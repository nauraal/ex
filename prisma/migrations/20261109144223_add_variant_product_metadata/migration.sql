ALTER TABLE "varian_produk"
  ADD COLUMN IF NOT EXISTS "deskripsi" TEXT,
  ADD COLUMN IF NOT EXISTS "ingredients_donut" TEXT,
  ADD COLUMN IF NOT EXISTS "ingredients_topping" TEXT,
  ADD COLUMN IF NOT EXISTS "gambar_url" VARCHAR(500);
