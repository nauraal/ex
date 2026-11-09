import Image from "next/image";
import Link from "next/link";

export default function RecoverySentPage() {
  return (
    <main className="account-result-page">
      <Image src="/zazi/logo.png" alt="Zazi Donut" width={90} height={90} />
      <p className="login-role">Pemulihan Akun</p>
      <h1>Permintaan Terkirim</h1>
      <p>Instruksi pemulihan ditampilkan sebagai simulasi dan tidak mengirim email.</p>
      <Link className="demo-button demo-button-primary" href="/login">
        Kembali ke Login
      </Link>
    </main>
  );
}
