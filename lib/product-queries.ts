import "server-only";

import { prisma } from "./prisma";

export type ProductAssigneeOption = {
  id_user: number;
  nama: string;
};

export type ProductFormOptions = {
  pembuatDonut: ProductAssigneeOption[];
  pengantar: ProductAssigneeOption[];
  penjagaTempat: ProductAssigneeOption[];
};

export async function getRegistrationRows() {
  const users = await prisma.users.findMany({
    where: {
      status_registrasi: "menunggu_verifikasi",
      role: { in: ["pembuat_donut", "pengantar", "penjaga_tempat"] },
    },
    select: {
      id_user: true,
      nama: true,
      username: true,
      role: true,
      status_registrasi: true,
    },
    orderBy: { id_user: "asc" },
  });

  return users.map((user, index) => ({
    values: [
      String(index + 1),
      user.nama,
      user.username,
      formatRole(user.role),
      formatRegistrationStatus(user.status_registrasi),
    ],
    href: "",
    actions: [
      {
        label: "Setujui",
        href: "",
        registrationDecision: "aktif" as const,
        userId: user.id_user,
      },
      {
        label: "Tolak",
        href: "",
        registrationDecision: "ditolak" as const,
        userId: user.id_user,
      },
    ],
  }));
}

export async function getAccountRows() {
  const users = await prisma.users.findMany({
    select: {
      id_user: true,
      nama: true,
      username: true,
      role: true,
      status_registrasi: true,
    },
    orderBy: { id_user: "asc" },
  });

  return users.map((user, index) => ({
    values: [
      String(index + 1),
      user.nama,
      user.username,
      formatRole(user.role),
      formatRegistrationStatus(user.status_registrasi),
    ],
    href: "",
    actions:
      user.role === "pemilik"
        ? []
        : [
            {
              label: "Kelola",
              href: "",
              accountId: user.id_user,
              accountName: user.nama,
              accountUsername: user.username,
              accountStatus: user.status_registrasi,
            },
          ],
  }));
}

export async function getRegistrationHistoryRows() {
  const history = await prisma.riwayat_registrasi.findMany({
    select: {
      status_registrasi: true,
      waktu_perubahan: true,
      pengguna: {
        select: {
          nama: true,
          username: true,
          role: true,
        },
      },
      pemroses: {
        select: { nama: true },
      },
    },
    orderBy: { waktu_perubahan: "desc" },
  });

  return history.map((entry, index) => ({
    values: [
      String(index + 1),
      entry.pengguna?.nama ?? "Pengguna tidak tersedia",
      entry.pengguna?.username ?? "—",
      entry.pengguna ? formatRole(entry.pengguna.role) : "—",
      formatRegistrationStatus(entry.status_registrasi),
      entry.waktu_perubahan.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }),
      entry.pemroses?.nama ?? "Pendaftar",
    ],
    href: "",
    actionLabel: "—",
  }));
}

export async function getProductFormOptions(): Promise<ProductFormOptions> {
  const users = await prisma.users.findMany({
    where: {
      status_registrasi: "aktif",
      role: { in: ["pembuat_donut", "pengantar", "penjaga_tempat"] },
    },
    select: {
      id_user: true,
      nama: true,
      role: true,
    },
    orderBy: { nama: "asc" },
  });

  return {
    pembuatDonut: users
      .filter((user) => user.role === "pembuat_donut")
      .map(({ id_user, nama }) => ({ id_user, nama })),
    pengantar: users
      .filter((user) => user.role === "pengantar")
      .map(({ id_user, nama }) => ({ id_user, nama })),
    penjagaTempat: users
      .filter((user) => user.role === "penjaga_tempat")
      .map(({ id_user, nama }) => ({ id_user, nama })),
  };
}

export async function getProductVariantRows(ownerUsername: string) {
  const owner = await prisma.pemilik.findUnique({
    where: { username: ownerUsername },
    select: { id_pemilik: true },
  });
  if (!owner) return [];

  const variants = await prisma.varian_produk.findMany({
    where: { produk: { id_pemilik: owner.id_pemilik } },
    select: {
      id_varian: true,
      nama_varian: true,
      harga: true,
      produk: {
        select: {
          nama_produk: true,
          satuan: true,
        },
      },
    },
    orderBy: [{ produk: { nama_produk: "asc" } }, { nama_varian: "asc" }],
  });

  return variants.map((variant, index) => ({
    values: [
      String(index + 1),
      variant.produk.nama_produk,
      variant.nama_varian,
      formatRupiah(variant.harga.toFixed(0)),
      "—",
    ],
    href: `produk/${variant.id_varian}`,
    actions: [
      { label: "Lihat", href: `produk/${variant.id_varian}` },
    ],
  }));
}

export async function getProductVariantDetail(id: number, ownerUsername: string) {
  const owner = await prisma.pemilik.findUnique({
    where: { username: ownerUsername },
    select: { id_pemilik: true },
  });
  if (!owner) return null;

  return prisma.varian_produk.findFirst({
    where: {
      id_varian: id,
      produk: { id_pemilik: owner.id_pemilik },
    },
    select: {
      id_varian: true,
      nama_varian: true,
      harga: true,
      deskripsi: true,
      ingredients_donut: true,
      ingredients_topping: true,
      gambar_url: true,
      produk: {
        select: {
          nama_produk: true,
          satuan: true,
        },
      },
    },
  });
}

export function formatRupiah(value: string) {
  const amount = BigInt(value);
  const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${formatted}`;
}

function formatRole(role: string) {
  switch (role) {
    case "pembuat_donut":
      return "Pembuat Donut";
    case "pengantar":
      return "Pengantar";
    case "penjaga_tempat":
      return "Penjaga Tempat";
    default:
      return role;
  }
}

function formatRegistrationStatus(status: string) {
  switch (status) {
    case "menunggu_verifikasi":
      return "Menunggu";
    case "aktif":
      return "Disetujui";
    case "ditolak":
      return "Ditolak";
    default:
      return status;
  }
}
