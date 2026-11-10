import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../lib/prisma";

const ASSIGNEE_ROLES = [
  "pembuat_donut",
  "pengantar",
  "penjaga_tempat",
] as const;

type AssigneeRole = (typeof ASSIGNEE_ROLES)[number];

type ProductInput = {
  nama_produk: string;
  nama_varian: string;
  harga: string;
  satuan: string;
  deskripsi: string | null;
  ingredients_donut: string | null;
  ingredients_topping: string | null;
  gambar_url: string | null;
  assigneeIds: Record<AssigneeRole, number>;
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 403 },
    );
  }

  let user: Awaited<ReturnType<typeof getAuthenticatedUser>>;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    console.error("Product authorization check failed.", error);
    return NextResponse.json(
      { message: "Pemeriksaan sesi pemilik gagal." },
      { status: 500 },
    );
  }
  if (!user) {
    return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  }
  if (user.role !== "pemilik") {
    return NextResponse.json(
      { message: "Hanya pemilik yang dapat menambahkan produk." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format data produk tidak valid." },
      { status: 400 },
    );
  }

  const input = parseProductInput(body);
  if (!input) {
    return NextResponse.json(
      { message: "Periksa kembali nama, harga, satuan, dan penugasan produk." },
      { status: 400 },
    );
  }

  try {
    const selectedUsers = await prisma.users.findMany({
      where: {
        id_user: { in: [user.id_user, ...Object.values(input.assigneeIds)] },
        status_registrasi: "aktif",
      },
      select: {
        id_user: true,
        nama: true,
        username: true,
        role: true,
      },
    });

    const owner = selectedUsers.find(
      (candidate) =>
        candidate.id_user === user.id_user && candidate.role === "pemilik",
    );
    if (!owner) {
      return NextResponse.json(
        { message: "Akun pemilik aktif tidak ditemukan." },
        { status: 403 },
      );
    }

    const assignees = {} as Record<AssigneeRole, (typeof selectedUsers)[number]>;
    for (const role of ASSIGNEE_ROLES) {
      const assignee = selectedUsers.find(
        (candidate) =>
          candidate.id_user === input.assigneeIds[role] &&
          candidate.role === role,
      );
      if (!assignee) {
        return NextResponse.json(
          { message: "Salah satu akun penanggung jawab tidak aktif atau tidak sesuai role." },
          { status: 400 },
        );
      }
      assignees[role] = assignee;
    }

    const [ownerProfileHash, makerProfileHash, courierProfileHash, guardProfileHash] =
      await Promise.all([
        createUnavailablePasswordHash(),
        createUnavailablePasswordHash(),
        createUnavailablePasswordHash(),
        createUnavailablePasswordHash(),
      ]);

    const created = await withPrismaTransaction(async (tx) => {
      const ownerProfile = await tx.pemilik.upsert({
        where: { username: owner.username },
        update: {
          nama_pemilik: owner.nama,
          status_registrasi: "aktif",
        },
        create: {
          nama_pemilik: owner.nama,
          username: owner.username,
          password_hash: ownerProfileHash,
          status_registrasi: "aktif",
        },
        select: { id_pemilik: true },
      });

      const makerProfile = await tx.pembuat_donut.upsert({
        where: { username: assignees.pembuat_donut.username },
        update: {
          nama_pembuat_donut: assignees.pembuat_donut.nama,
          status_registrasi: "aktif",
        },
        create: {
          nama_pembuat_donut: assignees.pembuat_donut.nama,
          username: assignees.pembuat_donut.username,
          password_hash: makerProfileHash,
          status_registrasi: "aktif",
        },
        select: { id_pembuat_donut: true },
      });

      const courierProfile = await tx.pengantar.upsert({
        where: { username: assignees.pengantar.username },
        update: {
          nama_pengantar: assignees.pengantar.nama,
          status_registrasi: "aktif",
        },
        create: {
          nama_pengantar: assignees.pengantar.nama,
          username: assignees.pengantar.username,
          password_hash: courierProfileHash,
          status_registrasi: "aktif",
        },
        select: { id_pengantar: true },
      });

      const guardProfile = await tx.penjaga_tempat.upsert({
        where: { username: assignees.penjaga_tempat.username },
        update: {
          nama_penjaga_tempat: assignees.penjaga_tempat.nama,
          status_registrasi: "aktif",
        },
        create: {
          nama_penjaga_tempat: assignees.penjaga_tempat.nama,
          username: assignees.penjaga_tempat.username,
          password_hash: guardProfileHash,
          status_registrasi: "aktif",
        },
        select: { id_penjaga_tempat: true },
      });

      return tx.produk.create({
        data: {
          nama_produk: input.nama_produk,
          harga: input.harga,
          satuan: input.satuan,
          id_pemilik: ownerProfile.id_pemilik,
          id_pembuat_donut: makerProfile.id_pembuat_donut,
          id_pengantar: courierProfile.id_pengantar,
          id_penjaga_tempat: guardProfile.id_penjaga_tempat,
          varian_produk: {
            create: {
              nama_varian: input.nama_varian,
              harga: input.harga,
              deskripsi: input.deskripsi,
              ingredients_donut: input.ingredients_donut,
              ingredients_topping: input.ingredients_topping,
              gambar_url: input.gambar_url,
            },
          },
        },
        select: {
          varian_produk: {
            select: { id_varian: true },
          },
        },
      });
    });

    const variantId = created.varian_produk[0]?.id_varian;
    if (!variantId) {
      throw new Error("Prisma tidak mengembalikan varian produk yang tersimpan.");
    }

    return NextResponse.json(
      { message: "Produk berhasil disimpan.", variantId },
      { status: 201 },
    );
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return NextResponse.json(
        { message: "Nama varian tersebut sudah digunakan." },
        { status: 409 },
      );
    }

    console.error("Product creation failed.", error);
    return NextResponse.json(
      { message: "Produk gagal disimpan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}

async function createUnavailablePasswordHash() {
  // Legacy role tables are operational profiles; authentication remains in users.
  const secret = randomBytes(32).toString("base64url");
  return bcrypt.hash(secret, 12);
}

function parseProductInput(body: unknown): ProductInput | null {
  if (!isRecord(body)) return null;

  const namaProduk = readTrimmedString(body.nama_produk, 100);
  const namaVarian = readTrimmedString(body.nama_varian, 50);
  const harga =
    typeof body.harga === "string" && /^[1-9]\d{0,18}$/.test(body.harga)
      ? body.harga
      : null;
  const satuan = readTrimmedString(body.satuan, 20);
  const idPembuat = readPositiveInteger(body.id_pembuat_user);
  const idPengantar = readPositiveInteger(body.id_pengantar_user);
  const idPenjaga = readPositiveInteger(body.id_penjaga_user);

  if (
    !namaProduk ||
    !namaVarian ||
    !harga ||
    !satuan ||
    idPembuat === null ||
    idPengantar === null ||
    idPenjaga === null
  ) {
    return null;
  }

  const deskripsi = readOptionalString(body.deskripsi, 5000);
  const ingredientsDonut = readOptionalString(body.ingredients_donut, 5000);
  const ingredientsTopping = readOptionalString(body.ingredients_topping, 5000);
  const gambarUrl = readOptionalImageUrl(body.gambar_url);
  if (
    deskripsi === undefined ||
    ingredientsDonut === undefined ||
    ingredientsTopping === undefined ||
    gambarUrl === undefined
  ) {
    return null;
  }

  return {
    nama_produk: namaProduk,
    nama_varian: namaVarian,
    harga,
    satuan,
    deskripsi,
    ingredients_donut: ingredientsDonut,
    ingredients_topping: ingredientsTopping,
    gambar_url: gambarUrl,
    assigneeIds: {
      pembuat_donut: idPembuat,
      pengantar: idPengantar,
      penjaga_tempat: idPenjaga,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : null;
}

function readOptionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) return undefined;
  const normalized = value.trim();
  return normalized || null;
}

function readOptionalImageUrl(value: unknown) {
  const imageUrl = readOptionalString(value, 500);
  if (imageUrl === undefined || imageUrl === null) return imageUrl;
  if (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) return imageUrl;

  try {
    const url = new URL(imageUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? imageUrl
      : undefined;
  } catch {
    return undefined;
  }
}

function readPositiveInteger(value: unknown) {
  if (typeof value !== "string" || !/^[1-9]\d{0,8}$/.test(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function hasPrismaCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
