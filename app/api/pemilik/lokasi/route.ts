import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const owner = await getOwner();
  if (owner instanceof NextResponse) return owner;
  try {
    const locations = await prisma.lokasi_penjualan.findMany({
      select: { id_lokasi: true, nama_lokasi: true, alamat_lokasi: true },
      orderBy: { nama_lokasi: "asc" },
    });
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Sales location query failed.", error);
    return NextResponse.json({ message: "Lokasi penjualan gagal dimuat." }, { status: 500 });
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
    return NextResponse.json({ message: "Format lokasi tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data lokasi tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const name = readString(values.nama_lokasi, 255);
  const address = readString(values.alamat_lokasi, 255);
  if (!name || !address) {
    return NextResponse.json({ message: "Nama dan alamat lokasi wajib diisi." }, { status: 400 });
  }
  try {
    const location = await prisma.lokasi_penjualan.create({
      data: { nama_lokasi: name, alamat_lokasi: address },
      select: { id_lokasi: true },
    });
    return NextResponse.json({ id_lokasi: location.id_lokasi }, { status: 201 });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return NextResponse.json({ message: "Nama lokasi sudah digunakan." }, { status: 409 });
    }
    console.error("Sales location creation failed.", error);
    return NextResponse.json({ message: "Lokasi gagal disimpan." }, { status: 500 });
  }
}

async function getOwner() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  if (user.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
  return user;
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
