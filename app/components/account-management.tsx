"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const roles = [
  ["pembuat_donut", "Pembuat Donut"],
  ["pengantar", "Pengantar"],
  ["penjaga_tempat", "Penjaga Tempat"],
] as const;

const statuses = [
  ["menunggu_verifikasi", "Menunggu Verifikasi"],
  ["aktif", "Aktif"],
  ["ditolak", "Ditolak / Nonaktif"],
] as const;

export function AccountCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/pemilik/pengguna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Pengguna gagal disimpan."));
        return;
      }
      router.push("/dashboard/pemilik/pengguna");
      router.refresh();
    } catch (requestError) {
      console.error("User creation request failed.", requestError);
      setError("Pengguna gagal disimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="demo-form" onSubmit={submit}>
      <div className="demo-form-grid">
        <label className="demo-field" htmlFor="account-name">
          <span>Nama Lengkap</span>
          <input autoComplete="name" id="account-name" maxLength={255} name="nama" required />
        </label>
        <label className="demo-field" htmlFor="account-username">
          <span>Username</span>
          <input autoComplete="username" id="account-username" maxLength={100} name="username" required />
        </label>
        <label className="demo-field" htmlFor="account-password">
          <span>Kata Sandi</span>
          <input autoComplete="new-password" id="account-password" maxLength={72} minLength={8} name="password" required type="password" />
        </label>
        <label className="demo-field" htmlFor="account-role">
          <span>Role</span>
          <select defaultValue="" id="account-role" name="role" required>
            <option disabled value="">Pilih role</option>
            {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="demo-form-footer">
        <button className="demo-button demo-button-primary" disabled={saving} type="submit">
          {saving ? "Menyimpan..." : "Simpan Pengguna"}
        </button>
        <p className="demo-note">Akun baru menunggu verifikasi. Akun pemilik tidak dapat dibuat dari formulir ini.</p>
        {error ? <p className="demo-error" role="alert">{error}</p> : null}
      </div>
    </form>
  );
}

export function AccountRowActions({
  userId,
  name,
  username,
  status,
}: {
  userId: number;
  name: string;
  username: string;
  status: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/pemilik/pengguna/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: values.nama,
          username: values.username,
          status_registrasi: values.status_registrasi,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Perubahan pengguna gagal disimpan."));
        return;
      }
      dialog.current?.close();
      router.refresh();
    } catch (requestError) {
      console.error("User update request failed.", requestError);
      setError("Perubahan pengguna gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!window.confirm(`Nonaktifkan akun ${name} (${username})? Data operasional tidak akan dihapus.`)) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/pemilik/pengguna/${userId}`, { method: "DELETE" });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Pengguna gagal dinonaktifkan."));
        return;
      }
      router.refresh();
    } catch (requestError) {
      console.error("User deactivation request failed.", requestError);
      setError("Pengguna gagal dinonaktifkan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="account-row-actions">
      <button className="demo-row-link action-button" disabled={saving} onClick={() => { setError(""); dialog.current?.showModal(); }} type="button">Edit</button>
      {status !== "ditolak" ? <button className="demo-row-link action-button" disabled={saving} onClick={deactivate} type="button">Nonaktifkan</button> : null}
      {error ? <span className="demo-error" role="alert">{error}</span> : null}
      <dialog className="account-dialog" ref={dialog}>
        <form className="demo-form" onSubmit={update}>
          <h2>Ubah Data Pengguna</h2>
          <label className="demo-field" htmlFor={`account-name-${userId}`}>
            <span>Nama Lengkap</span>
            <input defaultValue={name} id={`account-name-${userId}`} maxLength={255} name="nama" required />
          </label>
          <label className="demo-field" htmlFor={`account-username-${userId}`}>
            <span>Username</span>
            <input defaultValue={username} id={`account-username-${userId}`} maxLength={100} name="username" required />
          </label>
          <label className="demo-field" htmlFor={`account-status-${userId}`}>
            <span>Status</span>
            <select defaultValue={status} id={`account-status-${userId}`} name="status_registrasi" required>
              {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {error ? <p className="demo-error" role="alert">{error}</p> : null}
          <div className="demo-form-footer">
            <button className="demo-button demo-button-primary" disabled={saving} type="submit">{saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
            <button className="demo-button demo-button-secondary" onClick={() => dialog.current?.close()} type="button">Batal</button>
          </div>
        </form>
      </dialog>
    </span>
  );
}

function readMessage(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : fallback;
}
