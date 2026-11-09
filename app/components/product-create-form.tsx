"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProductFormOptions } from "../../lib/product-queries";

export default function ProductCreateForm({
  options,
}: {
  options: ProductFormOptions;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/pemilik/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Produk gagal disimpan.";
        setError(message);
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("variantId" in result) ||
        typeof result.variantId !== "number"
      ) {
        throw new Error("Respons penyimpanan produk tidak valid.");
      }

      router.push(`/dashboard/pemilik/produk/${result.variantId}`);
      router.refresh();
    } catch (requestError) {
      console.error("Product form submission failed.", requestError);
      setError("Produk gagal disimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
      <div className="demo-form-grid">
        <label className="demo-field" htmlFor="nama_produk">
          <span>Nama Produk</span>
          <input
            id="nama_produk"
            maxLength={100}
            name="nama_produk"
            placeholder="Nama produk"
            required
          />
        </label>
        <label className="demo-field" htmlFor="nama_varian">
          <span>Varian</span>
          <input
            id="nama_varian"
            maxLength={50}
            name="nama_varian"
            placeholder="Nama varian"
            required
          />
        </label>
        <label className="demo-field" htmlFor="harga">
          <span>Harga satuan (Rp)</span>
          <input
            id="harga"
            inputMode="numeric"
            maxLength={19}
            min="1"
            name="harga"
            pattern="[0-9]+"
            placeholder="Contoh: 3000"
            required
          />
        </label>
        <label className="demo-field" htmlFor="satuan">
          <span>Satuan</span>
          <input
            id="satuan"
            maxLength={20}
            name="satuan"
            placeholder="Contoh: pcs"
            required
          />
        </label>
        <label className="demo-field" htmlFor="id_pembuat_user">
          <span>Pembuat Donut</span>
          <AssigneeSelect
            id="id_pembuat_user"
            name="id_pembuat_user"
            options={options.pembuatDonut}
          />
        </label>
        <label className="demo-field" htmlFor="id_pengantar_user">
          <span>Pengantar</span>
          <AssigneeSelect
            id="id_pengantar_user"
            name="id_pengantar_user"
            options={options.pengantar}
          />
        </label>
        <label className="demo-field" htmlFor="id_penjaga_user">
          <span>Penjaga Tempat</span>
          <AssigneeSelect
            id="id_penjaga_user"
            name="id_penjaga_user"
            options={options.penjagaTempat}
          />
        </label>
        <label className="demo-field" htmlFor="deskripsi">
          <span>Deskripsi</span>
          <textarea
            id="deskripsi"
            maxLength={5000}
            name="deskripsi"
            placeholder="Deskripsi produk"
            rows={3}
          />
        </label>
        <label className="demo-field" htmlFor="ingredients_donut">
          <span>Ingredients Donut</span>
          <textarea
            id="ingredients_donut"
            maxLength={5000}
            name="ingredients_donut"
            placeholder="Satu bahan per baris"
            rows={3}
          />
        </label>
        <label className="demo-field" htmlFor="ingredients_topping">
          <span>Ingredients Topping / Olesan</span>
          <textarea
            id="ingredients_topping"
            maxLength={5000}
            name="ingredients_topping"
            placeholder="Satu bahan per baris"
            rows={3}
          />
        </label>
        <label className="demo-field" htmlFor="gambar_url">
          <span>URL Gambar (opsional)</span>
          <input
            id="gambar_url"
            maxLength={500}
            name="gambar_url"
            placeholder="/zazi/nama-gambar.png atau https://..."
          />
        </label>
      </div>

      <div className="demo-form-footer">
        <button
          className="demo-button demo-button-primary"
          disabled={isSaving || hasMissingAssignees(options)}
          type="submit"
        >
          {isSaving ? "Menyimpan..." : "Simpan Produk"}
        </button>
        {hasMissingAssignees(options) ? (
          <p className="demo-error" role="alert">
            Perlu akun aktif pembuat donut, pengantar, dan penjaga tempat
            sebelum produk dapat disimpan.
          </p>
        ) : null}
        {error ? (
          <p className="demo-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function AssigneeSelect({
  id,
  name,
  options,
}: {
  id: string;
  name: string;
  options: ProductFormOptions["pembuatDonut"];
}) {
  return (
    <select defaultValue="" id={id} name={name} required>
      <option disabled value="">
        Pilih akun aktif
      </option>
      {options.map((option) => (
        <option key={option.id_user} value={option.id_user}>
          {option.nama}
        </option>
      ))}
    </select>
  );
}

function hasMissingAssignees(options: ProductFormOptions) {
  return (
    options.pembuatDonut.length === 0 ||
    options.pengantar.length === 0 ||
    options.penjagaTempat.length === 0
  );
}
