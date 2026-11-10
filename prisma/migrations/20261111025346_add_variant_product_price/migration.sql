ALTER TABLE "varian_produk"
  ADD COLUMN "harga" DECIMAL(19,0);

UPDATE "varian_produk" AS variant
SET "harga" = product."harga"
FROM "produk" AS product
WHERE product."id_produk" = variant."id_produk";

ALTER TABLE "varian_produk"
  ALTER COLUMN "harga" SET NOT NULL;

ALTER TABLE "varian_produk"
  ADD CONSTRAINT "varian_produk_harga_check"
  CHECK ("harga" >= 0);
