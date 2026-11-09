import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../lib/prisma";

export async function GET() {
  const actor = await getCourier();
  if (actor instanceof NextResponse) return actor;
  try {
    const profile = await prisma.pengantar.findUnique({
      where: { username: actor.username },
      select: { id_pengantar: true },
    });
    if (!profile) return NextResponse.json({ message: "Profil pengantar tidak ditemukan." }, { status: 409 });
    const shipments = await prisma.pengiriman.findMany({
      where: { id_pengantar: profile.id_pengantar },
      select: {
        id_pengiriman: true,
        tanggal_kirim: true,
        jumlah_dikirim: true,
        status_pengiriman: true,
        lokasi_penjualan: { select: { nama_lokasi: true } },
        alokasi_produk: {
          select: {
            id_alokasi: true,
            produk: { select: { nama_produk: true } },
            varian_produk: { select: { nama_varian: true } },
          },
        },
      },
      orderBy: [{ tanggal_kirim: "desc" }, { id_pengiriman: "desc" }],
    });
    return NextResponse.json({ shipments });
  } catch (error) {
    console.error("Courier shipment query failed.", error);
    return NextResponse.json({ message: "Data pengiriman gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getCourier();
  if (actor instanceof NextResponse) return actor;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format status pengiriman tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data pengiriman tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const allocationId = parsePositiveInteger(values.id_alokasi);
  const date = parseDate(values.tanggal_kirim);
  const status = values.status_pengiriman;
  if (
    allocationId === null ||
    !date ||
    (status !== "dalam_perjalanan" && status !== "terkirim")
  ) {
    return NextResponse.json({ message: "Alokasi, tanggal, atau status pengiriman tidak valid." }, { status: 400 });
  }

  try {
    const outcome = await withPrismaTransaction(async (transaction) => {
      const profile = await transaction.pengantar.findUnique({
        where: { username: actor.username },
        select: { id_pengantar: true },
      });
      if (!profile) return { kind: "profile_missing" as const };
      const allocation = await transaction.alokasi_produk.findFirst({
        where: { id_alokasi: allocationId, id_pengantar: profile.id_pengantar },
        select: {
          id_pemilik: true,
          id_lokasi: true,
          jumlah_alokasi: true,
          pengiriman: {
            select: { id_pengiriman: true, penerimaan_produk: { select: { id_penerimaan: true } } },
            orderBy: { id_pengiriman: "desc" },
            take: 1,
          },
        },
      });
      if (!allocation) return { kind: "not_found" as const };
      const current = allocation.pengiriman[0];
      if (current?.penerimaan_produk) return { kind: "already_received" as const };

      const shipment = current
        ? await transaction.pengiriman.update({
            where: { id_pengiriman: current.id_pengiriman },
            data: { tanggal_kirim: date, status_pengiriman: status },
            select: { id_pengiriman: true },
          })
        : await transaction.pengiriman.create({
            data: {
              tanggal_kirim: date,
              jumlah_dikirim: allocation.jumlah_alokasi,
              status_pengiriman: status,
              id_pengantar: profile.id_pengantar,
              id_pemilik: allocation.id_pemilik,
              id_alokasi: allocationId,
              id_lokasi: allocation.id_lokasi,
            },
            select: { id_pengiriman: true },
          });
      return { kind: "saved" as const, id: shipment.id_pengiriman };
    });
    if (outcome.kind === "profile_missing") {
      return NextResponse.json({ message: "Profil pengantar tidak ditemukan." }, { status: 409 });
    }
    if (outcome.kind === "not_found") {
      return NextResponse.json({ message: "Alokasi tidak ditemukan untuk akun ini." }, { status: 404 });
    }
    if (outcome.kind === "already_received") {
      return NextResponse.json({ message: "Pengiriman ini telah diterima dan tidak dapat diubah." }, { status: 409 });
    }
    return NextResponse.json({ id_pengiriman: outcome.id }, { status: 200 });
  } catch (error) {
    console.error("Courier shipment update failed.", error);
    return NextResponse.json({ message: "Status pengiriman gagal disimpan." }, { status: 500 });
  }
}

async function getCourier() {
  try {
    const actor = await getAuthenticatedUser();
    if (!actor) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (actor.role !== "pengantar") return NextResponse.json({ message: "Akses hanya tersedia untuk pengantar." }, { status: 403 });
    return actor;
  } catch (error) {
    console.error("Courier authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi gagal." }, { status: 500 });
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
