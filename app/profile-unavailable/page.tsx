export default function OperationalProfileUnavailablePage() {
  return (
    <main className="dashboard-content">
      <section className="dashboard-home-panel" role="alert">
        <p className="dashboard-eyebrow">Akses dashboard</p>
        <h1>Profil operasional belum tersedia</h1>
        <p>
          Profil untuk akun aktif ini belum tersedia atau belum tersinkron.
          Akses data operasional dibatasi. Hubungi pemilik agar profil akun
          diperiksa.
        </p>
      </section>
    </main>
  );
}
