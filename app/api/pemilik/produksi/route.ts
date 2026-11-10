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
  const quality = readOptionalString(values.keterangan_kualitas, 255);
  if (planId === null || quality === undefined) {
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
          id_pemilik: true,
          id_pembuat_donut: true,
          produksi: { select: { id_hasil: true } },
          detail_produk: {
            select: {
              id_varian: true,
              jumlah_rencana_varian_pcs: true,
            },
          },
        },
      });
      if (!plan) return { kind: "not_found" as const };
      if (plan.produksi) return { kind: "already_recorded" as const };
      if (!plan.detail_produk.length) return { kind: "details_missing" as const };

      const details: {
        id_varian: number;
        jumlah_rencana_varian_pcs: number;
        jumlah_hasil_pcs: number;
        jumlah_rusak_pcs: number;
      }[] = [];
      for (const plannedDetail of plan.detail_produk) {
        const producedValue =
          values[`jumlah_hasil_${plannedDetail.id_varian}`] ??
          (plan.detail_produk.length === 1 ? values.jumlah_hasil : undefined);
        const damagedValue =
          values[`jumlah_rusak_${plannedDetail.id_varian}`] ??
          (plan.detail_produk.length === 1 ? values.jumlah_rusak : undefined);
        const produced = parseNonNegativeInteger(producedValue);
        const damaged = parseNonNegativeInteger(damagedValue);
        if (produced === null || damaged === null || damaged > produced) {
          return { kind: "invalid_details" as const };
        }
        details.push({
          id_varian: plannedDetail.id_varian,
          jumlah_rencana_varian_pcs: plannedDetail.jumlah_rencana_varian_pcs,
          jumlah_hasil_pcs: produced,
          jumlah_rusak_pcs: damaged,
        });
      }
      const totalProduced = details.reduce(
        (sum, detail) => sum + detail.jumlah_hasil_pcs,
        0,
      );
      const totalDamaged = details.reduce(
        (sum, detail) => sum + detail.jumlah_rusak_pcs,
        0,
      );
      if (totalProduced < 1) return { kind: "invalid_details" as const };

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
          jumlah_hasil: totalProduced,
          jumlah_rusak: totalDamaged,
          keterangan_kualitas: quality,
          id_rencana: plan.id_rencana,
          id_pemilik: plan.id_pemilik,
          id_produk: plan.id_produk,
          id_pembuat_donut: plan.id_pembuat_donut,
        },
        select: { id_hasil: true },
      });
      await transaction.detail_produksi.createMany({
        data: details.map((detail) => ({
          id_hasil: result.id_hasil,
          id_varian: detail.id_varian,
          jumlah_rencana_varian_pcs: detail.jumlah_rencana_varian_pcs,
          jumlah_hasil_pcs: detail.jumlah_hasil_pcs,
          jumlah_rusak_pcs: detail.jumlah_rusak_pcs,
        })),
      });
      await transaction.rencana_produksi.update({
        where: { id_rencana: plan.id_rencana },
        data: { status_rencana: "selesai" },
      });
      for (const detail of details) {
        const available = detail.jumlah_hasil_pcs - detail.jumlah_rusak_pcs;
        await transaction.stok_produk.upsert({
          where: { id_varian: detail.id_varian },
          create: {
            id_varian: detail.id_varian,
            jumlah_stok: available,
          },
          update: { jumlah_stok: { increment: available } },
        });
      }
      return { kind: "created" as const, id: result.id_hasil };
    });

    if (record.kind === "not_found") {
      return NextResponse.json({ message: "Rencana produksi tidak ditemukan." }, { status: 404 });
    }
    if (record.kind === "already_recorded") {
      return NextResponse.json({ message: "Hasil untuk rencana ini sudah dicatat." }, { status: 409 });
    }
    if (record.kind === "details_missing") {
      return NextResponse.json({ message: "Detail varian pada rencana tidak ditemukan." }, { status: 409 });
    }
    if (record.kind === "invalid_details") {
      return NextResponse.json({ message: "Jumlah hasil dan rusak untuk setiap varian tidak valid." }, { status: 400 });
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
  const quality = readOptionalString(values.keterangan_kualitas, 255);
  if (productionId === null || quality === undefined) {
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
          detail_produksi: {
            select: {
              id_varian: true,
              jumlah_hasil_pcs: true,
              jumlah_rusak_pcs: true,
            },
          },
        },
      });
      if (!production) return { kind: "not_found" as const };
      if (!production.detail_produksi.length) return { kind: "detail_missing" as const };

      const details: { id_varian: number; jumlah_rusak_pcs: number }[] = [];
      for (const productionDetail of production.detail_produksi) {
        const damageValue =
          values[`jumlah_rusak_${productionDetail.id_varian}`] ??
          (production.detail_produksi.length === 1 ? values.jumlah_rusak : undefined);
        const damaged = parseNonNegativeInteger(damageValue);
        if (damaged === null || damaged > productionDetail.jumlah_hasil_pcs) {
          return { kind: "invalid_quantity" as const };
        }
        details.push({
          id_varian: productionDetail.id_varian,
          jumlah_rusak_pcs: damaged,
        });
      }
      const totalDamaged = details.reduce(
        (sum, detail) => sum + detail.jumlah_rusak_pcs,
        0,
      );
      if (totalDamaged > production.jumlah_hasil) {
        return { kind: "invalid_quantity" as const };
      }

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

      for (const detail of details) {
        const previous = production.detail_produksi.find(
          (item) => item.id_varian === detail.id_varian,
        );
        if (!previous) return { kind: "detail_missing" as const };
        const damageDelta = detail.jumlah_rusak_pcs - previous.jumlah_rusak_pcs;
        if (damageDelta > 0) {
          const stock = await transaction.stok_produk.updateMany({
            where: {
              id_varian: detail.id_varian,
              jumlah_stok: { gte: damageDelta },
            },
            data: { jumlah_stok: { decrement: damageDelta } },
          });
          if (!stock.count) throw new InsufficientStockError();
        } else if (damageDelta < 0) {
          await transaction.stok_produk.upsert({
            where: { id_varian: detail.id_varian },
            create: { id_varian: detail.id_varian, jumlah_stok: -damageDelta },
            update: { jumlah_stok: { increment: -damageDelta } },
          });
        }
        await transaction.detail_produksi.update({
          where: {
            id_hasil_id_varian: {
              id_hasil: productionId,
              id_varian: detail.id_varian,
            },
          },
          data: { jumlah_rusak_pcs: detail.jumlah_rusak_pcs },
        });
      }

      await transaction.produksi.update({
        where: { id_hasil: productionId },
        data: { jumlah_rusak: totalDamaged, keterangan_kualitas: quality },
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
      default:
        return NextResponse.json({ message: "Catatan produk rusak berhasil disimpan." });
    }
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ message: "Stok tidak cukup untuk mencatat tambahan produk rusak." }, { status: 409 });
    }
    console.error("Production quality update failed.", error);
    return NextResponse.json({ message: "Catatan produk rusak gagal disimpan." }, { status: 500 });
  }
}

class InsufficientStockError extends Error {}

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
