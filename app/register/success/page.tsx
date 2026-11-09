import Image from "next/image";
import Link from "next/link";

export default function RegistrationSuccessPage() {
  return (
    <main className="account-result-page">
      <Image src="/zazi/logo.png" alt="Zazi Donut" width={90} height={90} />
      <p className="login-role">Pendaftaran Akun</p>
      <h1>Pendaftaran Berhasil</h1>
      <p>
        Data akun telah tersimpan dan menunggu verifikasi. Akun dapat digunakan
        setelah diaktifkan.
      </p>
      <Link className="demo-button demo-button-primary" href="/login">
        Kembali ke Login
      </Link>
    </main>
  );
}
