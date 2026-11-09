import Image from "next/image";
import Link from "next/link";

const products = [
  { name: "Donut Cheese", price: "Rp 9.000", description: "Donat lembut dengan taburan keju." },
  { name: "Donut Chocolate", price: "Rp 8.000", description: "Donat cokelat dengan topping klasik." },
  { name: "Donut Strawberry", price: "Rp 9.000", description: "Donat dengan topping strawberry." },
];

export default function CustomerHomePage() {
  return (
    <main className="customer-home">
      <header className="customer-home-header">
        <Link className="customer-home-brand" href="/pengguna">
          <Image src="/zazi/logo.png" alt="" width={48} height={48} />
          <span>ZAZI DONUT</span>
        </Link>
        <nav aria-label="Navigasi Pengguna">
          <Link href="#menu-donat">Menu Donat</Link>
          <Link href="/pengguna">Keluar</Link>
        </nav>
      </header>
      <section className="customer-home-hero">
        <div>
          <p className="dashboard-eyebrow">PENGGUNA</p>
          <h1>Selamat Datang di Zazi Donut</h1>
          <p>Pilih donat favorit Anda dari menu yang tersedia.</p>
          <a className="demo-button demo-button-primary" href="#menu-donat">
            Lihat Menu
          </a>
        </div>
        <Image
          src="/zazi/donut.png"
          alt="Donat Zazi Donut"
          width={280}
          height={280}
          priority
        />
      </section>
      <section className="customer-home-menu" id="menu-donat">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">MENU</p>
            <h2>Donat Favorit</h2>
          </div>
          <span className="dashboard-section-count">3 pilihan</span>
        </div>
        <div className="customer-product-grid">
          {products.map((product) => (
            <article className="customer-product-card" key={product.name}>
              <Image
                src="/zazi/donut.png"
                alt=""
                width={150}
                height={150}
              />
              <div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <strong>{product.price}</strong>
              </div>
              <Link
                className="demo-button demo-button-secondary"
                href="/pengguna"
              >
                Kembali ke Gerai
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
