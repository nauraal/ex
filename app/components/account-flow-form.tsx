"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AccountFlowFormProps = {
  mode: "register" | "recovery";
};

export default function AccountFlowForm({
  mode,
}: AccountFlowFormProps) {
  const router = useRouter();
  const isRegistration = mode === "register";
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!isRegistration) {
      router.push("/recovery/sent");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formData.get("full-name"),
          username: formData.get("register-username"),
          password: formData.get("register-password"),
          role: formData.get("register-role"),
        }),
      });
      const result: { message?: string } = await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Pendaftaran gagal. Periksa kembali data Anda.");
        return;
      }

      router.push("/register/success");
    } catch {
      setMessage("Tidak dapat menghubungi server. Coba lagi nanti.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page account-flow-page">
      <section className="login-panel" aria-labelledby="account-brand-title">
        <Link className="brand-logo-link" href="/login">
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
              {isRegistration ? "Pendaftaran Akun" : "Pemulihan Akun"}
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
                      autoComplete="new-password"
                      id="register-password"
                      label="Kata Sandi"
                      placeholder="Buat kata sandi"
                      type="password"
                    />
                    <div className="field-group">
                      <label className="field-label" htmlFor="register-role">
                        Daftar sebagai
                      </label>
                      <select
                        className="login-input"
                        defaultValue="pembuat_donut"
                        id="register-role"
                        name="register-role"
                        required
                      >
                        <option value="pembuat_donut">Pembuat Donut</option>
                        <option value="pengantar">Pengantar</option>
                        <option value="penjaga_tempat">Penjaga Tempat</option>
                      </select>
                    </div>
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
                  {isSubmitting
                    ? "MEMPROSES..."
                    : isRegistration
                      ? "DAFTAR"
                      : "KIRIM"}
                </button>
                <Link className="register-action" href="/login">
                  KEMBALI KE LOGIN
                </Link>
              </div>
              <p
                className="login-demo-message"
                role={message ? "alert" : undefined}
                aria-live="polite"
              >
                {message}
              </p>
            </form>
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
