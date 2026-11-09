CREATE TABLE IF NOT EXISTS "rencana_produksi" (
  "id_rencana" SERIAL NOT NULL,
  "tanggal_produksi" DATE NOT NULL,
  "status_rencana" VARCHAR(30) NOT NULL DEFAULT 'menunggu',
  "catatan" TEXT,
  "jumlah_rencana" INTEGER NOT NULL,
  "id_produk" INTEGER NOT NULL,
  "id_varian" INTEGER NOT NULL,
  "id_pemilik" INTEGER NOT NULL,
  "id_pembuat_donut" INTEGER NOT NULL,
  CONSTRAINT "rencana_produksi_pkey" PRIMARY KEY ("id_rencana"),
  CONSTRAINT "rencana_produksi_id_produk_fkey"
    FOREIGN KEY ("id_produk") REFERENCES "produk"("id_produk")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "rencana_produksi_id_varian_fkey"
    FOREIGN KEY ("id_varian") REFERENCES "varian_produk"("id_varian")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "rencana_produksi_id_pemilik_fkey"
    FOREIGN KEY ("id_pemilik") REFERENCES "pemilik"("id_pemilik")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "rencana_produksi_id_pembuat_donut_fkey"
    FOREIGN KEY ("id_pembuat_donut") REFERENCES "pembuat_donut"("id_pembuat_donut")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "rencana_produksi_tanggal_produksi_status_rencana_idx"
  ON "rencana_produksi"("tanggal_produksi", "status_rencana");

ALTER TABLE "produksi"
  ADD CONSTRAINT "produksi_id_rencana_fkey"
  FOREIGN KEY ("id_rencana") REFERENCES "rencana_produksi"("id_rencana")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "stok_bahan" (
  "id_bahan" INTEGER NOT NULL,
  "jumlah_stok" DECIMAL(15,3) NOT NULL DEFAULT 0,
  "diperbarui_pada" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stok_bahan_pkey" PRIMARY KEY ("id_bahan"),
  CONSTRAINT "stok_bahan_id_bahan_fkey"
    FOREIGN KEY ("id_bahan") REFERENCES "bahan_baku"("id_bahan")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stok_bahan_jumlah_stok_check" CHECK ("jumlah_stok" >= 0)
);

CREATE TABLE IF NOT EXISTS "stok_produk" (
  "id_varian" INTEGER NOT NULL,
  "jumlah_stok" INTEGER NOT NULL DEFAULT 0,
  "diperbarui_pada" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stok_produk_pkey" PRIMARY KEY ("id_varian"),
  CONSTRAINT "stok_produk_id_varian_fkey"
    FOREIGN KEY ("id_varian") REFERENCES "varian_produk"("id_varian")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stok_produk_jumlah_stok_check" CHECK ("jumlah_stok" >= 0)
);

INSERT INTO "stok_produk" ("id_varian", "jumlah_stok")
SELECT "id_varian", 0 FROM "varian_produk"
ON CONFLICT ("id_varian") DO NOTHING;
