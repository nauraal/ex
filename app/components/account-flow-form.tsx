"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { StakeholderId } from "../../lib/stakeholders";

type AccountFlowFormProps = {
  role: StakeholderId;
  stakeholder: string;
  mode: "register" | "recovery";
};

export default function AccountFlowForm({
  role,
  stakeholder,
  mode,
}: AccountFlowFormProps) {
  const router = useRouter();
  const isRegistration = mode === "register";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      isRegistration
        ? `/register/success?role=${role}`
        : `/recovery/sent?role=${role}`,
    );
  }

  return (
    <main className="login-page account-flow-page">
      <section className="login-panel" aria-labelledby="account-brand-title">
        <Link className="brand-logo-link" href="/">
          <Image
            className="brand-logo"
            src="/zazi/logo.png"
            alt="Zazi Donut"
            width={141}
            height={141}
            priority
          />
        </Link>
        <div className="login-content">
          <Image
            className="donut-illustration"
            src="/zazi/donut.png"
            alt=""
            width={297}
            height={297}
            priority
          />
          <h1 className="brand-title" id="account-brand-title">
            ZAZI DONUT
          </h1>
          <section className="login-card account-flow-card">
            <p className="login-role">
              {isRegistration ? "Pendaftaran Akun" : "Pemulihan Akun"} ·{" "}
              {stakeholder}
            </p>
            <h2 className="login-heading">
              {isRegistration ? "Daftar Akun Baru" : "Recovery Password"}
            </h2>
            <form className="account-flow-form" onSubmit={submit}>
              <div className="login-fields">
                {isRegistration ? (
                  <>
                    <AccountField
                      autoComplete="name"
                      id="full-name"
                      label="Nama Lengkap"
                      placeholder="Masukkan nama lengkap"
                    />
                    <AccountField
                      autoComplete="username"
                      id="register-username"
                      label="Username"
                      placeholder="Buat username"
                    />
                    <AccountField
                      autoComplete="email"
                      id="register-email"
                      label="Email"
                      placeholder="nama@email.com"
                      type="email"
                    />
                    <AccountField
                      autoComplete="new-password"
                      id="register-password"
                      label="Kata Sandi"
                      placeholder="Buat kata sandi"
                      type="password"
                    />
                  </>
                ) : (
                  <>
                    <AccountField
                      autoComplete="username"
                      id="recovery-username"
                      label="Username"
                      placeholder="Masukkan username"
                    />
                    <AccountField
                      autoComplete="email"
                      id="recovery-email"
                      label="Email"
                      placeholder="Alamat email terdaftar"
                      type="email"
                    />
                  </>
                )}
              </div>
              <div className="login-actions account-flow-actions">
                <button className="login-action" type="submit">
                  {isRegistration ? "DAFTAR" : "KIRIM"}
                </button>
                <Link
                  className="register-action"
                  href={`/login?role=${role}`}
                >
                  KEMBALI KE LOGIN
                </Link>
              </div>
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

function AccountField({
  autoComplete,
  id,
  label,
  placeholder,
  type = "text",
}: {
  autoComplete: string;
  id: string;
  label: string;
  placeholder: string;
  type?: "email" | "password" | "text";
}) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className="login-input"
        id={id}
        name={id}
        placeholder={placeholder}
        required
        type={type}
      />
    </div>
  );
}
