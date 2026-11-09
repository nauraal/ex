"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { StakeholderId } from "../../lib/stakeholders";

export default function LoginDemoForm({
  role,
  stakeholder,
}: {
  role: StakeholderId;
  stakeholder: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Mode demonstrasi: membuka halaman sesuai stakeholder.");
    router.push(
      role === "pemilik"
        ? "/pemilik"
        : role === "pengguna"
          ? "/pengguna/beranda"
          : `/dashboard/${role}`,
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="brand-title">
        <Image
          className="brand-logo"
          src="/zazi/logo.png"
          alt="Zazi Donut"
          width={141}
          height={141}
          priority
        />
        <div className="login-content">
          <Image
            className="donut-illustration"
            src="/zazi/donut.png"
            alt=""
            width={297}
            height={297}
            priority
          />
          <h1 className="brand-title" id="brand-title">
            ZAZI DONUT
          </h1>
          <section className="login-card" aria-label={`Login ${stakeholder}`}>
            <p className="login-role">Masuk sebagai {stakeholder}</p>
            <h2 className="login-heading">
              Sistem Informasi Produksi dan Distribusi
            </h2>
            <form className="login-demo-form" onSubmit={signIn}>
              <div className="login-fields">
                <div className="field-group">
                  <label className="field-label" htmlFor="username">
                    Username
                  </label>
                  <input
                    autoComplete="username"
                    className="login-input"
                    id="username"
                    name="username"
                    placeholder="Masukkan username"
                    type="text"
                  />
                </div>
                <div className="field-group">
                  <div className="field-label-row">
                    <label className="field-label" htmlFor="password">
                      Kata Sandi
                    </label>
                    <Link
                      className="recovery-action"
                      href={`/recovery?role=${role}`}
                    >
                      Recovery Password
                    </Link>
                  </div>
                  <input
                    autoComplete="current-password"
                    className="login-input"
                    id="password"
                    name="password"
                    placeholder="Masukkan kata sandi"
                    type="password"
                  />
                </div>
              </div>
              <div className="login-actions">
                <button className="login-action" type="submit">
                  MASUK
                </button>
                <Link
                  className="register-action"
                  href={`/register?role=${role}`}
                >
                  DAFTAR AKUN BARU
                </Link>
              </div>
              <p className="login-demo-message" aria-live="polite">
                {message}
              </p>
            </form>
            <Link className="login-back" href="/">
              Ganti stakeholder
            </Link>
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
      </aside>
    </main>
  );
}
