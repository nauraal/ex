"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type EditableProductVariant = {
  id_varian: number;
  nama_varian: string;
  harga: string;
  deskripsi: string | null;
  ingredients_donut: string | null;
  ingredients_topping: string | null;
  gambar_url: string | null;
  produk: {
    nama_produk: string;
    satuan: string;
  };
};

export default function ProductManagement({
  variant,
}: {
  variant: EditableProductVariant;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget).entries());
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/pemilik/produk/${variant.id_varian}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Produk gagal diperbarui."));
        return;
      }
      dialog.current?.close();
      router.refresh();
    } catch (requestError) {
      console.error("Product update request failed.", requestError);
      setError("Produk gagal diperbarui. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Hapus varian ${variant.nama_varian}? Varian dengan stok atau riwayat operasional tidak dapat dihapus.`)) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/pemilik/produk/${variant.id_varian}`, {
        method: "DELETE",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Varian produk gagal dihapus."));
        return;
      }
      router.push("/dashboard/pemilik/produk");
      router.refresh();
    } catch (requestError) {
      console.error("Product deletion request failed.", requestError);
      setError("Varian produk gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-management-actions">
      <button
        className="demo-button demo-button-secondary"
        disabled={saving}
        onClick={() => { setError(""); dialog.current?.showModal(); }}
        type="button"
      >
        Edit Produk
      </button>
      <button className="demo-button demo-button-secondary" disabled={saving} onClick={remove} type="button">
        Hapus Varian
      </button>
      {error ? <p className="demo-error" role="alert">{error}</p> : null}
      <dialog className="account-dialog" ref={dialog}>
        <form className="demo-form" onSubmit={save}>
          <h2>Edit Produk dan Varian</h2>
          <label className="demo-field">
            <span>Nama Produk</span>
            <input defaultValue={variant.produk.nama_produk} maxLength={100} name="nama_produk" required />
          </label>
          <label className="demo-field">
            <span>Nama Varian</span>
            <input defaultValue={variant.nama_varian} maxLength={50} name="nama_varian" required />
          </label>
          <label className="demo-field">
            <span>Harga varian (Rp)</span>
            <input defaultValue={variant.harga} inputMode="numeric" maxLength={19} min="1" name="harga" pattern="[0-9]+" required />
          </label>
          <label className="demo-field">
            <span>Satuan</span>
            <input defaultValue={variant.produk.satuan} maxLength={20} name="satuan" required />
          </label>
          <label className="demo-field">
            <span>Deskripsi</span>
            <textarea defaultValue={variant.deskripsi ?? ""} maxLength={5000} name="deskripsi" rows={3} />
          </label>
          <label className="demo-field">
            <span>Ingredients Donut</span>
            <textarea defaultValue={variant.ingredients_donut ?? ""} maxLength={5000} name="ingredients_donut" rows={3} />
          </label>
          <label className="demo-field">
            <span>Ingredients Topping / Olesan</span>
            <textarea defaultValue={variant.ingredients_topping ?? ""} maxLength={5000} name="ingredients_topping" rows={3} />
          </label>
          <label className="demo-field">
            <span>URL Gambar</span>
            <input defaultValue={variant.gambar_url ?? ""} maxLength={500} name="gambar_url" />
          </label>
          {error ? <p className="demo-error" role="alert">{error}</p> : null}
          <div className="demo-form-footer">
            <button className="demo-button demo-button-primary" disabled={saving} type="submit">{saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
            <button className="demo-button demo-button-secondary" onClick={() => dialog.current?.close()} type="button">Batal</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function readMessage(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : fallback;
}
