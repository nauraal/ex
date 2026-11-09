CREATE TABLE IF NOT EXISTS "riwayat_registrasi" (
  "id_riwayat" SERIAL NOT NULL,
  "id_user" INTEGER NOT NULL,
  "status_registrasi" VARCHAR(30) NOT NULL,
  "diproses_oleh" INTEGER,
  "waktu_perubahan" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "riwayat_registrasi_pkey" PRIMARY KEY ("id_riwayat"),
  CONSTRAINT "riwayat_registrasi_id_user_fkey"
    FOREIGN KEY ("id_user") REFERENCES "users"("id_user")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "riwayat_registrasi_diproses_oleh_fkey"
    FOREIGN KEY ("diproses_oleh") REFERENCES "users"("id_user")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "riwayat_registrasi_id_user_waktu_perubahan_idx"
  ON "riwayat_registrasi"("id_user", "waktu_perubahan");
