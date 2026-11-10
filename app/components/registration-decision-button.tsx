"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistrationDecisionButton({
  userId,
  status,
  label,
}: {
  userId: number;
  status: "aktif" | "ditolak";
  label: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submitDecision() {
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/pemilik/registrasi/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Keputusan registrasi gagal disimpan.";
        setError(message);
        return;
      }

      setSuccess(status === "aktif" ? "Pendaftaran disetujui." : "Pendaftaran ditolak.");
      router.refresh();
    } catch (requestError) {
      console.error("Registration decision request failed.", requestError);
      setError("Keputusan registrasi gagal disimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <span className="registration-action">
      <button
        className="demo-row-link registration-action-button"
        disabled={isSaving}
        onClick={submitDecision}
        type="button"
      >
        {isSaving ? "Menyimpan..." : label}
      </button>
      {error ? (
        <span className="demo-error" role="alert">
          {error}
        </span>
      ) : null}
      {success ? <span className="demo-success" role="status">{success}</span> : null}
    </span>
  );
}
