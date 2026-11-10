import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { withPrismaTransaction } from "../../../../../lib/prisma";

type ProductUpdate = {
  nama_produk: string;
  nama_varian: string;
  harga: string;
  satuan: string;
  deskripsi: string | null;
  ingredients_donut: string | null;
  ingredients_topping: string | null;
  gambar_url: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ varianId: string }> },
) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  const id = parseId((await params).varianId);
  if (id === null) {
    return NextResponse.json({ message: "ID varian tidak valid." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format data produk tidak valid." }, { status: 400 });
  }
  const input = parseProductUpdate(body);
  if (!input) {
    return NextResponse.json({ message: "Data produk atau varian tidak valid." }, { status: 400 });
  }

  try {
    const updated = await withPrismaTransaction(async (transaction) => {
      const ownerProfile = await transaction.pemilik.findUnique({
        where: { username: owner.username },
        select: { id_pemilik: true },
      });
      if (!ownerProfile) return null;

      const variant = await transaction.varian_produk.findUnique({
        where: { id_varian: id },
        select: {
          id_produk: true,
          produk: { select: { id_pemilik: true } },
        },
      });
      if (!variant || variant.produk.id_pemilik !== ownerProfile.id_pemilik) {
        return null;
      }

      await transaction.produk.update({
        where: { id_produk: variant.id_produk },
        data: {
          nama_produk: input.nama_produk,
          satuan: input.satuan,
        },
      });
      return transaction.varian_produk.update({
        where: { id_varian: id },
        data: {
          nama_varian: input.nama_varian,
          harga: input.harga,
          deskripsi: input.deskripsi,
          ingredients_donut: input.ingredients_donut,
          ingredients_topping: input.ingredients_topping,
          gambar_url: input.gambar_url,
        },
        select: { id_varian: true },
      });
    });

    if (!updated) {
      return NextResponse.json({ message: "Varian produk tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ message: "Produk berhasil diperbarui." });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return NextResponse.json({ message: "Nama varian tersebut sudah digunakan." }, { status: 409 });
    }
    console.error("Product update failed.", error);
    return NextResponse.json({ message: "Produk gagal diperbarui." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ varianId: string }> },
) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  const id = parseId((await params).varianId);
  if (id === null) {
    return NextResponse.json({ message: "ID varian tidak valid." }, { status: 400 });
  }

  try {
    const result = await withPrismaTransaction(async (transaction) => {
      const ownerProfile = await transaction.pemilik.findUnique({
        where: { username: owner.username },
        select: { id_pemilik: true },
      });
      if (!ownerProfile) return "not_found" as const;

      const variant = await transaction.varian_produk.findUnique({
        where: { id_varian: id },
        select: {
          id_produk: true,
          produk: { select: { id_pemilik: true } },
        },
      });
      if (!variant || variant.produk.id_pemilik !== ownerProfile.id_pemilik) {
        return "not_found" as const;
      }

      const stock = await transaction.stok_produk.findUnique({
        where: { id_varian: id },
        select: { jumlah_stok: true },
      });
      if (stock && stock.jumlah_stok > 0) return "has_stock" as const;
      if (stock) {
        await transaction.stok_produk.delete({ where: { id_varian: id } });
      }

      await transaction.varian_produk.delete({ where: { id_varian: id } });
      const remainingVariants = await transaction.varian_produk.count({
        where: { id_produk: variant.id_produk },
      });
      if (remainingVariants === 0) {
        await transaction.produk.delete({ where: { id_produk: variant.id_produk } });
      }
      return "deleted" as const;
    });

    if (result === "not_found") {
      return NextResponse.json({ message: "Varian produk tidak ditemukan." }, { status: 404 });
    }
    if (result === "has_stock") {
      return NextResponse.json({ message: "Varian dengan stok tersedia tidak dapat dihapus." }, { status: 409 });
    }
    return NextResponse.json({ message: "Varian produk berhasil dihapus." });
  } catch (error) {
    if (hasPrismaCode(error, "P2003")) {
      return NextResponse.json(
        { message: "Varian sudah dipakai dalam produksi, alokasi, atau riwayat lain dan tidak dapat dihapus." },
        { status: 409 },
      );
    }
    console.error("Product deletion failed.", error);
    return NextResponse.json({ message: "Varian produk gagal dihapus." }, { status: 500 });
  }
}

async function getOwner() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    }
    if (user.role !== "pemilik") {
      return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
    }
    return user;
  } catch (error) {
    console.error("Product authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi pemilik gagal." }, { status: 500 });
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseProductUpdate(value: unknown): ProductUpdate | null {
  if (typeof value !== "object" || value === null) return null;
  const body = value as Record<string, unknown>;
  const nama_produk = readString(body.nama_produk, 100);
  const nama_varian = readString(body.nama_varian, 50);
  const harga =
    typeof body.harga === "string" && /^[1-9]\d{0,18}$/.test(body.harga)
      ? body.harga
      : null;
  const satuan = readString(body.satuan, 20);
  const deskripsi = readOptionalString(body.deskripsi, 5000);
  const ingredients_donut = readOptionalString(body.ingredients_donut, 5000);
  const ingredients_topping = readOptionalString(body.ingredients_topping, 5000);
  const gambar_url = readOptionalString(body.gambar_url, 500);
  if (
    !nama_produk ||
    !nama_varian ||
    !harga ||
    !satuan ||
    deskripsi === undefined ||
    ingredients_donut === undefined ||
    ingredients_topping === undefined ||
    gambar_url === undefined
  ) {
    return null;
  }
  if (
    gambar_url &&
    !gambar_url.startsWith("/") &&
    !isHttpUrl(gambar_url)
  ) {
    return null;
  }
  return {
    nama_produk,
    nama_varian,
    harga,
    satuan,
    deskripsi,
    ingredients_donut,
    ingredients_topping,
    gambar_url,
  };
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function readOptionalString(value: unknown, maxLength: number) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maxLength ? text || null : undefined;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
