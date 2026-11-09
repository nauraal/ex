import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  try {
    const [materials, requirements] = await Promise.all([
      prisma.bahan_baku.findMany({
        select: {
          id_bahan: true,
          nama_bahan: true,
          satuan: true,
          stok_bahan: { select: { jumlah_stok: true, diperbarui_pada: true } },
        },
        orderBy: { nama_bahan: "asc" },
      }),
      prisma.persediaan_bahan.findMany({
        select: {
          id_persediaan: true,
          id_bahan: true,
          id_jadwal: true,
          id_varian: true,
          jumlah_pemakaian_bahan: true,
        },
        orderBy: { id_persediaan: "desc" },
      }),
    ]);
    return NextResponse.json({ materials, requirements });
  } catch (error) {
    console.error("Ingredient data query failed.", error);
    return NextResponse.json({ message: "Data bahan baku gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format data bahan baku tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data bahan baku tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;

  if (values.kind === "material") {
    const nama = readString(values.nama_bahan, 50);
    const satuan = readString(values.satuan, 20);
    const variantId = parsePositiveInteger(values.id_varian);
    if (!nama || !satuan || variantId === null) {
      return NextResponse.json({ message: "Nama bahan, satuan, dan produk acuan wajib valid." }, { status: 400 });
    }
    try {
      const ownerProfile = await prisma.pemilik.findUnique({
        where: { username: owner.username },
        select: { id_pemilik: true },
      });
      if (!ownerProfile) {
        return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
      }
      const variant = await prisma.varian_produk.findUnique({
        where: { id_varian: variantId },
        select: {
          produk: { select: { id_pemilik: true, id_pembuat_donut: true } },
        },
      });
      if (!variant || variant.produk.id_pemilik !== ownerProfile.id_pemilik) {
        return NextResponse.json({ message: "Produk acuan tidak ditemukan untuk pemilik ini." }, { status: 404 });
      }
      const material = await prisma.bahan_baku.create({
        data: {
          nama_bahan: nama,
          satuan,
          id_pemilik: ownerProfile.id_pemilik,
          id_pembuat_donut: variant.produk.id_pembuat_donut,
        },
        select: { id_bahan: true },
      });
      return NextResponse.json({ id_bahan: material.id_bahan }, { status: 201 });
    } catch (error) {
      if (hasPrismaCode(error, "P2002")) {
        return NextResponse.json({ message: "Nama bahan baku sudah terdaftar." }, { status: 409 });
      }
      console.error("Ingredient creation failed.", error);
      return NextResponse.json({ message: "Bahan baku gagal disimpan." }, { status: 500 });
    }
  }

  const materialId = parsePositiveInteger(values.id_bahan);
  const planId = parsePositiveInteger(values.id_rencana);
  const variantId = parsePositiveInteger(values.id_varian);
  const quantity = parseDecimal(values.jumlah_kebutuhan);
  if (materialId === null || planId === null || variantId === null || quantity === null) {
    return NextResponse.json({ message: "Bahan, rencana, varian, dan jumlah kebutuhan wajib valid." }, { status: 400 });
  }
  try {
    const [plan, material] = await Promise.all([
      prisma.rencana_produksi.findUnique({
        where: { id_rencana: planId },
        select: { id_varian: true, id_pemilik: true, id_pembuat_donut: true },
      }),
      prisma.bahan_baku.findUnique({
        where: { id_bahan: materialId },
        select: { id_pemilik: true, id_pembuat_donut: true },
      }),
    ]);
    const ownerProfile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!plan || !material || !ownerProfile || plan.id_varian !== variantId) {
      return NextResponse.json({ message: "Kombinasi bahan, rencana, dan varian tidak sesuai." }, { status: 400 });
    }
    if (
      plan.id_pemilik !== ownerProfile.id_pemilik ||
      material.id_pemilik !== plan.id_pemilik ||
      material.id_pembuat_donut !== plan.id_pembuat_donut
    ) {
      return NextResponse.json({ message: "Bahan baku bukan milik rencana produksi ini." }, { status: 403 });
    }

    const requirement = await prisma.persediaan_bahan.create({
      data: {
        id_bahan: materialId,
        id_jadwal: planId,
        id_varian: variantId,
        jumlah_pemakaian_bahan: quantity,
      },
      select: { id_persediaan: true },
    });
    return NextResponse.json({ id_persediaan: requirement.id_persediaan }, { status: 201 });
  } catch (error) {
    console.error("Ingredient requirement creation failed.", error);
    return NextResponse.json({ message: "Kebutuhan bahan gagal disimpan." }, { status: 500 });
  }
}

async function getOwner() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (user.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
    return user;
  } catch (error) {
    console.error("Ingredient authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi pemilik gagal." }, { status: 500 });
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function parsePositiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseDecimal(value: unknown) {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/.test(value)) return null;
  return Number(value) > 0 ? value : null;
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
