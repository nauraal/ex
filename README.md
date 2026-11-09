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

## Project checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
