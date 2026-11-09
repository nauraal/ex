import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { withPrismaTransaction } from "../../../../../lib/prisma";

export async function POST(request: Request) {
  let actor;
  try {
    actor = await getAuthenticatedUser();
  } catch (error) {
    console.error("Material usage authorization check failed.", error);
    return NextResponse.json({ message: "Pemeriksaan sesi gagal." }, { status: 500 });
  }
  if (!actor) return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  if (actor.role !== "pemilik" && actor.role !== "pembuat_donut") {
    return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik atau pembuat donut." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format pemakaian bahan tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data pemakaian bahan tidak valid." }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const productionParts =
    typeof values.production_detail === "string"
      ? values.production_detail.split(":")
      : [];
  const productionId = parsePositiveInteger(values.id_hasil ?? productionParts[0]);
  const materialId = parsePositiveInteger(values.id_bahan);
  const variantId = parsePositiveInteger(values.id_varian ?? productionParts[1]);
  const quantity = parseDecimal(values.jumlah_pemakaian);
  if (productionId === null || materialId === null || variantId === null || quantity === null) {
    return NextResponse.json({ message: "Produksi, bahan, varian, dan jumlah pemakaian wajib valid." }, { status: 400 });
  }

  try {
    const result = await withPrismaTransaction(async (transaction) => {
      const production = await transaction.produksi.findUnique({
        where: { id_hasil: productionId },
        select: {
          id_pemilik: true,
          id_pembuat_donut: true,
          detail_produksi: {
            select: { id_varian: true },
          },
        },
      });
      const material = await transaction.bahan_baku.findUnique({
        where: { id_bahan: materialId },
        select: { id_pemilik: true, id_pembuat_donut: true },
      });
      if (!production || !material) return { kind: "not_found" as const };
      if (!production.detail_produksi.some((detail) => detail.id_varian === variantId)) {
        return { kind: "variant_mismatch" as const };
      }

      if (actor.role === "pemilik") {
        const profile = await transaction.pemilik.findUnique({
          where: { username: actor.username },
          select: { id_pemilik: true },
        });
        if (!profile || profile.id_pemilik !== production.id_pemilik) {
          return { kind: "forbidden" as const };
        }
      } else {
        const profile = await transaction.pembuat_donut.findUnique({
          where: { username: actor.username },
          select: { id_pembuat_donut: true },
        });
        if (!profile || profile.id_pembuat_donut !== production.id_pembuat_donut) {
          return { kind: "forbidden" as const };
        }
      }
      if (
        material.id_pemilik !== production.id_pemilik ||
        material.id_pembuat_donut !== production.id_pembuat_donut
      ) {
        return { kind: "material_mismatch" as const };
      }

      const stock = await transaction.stok_bahan.updateMany({
        where: {
          id_bahan: materialId,
          jumlah_stok: { gte: quantity },
        },
        data: { jumlah_stok: { decrement: quantity } },
      });
      if (!stock.count) return { kind: "insufficient_stock" as const };

      await transaction.pemakaian_bahan.upsert({
        where: {
          id_bahan_id_hasil_id_varian: {
            id_bahan: materialId,
            id_hasil: productionId,
            id_varian: variantId,
          },
        },
        create: {
          id_bahan: materialId,
          id_hasil: productionId,
          id_varian: variantId,
          jumlah_pemakaian_bahan: quantity,
        },
        update: {
          jumlah_pemakaian_bahan: { increment: quantity },
        },
      });
      return { kind: "saved" as const };
    });

    switch (result.kind) {
      case "not_found":
        return NextResponse.json({ message: "Produksi atau bahan baku tidak ditemukan." }, { status: 404 });
      case "variant_mismatch":
        return NextResponse.json({ message: "Varian tidak termasuk dalam hasil produksi ini." }, { status: 400 });
      case "forbidden":
        return NextResponse.json({ message: "Produksi ini bukan tanggung jawab akun Anda." }, { status: 403 });
      case "material_mismatch":
        return NextResponse.json({ message: "Bahan baku tidak ditugaskan ke produksi ini." }, { status: 400 });
      case "insufficient_stock":
        return NextResponse.json({ message: "Stok bahan baku tidak cukup atau belum dicatat." }, { status: 409 });
      default:
        return NextResponse.json({ message: "Pemakaian bahan berhasil disimpan." }, { status: 201 });
    }
  } catch (error) {
    console.error("Material usage creation failed.", error);
    return NextResponse.json({ message: "Pemakaian bahan gagal disimpan." }, { status: 500 });
  }
}

function parsePositiveInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function parseDecimal(value: unknown) {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value)) return null;
  return Number(value) > 0 ? value : null;
}
