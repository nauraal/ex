import "server-only";

import type { DashboardRole, DemoRow } from "./dashboard-config";
import { prisma } from "./prisma";

export async function getDashboardMetricValues(
  role: DashboardRole,
  username: string,
) {
  const format = (value: number | null | bigint) =>
    new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (role === "pemilik") {
    const owner = await prisma.pemilik.findUnique({
      where: { username },
      select: { id_pemilik: true },
    });
    if (!owner) throw new Error("Owner operational profile is missing.");
    const [pendingRegistrations, openPlans, productStock, activeShipments, receipts] =
      await Promise.all([
        prisma.users.count({
          where: {
            role: { in: ["pembuat_donut", "pengantar", "penjaga_tempat"] },
            status_registrasi: "menunggu_verifikasi",
          },
        }),
        prisma.rencana_produksi.count({
          where: { id_pemilik: owner.id_pemilik, produksi: { is: null } },
        }),
        prisma.stok_produk.aggregate({
          where: { varian_produk: { produk: { id_pemilik: owner.id_pemilik } } },
          _sum: { jumlah_stok: true },
        }),
        prisma.pengiriman.count({
          where: {
            id_pemilik: owner.id_pemilik,
            status_pengiriman: { in: ["dalam_perjalanan", "terkirim"] },
          },
        }),
        prisma.penerimaan_produk.count({
          where: { id_pemilik: owner.id_pemilik },
        }),
      ]);
    return [
      format(pendingRegistrations),
      format(openPlans),
      format(productStock._sum.jumlah_stok),
      format(activeShipments),
      format(receipts),
    ];
  }

  if (role === "pembuat_donut") {
    const maker = await prisma.pembuat_donut.findUnique({
      where: { username },
      select: { id_pembuat_donut: true },
    });
    if (!maker) throw new Error("Maker operational profile is missing.");
    const [openPlans, materials, production] = await Promise.all([
      prisma.rencana_produksi.count({
        where: { id_pembuat_donut: maker.id_pembuat_donut, produksi: { is: null } },
      }),
      prisma.bahan_baku.findMany({
        where: { id_pembuat_donut: maker.id_pembuat_donut },
        select: { stok_bahan: { select: { jumlah_stok: true } } },
      }),
      prisma.produksi.aggregate({
        where: { id_pembuat_donut: maker.id_pembuat_donut },
        _sum: { jumlah_rusak: true },
      }),
    ]);
    const lowStock = materials.filter(
      (material) => !material.stok_bahan || Number(material.stok_bahan.jumlah_stok) < 10,
    ).length;
    return [
      format(openPlans),
      format(lowStock),
      format(production._sum.jumlah_rusak),
    ];
  }

  if (role === "pengantar") {
    const courier = await prisma.pengantar.findUnique({
      where: { username },
      select: { id_pengantar: true },
    });
    if (!courier) throw new Error("Courier operational profile is missing.");
    const [pending, todayShipments] = await Promise.all([
      prisma.alokasi_produk.count({
        where: { id_pengantar: courier.id_pengantar, pengiriman: { none: {} } },
      }),
      prisma.pengiriman.count({
        where: { id_pengantar: courier.id_pengantar, tanggal_kirim: today },
      }),
    ]);
    return [format(pending), format(todayShipments)];
  }

  const guard = await prisma.penjaga_tempat.findUnique({
    where: { username },
    select: { id_penjaga_tempat: true },
  });
  if (!guard) throw new Error("Storekeeper operational profile is missing.");
  const [pending, receiptsToday, receivedQuantity] = await Promise.all([
    prisma.pengiriman.count({
      where: {
        penerimaan_produk: { is: null },
        alokasi_produk: { produk: { id_penjaga_tempat: guard.id_penjaga_tempat } },
      },
    }),
    prisma.penerimaan_produk.count({
      where: { id_penjaga_tempat: guard.id_penjaga_tempat, tanggal_terima: today },
    }),
    prisma.penerimaan_produk.aggregate({
      where: { id_penjaga_tempat: guard.id_penjaga_tempat },
      _sum: { jumlah_diterima: true },
    }),
  ]);
  return [
    format(pending),
    format(receiptsToday),
    format(receivedQuantity._sum.jumlah_diterima),
  ];
}

export async function getProductionPlanRows(): Promise<DemoRow[]> {
  const plans = await prisma.rencana_produksi.findMany({
    select: {
      id_rencana: true,
      tanggal_produksi: true,
      jumlah_rencana: true,
      status_rencana: true,
      catatan: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      produksi: { select: { id_hasil: true } },
    },
    orderBy: [{ tanggal_produksi: "desc" }, { id_rencana: "desc" }],
  });

  return plans.map((plan, index) => ({
    values: [
      String(index + 1),
      formatPlanId(plan.id_rencana),
      plan.tanggal_produksi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      `${plan.produk.nama_produk} ${plan.varian_produk.nama_varian}`,
      `${plan.jumlah_rencana} pcs`,
      plan.produksi ? "Selesai" : formatStatus(plan.status_rencana),
    ],
    href: "",
    actions: plan.produksi
      ? []
      : [{
          label: "Kelola",
          href: "",
          planId: plan.id_rencana,
          planDate: plan.tanggal_produksi.toISOString().slice(0, 10),
          planQuantity: plan.jumlah_rencana,
          planNote: plan.catatan,
        }],
  }));
}

export async function getProductionPlanOptions() {
  const variants = await prisma.varian_produk.findMany({
    select: {
      id_varian: true,
      nama_varian: true,
      produk: { select: { id_produk: true, nama_produk: true } },
    },
    orderBy: [{ produk: { nama_produk: "asc" } }, { nama_varian: "asc" }],
  });
  return variants.map((variant) => ({
    id_varian: variant.id_varian,
    label: `${variant.produk.nama_produk} - ${variant.nama_varian}`,
  }));
}

export async function getOpenProductionPlanOptions(username: string) {
  const maker = await prisma.pembuat_donut.findUnique({
    where: { username },
    select: { id_pembuat_donut: true },
  });
  if (!maker) return [];
  const plans = await prisma.rencana_produksi.findMany({
    where: {
      id_pembuat_donut: maker.id_pembuat_donut,
      produksi: { is: null },
    },
    select: {
      id_rencana: true,
      jumlah_rencana: true,
      id_varian: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
    },
    orderBy: [{ id_rencana: "desc" }],
  });
  return plans.map((plan) => ({
    id_rencana: plan.id_rencana,
    id_varian: plan.id_varian,
    label: `${formatPlanId(plan.id_rencana)} - ${plan.produk.nama_produk} ${plan.varian_produk.nama_varian} (${plan.jumlah_rencana} pcs)`,
  }));
}

export async function getRequirementPlanOptions() {
  const plans = await prisma.rencana_produksi.findMany({
    select: {
      id_rencana: true,
      id_varian: true,
      jumlah_rencana: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
    },
    orderBy: { id_rencana: "desc" },
  });
  return plans.map((plan) => ({
    id_rencana: plan.id_rencana,
    id_varian: plan.id_varian,
    label: `${formatPlanId(plan.id_rencana)} - ${plan.produk.nama_produk} ${plan.varian_produk.nama_varian} (${plan.jumlah_rencana} pcs)`,
  }));
}

export async function getAllocatablePlanOptions() {
  const plans = await prisma.rencana_produksi.findMany({
    where: {
      produksi: { isNot: null },
      varian_produk: { stok_produk: { is: { jumlah_stok: { gt: 0 } } } },
    },
    select: {
      id_rencana: true,
      produk: { select: { nama_produk: true } },
      varian_produk: {
        select: {
          nama_varian: true,
          stok_produk: { select: { jumlah_stok: true } },
        },
      },
    },
    orderBy: { id_rencana: "desc" },
  });
  return plans.map((plan) => ({
    id_rencana: plan.id_rencana,
    label: `${formatPlanId(plan.id_rencana)} - ${plan.produk.nama_produk} ${plan.varian_produk.nama_varian} (stok ${plan.varian_produk.stok_produk?.jumlah_stok ?? 0})`,
  }));
}

export async function getProductionOptions(username?: string) {
  const maker = username
    ? await prisma.pembuat_donut.findUnique({
        where: { username },
        select: { id_pembuat_donut: true },
      })
    : null;
  if (username && !maker) return [];
  const productions = await prisma.produksi.findMany({
    where: maker ? { id_pembuat_donut: maker.id_pembuat_donut } : undefined,
    select: {
      id_hasil: true,
      tanggal_produksi: true,
      id_rencana: true,
      produk: { select: { nama_produk: true } },
    },
    orderBy: [{ tanggal_produksi: "desc" }, { id_hasil: "desc" }],
  });
  return productions.map((production) => ({
    id_hasil: production.id_hasil,
    label: `${formatPlanId(production.id_rencana)} - ${production.produk.nama_produk} - ${production.tanggal_produksi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}`,
  }));
}

export async function getMaterialUsageOptions(username: string) {
  const maker = await prisma.pembuat_donut.findUnique({
    where: { username },
    select: { id_pembuat_donut: true },
  });
  if (!maker) return { productionDetails: [], usageMaterials: [] };

  const [productions, materials] = await Promise.all([
    prisma.produksi.findMany({
      where: { id_pembuat_donut: maker.id_pembuat_donut },
      select: {
        id_hasil: true,
        id_rencana: true,
        produk: { select: { nama_produk: true } },
        detail_produksi: {
          select: {
            id_varian: true,
            varian_produk: { select: { nama_varian: true } },
          },
        },
      },
      orderBy: { id_hasil: "desc" },
    }),
    prisma.bahan_baku.findMany({
      where: { id_pembuat_donut: maker.id_pembuat_donut },
      select: {
        id_bahan: true,
        nama_bahan: true,
        satuan: true,
        stok_bahan: { select: { jumlah_stok: true } },
      },
      orderBy: { nama_bahan: "asc" },
    }),
  ]);
  return {
    productionDetails: productions.flatMap((production) =>
      production.detail_produksi.map((detail) => ({
        id_hasil: production.id_hasil,
        id_varian: detail.id_varian,
        label: `${formatPlanId(production.id_rencana)} - ${production.produk.nama_produk} ${detail.varian_produk.nama_varian}`,
      })),
    ),
    usageMaterials: materials.map((material) => ({
      id_bahan: material.id_bahan,
      nama_bahan: material.nama_bahan,
      satuan: material.satuan,
      jumlah_stok: material.stok_bahan?.jumlah_stok.toString() ?? "0",
    })),
  };
}

export async function getMaterialRequirementRows(): Promise<DemoRow[]> {
  const requirements = await prisma.persediaan_bahan.findMany({
    select: {
      id_persediaan: true,
      id_bahan: true,
      id_jadwal: true,
      id_varian: true,
      jumlah_pemakaian_bahan: true,
    },
    orderBy: { id_persediaan: "desc" },
  });
  const materials = await prisma.bahan_baku.findMany({
    select: { id_bahan: true, nama_bahan: true, satuan: true },
  });
  const plans = await prisma.rencana_produksi.findMany({
    select: {
      id_rencana: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
    },
  });
  const materialById = new Map(materials.map((item) => [item.id_bahan, item]));
  const planById = new Map(plans.map((item) => [item.id_rencana, item]));

  return requirements.map((requirement, index) => {
    const material = materialById.get(requirement.id_bahan);
    const plan = requirement.id_jadwal
      ? planById.get(requirement.id_jadwal)
      : undefined;
    return {
      values: [
        String(index + 1),
        material?.nama_bahan ?? `Bahan ID ${requirement.id_bahan}`,
        plan
          ? `${formatPlanId(requirement.id_jadwal!)} - ${plan.produk.nama_produk} ${plan.varian_produk.nama_varian}`
          : `Rencana ${requirement.id_jadwal ?? "tidak tersedia"}`,
        String(requirement.jumlah_pemakaian_bahan),
        material?.satuan ?? "—",
      ],
      href: "",
      actionLabel: "—",
    };
  });
}

export async function getIngredientOptions() {
  return prisma.bahan_baku.findMany({
    select: { id_bahan: true, nama_bahan: true, satuan: true },
    orderBy: { nama_bahan: "asc" },
  });
}

export async function getLocationOptions() {
  return prisma.lokasi_penjualan.findMany({
    select: { id_lokasi: true, nama_lokasi: true, alamat_lokasi: true },
    orderBy: { nama_lokasi: "asc" },
  });
}

export async function getCourierOptions() {
  return prisma.users.findMany({
    where: { role: "pengantar", status_registrasi: "aktif" },
    select: { id_user: true, nama: true },
    orderBy: { nama: "asc" },
  });
}

export async function getCourierAllocationOptions(username: string) {
  const courier = await prisma.pengantar.findUnique({
    where: { username },
    select: { id_pengantar: true },
  });
  if (!courier) return [];
  const allocations = await prisma.alokasi_produk.findMany({
    where: {
      id_pengantar: courier.id_pengantar,
      pengiriman: { none: {} },
    },
    select: {
      id_alokasi: true,
      jumlah_alokasi: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
    },
    orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
  });
  return allocations.map((allocation) => ({
    id_alokasi: allocation.id_alokasi,
    label: `AL-${String(allocation.id_alokasi).padStart(3, "0")} - ${allocation.produk.nama_produk} ${allocation.varian_produk.nama_varian}, ${allocation.jumlah_alokasi} pcs ke ${allocation.lokasi_penjualan.nama_lokasi}`,
  }));
}

export async function getIncomingShipmentOptions(username: string) {
  const guard = await prisma.penjaga_tempat.findUnique({
    where: { username },
    select: { id_penjaga_tempat: true },
  });
  if (!guard) return [];
  const shipments = await prisma.pengiriman.findMany({
    where: {
      penerimaan_produk: { is: null },
      status_pengiriman: { in: ["dalam_perjalanan", "terkirim"] },
      alokasi_produk: { produk: { id_penjaga_tempat: guard.id_penjaga_tempat } },
    },
    select: {
      id_pengiriman: true,
      jumlah_dikirim: true,
      lokasi_penjualan: { select: { nama_lokasi: true } },
      pengantar: { select: { nama_pengantar: true } },
      alokasi_produk: {
        select: {
          produk: { select: { nama_produk: true } },
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
    orderBy: [{ tanggal_kirim: "desc" }, { id_pengiriman: "desc" }],
  });
  return shipments.map((shipment) => ({
    id_pengiriman: shipment.id_pengiriman,
    jumlah_dikirim: shipment.jumlah_dikirim,
    label: `AL-${String(shipment.id_pengiriman).padStart(3, "0")} - ${shipment.alokasi_produk.produk.nama_produk} ${shipment.alokasi_produk.varian_produk.nama_varian}, ${shipment.jumlah_dikirim} pcs dari ${shipment.pengantar.nama_pengantar} ke ${shipment.lokasi_penjualan.nama_lokasi}`,
  }));
}

export async function getCourierRows(username: string, history = false): Promise<DemoRow[]> {
  const courier = await prisma.pengantar.findUnique({
    where: { username },
    select: { id_pengantar: true },
  });
  if (!courier) return [];
  const allocations = await prisma.alokasi_produk.findMany({
    where: history
      ? {
          id_pengantar: courier.id_pengantar,
          pengiriman: { some: { status_pengiriman: { in: ["diterima", "selisih"] } } },
        }
      : {
          id_pengantar: courier.id_pengantar,
          OR: [
            { pengiriman: { none: {} } },
            { pengiriman: { some: { status_pengiriman: { in: ["dalam_perjalanan", "terkirim"] } } } },
          ],
        },
    select: {
      id_alokasi: true,
      jumlah_alokasi: true,
      tanggal_alokasi: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
      pengiriman: {
        select: { tanggal_kirim: true, status_pengiriman: true },
        orderBy: { id_pengiriman: "desc" },
        take: 1,
      },
    },
    orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
  });
  return allocations.map((allocation, index) => {
    const shipment = allocation.pengiriman[0];
    return {
      values: [
        String(index + 1),
        `AL-${String(allocation.id_alokasi).padStart(3, "0")}`,
        allocation.lokasi_penjualan.nama_lokasi,
        `${allocation.produk.nama_produk} ${allocation.varian_produk.nama_varian}`,
        history
          ? shipment?.tanggal_kirim.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) ?? "—"
          : `${allocation.jumlah_alokasi} pcs`,
        history
          ? shipment?.status_pengiriman ?? "—"
          : shipment?.status_pengiriman ?? "Siap dikirim",
      ],
      href: "",
      actionLabel: "—",
    };
  });
}

export async function getCourierInformationRows(username: string): Promise<DemoRow[]> {
  const courier = await prisma.pengantar.findUnique({
    where: { username },
    select: { id_pengantar: true },
  });
  if (!courier) return [];
  const allocations = await prisma.alokasi_produk.findMany({
    where: { id_pengantar: courier.id_pengantar },
    select: {
      id_alokasi: true,
      jumlah_alokasi: true,
      produk: { select: { id_produk: true, nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
    },
    orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
  });
  return allocations.map((allocation, index) => ({
    values: [
      String(index + 1),
      `P-${allocation.produk.id_produk}`,
      allocation.produk.nama_produk,
      allocation.varian_produk.nama_varian,
      `${allocation.jumlah_alokasi} pcs`,
      allocation.lokasi_penjualan.nama_lokasi,
    ],
    href: "",
    actionLabel: "—",
  }));
}

export async function getGuardShipmentRows(
  username: string,
  view: "pending" | "status" | "history" = "pending",
): Promise<DemoRow[]> {
  const guard = await prisma.penjaga_tempat.findUnique({
    where: { username },
    select: { id_penjaga_tempat: true },
  });
  if (!guard) return [];
  const shipments = await prisma.pengiriman.findMany({
    where: {
      alokasi_produk: { produk: { id_penjaga_tempat: guard.id_penjaga_tempat } },
      ...(view === "pending"
        ? { penerimaan_produk: { is: null } }
        : view === "history"
          ? { penerimaan_produk: { isNot: null } }
          : {}),
    },
    select: {
      id_pengiriman: true,
      tanggal_kirim: true,
      jumlah_dikirim: true,
      status_pengiriman: true,
      pengantar: { select: { nama_pengantar: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
      penerimaan_produk: {
        select: { tanggal_terima: true, jumlah_diterima: true, status_penerimaan: true },
      },
      alokasi_produk: {
        select: {
          produk: { select: { nama_produk: true } },
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
    orderBy: [{ tanggal_kirim: "desc" }, { id_pengiriman: "desc" }],
  });
  return shipments.map((shipment, index) => {
    const product = `${shipment.alokasi_produk.produk.nama_produk} ${shipment.alokasi_produk.varian_produk.nama_varian}`;
    const received = shipment.penerimaan_produk;
    const values =
      view === "pending"
        ? [
            String(index + 1),
            `AL-${String(shipment.id_pengiriman).padStart(3, "0")}`,
            shipment.pengantar.nama_pengantar,
            product,
            `${shipment.jumlah_dikirim} pcs`,
            shipment.tanggal_kirim.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
          ]
        : view === "history"
          ? [
              String(index + 1),
              `AL-${String(shipment.id_pengiriman).padStart(3, "0")}`,
              product,
              `${received?.jumlah_diterima ?? 0} pcs`,
              received?.tanggal_terima.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) ?? "—",
              received?.status_penerimaan ?? "—",
            ]
          : [
              String(index + 1),
              `AL-${String(shipment.id_pengiriman).padStart(3, "0")}`,
              shipment.pengantar.nama_pengantar,
              product,
              shipment.tanggal_kirim.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
              shipment.status_pengiriman,
            ];
    return { values, href: "", actionLabel: "—" };
  });
}

export async function getProductStockRows(): Promise<DemoRow[]> {
  const stocks = await prisma.stok_produk.findMany({
    select: {
      id_varian: true,
      jumlah_stok: true,
      varian_produk: {
        select: {
          nama_varian: true,
          produk: { select: { id_produk: true, nama_produk: true, satuan: true } },
        },
      },
    },
    orderBy: [
      { varian_produk: { produk: { nama_produk: "asc" } } },
      { varian_produk: { nama_varian: "asc" } },
    ],
  });
  return stocks.map((stock, index) => ({
    values: [
      String(index + 1),
      `P-${stock.varian_produk.produk.id_produk}`,
      stock.varian_produk.produk.nama_produk,
      stock.varian_produk.nama_varian,
      `${stock.jumlah_stok} ${stock.varian_produk.produk.satuan}`,
    ],
    href: "",
    actions: [{
      label: "Ubah Stok",
      href: "",
      stockVariantId: stock.id_varian,
      stockQuantity: stock.jumlah_stok,
    }],
  }));
}

export async function getRawMaterialStockRows(
  editable = true,
  username?: string,
): Promise<DemoRow[]> {
  let where: { id_pembuat_donut?: number } | undefined;
  if (!editable) {
    if (!username) return [];
    const maker = await prisma.pembuat_donut.findUnique({
      where: { username },
      select: { id_pembuat_donut: true },
    });
    if (!maker) return [];
    where = { id_pembuat_donut: maker.id_pembuat_donut };
  }
  const materials = await prisma.bahan_baku.findMany({
    where,
    select: {
      id_bahan: true,
      nama_bahan: true,
      satuan: true,
      stok_bahan: { select: { jumlah_stok: true } },
    },
    orderBy: { nama_bahan: "asc" },
  });
  return materials.map((material, index) => ({
    values: [
      String(index + 1),
      material.nama_bahan,
      material.stok_bahan?.jumlah_stok.toString() ?? "Belum dicatat",
      material.satuan,
      material.stok_bahan ? "Tercatat" : "Belum dicatat",
    ],
    href: "",
    actions: editable
      ? [{
          label: "Ubah Stok",
          href: "",
          rawMaterialId: material.id_bahan,
          rawMaterialQuantity: material.stok_bahan?.jumlah_stok.toString() ?? "0",
        }]
      : [],
  }));
}

export async function getAllocationRows(): Promise<DemoRow[]> {
  const allocations = await prisma.alokasi_produk.findMany({
    select: {
      id_alokasi: true,
      tanggal_alokasi: true,
      jumlah_alokasi: true,
      stok_tersedia: true,
      lokasi_penjualan: { select: { nama_lokasi: true } },
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
    },
    orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
  });
  return allocations.map((allocation, index) => ({
    values: [
      String(index + 1),
      `AL-${allocation.id_alokasi}`,
      `${allocation.produk.nama_produk} ${allocation.varian_produk.nama_varian}`,
      allocation.lokasi_penjualan.nama_lokasi,
      `${allocation.jumlah_alokasi} pcs`,
      allocation.tanggal_alokasi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
    ],
    href: "",
    actionLabel: "—",
  }));
}

export async function getProductionReportRows(): Promise<DemoRow[]> {
  const reports = await prisma.laporan.findMany({
    select: {
      id_laporan: true,
      tanggal_laporan: true,
      jenis_laporan: true,
      produksi: {
        select: {
          id_rencana: true,
          jumlah_rencana: true,
          jumlah_hasil: true,
          jumlah_rusak: true,
          produk: { select: { nama_produk: true } },
        },
      },
    },
    orderBy: [{ tanggal_laporan: "desc" }, { id_laporan: "desc" }],
  });
  return reports.map((report, index) => ({
    values: [
      String(index + 1),
      report.produksi ? formatPlanId(report.produksi.id_rencana) : `L-${report.id_laporan}`,
      report.produksi?.produk.nama_produk ?? report.jenis_laporan,
      report.produksi ? `${report.produksi.jumlah_rencana} pcs` : "—",
      report.produksi
        ? `${report.produksi.jumlah_hasil - report.produksi.jumlah_rusak} pcs`
        : "—",
      report.produksi ? `${report.produksi.jumlah_rusak} pcs` : "—",
    ],
    href: "",
    actionLabel: "—",
    date: report.tanggal_laporan.toISOString().slice(0, 10),
  }));
}

export async function getMakerPlanRows(username: string): Promise<DemoRow[]> {
  const maker = await prisma.pembuat_donut.findUnique({
    where: { username },
    select: { id_pembuat_donut: true },
  });
  if (!maker) return [];
  const plans = await prisma.rencana_produksi.findMany({
    where: { id_pembuat_donut: maker.id_pembuat_donut },
    select: {
      id_rencana: true,
      tanggal_produksi: true,
      jumlah_rencana: true,
      status_rencana: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      produksi: {
        select: {
          jumlah_hasil: true,
          jumlah_rusak: true,
        },
      },
    },
    orderBy: [{ tanggal_produksi: "desc" }, { id_rencana: "desc" }],
  });
  return plans.map((plan, index) => ({
    values: [
      String(index + 1),
      formatPlanId(plan.id_rencana),
      `${plan.produk.nama_produk} ${plan.varian_produk.nama_varian}`,
      `${plan.jumlah_rencana} pcs`,
      plan.tanggal_produksi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      plan.produksi ? "Hasil dicatat" : formatStatus(plan.status_rencana),
    ],
    href: "",
    actions: plan.produksi
      ? [{ label: "—", href: "hasil-produksi" }]
      : [{ label: "Catat Hasil", href: "catat-hasil" }],
  }));
}

export async function getProductionQualityRows(username: string): Promise<DemoRow[]> {
  const maker = await prisma.pembuat_donut.findUnique({
    where: { username },
    select: { id_pembuat_donut: true },
  });
  if (!maker) return [];
  const results = await prisma.produksi.findMany({
    where: { id_pembuat_donut: maker.id_pembuat_donut },
    select: {
      id_rencana: true,
      jumlah_hasil: true,
      jumlah_rusak: true,
      keterangan_kualitas: true,
      produk: { select: { nama_produk: true } },
    },
    orderBy: { id_hasil: "desc" },
  });
  return results.map((result, index) => ({
    values: [
      String(index + 1),
      formatPlanId(result.id_rencana),
      result.produk.nama_produk,
      `${result.jumlah_hasil - result.jumlah_rusak} pcs`,
      `${result.jumlah_rusak} pcs`,
      result.keterangan_kualitas ?? "Tercatat",
    ],
    href: "",
    actionLabel: "—",
  }));
}

export async function getPlanDetails(id: number) {
  return prisma.rencana_produksi.findUnique({
    where: { id_rencana: id },
    select: {
      id_rencana: true,
      tanggal_produksi: true,
      status_rencana: true,
      catatan: true,
      jumlah_rencana: true,
      id_varian: true,
      produksi: { select: { id_hasil: true } },
    },
  });
}

export function formatPlanId(id: number) {
  return `RP-${String(id).padStart(3, "0")}`;
}

function formatStatus(status: string) {
  switch (status) {
    case "menunggu":
      return "Menunggu";
    case "dalam_proses":
      return "Dalam proses";
    case "selesai":
      return "Selesai";
    default:
      return status;
  }
}
