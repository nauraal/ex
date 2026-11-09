"use client";

import { useState, type FormEvent } from "react";
import type { DemoField } from "../../lib/dashboard-config";

type DemoFormProps = {
  fields: DemoField[];
  submitLabel?: string;
  validation?: "allocation";
};

export default function DemoForm({
  fields,
  submitLabel = "Simpan",
  validation,
}: DemoFormProps) {
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const location = String(formData.get("lokasi") ?? "");
    const allocationLimit = location.includes("Cimahi") ? 40 : 50;
    if (
      validation === "allocation" &&
      Number(formData.get("jumlah")) > allocationLimit
    ) {
      setError(
        `Jumlah alokasi melebihi kapasitas lokasi (${allocationLimit} pcs).`,
      );
      return;
    }

    setError("Formulir ini belum terhubung ke penyimpanan database.");
  }

  return (
    <form className="demo-form" onSubmit={handleSubmit}>
      <div className="demo-form-grid">
        {fields.map((field) => (
          <label className="demo-field" htmlFor={field.name} key={field.name}>
            <span>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                defaultValue={field.defaultValue}
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                rows={3}
                required
              />
            ) : field.type === "select" ? (
              <select
                id={field.name}
                name={field.name}
                required
                defaultValue={field.defaultValue ?? ""}
              >
                <option disabled value="">
                  Pilih {field.label.toLowerCase()}
                </option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                min={field.type === "number" ? 0 : undefined}
                name={field.name}
                placeholder={field.placeholder}
                required
                type={field.type}
                defaultValue={field.defaultValue}
              />
            )}
          </label>
        ))}
      </div>
      <div className="demo-form-footer">
        <button className="demo-button demo-button-primary" type="submit">
          {submitLabel}
        </button>
        {error ? (
          <p className="demo-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
