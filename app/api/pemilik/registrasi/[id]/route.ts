import { NextResponse } from "next/server";
import { syncOperationalProfile } from "../../../../../lib/account-profiles";
import { getAuthenticatedUser, isAuthRole } from "../../../../../lib/auth";
import { withPrismaTransaction } from "../../../../../lib/prisma";

function isRegistrationDecision(
  status: unknown,
): status is "aktif" | "ditolak" {
  return status === "aktif" || status === "ditolak";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { message: "Permintaan tidak valid." },
      { status: 403 },
    );
  }

  let actor;
  try {
    actor = await getAuthenticatedUser();
  } catch (error) {
    console.error("Registration authorization check failed.", error);
    return NextResponse.json(
      { message: "Pemeriksaan sesi pemilik gagal." },
      { status: 500 },
    );
  }

  if (!actor) {
    return NextResponse.json(
      { message: "Sesi login tidak valid." },
      { status: 401 },
    );
  }
  if (actor.role !== "pemilik") {
    return NextResponse.json(
      { message: "Hanya pemilik yang dapat memverifikasi pendaftaran." },
      { status: 403 },
    );
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json(
      { message: "ID pendaftar tidak valid." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format keputusan registrasi tidak valid." },
      { status: 400 },
    );
  }

  const status =
    typeof body === "object" && body !== null && "status" in body
      ? body.status
      : undefined;
  if (!isRegistrationDecision(status)) {
    return NextResponse.json(
      { message: "Status keputusan harus aktif atau ditolak." },
      { status: 400 },
    );
  }

  try {
    const result = await withPrismaTransaction(async (transaction) => {
      const registrant = await transaction.users.findUnique({
        where: { id_user: id },
        select: {
          id_user: true,
          nama: true,
          username: true,
          status_registrasi: true,
          role: true,
        },
      });

      if (
        !registrant ||
        !isAuthRole(registrant.role) ||
        registrant.role === "pemilik" ||
        !["pembuat_donut", "pengantar", "penjaga_tempat"].includes(
          registrant.role,
        )
      ) {
        return { kind: "not_found" as const };
      }

      if (registrant.status_registrasi !== "menunggu_verifikasi") {
        return {
          kind: "already_processed" as const,
          status: registrant.status_registrasi,
        };
      }

      const update = await transaction.users.updateMany({
        where: {
          id_user: registrant.id_user,
          status_registrasi: "menunggu_verifikasi",
        },
        data: { status_registrasi: status },
      });
      if (update.count === 0) {
        const current = await transaction.users.findUnique({
          where: { id_user: registrant.id_user },
          select: { status_registrasi: true },
        });
        return {
          kind: "already_processed" as const,
          status: current?.status_registrasi ?? "tidak ditemukan",
        };
      }

      await syncOperationalProfile(transaction, {
        nama: registrant.nama,
        username: registrant.username,
        role: registrant.role,
        status_registrasi: status,
      });

      await transaction.riwayat_registrasi.create({
        data: {
          id_user: registrant.id_user,
          status_registrasi: status,
          diproses_oleh: actor.id_user,
        },
      });

      return { kind: "updated" as const, status };
    });

    if (result.kind === "not_found") {
      return NextResponse.json(
        { message: "Pendaftar tidak ditemukan." },
        { status: 404 },
      );
    }
    if (result.kind === "already_processed") {
      return NextResponse.json(
        {
          message: "Status pendaftar telah diproses sebelumnya.",
          status: result.status,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message: result.status === "aktif" ? "Pendaftaran disetujui." : "Pendaftaran ditolak.",
      status: result.status,
    });
  } catch (error) {
    console.error("Registration decision failed.", error);
    return NextResponse.json(
      { message: "Keputusan registrasi gagal disimpan." },
      { status: 500 },
    );
  }
}
