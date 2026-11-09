# Zazi Donut

**Website:** https://ex-fh13.vercel.app/

## Development

Configure `.env` with the PostgreSQL `DATABASE_URL` and `.env.local` with a
private session signing secret of at least 32 bytes (`SESSION_SECRET`).

## Development

Configure `.env` with the PostgreSQL `DATABASE_URL` and `.env.local` with a
private session signing secret of at least 32 bytes (`SESSION_SECRET`). Generate
a local secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Do not commit either environment file. Set `SESSION_SECRET` in the deployment
environment as well.

Run the app locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login uses the `users`
table in PostgreSQL; the database role controls the dashboard destination.
Demo user records and their test credentials are in `database.sql`.
Public registration creates only `pembuat_donut`, `pengantar`, or
`penjaga_tempat` accounts in `users` with a bcrypt password hash and a pending
registration status. `pemilik` accounts cannot be created through public
registration and must be provisioned through an authorized administrative
process.

## Product variant details

The owner's product list and detail pages read `produk` and `varian_produk`
from PostgreSQL. The detail URL identifies a variant by its `id_varian`.
Optional detail metadata is stored on `varian_produk`: `deskripsi`,
`ingredients_donut`, `ingredients_topping`, and `gambar_url`. Enter ingredients
as one item per line; `gambar_url` accepts a root-relative public asset path or
an HTTP(S) URL. When these optional values are empty, the page displays an
availability message and uses the existing general donut illustration.

The additive SQL is in
`prisma/migrations/20261109144223_add_variant_product_metadata/migration.sql`.
For a database whose `varian_produk` table already exists, apply it with:

```bash
npx prisma db execute --config prisma7.config.ts --file prisma/migrations/20261109144223_add_variant_product_metadata/migration.sql
npx prisma generate --config prisma7.config.ts
```

The owner product form lists active users for the required maker, courier, and
store-guard assignments. When saving, the API synchronizes each selected active
`users` account to its matching legacy operational profile if that profile is
missing, then creates the product and variant atomically. Generated profile
password hashes are unusable random hashes; authentication continues to read
only from `users`.

## Project checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
