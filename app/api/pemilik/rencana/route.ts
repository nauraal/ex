import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  try {
    const plans = await prisma.rencana_produksi.findMany({
      select: {
        id_rencana: true,
        tanggal_produksi: true,
        jumlah_rencana: true,
        status_rencana: true,
        catatan: true,
        produk: { select: { nama_produk: true } },
        varian_produk: { select: { nama_varian: true } },
      },
      orderBy: [{ tanggal_produksi: "desc" }, { id_rencana: "desc" }],
    });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Production plan query failed.", error);
    return NextResponse.json({ message: "Rencana produksi gagal dimuat." }, { status: 500 });
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
    return NextResponse.json({ message: "Format rencana produksi tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data rencana produksi tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const variantId = parsePositiveInteger(values.id_varian);
  const quantity = parsePositiveInteger(values.jumlah_rencana);
  const date = parseDate(values.tanggal_produksi);
  const catatan = readOptionalString(values.catatan, 5000);
  if (variantId === null || quantity === null || !date || catatan === undefined) {
    return NextResponse.json({ message: "Varian, tanggal, jumlah, atau catatan rencana tidak valid." }, { status: 400 });
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
        id_varian: true,
        id_produk: true,
        produk: { select: { id_pemilik: true, id_pembuat_donut: true } },
      },
    });
    if (!variant || variant.produk.id_pemilik !== ownerProfile.id_pemilik) {
      return NextResponse.json({ message: "Varian produk tidak ditemukan untuk pemilik ini." }, { status: 404 });
    }

    const plan = await prisma.rencana_produksi.create({
      data: {
        tanggal_produksi: date,
        jumlah_rencana: quantity,
        catatan,
        id_produk: variant.id_produk,
        id_varian: variant.id_varian,
        id_pemilik: ownerProfile.id_pemilik,
        id_pembuat_donut: variant.produk.id_pembuat_donut,
      },
      select: { id_rencana: true },
    });
    return NextResponse.json({ id_rencana: plan.id_rencana }, { status: 201 });
  } catch (error) {
    console.error("Production plan creation failed.", error);
    return NextResponse.json({ message: "Rencana produksi gagal disimpan." }, { status: 500 });
  }
}

async function getOwner() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (user.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
    return user;
  } catch (error) {
    console.error("Production plan authorization check failed.", error);
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

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function readOptionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maxLength ? text || null : undefined;
}
