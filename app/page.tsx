import Image from "next/image";
import Link from "next/link";
import { stakeholders } from "../lib/stakeholders";

export default function Home() {
  return (
    <main className="stakeholder-page">
      <section
        className="stakeholder-panel"
        aria-labelledby="stakeholder-brand-title"
      >
        <Image
          className="brand-logo"
          src="/zazi/logo.png"
          alt="Zazi Donut"
          width={141}
          height={141}
          priority
        />

        <div className="stakeholder-content">
          <Image
            className="donut-illustration stakeholder-donut"
            src="/zazi/donut.png"
            alt=""
            width={297}
            height={297}
            priority
          />
          <h1 className="brand-title" id="stakeholder-brand-title">
            ZAZI DONUT
          </h1>

          <section className="stakeholder-card" aria-labelledby="role-heading">
            <h2 className="role-heading" id="role-heading">
              Stakeholder
            </h2>
            <p className="role-instruction">Pilih peran yang sesuai!</p>
            <div className="stakeholder-options">
              {stakeholders.map((stakeholder) => (
                <Link
                  className="stakeholder-option"
                  href={`/login?role=${stakeholder.id}`}
                  key={stakeholder.id}
                >
                  {stakeholder.label.toUpperCase()}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>

      <aside className="photo-panel" aria-label="Foto gerai Zazi Donut">
        <Image
          className="shop-photo"
          src="/zazi/shop.jpeg"
          alt="Gerai Zazi Donut"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 44.5vw"
        />
        <Link className="customer-mode-link" href="/pengguna">
          Halaman Pengguna
        </Link>
      </aside>
    </main>
  );
}
