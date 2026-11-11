import { NextResponse } from "next/server";
import { syncOperationalProfile } from "../../../../../lib/account-profiles";
import { getAuthenticatedUser, isAuthRole } from "../../../../../lib/auth";
import { withPrismaTransaction } from "../../../../../lib/prisma";

const REGISTRATION_STATUSES = [
  "menunggu_verifikasi",
  "aktif",
  "ditolak",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getAuthenticatedUser();
  if (!owner) {
    return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  }
  if (owner.role !== "pemilik") {
    return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ message: "ID pengguna tidak valid." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format data pengguna tidak valid." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Data pengguna tidak valid." }, { status: 400 });
  }

  const fields = body as Record<string, unknown>;
  const nama = fields.nama === undefined ? undefined : readString(fields.nama, 255);
  const username = fields.username === undefined ? undefined : readString(fields.username, 100);
  const status =
    fields.status_registrasi === undefined
      ? undefined
      : fields.status_registrasi;
  if (
    (fields.nama !== undefined && nama === null) ||
    (fields.username !== undefined && username === null) ||
    (fields.status_registrasi !== undefined &&
      (typeof status !== "string" ||
        !REGISTRATION_STATUSES.includes(
          status as (typeof REGISTRATION_STATUSES)[number],
        ))) ||
    (nama === undefined && username === undefined && status === undefined)
  ) {
    return NextResponse.json({ message: "Perubahan data pengguna tidak valid." }, { status: 400 });
  }

  try {
    const result = await withPrismaTransaction(async (transaction) => {
      const current = await transaction.users.findUnique({
        where: { id_user: id },
        select: {
          id_user: true,
          nama: true,
          username: true,
          role: true,
          status_registrasi: true,
        },
      });
      if (!current || current.role === "pemilik" || !isAuthRole(current.role)) {
        return { kind: "not_found" as const };
      }

      const nextStatus =
        typeof status === "string" ? status : current.status_registrasi;
      const user = await transaction.users.update({
        where: { id_user: id },
        data: {
          ...(nama ? { nama } : {}),
          ...(username ? { username } : {}),
          ...(typeof status === "string" ? { status_registrasi: nextStatus } : {}),
        },
        select: {
          id_user: true,
          nama: true,
          username: true,
          role: true,
          status_registrasi: true,
        },
      });
      await syncOperationalProfile(
        transaction,
        {
          nama: user.nama,
          username: user.username,
          role: current.role,
          status_registrasi: user.status_registrasi,
        },
        current.username,
      );
      if (nextStatus !== current.status_registrasi) {
        await transaction.riwayat_registrasi.create({
          data: {
            id_user: id,
            status_registrasi: nextStatus,
            diproses_oleh: owner.id_user,
          },
        });
      }
      return { kind: "updated" as const, user };
    });

    if (result.kind === "not_found") {
      return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return NextResponse.json({ message: "Username sudah digunakan." }, { status: 409 });
    }
    console.error("User update failed.", error);
    return NextResponse.json({ message: "Perubahan pengguna gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await getAuthenticatedUser();
  if (!owner) {
    return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  }
  if (owner.role !== "pemilik") {
    return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }

  const id = parseId((await params).id);
  if (id === null || id === owner.id_user) {
    return NextResponse.json({ message: "Pengguna tidak dapat dinonaktifkan." }, { status: 400 });
  }

  try {
    const result = await withPrismaTransaction(async (transaction) => {
      const target = await transaction.users.findUnique({
        where: { id_user: id },
        select: {
          id_user: true,
          nama: true,
          username: true,
          role: true,
          status_registrasi: true,
        },
      });
      if (!target || target.role === "pemilik" || !isAuthRole(target.role)) {
        return { kind: "not_found" as const };
      }
      if (target.status_registrasi === "ditolak") {
        return { kind: "unchanged" as const };
      }
      await transaction.users.update({
        where: { id_user: id },
        data: { status_registrasi: "ditolak" },
      });
      await syncOperationalProfile(transaction, {
        nama: target.nama,
        username: target.username,
        role: target.role,
        status_registrasi: "ditolak",
      });
      await transaction.riwayat_registrasi.create({
        data: {
          id_user: id,
          status_registrasi: "ditolak",
          diproses_oleh: owner.id_user,
        },
      });
      return { kind: "deactivated" as const };
    });

    if (result.kind === "not_found") {
      return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({
      message: "Akun dinonaktifkan tanpa menghapus riwayat operasional.",
    });
  } catch (error) {
    console.error("User deactivation failed.", error);
    return NextResponse.json({ message: "Pengguna gagal dinonaktifkan." }, { status: 500 });
  }
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
