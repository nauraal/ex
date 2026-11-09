import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../../lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ message: "ID rencana tidak valid." }, { status: 400 });
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
  const quantity = parsePositiveInteger(values.jumlah_rencana);
  const date = parseDate(values.tanggal_produksi);
  const catatan = readOptionalString(values.catatan, 5000);
  if (quantity === null || !date || catatan === undefined) {
    return NextResponse.json({ message: "Tanggal, jumlah, atau catatan rencana tidak valid." }, { status: 400 });
  }
  try {
    const profile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!profile) {
      return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
    }
    const updated = await prisma.rencana_produksi.updateMany({
      where: {
        id_rencana: id,
        id_pemilik: profile.id_pemilik,
        produksi: { is: null },
      },
      data: {
        tanggal_produksi: date,
        jumlah_rencana: quantity,
        catatan,
      },
    });
    if (updated.count === 0) {
      return NextResponse.json({ message: "Rencana tidak ditemukan atau sudah memiliki hasil produksi." }, { status: 404 });
    }
    return NextResponse.json({ message: "Rencana produksi berhasil diperbarui." });
  } catch (error) {
    console.error("Production plan update failed.", error);
    return NextResponse.json({ message: "Rencana produksi gagal diperbarui." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ message: "ID rencana tidak valid." }, { status: 400 });
  }
  try {
    const profile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!profile) {
      return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
    }
    const [requirements, deleted] = await withPrismaTransaction(async (transaction) => {
      const requirements = await transaction.persediaan_bahan.count({
        where: { id_jadwal: id },
      });
      if (requirements > 0) return [requirements, 0] as const;
      const deleted = await transaction.rencana_produksi.deleteMany({
        where: {
          id_rencana: id,
          id_pemilik: profile.id_pemilik,
          produksi: { is: null },
        },
      });
      return [requirements, deleted.count] as const;
    });
    if (requirements > 0) {
      return NextResponse.json({ message: "Rencana dengan catatan kebutuhan bahan tidak dapat dihapus." }, { status: 409 });
    }
    if (deleted === 0) {
      return NextResponse.json({ message: "Rencana tidak ditemukan atau sudah memiliki hasil produksi." }, { status: 404 });
    }
    return NextResponse.json({ message: "Rencana produksi berhasil dihapus." });
  } catch (error) {
    console.error("Production plan deletion failed.", error);
    return NextResponse.json({ message: "Rencana produksi gagal dihapus." }, { status: 500 });
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

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
