import type { Prisma } from "../app/generated/prisma/client";
import type { AuthRole } from "./auth";

type AccountProfile = {
  nama: string;
  username: string;
  role: AuthRole;
  status_registrasi: string;
};

const DISABLED_PROFILE_PASSWORD_HASH = "!disabled!";

export async function syncOperationalProfile(
  transaction: Prisma.TransactionClient,
  account: AccountProfile,
  previousUsername = account.username,
): Promise<{ id: number }> {
  switch (account.role) {
    case "pemilik": {
      const current = await transaction.pemilik.findUnique({
        where: { username: previousUsername },
        select: { id_pemilik: true },
      });
      if (current) {
        const profile = await transaction.pemilik.update({
          where: { id_pemilik: current.id_pemilik },
          data: {
            nama_pemilik: account.nama,
            username: account.username,
            status_registrasi: account.status_registrasi,
          },
          select: { id_pemilik: true },
        });
        return { id: profile.id_pemilik };
      }
      const profile = await transaction.pemilik.create({
        data: {
          nama_pemilik: account.nama,
          username: account.username,
          password_hash: DISABLED_PROFILE_PASSWORD_HASH,
          status_registrasi: account.status_registrasi,
        },
        select: { id_pemilik: true },
      });
      return { id: profile.id_pemilik };
    }
    case "pembuat_donut": {
      const current = await transaction.pembuat_donut.findUnique({
        where: { username: previousUsername },
        select: { id_pembuat_donut: true },
      });
      if (current) {
        const profile = await transaction.pembuat_donut.update({
          where: { id_pembuat_donut: current.id_pembuat_donut },
          data: {
            nama_pembuat_donut: account.nama,
            username: account.username,
            status_registrasi: account.status_registrasi,
          },
          select: { id_pembuat_donut: true },
        });
        return { id: profile.id_pembuat_donut };
      }
      const profile = await transaction.pembuat_donut.create({
        data: {
          nama_pembuat_donut: account.nama,
          username: account.username,
          password_hash: DISABLED_PROFILE_PASSWORD_HASH,
          status_registrasi: account.status_registrasi,
        },
        select: { id_pembuat_donut: true },
      });
      return { id: profile.id_pembuat_donut };
    }
    case "pengantar": {
      const current = await transaction.pengantar.findUnique({
        where: { username: previousUsername },
        select: { id_pengantar: true },
      });
      if (current) {
        const profile = await transaction.pengantar.update({
          where: { id_pengantar: current.id_pengantar },
          data: {
            nama_pengantar: account.nama,
            username: account.username,
            status_registrasi: account.status_registrasi,
          },
          select: { id_pengantar: true },
        });
        return { id: profile.id_pengantar };
      }
      const profile = await transaction.pengantar.create({
        data: {
          nama_pengantar: account.nama,
          username: account.username,
          password_hash: DISABLED_PROFILE_PASSWORD_HASH,
          status_registrasi: account.status_registrasi,
        },
        select: { id_pengantar: true },
      });
      return { id: profile.id_pengantar };
    }
    case "penjaga_tempat": {
      const current = await transaction.penjaga_tempat.findUnique({
        where: { username: previousUsername },
        select: { id_penjaga_tempat: true },
      });
      if (current) {
        const profile = await transaction.penjaga_tempat.update({
          where: { id_penjaga_tempat: current.id_penjaga_tempat },
          data: {
            nama_penjaga_tempat: account.nama,
            username: account.username,
            status_registrasi: account.status_registrasi,
          },
          select: { id_penjaga_tempat: true },
        });
        return { id: profile.id_penjaga_tempat };
      }
      const profile = await transaction.penjaga_tempat.create({
        data: {
          nama_penjaga_tempat: account.nama,
          username: account.username,
          password_hash: DISABLED_PROFILE_PASSWORD_HASH,
          status_registrasi: account.status_registrasi,
        },
        select: { id_penjaga_tempat: true },
      });
      return { id: profile.id_penjaga_tempat };
    }
  }
}
