import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../lib/prisma";

export async function GET() {
  const actor = await getAuthorizedActor();
  if (actor instanceof NextResponse) return actor;
  try {
    const ownerId =
      actor.role === "pemilik"
        ? (await prisma.pemilik.findUnique({
            where: { username: actor.username },
            select: { id_pemilik: true },
          }))?.id_pemilik
        : null;
    const makerId =
      actor.role === "pembuat_donut"
        ? (await prisma.pembuat_donut.findUnique({
            where: { username: actor.username },
            select: { id_pembuat_donut: true },
          }))?.id_pembuat_donut
        : null;
    const where = ownerId
      ? { id_pemilik: ownerId }
      : makerId
        ? { id_pembuat_donut: makerId }
        : null;
    if (!where) {
      return NextResponse.json({ message: "Profil operasional tidak ditemukan." }, { status: 409 });
    }
    const records = await prisma.produksi.findMany({
      where,
      select: {
        id_hasil: true,
        id_rencana: true,
        tanggal_produksi: true,
        jumlah_rencana: true,
        jumlah_hasil: true,
        jumlah_rusak: true,
        keterangan_kualitas: true,
        produk: { select: { nama_produk: true } },
        detail_produksi: {
          select: {
            varian_produk: { select: { nama_varian: true } },
          },
        },
      },
      orderBy: [{ tanggal_produksi: "desc" }, { id_hasil: "desc" }],
    });
    return NextResponse.json({ records });
  } catch (error) {
    console.error("Production result query failed.", error);
    return NextResponse.json({ message: "Hasil produksi gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getAuthorizedActor();
  if (actor instanceof NextResponse) return actor;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format hasil produksi tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data hasil produksi tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const planId = parsePositiveInteger(values.id_rencana);
  const produced = parseNonNegativeInteger(values.jumlah_hasil);
  const damaged = parseNonNegativeInteger(values.jumlah_rusak);
  const quality = readOptionalString(values.keterangan_kualitas, 255);
  if (
    planId === null ||
    produced === null ||
    produced < 1 ||
    damaged === null ||
    damaged > produced ||
    quality === undefined
  ) {
    return NextResponse.json({ message: "Rencana, jumlah hasil, jumlah rusak, atau catatan tidak valid." }, { status: 400 });
  }

  try {
    const record = await withPrismaTransaction(async (transaction) => {
      const plan = await transaction.rencana_produksi.findUnique({
        where: { id_rencana: planId },
        select: {
          id_rencana: true,
          tanggal_produksi: true,
          jumlah_rencana: true,
          id_produk: true,
          id_varian: true,
          id_pemilik: true,
          id_pembuat_donut: true,
          produksi: { select: { id_hasil: true } },
        },
      });
      if (!plan) return { kind: "not_found" as const };
      if (plan.produksi) return { kind: "already_recorded" as const };

      const assigned =
        actor.role === "pemilik"
          ? (await transaction.pemilik.findUnique({
              where: { username: actor.username },
              select: { id_pemilik: true },
            }))?.id_pemilik === plan.id_pemilik
          : (await transaction.pembuat_donut.findUnique({
              where: { username: actor.username },
              select: { id_pembuat_donut: true },
            }))?.id_pembuat_donut === plan.id_pembuat_donut;
      if (!assigned) {
        return { kind: "forbidden" as const };
      }

      const result = await transaction.produksi.create({
        data: {
          tanggal_produksi: plan.tanggal_produksi,
          jumlah_rencana: plan.jumlah_rencana,
          jumlah_hasil: produced,
          jumlah_rusak: damaged,
          keterangan_kualitas: quality,
          id_rencana: plan.id_rencana,
          id_pemilik: plan.id_pemilik,
          id_produk: plan.id_produk,
          id_pembuat_donut: plan.id_pembuat_donut,
        },
        select: { id_hasil: true },
      });
      await transaction.detail_produksi.create({
        data: {
          id_hasil: result.id_hasil,
          id_varian: plan.id_varian,
          jumlah_rencana_varian_pcs: plan.jumlah_rencana,
          jumlah_hasil_pcs: produced,
          jumlah_rusak_pcs: damaged,
        },
      });
      await transaction.rencana_produksi.update({
        where: { id_rencana: plan.id_rencana },
        data: { status_rencana: "selesai" },
      });
      await transaction.stok_produk.upsert({
        where: { id_varian: plan.id_varian },
        create: {
          id_varian: plan.id_varian,
          jumlah_stok: produced - damaged,
        },
        update: { jumlah_stok: { increment: produced - damaged } },
      });
      return { kind: "created" as const, id: result.id_hasil };
    });

    if (record.kind === "not_found") {
      return NextResponse.json({ message: "Rencana produksi tidak ditemukan." }, { status: 404 });
    }
    if (record.kind === "already_recorded") {
      return NextResponse.json({ message: "Hasil untuk rencana ini sudah dicatat." }, { status: 409 });
    }
    if (record.kind === "forbidden") {
      return NextResponse.json({ message: "Rencana ini bukan tanggung jawab akun Anda." }, { status: 403 });
    }
    return NextResponse.json({ id_hasil: record.id }, { status: 201 });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return NextResponse.json({ message: "Hasil untuk rencana ini sudah dicatat." }, { status: 409 });
    }
    console.error("Production result creation failed.", error);
    return NextResponse.json({ message: "Hasil produksi gagal disimpan." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const actor = await getAuthorizedActor();
  if (actor instanceof NextResponse) return actor;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format catatan kualitas tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data catatan kualitas tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const productionId = parsePositiveInteger(values.id_hasil);
  const damaged = parseNonNegativeInteger(values.jumlah_rusak);
  const quality = readOptionalString(values.keterangan_kualitas, 255);
  if (productionId === null || damaged === null || quality === undefined) {
    return NextResponse.json({ message: "Hasil produksi, jumlah rusak, atau catatan tidak valid." }, { status: 400 });
  }

  try {
    const outcome = await withPrismaTransaction(async (transaction) => {
      const production = await transaction.produksi.findUnique({
        where: { id_hasil: productionId },
        select: {
          id_pemilik: true,
          id_pembuat_donut: true,
          jumlah_hasil: true,
          jumlah_rusak: true,
          detail_produksi: { select: { id_varian: true } },
        },
      });
      if (!production) return { kind: "not_found" as const };
      if (damaged > production.jumlah_hasil) return { kind: "invalid_quantity" as const };

      const assigned =
        actor.role === "pemilik"
          ? (await transaction.pemilik.findUnique({
              where: { username: actor.username },
              select: { id_pemilik: true },
            }))?.id_pemilik === production.id_pemilik
          : (await transaction.pembuat_donut.findUnique({
              where: { username: actor.username },
              select: { id_pembuat_donut: true },
            }))?.id_pembuat_donut === production.id_pembuat_donut;
      if (!assigned) return { kind: "forbidden" as const };

      const detail = production.detail_produksi[0];
      if (!detail) return { kind: "detail_missing" as const };
      const damageDelta = damaged - production.jumlah_rusak;
      if (damageDelta > 0) {
        const stock = await transaction.stok_produk.updateMany({
          where: {
            id_varian: detail.id_varian,
            jumlah_stok: { gte: damageDelta },
          },
          data: { jumlah_stok: { decrement: damageDelta } },
        });
        if (!stock.count) return { kind: "insufficient_stock" as const };
      } else if (damageDelta < 0) {
        await transaction.stok_produk.upsert({
          where: { id_varian: detail.id_varian },
          create: { id_varian: detail.id_varian, jumlah_stok: -damageDelta },
          update: { jumlah_stok: { increment: -damageDelta } },
        });
      }

      await transaction.produksi.update({
        where: { id_hasil: productionId },
        data: { jumlah_rusak: damaged, keterangan_kualitas: quality },
      });
      await transaction.detail_produksi.update({
        where: {
          id_hasil_id_varian: {
            id_hasil: productionId,
            id_varian: detail.id_varian,
          },
        },
        data: { jumlah_rusak_pcs: damaged },
      });
      return { kind: "updated" as const };
    });

    switch (outcome.kind) {
      case "not_found":
        return NextResponse.json({ message: "Hasil produksi tidak ditemukan." }, { status: 404 });
      case "invalid_quantity":
        return NextResponse.json({ message: "Jumlah produk rusak tidak boleh melebihi hasil produksi." }, { status: 400 });
      case "forbidden":
        return NextResponse.json({ message: "Hasil produksi ini bukan tanggung jawab akun Anda." }, { status: 403 });
      case "detail_missing":
        return NextResponse.json({ message: "Detail varian hasil produksi tidak ditemukan." }, { status: 409 });
      case "insufficient_stock":
        return NextResponse.json({ message: "Stok tidak cukup untuk mencatat tambahan produk rusak." }, { status: 409 });
      default:
        return NextResponse.json({ message: "Catatan produk rusak berhasil disimpan." });
    }
  } catch (error) {
    console.error("Production quality update failed.", error);
    return NextResponse.json({ message: "Catatan produk rusak gagal disimpan." }, { status: 500 });
  }
}

async function getAuthorizedActor() {
  try {
    const actor = await getAuthenticatedUser();
    if (!actor) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
    if (actor.role !== "pemilik" && actor.role !== "pembuat_donut") {
      return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik atau pembuat donut." }, { status: 403 });
    }
    return actor;
  } catch (error) {
    console.error("Production authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi gagal." }, { status: 500 });
  }
}

function parsePositiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseNonNegativeInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function readOptionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maxLength ? text || null : undefined;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
