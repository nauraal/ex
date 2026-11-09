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

export async function getProductVariantRows() {
  const variants = await prisma.varian_produk.findMany({
    select: {
      id_varian: true,
      nama_varian: true,
      produk: {
        select: {
          nama_produk: true,
          harga: true,
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
      formatRupiah(variant.produk.harga.toFixed(0)),
      "—",
    ],
    href: `produk/${variant.id_varian}`,
    actions: [
      { label: "Lihat", href: `produk/${variant.id_varian}` },
    ],
  }));
}

export async function getProductVariantDetail(id: number) {
  return prisma.varian_produk.findUnique({
    where: { id_varian: id },
    select: {
      id_varian: true,
      nama_varian: true,
      deskripsi: true,
      ingredients_donut: true,
      ingredients_topping: true,
      gambar_url: true,
      produk: {
        select: {
          nama_produk: true,
          harga: true,
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
