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

## Registration decision history

The owner registration screen stores approval/rejection decisions and their
processor and timestamp in `riwayat_registrasi`. Before deploying this change,
verify `DATABASE_URL` points to the intended PostgreSQL database and apply the
additive SQL migration:

```bash
npm exec -- prisma db execute --file=prisma/migrations/20261109225000_add_registration_history/migration.sql
```

The migration does not reset or delete existing data.

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

## Operational data

Planning, production results, raw-material stock and use, product stock,
allocations, shipping, receipts, and production reports are stored in their
corresponding PostgreSQL tables through role-checked Route Handlers. Dashboard
tables and summary metrics query the signed-in user's operational assignments;
unconnected legacy forms are not presented as saved data.

The additive planning and stock schema is in
`prisma/migrations/20261109235500_add_operational_planning_and_stock/migration.sql`.
For an existing database without Prisma migration history, verify that
`DATABASE_URL` targets the intended Neon database before applying this SQL
with Prisma `db execute`. Do not reset or force-push the database. Transaction
operations use an extended wait window to accommodate Neon connection wake-up.

For Vercel, configure `DATABASE_URL` and `SESSION_SECRET` in the Production
environment, then verify the target database schema before deploying. Local
environment variables do not configure Vercel.

## Project checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
