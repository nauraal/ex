import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStakeholder } from "../../../lib/stakeholders";

export const instant = false;

export default async function RecoverySentPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const { role: roleParam } = await searchParams;
  const stakeholder = getStakeholder(roleParam);
  if (!stakeholder) redirect("/");

  return (
    <main className="account-result-page">
      <Image src="/zazi/logo.png" alt="Zazi Donut" width={90} height={90} />
      <p className="login-role">Pemulihan Akun</p>
      <h1>Permintaan Terkirim</h1>
      <p>
        Instruksi pemulihan untuk {stakeholder.label} ditampilkan sebagai
        simulasi dan tidak mengirim email.
      </p>
      <Link className="demo-button demo-button-primary" href={`/login?role=${stakeholder.id}`}>
        Kembali ke Login
      </Link>
      <Link className="demo-text-link" href="/">
        Pilih Stakeholder Lain
      </Link>
    </main>
  );
}
