import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../lib/prisma";

export async function GET() {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  try {
    const allocations = await prisma.alokasi_produk.findMany({
      select: {
        id_alokasi: true,
        tanggal_alokasi: true,
        jumlah_alokasi: true,
        stok_tersedia: true,
        lokasi_penjualan: { select: { nama_lokasi: true } },
        produk: { select: { nama_produk: true } },
        varian_produk: { select: { nama_varian: true } },
      },
      orderBy: [{ tanggal_alokasi: "desc" }, { id_alokasi: "desc" }],
    });
    return NextResponse.json({ allocations });
  } catch (error) {
    console.error("Product allocation query failed.", error);
    return NextResponse.json({ message: "Alokasi produk gagal dimuat." }, { status: 500 });
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
    return NextResponse.json({ message: "Format alokasi tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data alokasi tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const planId = parsePositiveInteger(values.id_rencana);
  const locationId = parsePositiveInteger(values.id_lokasi);
  const courierUserId = parsePositiveInteger(values.id_pengantar_user);
  const quantity = parsePositiveInteger(values.jumlah_alokasi);
  const date = parseDate(values.tanggal_alokasi);
  if (planId === null || locationId === null || courierUserId === null || quantity === null || !date) {
    return NextResponse.json({ message: "Rencana, lokasi, pengantar, jumlah, atau tanggal alokasi tidak valid." }, { status: 400 });
  }

  try {
    const ownerProfile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!ownerProfile) {
      return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
    }
    const courierUser = await prisma.users.findUnique({
      where: { id_user: courierUserId },
      select: { username: true, role: true, status_registrasi: true },
    });
    if (!courierUser || courierUser.role !== "pengantar" || courierUser.status_registrasi !== "aktif") {
      return NextResponse.json({ message: "Akun pengantar aktif tidak ditemukan." }, { status: 400 });
    }
    const courierProfile = await prisma.pengantar.findUnique({
      where: { username: courierUser.username },
      select: { id_pengantar: true },
    });
    if (!courierProfile) {
      return NextResponse.json({ message: "Profil operasional pengantar belum tersedia." }, { status: 409 });
    }

    const result = await withPrismaTransaction(async (transaction) => {
      const plan = await transaction.rencana_produksi.findUnique({
        where: { id_rencana: planId },
        select: {
          id_pemilik: true,
          id_produk: true,
          id_varian: true,
          id_pembuat_donut: true,
          produksi: { select: { id_hasil: true } },
          produk: { select: { id_pengantar: true } },
        },
      });
      if (!plan || plan.id_pemilik !== ownerProfile.id_pemilik || !plan.produksi) {
        return { kind: "plan_unavailable" as const };
      }
      if (plan.produk.id_pengantar !== courierProfile.id_pengantar) {
        return { kind: "courier_mismatch" as const };
      }
      const stockUpdate = await transaction.stok_produk.updateMany({
        where: { id_varian: plan.id_varian, jumlah_stok: { gte: quantity } },
        data: { jumlah_stok: { decrement: quantity } },
      });
      if (!stockUpdate.count) return { kind: "insufficient_stock" as const };
      const stock = await transaction.stok_produk.findUniqueOrThrow({
        where: { id_varian: plan.id_varian },
        select: { jumlah_stok: true },
      });
      const allocation = await transaction.alokasi_produk.create({
        data: {
          tanggal_alokasi: date,
          jumlah_alokasi: quantity,
          stok_tersedia: stock.jumlah_stok,
          id_pemilik: ownerProfile.id_pemilik,
          id_hasil: plan.produksi.id_hasil,
          id_pembuat_donut: plan.id_pembuat_donut,
          id_pengantar: courierProfile.id_pengantar,
          id_produk: plan.id_produk,
          id_lokasi: locationId,
          id_varian: plan.id_varian,
        },
        select: { id_alokasi: true },
      });
      return { kind: "created" as const, id: allocation.id_alokasi };
    });
    if (result.kind === "plan_unavailable") {
      return NextResponse.json({ message: "Rencana belum memiliki hasil produksi atau bukan milik pemilik ini." }, { status: 409 });
    }
    if (result.kind === "courier_mismatch") {
      return NextResponse.json({ message: "Pengantar tidak sesuai dengan penugasan produk." }, { status: 400 });
    }
    if (result.kind === "insufficient_stock") {
      return NextResponse.json({ message: "Stok produk tidak mencukupi." }, { status: 409 });
    }
    return NextResponse.json({ id_alokasi: result.id }, { status: 201 });
  } catch (error) {
    console.error("Product allocation creation failed.", error);
    return NextResponse.json({ message: "Alokasi produk gagal disimpan." }, { status: 500 });
  }
}

async function getOwner() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (user.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
    return user;
  } catch (error) {
    console.error("Allocation authorization check failed.", error);
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
