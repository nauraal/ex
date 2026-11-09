import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let owner;
  try {
    owner = await getAuthenticatedUser();
  } catch (error) {
    console.error("Material stock authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi gagal." }, { status: 500 });
  }
  if (!owner) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  if (owner.role !== "pemilik") return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ message: "ID bahan baku tidak valid." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format stok bahan tidak valid." }, { status: 400 });
  }
  const rawQuantity =
    typeof body === "object" && body !== null && "jumlah_stok" in body
      ? body.jumlah_stok
      : undefined;
  if (
    typeof rawQuantity !== "string" ||
    !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/.test(rawQuantity)
  ) {
    return NextResponse.json({ message: "Jumlah stok harus berupa angka non-negatif dengan maksimal tiga desimal." }, { status: 400 });
  }
  try {
    const profile = await prisma.pemilik.findUnique({
      where: { username: owner.username },
      select: { id_pemilik: true },
    });
    if (!profile) {
      return NextResponse.json({ message: "Profil operasional pemilik belum tersedia." }, { status: 409 });
    }
    const material = await prisma.bahan_baku.findUnique({
      where: { id_bahan: id },
      select: { id_pemilik: true },
    });
    if (!material || material.id_pemilik !== profile.id_pemilik) {
      return NextResponse.json({ message: "Bahan baku tidak ditemukan." }, { status: 404 });
    }
    await prisma.stok_bahan.upsert({
      where: { id_bahan: id },
      create: { id_bahan: id, jumlah_stok: rawQuantity },
      update: { jumlah_stok: rawQuantity },
    });
    return NextResponse.json({ message: "Stok bahan berhasil diperbarui." });
  } catch (error) {
    console.error("Material stock update failed.", error);
    return NextResponse.json({ message: "Stok bahan gagal diperbarui." }, { status: 500 });
  }
}
