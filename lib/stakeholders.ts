export const stakeholders = [
  { id: "pemilik", label: "Pemilik" },
  { id: "penjaga_tempat", label: "Penjaga Tempat" },
  { id: "pembuat_donut", label: "Pembuat Donut" },
  { id: "pengantar", label: "Pengantar" },
] as const;

export type StakeholderId = (typeof stakeholders)[number]["id"] | "pengguna";

export function getStakeholder(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  return (
    stakeholders.find((stakeholder) => stakeholder.id === value) ??
    (value === "pengguna" ? { id: "pengguna", label: "Pengguna" } : undefined)
  );
}
