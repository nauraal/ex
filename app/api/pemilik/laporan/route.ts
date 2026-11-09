import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  try {
    const profile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!profile) {
      return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
    }
    const reports = await prisma.laporan.findMany({
      where: { id_pemilik: profile.id_pemilik },
      select: {
        id_laporan: true,
        tanggal_laporan: true,
        periode_awal: true,
        periode_akhir: true,
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
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Production report query failed.", error);
    return NextResponse.json({ message: "Laporan produksi gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format laporan tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data laporan tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const productionId = parsePositiveInteger(values.id_hasil);
  const start = parseDate(values.periode_awal);
  const end = parseDate(values.periode_akhir);
  const reportDate = parseDate(values.tanggal_laporan);
  const type = readString(values.jenis_laporan, 50);
  if (
    productionId === null ||
    !start ||
    !end ||
    !reportDate ||
    !type ||
    start > end
  ) {
    return NextResponse.json({ message: "Produksi, jenis, dan periode laporan tidak valid." }, { status: 400 });
  }
  try {
    const profile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!profile) {
      return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
    }
    const production = await prisma.produksi.findUnique({
      where: { id_hasil: productionId },
      select: { id_pemilik: true, tanggal_produksi: true },
    });
    if (!production || production.id_pemilik !== profile.id_pemilik) {
      return NextResponse.json({ message: "Hasil produksi tidak ditemukan." }, { status: 404 });
    }
    if (
      production.tanggal_produksi < start ||
      production.tanggal_produksi > end
    ) {
      return NextResponse.json({ message: "Periode laporan harus mencakup tanggal produksi." }, { status: 400 });
    }
    const report = await prisma.laporan.create({
      data: {
        tanggal_laporan: reportDate,
        periode_awal: start,
        periode_akhir: end,
        jenis_laporan: type,
        id_hasil: productionId,
        id_pemilik: profile.id_pemilik,
      },
      select: { id_laporan: true },
    });
    return NextResponse.json({ id_laporan: report.id_laporan }, { status: 201 });
  } catch (error) {
    console.error("Production report creation failed.", error);
    return NextResponse.json({ message: "Laporan produksi gagal disimpan." }, { status: 500 });
  }
}

async function getOwner() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (user.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
    return user;
  } catch (error) {
    console.error("Report authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi pemilik gagal." }, { status: 500 });
  }
}

function parsePositiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}
