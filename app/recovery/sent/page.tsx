import Image from "next/image";
import Link from "next/link";

export default function RecoverySentPage() {
  return (
    <main className="account-result-page">
      <Image src="/zazi/logo.png" alt="Zazi Donut" width={90} height={90} />
      <p className="login-role">Pemulihan Akun</p>
      <h1>Pemulihan Belum Aktif</h1>
      <p>
        Fitur reset password belum dikonfigurasi. Tidak ada email atau permintaan
        reset yang dikirim.
      </p>
      <Link className="demo-button demo-button-primary" href="/login">
        Kembali ke Login
      </Link>
    </main>
  );
}
