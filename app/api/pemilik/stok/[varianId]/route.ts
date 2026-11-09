import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../../lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ varianId: string }> },
) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  const variantId = Number((await params).varianId);
  if (!Number.isSafeInteger(variantId) || variantId < 1) {
    return NextResponse.json({ message: "ID varian tidak valid." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format perubahan stok tidak valid." }, { status: 400 });
  }
  const delta =
    typeof body === "object" && body !== null && "jumlah_perubahan" in body
      ? parseInteger(body.jumlah_perubahan)
      : null;
  if (delta === null || delta === 0) {
    return NextResponse.json({ message: "Perubahan stok harus berupa bilangan bulat bukan nol." }, { status: 400 });
  }

  try {
    const ownerProfile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    const variant = await prisma.varian_produk.findUnique({
      where: { id_varian: variantId },
      select: { produk: { select: { id_pemilik: true } } },
    });
    if (!ownerProfile || !variant || variant.produk.id_pemilik !== ownerProfile.id_pemilik) {
      return NextResponse.json({ message: "Varian produk tidak ditemukan." }, { status: 404 });
    }

    const result = await withPrismaTransaction(async (transaction) => {
      const current = await transaction.stok_produk.findUnique({
        where: { id_varian: variantId },
        select: { jumlah_stok: true },
      });
      if (!current) {
        if (delta < 0) return { kind: "insufficient" as const };
        const created = await transaction.stok_produk.create({
          data: { id_varian: variantId, jumlah_stok: delta },
          select: { jumlah_stok: true },
        });
        return { kind: "updated" as const, stock: created.jumlah_stok };
      }

      const updated = await transaction.stok_produk.updateMany({
        where: {
          id_varian: variantId,
          jumlah_stok: delta < 0 ? { gte: -delta } : { gte: 0 },
        },
        data: { jumlah_stok: { increment: delta } },
      });
      if (!updated.count) return { kind: "insufficient" as const };
      const stock = await transaction.stok_produk.findUniqueOrThrow({
        where: { id_varian: variantId },
        select: { jumlah_stok: true },
      });
      return { kind: "updated" as const, stock: stock.jumlah_stok };
    });
    if (result.kind === "insufficient") {
      return NextResponse.json({ message: "Stok tidak cukup untuk pengurangan tersebut." }, { status: 409 });
    }
    return NextResponse.json({ jumlah_stok: result.stock });
  } catch (error) {
    console.error("Product stock adjustment failed.", error);
    return NextResponse.json({ message: "Stok produk gagal diperbarui." }, { status: 500 });
  }
}

async function getOwner() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (user.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
    return user;
  } catch (error) {
    console.error("Product stock authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi pemilik gagal." }, { status: 500 });
  }
}

function parseInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && Math.abs(number) <= 2_147_483_647
    ? number
    : null;
}
