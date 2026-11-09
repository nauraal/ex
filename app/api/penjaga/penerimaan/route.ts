import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../lib/prisma";

export async function GET() {
  const actor = await getGuard();
  if (actor instanceof NextResponse) return actor;
  try {
    const profile = await prisma.penjaga_tempat.findUnique({
      where: { username: actor.username },
      select: { id_penjaga_tempat: true },
    });
    if (!profile) return NextResponse.json({ message: "Profil penjaga tempat tidak ditemukan." }, { status: 409 });
    const shipments = await prisma.pengiriman.findMany({
      where: {
        penerimaan_produk: { is: null },
        alokasi_produk: { produk: { id_penjaga_tempat: profile.id_penjaga_tempat } },
      },
      select: {
        id_pengiriman: true,
        tanggal_kirim: true,
        jumlah_dikirim: true,
        status_pengiriman: true,
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
    return NextResponse.json({ shipments });
  } catch (error) {
    console.error("Incoming shipment query failed.", error);
    return NextResponse.json({ message: "Data penerimaan gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getGuard();
  if (actor instanceof NextResponse) return actor;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format penerimaan tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data penerimaan tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const shipmentId = parsePositiveInteger(values.id_pengiriman);
  const received = parsePositiveInteger(values.jumlah_diterima);
  const date = parseDate(values.tanggal_terima);
  const condition = readString(values.kondisi_produksi, 100);
  if (!shipmentId || !received || !date || !condition) {
    return NextResponse.json({ message: "Pengiriman, jumlah diterima, kondisi, dan tanggal wajib valid." }, { status: 400 });
  }

  try {
    const outcome = await withPrismaTransaction(async (transaction) => {
      const profile = await transaction.penjaga_tempat.findUnique({
        where: { username: actor.username },
        select: { id_penjaga_tempat: true },
      });
      if (!profile) return { kind: "profile_missing" as const };
      const shipment = await transaction.pengiriman.findUnique({
        where: { id_pengiriman: shipmentId },
        select: {
          id_pemilik: true,
          jumlah_dikirim: true,
          status_pengiriman: true,
          penerimaan_produk: { select: { id_penerimaan: true } },
          alokasi_produk: { select: { produk: { select: { id_penjaga_tempat: true } } } },
        },
      });
      if (!shipment || shipment.alokasi_produk.produk.id_penjaga_tempat !== profile.id_penjaga_tempat) {
        return { kind: "not_found" as const };
      }
      if (shipment.penerimaan_produk) return { kind: "already_received" as const };
      if (!["dalam_perjalanan", "terkirim"].includes(shipment.status_pengiriman)) {
        return { kind: "not_in_transit" as const };
      }
      if (received > shipment.jumlah_dikirim) return { kind: "quantity_mismatch" as const };
      const status = received === shipment.jumlah_dikirim ? "diterima" : "selisih";
      const receipt = await transaction.penerimaan_produk.create({
        data: {
          tanggal_terima: date,
          jumlah_diterima: received,
          kondisi_produksi: condition,
          status_penerimaan: status,
          id_penjaga_tempat: profile.id_penjaga_tempat,
          id_pengiriman: shipmentId,
          id_pemilik: shipment.id_pemilik,
        },
        select: { id_penerimaan: true },
      });
      await transaction.pengiriman.update({
        where: { id_pengiriman: shipmentId },
        data: { status_pengiriman: status },
      });
      return { kind: "saved" as const, id: receipt.id_penerimaan };
    });
    if (outcome.kind === "profile_missing") {
      return NextResponse.json({ message: "Profil penjaga tempat tidak ditemukan." }, { status: 409 });
    }
    if (outcome.kind === "not_found") {
      return NextResponse.json({ message: "Pengiriman tidak ditemukan untuk lokasi yang ditugaskan." }, { status: 404 });
    }
    if (outcome.kind === "already_received") {
      return NextResponse.json({ message: "Pengiriman ini sudah memiliki catatan penerimaan." }, { status: 409 });
    }
    if (outcome.kind === "not_in_transit") {
      return NextResponse.json({ message: "Pengiriman belum berstatus dalam perjalanan atau terkirim." }, { status: 409 });
    }
    if (outcome.kind === "quantity_mismatch") {
      return NextResponse.json({ message: "Jumlah diterima tidak boleh melebihi jumlah dikirim." }, { status: 400 });
    }
    return NextResponse.json({ id_penerimaan: outcome.id }, { status: 201 });
  } catch (error) {
    console.error("Shipment receipt creation failed.", error);
    return NextResponse.json({ message: "Penerimaan produk gagal disimpan." }, { status: 500 });
  }
}

async function getGuard() {
  try {
    const actor = await getAuthenticatedUser();
    if (!actor) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (actor.role !== "penjaga_tempat") return NextResponse.json({ message: "Akses hanya tersedia untuk penjaga tempat." }, { status: 403 });
    return actor;
  } catch (error) {
    console.error("Storekeeper authorization check failed.", error);
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

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}
