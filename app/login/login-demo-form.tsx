"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginDemoForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result: { message?: string; redirectTo?: string } =
        await response.json();

      if (!response.ok) {
        setMessage(result.message ?? "Login gagal. Periksa kembali data Anda.");
        return;
      }

      if (!result.redirectTo) {
        setMessage("Respons login tidak valid. Silakan coba kembali.");
        return;
      }

      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setMessage("Tidak dapat menghubungi server. Coba lagi nanti.");
    } finally {
      setIsSubmitting(false);
    }
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
          <section className="login-card" aria-label="Login Zazi Donut">
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
                    required
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
                      href="/recovery"
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
                    required
                    type="password"
                  />
                </div>
              </div>
              <div className="login-actions">
                <button
                  className="login-action"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "MEMPROSES..." : "MASUK"}
                </button>
                <Link
                  className="register-action"
                  href="/register"
                >
                  DAFTAR AKUN BARU
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
