import "server-only";

import type { DashboardRole, DemoRow } from "./dashboard-config";
import { prisma } from "./prisma";

async function getOwnerProfileId(username: string) {
  const owner = await prisma.pemilik.findUnique({
    where: { username },
    select: { id_pemilik: true },
  });
  if (!owner) throw new Error("Owner operational profile is missing.");
  return owner.id_pemilik;
}

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
        status_pengiriman: { in: ["dalam_perjalanan", "terkirim"] },
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

export async function getProductionPlanRows(username: string): Promise<DemoRow[]> {
  const ownerId = await getOwnerProfileId(username);
  const plans = await prisma.rencana_produksi.findMany({
    where: { id_pemilik: ownerId },
    select: {
      id_rencana: true,
      tanggal_produksi: true,
      jumlah_rencana: true,
      status_rencana: true,
      catatan: true,
      produk: { select: { nama_produk: true } },
      detail_produk: {
        select: {
          varian_produk: { select: { nama_varian: true } },
        },
      },
      produksi: { select: { id_hasil: true } },
    },
    orderBy: [{ tanggal_produksi: "desc" }, { id_rencana: "desc" }],
  });

  return plans.map((plan, index) => ({
    values: [
      String(index + 1),
      formatPlanId(plan.id_rencana),
      plan.tanggal_produksi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      `${plan.produk.nama_produk} ${plan.detail_produk.map((detail) => detail.varian_produk.nama_varian).join(", ") || "Tanpa varian"}`,
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

export async function getProductionPlanOptions(username: string) {
  const ownerId = await getOwnerProfileId(username);
  const variants = await prisma.varian_produk.findMany({
    where: { produk: { id_pemilik: ownerId } },
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
      produk: { select: { nama_produk: true } },
      detail_produk: {
        select: {
          id_varian: true,
          jumlah_rencana_varian_pcs: true,
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
    orderBy: [{ id_rencana: "desc" }],
  });
  return plans.map((plan) => ({
    id_rencana: plan.id_rencana,
    label: `${formatPlanId(plan.id_rencana)} - ${plan.produk.nama_produk} (${plan.jumlah_rencana} pcs)`,
    variants: plan.detail_produk.map((detail) => ({
      id_varian: detail.id_varian,
      nama_varian: detail.varian_produk.nama_varian,
      jumlah_rencana_varian_pcs: detail.jumlah_rencana_varian_pcs,
    })),
  }));
}

export async function getRequirementPlanOptions(username: string) {
  const ownerId = await getOwnerProfileId(username);
  const plans = await prisma.rencana_produksi.findMany({
    where: { id_pemilik: ownerId },
    select: {
      id_rencana: true,
      jumlah_rencana: true,
      produk: { select: { nama_produk: true } },
      detail_produk: {
        select: {
          id_varian: true,
          jumlah_rencana_varian_pcs: true,
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
    orderBy: { id_rencana: "desc" },
  });
  return plans.flatMap((plan) =>
    plan.detail_produk.map((detail) => ({
      id_rencana: plan.id_rencana,
      id_varian: detail.id_varian,
      label: `${formatPlanId(plan.id_rencana)} - ${plan.produk.nama_produk} ${detail.varian_produk.nama_varian} (${detail.jumlah_rencana_varian_pcs} pcs)`,
    })),
  );
}

export async function getAllocatablePlanOptions(username: string) {
  const ownerId = await getOwnerProfileId(username);
  const plans = await prisma.rencana_produksi.findMany({
    where: {
      id_pemilik: ownerId,
      produksi: { isNot: null },
    },
    select: {
      id_rencana: true,
      produk: { select: { nama_produk: true } },
      detail_produk: {
        select: {
          id_varian: true,
          varian_produk: {
            select: {
              nama_varian: true,
              stok_produk: { select: { jumlah_stok: true } },
            },
          },
        },
      },
    },
    orderBy: { id_rencana: "desc" },
  });
  return plans.flatMap((plan) =>
    plan.detail_produk.flatMap((detail) => {
      const stock = detail.varian_produk.stok_produk?.jumlah_stok ?? 0;
      return stock > 0
        ? [{
            id_rencana: plan.id_rencana,
            id_varian: detail.id_varian,
            label: `${formatPlanId(plan.id_rencana)} - ${plan.produk.nama_produk} ${detail.varian_produk.nama_varian} (stok ${stock})`,
          }]
        : [];
    }),
  );
}

export async function getProductionOptions(
  username: string,
  role: "pemilik" | "pembuat_donut",
) {
  let where: { id_pemilik?: number; id_pembuat_donut?: number };
  if (role === "pemilik") {
    where = { id_pemilik: await getOwnerProfileId(username) };
  } else {
    const maker = await prisma.pembuat_donut.findUnique({
        where: { username },
        select: { id_pembuat_donut: true },
      });
    if (!maker) return [];
    where = { id_pembuat_donut: maker.id_pembuat_donut };
  }
  const productions = await prisma.produksi.findMany({
    where,
    select: {
      id_hasil: true,
      tanggal_produksi: true,
      id_rencana: true,
      produk: { select: { nama_produk: true } },
      detail_produksi: {
        select: {
          id_varian: true,
          jumlah_hasil_pcs: true,
          jumlah_rusak_pcs: true,
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
    orderBy: [{ tanggal_produksi: "desc" }, { id_hasil: "desc" }],
  });
  return productions.map((production) => ({
    id_hasil: production.id_hasil,
    label: `${formatPlanId(production.id_rencana)} - ${production.produk.nama_produk} - ${production.tanggal_produksi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}`,
    variants: production.detail_produksi.map((detail) => ({
      id_varian: detail.id_varian,
      nama_varian: detail.varian_produk.nama_varian,
      jumlah_hasil_pcs: detail.jumlah_hasil_pcs,
      jumlah_rusak_pcs: detail.jumlah_rusak_pcs,
    })),
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

export async function getMaterialRequirementRows(username: string): Promise<DemoRow[]> {
  const ownerId = await getOwnerProfileId(username);
  const plans = await prisma.rencana_produksi.findMany({
    where: { id_pemilik: ownerId },
    select: {
      id_rencana: true,
      produk: { select: { nama_produk: true } },
      detail_produk: {
        select: {
          id_varian: true,
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
  });
  const [requirements, materials] = await Promise.all([
    prisma.persediaan_bahan.findMany({
      where: { id_jadwal: { in: plans.map((plan) => plan.id_rencana) } },
      select: {
        id_persediaan: true,
        id_bahan: true,
        id_jadwal: true,
        id_varian: true,
        jumlah_pemakaian_bahan: true,
      },
      orderBy: { id_persediaan: "desc" },
    }),
    prisma.bahan_baku.findMany({
      where: { id_pemilik: ownerId },
      select: { id_bahan: true, nama_bahan: true, satuan: true },
    }),
  ]);
  const materialById = new Map(materials.map((item) => [item.id_bahan, item]));
  const planById = new Map(plans.map((item) => [item.id_rencana, item]));

  return requirements.map((requirement, index) => {
    const material = materialById.get(requirement.id_bahan);
    const plan = requirement.id_jadwal
      ? planById.get(requirement.id_jadwal)
      : undefined;
    const variantName = requirement.id_varian === null
      ? undefined
      : plan?.detail_produk.find(
          (detail) => detail.id_varian === requirement.id_varian,
        )?.varian_produk.nama_varian;
    return {
      values: [
        String(index + 1),
        material?.nama_bahan ?? `Bahan ID ${requirement.id_bahan}`,
        plan
          ? `${formatPlanId(requirement.id_jadwal!)} - ${plan.produk.nama_produk}${variantName ? ` ${variantName}` : ""}`
          : `Rencana ${requirement.id_jadwal ?? "tidak tersedia"}`,
        String(requirement.jumlah_pemakaian_bahan),
        material?.satuan ?? "—",
      ],
      href: "",
      actionLabel: "—",
    };
  });
}

export async function getIngredientOptions(username: string) {
  const ownerId = await getOwnerProfileId(username);
  return prisma.bahan_baku.findMany({
    where: { id_pemilik: ownerId },
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

export async function getLocationRows(): Promise<DemoRow[]> {
  const locations = await prisma.lokasi_penjualan.findMany({
    select: { id_lokasi: true, nama_lokasi: true, alamat_lokasi: true },
    orderBy: { nama_lokasi: "asc" },
  });
  return locations.map((location, index) => ({
    values: [
      String(index + 1),
      location.nama_lokasi,
      location.alamat_lokasi,
    ],
    href: "",
    actions: [{
      label: "Pilih",
      href: `alokasi-form?id_lokasi=${location.id_lokasi}`,
    }],
  }));
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
    where: { id_pengantar: courier.id_pengantar },
    select: {
      id_alokasi: true,
      jumlah_alokasi: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
      pengiriman: {
        select: {
          id_pengiriman: true,
          status_pengiriman: true,
          penerimaan_produk: { select: { id_penerimaan: true } },
        },
        orderBy: { id_pengiriman: "desc" },
        take: 1,
      },
    },
    orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
  });
  return allocations
    .filter((allocation) => {
      const shipment = allocation.pengiriman[0];
      return !shipment || (
        !shipment.penerimaan_produk &&
        ["dalam_perjalanan", "terkirim"].includes(shipment.status_pengiriman)
      );
    })
    .map((allocation) => ({
      id_alokasi: allocation.id_alokasi,
      id_pengiriman: allocation.pengiriman[0]?.id_pengiriman ?? null,
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
    where: { id_pengantar: courier.id_pengantar },
    select: {
      id_alokasi: true,
      jumlah_alokasi: true,
      tanggal_alokasi: true,
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
      pengiriman: {
        select: {
          id_pengiriman: true,
          tanggal_kirim: true,
          status_pengiriman: true,
          penerimaan_produk: {
            select: {
              tanggal_terima: true,
              jumlah_diterima: true,
              kondisi_produksi: true,
              status_penerimaan: true,
            },
          },
        },
        orderBy: { id_pengiriman: "desc" },
        take: 1,
      },
    },
    orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
  });
  const visibleAllocations = allocations.filter((allocation) => {
    const shipment = allocation.pengiriman[0];
    const completed =
      Boolean(shipment?.penerimaan_produk) ||
      shipment?.status_pengiriman === "diterima" ||
      shipment?.status_pengiriman === "selisih";
    return history ? completed : !shipment || (!completed && ["dalam_perjalanan", "terkirim"].includes(shipment.status_pengiriman));
  });
  return visibleAllocations.map((allocation, index) => {
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
      href: shipment
        ? `${history ? "riwayat-detail" : "pengiriman-detail"}/shipment-${shipment.id_pengiriman}`
        : `pengiriman-detail/allocation-${allocation.id_alokasi}`,
      actionLabel: "Lihat",
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
    href: `pengiriman-detail/allocation-${allocation.id_alokasi}`,
    actionLabel: "Lihat",
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
        ? {
            penerimaan_produk: { is: null },
            status_pengiriman: { in: ["dalam_perjalanan", "terkirim"] },
          }
        : view === "history"
          ? { penerimaan_produk: { isNot: null } }
          : {
              penerimaan_produk: { is: null },
              status_pengiriman: { in: ["dalam_perjalanan", "terkirim"] },
            }),
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
    const detailScreen =
      view === "history"
        ? "riwayat-penerimaan-detail"
        : view === "status"
          ? "detail-status"
          : "detail-penerimaan";
    return {
      values,
      href: `${detailScreen}/${shipment.id_pengiriman}`,
      actionLabel: "Lihat",
    };
  });
}

export async function getProductStockRows(username: string): Promise<DemoRow[]> {
  const ownerId = await getOwnerProfileId(username);
  const stocks = await prisma.stok_produk.findMany({
    where: { varian_produk: { produk: { id_pemilik: ownerId } } },
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
  let where: { id_pemilik?: number; id_pembuat_donut?: number } | undefined;
  if (editable) {
    if (!username) return [];
    where = { id_pemilik: await getOwnerProfileId(username) };
  } else {
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
      : [{
          label: "Catat Penggunaan",
          href: `catat-penggunaan?id_bahan=${material.id_bahan}`,
        }],
  }));
}

export async function getAllocationRows(
  username: string,
  history = false,
): Promise<DemoRow[]> {
  const ownerId = await getOwnerProfileId(username);
  const allocations = await prisma.alokasi_produk.findMany({
    where: { id_pemilik: ownerId },
    select: {
      id_alokasi: true,
      tanggal_alokasi: true,
      jumlah_alokasi: true,
      stok_tersedia: true,
      lokasi_penjualan: { select: { nama_lokasi: true } },
      produk: { select: { nama_produk: true } },
      varian_produk: { select: { nama_varian: true } },
      pengiriman: {
        select: { status_pengiriman: true },
        orderBy: { id_pengiriman: "desc" },
        take: 1,
      },
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
      ...(history
        ? [allocation.pengiriman[0]?.status_pengiriman ?? "Belum dikirim"]
        : []),
    ],
    href: "",
    actionLabel: "—",
  }));
}

export async function getProductionReportRows(username: string): Promise<DemoRow[]> {
  const ownerId = await getOwnerProfileId(username);
  const reports = await prisma.laporan.findMany({
    where: { id_pemilik: ownerId },
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
    href: `laporan-detail/${report.id_laporan}`,
    actionLabel: "Lihat",
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
      detail_produk: {
        select: {
          varian_produk: { select: { nama_varian: true } },
        },
      },
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
      `${plan.produk.nama_produk} ${plan.detail_produk.map((detail) => detail.varian_produk.nama_varian).join(", ") || "Tanpa varian"}`,
      `${plan.jumlah_rencana} pcs`,
      plan.tanggal_produksi.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }),
      plan.produksi ? "Hasil dicatat" : formatStatus(plan.status_rencana),
    ],
    href: "",
    actions: [
      { label: "Lihat", href: `hasil-produksi-detail/${plan.id_rencana}` },
      ...(!plan.produksi
        ? [{
            label: "Catat Hasil",
            href: `catat-hasil?id_rencana=${plan.id_rencana}`,
          }]
        : []),
    ],
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
      id_hasil: true,
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
    href: `kualitas-detail/${result.id_hasil}`,
    actionLabel: "Lihat",
  }));
}

export async function getOwnerReportDetail(username: string, reportId: number) {
  const ownerId = await getOwnerProfileId(username);
  const report = await prisma.laporan.findFirst({
    where: { id_laporan: reportId, id_pemilik: ownerId },
    select: {
      id_laporan: true,
      tanggal_laporan: true,
      periode_awal: true,
      periode_akhir: true,
      jenis_laporan: true,
      produksi: {
        select: {
          tanggal_produksi: true,
          jumlah_rencana: true,
          jumlah_hasil: true,
          jumlah_rusak: true,
          keterangan_kualitas: true,
          produk: { select: { nama_produk: true } },
          detail_produksi: {
            select: {
              jumlah_hasil_pcs: true,
              jumlah_rusak_pcs: true,
              varian_produk: { select: { nama_varian: true } },
            },
          },
        },
      },
    },
  });
  if (!report) return null;
  return {
    title: `Detail Laporan ${report.jenis_laporan}`,
    details: [
      { label: "Jenis laporan", value: report.jenis_laporan },
      { label: "Tanggal laporan", value: formatDate(report.tanggal_laporan) },
      {
        label: "Periode",
        value: `${formatDate(report.periode_awal)} - ${formatDate(report.periode_akhir)}`,
      },
      ...(report.produksi
        ? [
            { label: "Produk", value: report.produksi.produk.nama_produk },
            { label: "Tanggal produksi", value: formatDate(report.produksi.tanggal_produksi) },
            { label: "Target produksi", value: `${report.produksi.jumlah_rencana} pcs` },
            {
              label: "Hasil layak",
              value: `${report.produksi.jumlah_hasil - report.produksi.jumlah_rusak} pcs`,
            },
            { label: "Produk rusak", value: `${report.produksi.jumlah_rusak} pcs` },
            ...report.produksi.detail_produksi.map((detail) => ({
              label: `Varian ${detail.varian_produk.nama_varian}`,
              value: `${detail.jumlah_hasil_pcs} pcs hasil, ${detail.jumlah_rusak_pcs} pcs rusak`,
            })),
            ...(report.produksi.keterangan_kualitas
              ? [{ label: "Catatan kualitas", value: report.produksi.keterangan_kualitas }]
              : []),
          ]
        : []),
    ],
  };
}

export async function getMakerPlanDetail(username: string, planId: number) {
  const maker = await prisma.pembuat_donut.findUnique({
    where: { username },
    select: { id_pembuat_donut: true },
  });
  if (!maker) return null;
  const plan = await prisma.rencana_produksi.findFirst({
    where: { id_rencana: planId, id_pembuat_donut: maker.id_pembuat_donut },
    select: {
      id_rencana: true,
      tanggal_produksi: true,
      jumlah_rencana: true,
      status_rencana: true,
      catatan: true,
      produk: { select: { nama_produk: true } },
      detail_produk: {
        select: {
          jumlah_rencana_varian_pcs: true,
          varian_produk: { select: { nama_varian: true } },
        },
      },
      produksi: {
        select: {
          jumlah_hasil: true,
          jumlah_rusak: true,
          keterangan_kualitas: true,
        },
      },
    },
  });
  if (!plan) return null;
  return {
    title: `Detail Rencana Produksi ${formatPlanId(plan.id_rencana)}`,
    details: [
      { label: "Kode rencana", value: formatPlanId(plan.id_rencana) },
      { label: "Produk", value: plan.produk.nama_produk },
      { label: "Tanggal produksi", value: formatDate(plan.tanggal_produksi) },
      { label: "Target produksi", value: `${plan.jumlah_rencana} pcs` },
      { label: "Status", value: formatStatus(plan.status_rencana) },
      ...plan.detail_produk.map((detail) => ({
        label: `Varian ${detail.varian_produk.nama_varian}`,
        value: `${detail.jumlah_rencana_varian_pcs} pcs direncanakan`,
      })),
      ...(plan.catatan ? [{ label: "Catatan", value: plan.catatan }] : []),
      ...(plan.produksi
        ? [
            { label: "Hasil produksi", value: `${plan.produksi.jumlah_hasil} pcs` },
            { label: "Produk rusak", value: `${plan.produksi.jumlah_rusak} pcs` },
            ...(plan.produksi.keterangan_kualitas
              ? [{ label: "Catatan kualitas", value: plan.produksi.keterangan_kualitas }]
              : []),
          ]
        : []),
    ],
    primaryAction: plan.produksi
      ? undefined
      : {
          label: "Catat Hasil Produksi",
          href: `catat-hasil?id_rencana=${plan.id_rencana}`,
        },
  };
}

export async function getMakerQualityDetail(username: string, productionId: number) {
  const maker = await prisma.pembuat_donut.findUnique({
    where: { username },
    select: { id_pembuat_donut: true },
  });
  if (!maker) return null;
  const production = await prisma.produksi.findFirst({
    where: { id_hasil: productionId, id_pembuat_donut: maker.id_pembuat_donut },
    select: {
      id_rencana: true,
      tanggal_produksi: true,
      jumlah_rencana: true,
      jumlah_hasil: true,
      jumlah_rusak: true,
      keterangan_kualitas: true,
      produk: { select: { nama_produk: true } },
      detail_produksi: {
        select: {
          jumlah_hasil_pcs: true,
          jumlah_rusak_pcs: true,
          varian_produk: { select: { nama_varian: true } },
        },
      },
    },
  });
  if (!production) return null;
  return {
    title: `Detail Kualitas ${formatPlanId(production.id_rencana)}`,
    details: [
      { label: "Kode rencana", value: formatPlanId(production.id_rencana) },
      { label: "Produk", value: production.produk.nama_produk },
      { label: "Tanggal produksi", value: formatDate(production.tanggal_produksi) },
      { label: "Target produksi", value: `${production.jumlah_rencana} pcs` },
      {
        label: "Hasil layak",
        value: `${production.jumlah_hasil - production.jumlah_rusak} pcs`,
      },
      { label: "Produk rusak", value: `${production.jumlah_rusak} pcs` },
      ...production.detail_produksi.map((detail) => ({
        label: `Varian ${detail.varian_produk.nama_varian}`,
        value: `${detail.jumlah_hasil_pcs} pcs hasil, ${detail.jumlah_rusak_pcs} pcs rusak`,
      })),
      { label: "Catatan", value: production.keterangan_kualitas ?? "Tidak ada catatan kualitas." },
    ],
    primaryAction: {
      label: "Perbarui Catatan Kerusakan",
      href: `catat-rusak?id_hasil=${productionId}`,
    },
  };
}

export async function getCourierAllocationDetail(
  username: string,
  recordType: "allocation" | "shipment",
  recordId: number,
) {
  const courier = await prisma.pengantar.findUnique({
    where: { username },
    select: { id_pengantar: true },
  });
  if (!courier) return null;

  if (recordType === "allocation") {
    const allocation = await prisma.alokasi_produk.findFirst({
      where: { id_alokasi: recordId, id_pengantar: courier.id_pengantar },
      select: {
        id_alokasi: true,
        tanggal_alokasi: true,
        jumlah_alokasi: true,
        produk: { select: { nama_produk: true } },
        varian_produk: { select: { nama_varian: true } },
        lokasi_penjualan: { select: { nama_lokasi: true } },
        pengiriman: {
          select: {
            id_pengiriman: true,
            tanggal_kirim: true,
            status_pengiriman: true,
            penerimaan_produk: {
              select: {
                tanggal_terima: true,
                jumlah_diterima: true,
                kondisi_produksi: true,
                status_penerimaan: true,
              },
            },
          },
          orderBy: { id_pengiriman: "desc" },
          take: 1,
        },
      },
    });
    if (!allocation) return null;
    return formatCourierDetail(allocation, allocation.pengiriman[0]);
  }

  const shipment = await prisma.pengiriman.findFirst({
    where: { id_pengiriman: recordId, id_pengantar: courier.id_pengantar },
    select: {
      id_pengiriman: true,
      tanggal_kirim: true,
      status_pengiriman: true,
      penerimaan_produk: {
        select: {
          tanggal_terima: true,
          jumlah_diterima: true,
          kondisi_produksi: true,
          status_penerimaan: true,
        },
      },
      alokasi_produk: {
        select: {
          id_alokasi: true,
          tanggal_alokasi: true,
          jumlah_alokasi: true,
          produk: { select: { nama_produk: true } },
          varian_produk: { select: { nama_varian: true } },
          lokasi_penjualan: { select: { nama_lokasi: true } },
        },
      },
    },
  });
  if (!shipment) return null;
  return formatCourierDetail(shipment.alokasi_produk, shipment);
}

function formatCourierDetail(
  allocation: {
    id_alokasi: number;
    tanggal_alokasi: Date;
    jumlah_alokasi: number;
    produk: { nama_produk: string };
    varian_produk: { nama_varian: string };
    lokasi_penjualan: { nama_lokasi: string };
  },
  shipment: {
    id_pengiriman?: number;
    tanggal_kirim: Date;
    status_pengiriman: string;
    penerimaan_produk: {
      tanggal_terima: Date;
      jumlah_diterima: number;
      kondisi_produksi: string;
      status_penerimaan: string;
    } | null;
  } | null,
) {
  return {
    title: `Detail Pengiriman AL-${String(allocation.id_alokasi).padStart(3, "0")}`,
    details: [
      { label: "Kode alokasi", value: `AL-${String(allocation.id_alokasi).padStart(3, "0")}` },
      { label: "Tujuan", value: allocation.lokasi_penjualan.nama_lokasi },
      { label: "Produk", value: `${allocation.produk.nama_produk} ${allocation.varian_produk.nama_varian}` },
      { label: "Jumlah dialokasikan", value: `${allocation.jumlah_alokasi} pcs` },
      { label: "Tanggal alokasi", value: formatDate(allocation.tanggal_alokasi) },
      ...(shipment
        ? [
            ...(shipment.id_pengiriman
              ? [{
                  label: "ID pengiriman",
                  value: String(shipment.id_pengiriman),
                }]
              : []),
            { label: "Tanggal pengiriman", value: formatDate(shipment.tanggal_kirim) },
            { label: "Status", value: shipment.status_pengiriman },
            ...(shipment.penerimaan_produk
              ? [
                  { label: "Jumlah diterima", value: `${shipment.penerimaan_produk.jumlah_diterima} pcs` },
                  { label: "Tanggal penerimaan", value: formatDate(shipment.penerimaan_produk.tanggal_terima) },
                  { label: "Kondisi", value: shipment.penerimaan_produk.kondisi_produksi },
                  { label: "Status penerimaan", value: shipment.penerimaan_produk.status_penerimaan },
                ]
              : []),
          ]
        : [{ label: "Status", value: "Siap dikirim" }]),
    ],
    primaryAction: shipment?.penerimaan_produk
      ? undefined
      : {
          label: "Perbarui Status Pengiriman",
          href: `konfirmasi-pengiriman?id_alokasi=${allocation.id_alokasi}${shipment?.id_pengiriman ? `&id_pengiriman=${shipment.id_pengiriman}` : ""}`,
        },
  };
}

export async function getGuardShipmentDetail(username: string, shipmentId: number) {
  const guard = await prisma.penjaga_tempat.findUnique({
    where: { username },
    select: { id_penjaga_tempat: true },
  });
  if (!guard) return null;
  const shipment = await prisma.pengiriman.findFirst({
    where: {
      id_pengiriman: shipmentId,
      alokasi_produk: { produk: { id_penjaga_tempat: guard.id_penjaga_tempat } },
    },
    select: {
      id_pengiriman: true,
      tanggal_kirim: true,
      jumlah_dikirim: true,
      status_pengiriman: true,
      pengantar: { select: { nama_pengantar: true } },
      lokasi_penjualan: { select: { nama_lokasi: true } },
      alokasi_produk: {
        select: {
          produk: { select: { nama_produk: true } },
          varian_produk: { select: { nama_varian: true } },
        },
      },
      penerimaan_produk: {
        select: {
          tanggal_terima: true,
          jumlah_diterima: true,
          kondisi_produksi: true,
          status_penerimaan: true,
        },
      },
    },
  });
  if (!shipment) return null;
  return {
    title: `Detail Pengiriman AL-${String(shipment.id_pengiriman).padStart(3, "0")}`,
    details: [
      { label: "Kode pengiriman", value: `AL-${String(shipment.id_pengiriman).padStart(3, "0")}` },
      { label: "Pengantar", value: shipment.pengantar.nama_pengantar },
      { label: "Produk", value: `${shipment.alokasi_produk.produk.nama_produk} ${shipment.alokasi_produk.varian_produk.nama_varian}` },
      { label: "Jumlah dikirim", value: `${shipment.jumlah_dikirim} pcs` },
      { label: "Tanggal pengiriman", value: formatDate(shipment.tanggal_kirim) },
      { label: "Tujuan", value: shipment.lokasi_penjualan.nama_lokasi },
      { label: "Status", value: shipment.status_pengiriman },
      ...(shipment.penerimaan_produk
        ? [
            { label: "Jumlah diterima", value: `${shipment.penerimaan_produk.jumlah_diterima} pcs` },
            { label: "Tanggal penerimaan", value: formatDate(shipment.penerimaan_produk.tanggal_terima) },
            { label: "Kondisi", value: shipment.penerimaan_produk.kondisi_produksi },
            { label: "Status penerimaan", value: shipment.penerimaan_produk.status_penerimaan },
          ]
        : []),
    ],
    primaryAction: shipment.penerimaan_produk
      ? undefined
      : {
          label: "Konfirmasi Penerimaan",
          href: `konfirmasi-penerimaan?id_pengiriman=${shipment.id_pengiriman}`,
        },
  };
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
      detail_produk: {
        select: {
          id_varian: true,
          jumlah_rencana_varian_pcs: true,
        },
      },
      produksi: { select: { id_hasil: true } },
    },
  });
}

export function formatPlanId(id: number) {
  return `RP-${String(id).padStart(3, "0")}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
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
