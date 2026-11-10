"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type OperationalOptions = {
  variants: { id_varian: number; label: string }[];
  plans: {
    id_rencana: number;
    label: string;
    id_varian?: number;
    variants?: {
      id_varian: number;
      nama_varian: string;
      jumlah_rencana_varian_pcs: number;
    }[];
  }[];
  materials: { id_bahan: number; nama_bahan: string; satuan: string }[];
  locations: { id_lokasi: number; nama_lokasi: string; alamat_lokasi: string }[];
  couriers: { id_user: number; nama: string }[];
  productions: {
    id_hasil: number;
    label: string;
    variants?: {
      id_varian: number;
      nama_varian: string;
      jumlah_hasil_pcs: number;
      jumlah_rusak_pcs: number;
    }[];
  }[];
  productionDetails: { id_hasil: number; id_varian: number; label: string }[];
  usageMaterials: { id_bahan: number; nama_bahan: string; satuan: string; jumlah_stok: string }[];
  courierAllocations: {
    id_alokasi: number;
    id_pengiriman?: number | null;
    label: string;
  }[];
  incomingShipments: { id_pengiriman: number; jumlah_dikirim: number; label: string }[];
  selectedLocationId?: number;
  selectedPlanId?: number;
  selectedMaterialId?: number;
  selectedProductionId?: number;
  selectedAllocationId?: number;
  selectedShipmentId?: number;
};

export function ProductionPlanForm({ variants }: OperationalOptions) {
  const router = useRouter();
  return (
    <PostForm endpoint="/api/pemilik/rencana" onSuccess={() => { router.push("/dashboard/pemilik/rencana"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Produk dan Varian</span>
            <select name="id_varian" required defaultValue="">
              <option disabled value="">Pilih varian</option>
              {variants.map((item) => <option key={item.id_varian} value={item.id_varian}>{item.label}</option>)}
            </select>
          </label>
          <label className="demo-field">
            <span>Tanggal Produksi</span>
            <input name="tanggal_produksi" type="date" required />
          </label>
          <label className="demo-field">
            <span>Jumlah Rencana (pcs)</span>
            <input min="1" name="jumlah_rencana" type="number" required />
          </label>
          <label className="demo-field">
            <span>Catatan</span>
            <textarea maxLength={5000} name="catatan" rows={3} />
          </label>
          <SubmitButton saving={saving} completed={completed} label="Simpan Rencana" />
        </>
      )}
    </PostForm>
  );
}

export function MaterialRequirementForm({
  plans,
  materials,
}: OperationalOptions) {
  const router = useRouter();
  const [selectedPlanVariant, setSelectedPlanVariant] = useState(
    plans[0]?.id_varian ? `${plans[0].id_rencana}:${plans[0].id_varian}` : "",
  );
  const selectedPlan = plans.find(
    (plan) => `${plan.id_rencana}:${plan.id_varian}` === selectedPlanVariant,
  );
  return (
    <PostForm endpoint="/api/pemilik/bahan" onSuccess={() => { router.push("/dashboard/pemilik/bahan"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Rencana Produksi</span>
            <select
              name="plan_variant"
              onChange={(event) => setSelectedPlanVariant(event.target.value)}
              required
              value={selectedPlanVariant}
            >
              <option disabled value="">Pilih rencana</option>
              {plans.map((item) => (
                <option key={`${item.id_rencana}:${item.id_varian}`} value={`${item.id_rencana}:${item.id_varian}`}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {selectedPlan?.id_varian ? (
            <>
              <input name="id_rencana" type="hidden" value={selectedPlan.id_rencana} />
              <input name="id_varian" type="hidden" value={selectedPlan.id_varian} />
            </>
          ) : null}
          <label className="demo-field">
            <span>Bahan Baku</span>
            <select name="id_bahan" required defaultValue="">
              <option disabled value="">Pilih bahan</option>
              {materials.map((item) => <option key={item.id_bahan} value={item.id_bahan}>{item.nama_bahan} ({item.satuan})</option>)}
            </select>
          </label>
          <label className="demo-field">
            <span>Jumlah Kebutuhan</span>
            <input min="0.01" name="jumlah_kebutuhan" required step="0.001" type="number" />
          </label>
          {!plans.length || !materials.length ? <p className="demo-note">Buat rencana produksi dan data bahan baku terlebih dahulu.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Simpan Kebutuhan" disabled={!plans.length || !materials.length} />
        </>
      )}
    </PostForm>
  );
}

export function IngredientCreateForm({ variants }: OperationalOptions) {
  const router = useRouter();
  return (
    <PostForm endpoint="/api/pemilik/bahan" onSuccess={() => { router.push("/dashboard/pemilik/bahan-stok"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <input name="kind" type="hidden" value="material" />
          <label className="demo-field">
            <span>Nama Bahan</span>
            <input maxLength={50} name="nama_bahan" required />
          </label>
          <label className="demo-field">
            <span>Satuan</span>
            <input maxLength={20} name="satuan" placeholder="kg, gram, liter, pcs" required />
          </label>
          <label className="demo-field">
            <span>Produk Acuan / Penanggung Jawab Produksi</span>
            <select name="id_varian" required defaultValue="">
              <option disabled value="">Pilih varian produk</option>
              {variants.map((item) => <option key={item.id_varian} value={item.id_varian}>{item.label}</option>)}
            </select>
          </label>
          {!variants.length ? <p className="demo-note">Belum ada varian produk di database.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Simpan Bahan Baku" disabled={!variants.length} />
        </>
      )}
    </PostForm>
  );
}

export function ProductStockAdjustmentForm({ variants }: OperationalOptions) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || completed) return;
    const form = new FormData(event.currentTarget);
    const variantId = Number(form.get("id_varian"));
    const delta = Number(form.get("jumlah_perubahan"));
    if (!Number.isSafeInteger(variantId) || variantId < 1 || !Number.isSafeInteger(delta) || delta === 0) {
      setError("Pilih varian dan masukkan perubahan stok berupa bilangan bulat bukan nol.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/pemilik/stok/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah_perubahan: delta }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Stok produk gagal diperbarui."));
        return;
      }
      setCompleted(true);
      setSuccess("Stok produk berhasil diperbarui. Membuka daftar stok...");
      window.setTimeout(() => {
        router.push("/dashboard/pemilik/stok");
        router.refresh();
      }, 700);
    } catch (requestError) {
      console.error("Product stock adjustment form failed.", requestError);
      setError("Stok produk gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="demo-form-grid" onSubmit={submit}>
      <label className="demo-field">
        <span>Produk dan Varian</span>
        <select name="id_varian" required defaultValue="">
          <option disabled value="">Pilih varian</option>
          {variants.map((item) => <option key={item.id_varian} value={item.id_varian}>{item.label}</option>)}
        </select>
      </label>
      <label className="demo-field">
        <span>Perubahan Stok (gunakan angka negatif untuk mengurangi)</span>
        <input name="jumlah_perubahan" required step="1" type="number" />
      </label>
      {!variants.length ? <p className="demo-note">Belum ada varian produk di database.</p> : null}
      {error ? <p className="demo-error" role="alert">{error}</p> : null}
      <button className="demo-button demo-button-primary" disabled={saving || completed || !variants.length} type="submit">
        {completed ? "Tersimpan" : saving ? "Menyimpan..." : "Simpan Perubahan Stok"}
      </button>
      {success ? <p className="demo-success" role="status">{success}</p> : null}
    </form>
  );
}

export function AllocationForm({
  plans: initialPlans,
  locations: initialLocations,
  couriers,
  selectedLocationId: initialSelectedLocationId,
}: OperationalOptions) {
  const [locations, setLocations] = useState(initialLocations);
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialSelectedLocationId ? String(initialSelectedLocationId) : "",
  );
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationSuccess, setLocationSuccess] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const router = useRouter();

  async function addLocation() {
    setLocationError("");
    setLocationSuccess("");
    setSavingLocation(true);
    try {
      const response = await fetch("/api/pemilik/lokasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama_lokasi: locationName, alamat_lokasi: locationAddress }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setLocationError(readMessage(result, "Lokasi gagal disimpan."));
        return;
      }
      if (typeof result === "object" && result !== null && "id_lokasi" in result) {
        const id = result.id_lokasi;
        if (typeof id === "number") {
          setLocations((items) => [...items, { id_lokasi: id, nama_lokasi: locationName, alamat_lokasi: locationAddress }]);
          setSelectedLocationId(String(id));
          setLocationName("");
          setLocationAddress("");
          setLocationSuccess("Lokasi berhasil disimpan.");
        }
      }
    } catch (error) {
      console.error("Sales location request failed.", error);
      setLocationError("Lokasi gagal disimpan.");
    } finally {
      setSavingLocation(false);
    }
  }

  return (
    <PostForm endpoint="/api/pemilik/alokasi" onSuccess={() => { router.push("/dashboard/pemilik/alokasi"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Rencana dengan Hasil dan Stok Tersedia</span>
            <select name="id_rencana_varian" required defaultValue="">
              <option disabled value="">Pilih rencana</option>
              {initialPlans.map((plan) => (
                <option key={`${plan.id_rencana}:${plan.id_varian}`} value={`${plan.id_rencana}:${plan.id_varian}`}>
                  {plan.label}
                </option>
              ))}
            </select>
          </label>
          <label className="demo-field">
            <span>Lokasi Penjualan</span>
            <select
              name="id_lokasi"
              onChange={(event) => setSelectedLocationId(event.target.value)}
              required
              value={selectedLocationId}
            >
              <option disabled value="">Pilih lokasi</option>
              {locations.map((location) => <option key={location.id_lokasi} value={location.id_lokasi}>{location.nama_lokasi} — {location.alamat_lokasi}</option>)}
            </select>
          </label>
          <label className="demo-field">
            <span>Pengantar</span>
            <select name="id_pengantar_user" required defaultValue="">
              <option disabled value="">Pilih pengantar</option>
              {couriers.map((courier) => <option key={courier.id_user} value={courier.id_user}>{courier.nama}</option>)}
            </select>
          </label>
          <label className="demo-field">
            <span>Jumlah Dialokasikan (pcs)</span>
            <input min="1" name="jumlah_alokasi" required type="number" />
          </label>
          <label className="demo-field">
            <span>Tanggal Alokasi</span>
            <input name="tanggal_alokasi" required type="date" />
          </label>
          <SubmitButton saving={saving} completed={completed} label="Simpan Alokasi" disabled={!initialPlans.length || !locations.length || !couriers.length} />
          {!initialPlans.length ? <p className="demo-note">Belum ada hasil produksi dengan stok yang dapat dialokasikan.</p> : null}
          {!couriers.length ? <p className="demo-note">Belum ada akun pengantar aktif.</p> : null}
          {!locations.length ? <p className="demo-note">Tambahkan lokasi sebelum menyimpan alokasi.</p> : null}
          <div className="demo-form-grid allocation-location-create">
            <label className="demo-field">
              <span>Nama Lokasi Baru</span>
              <input onChange={(event) => setLocationName(event.target.value)} value={locationName} />
            </label>
            <label className="demo-field">
              <span>Alamat</span>
              <input onChange={(event) => setLocationAddress(event.target.value)} value={locationAddress} />
            </label>
            <button className="demo-button demo-button-secondary" disabled={savingLocation || !locationName.trim() || !locationAddress.trim()} onClick={addLocation} type="button">
              {savingLocation ? "Menyimpan..." : "Tambah Lokasi"}
            </button>
            {locationError ? <p className="demo-error" role="alert">{locationError}</p> : null}
            {locationSuccess ? <p className="demo-success" role="status">{locationSuccess}</p> : null}
          </div>
        </>
      )}
    </PostForm>
  );
}

export function ProductionResultForm({
  plans,
  selectedPlanId: initialSelectedPlanId,
}: OperationalOptions) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
    initialSelectedPlanId ?? null,
  );
  const selectedPlan = plans.find((plan) => plan.id_rencana === selectedPlanId);
  return (
    <PostForm endpoint="/api/pemilik/produksi" onSuccess={() => { router.push("/dashboard/pembuat_donut/hasil-produksi"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Rencana Produksi</span>
            <select
              name="id_rencana"
              onChange={(event) => setSelectedPlanId(Number(event.target.value))}
              required
              value={selectedPlanId ?? ""}
            >
              <option disabled value="">Pilih rencana</option>
              {plans.map((plan) => <option key={plan.id_rencana} value={plan.id_rencana}>{plan.label}</option>)}
            </select>
          </label>
          {selectedPlan?.variants?.map((variant) => (
            <div className="demo-form-grid" key={variant.id_varian}>
              <p>{variant.nama_varian} — Rencana {variant.jumlah_rencana_varian_pcs} pcs</p>
              <label className="demo-field">
                <span>Jumlah Hasil ({variant.nama_varian})</span>
                <input min="0" name={`jumlah_hasil_${variant.id_varian}`} required type="number" />
              </label>
              <label className="demo-field">
                <span>Jumlah Rusak ({variant.nama_varian})</span>
                <input defaultValue="0" min="0" name={`jumlah_rusak_${variant.id_varian}`} required type="number" />
              </label>
            </div>
          ))}
          <label className="demo-field">
            <span>Catatan Kualitas</span>
            <textarea maxLength={255} name="keterangan_kualitas" rows={3} />
          </label>
          {!plans.length ? <p className="demo-note">Tidak ada rencana yang menunggu hasil produksi.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Simpan Hasil Produksi" disabled={!plans.length} />
        </>
      )}
    </PostForm>
  );
}

export function ProductionDamageForm({
  productions,
  selectedProductionId: initialSelectedProductionId,
}: OperationalOptions) {
  const router = useRouter();
  const [selectedProductionId, setSelectedProductionId] = useState<number | null>(
    initialSelectedProductionId ?? null,
  );
  const selectedProduction = productions.find((production) => production.id_hasil === selectedProductionId);
  return (
    <PostForm endpoint="/api/pemilik/produksi" method="PATCH" onSuccess={() => { router.push("/dashboard/pembuat_donut/kualitas-hasil"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Hasil Produksi</span>
            <select
              name="id_hasil"
              onChange={(event) => setSelectedProductionId(Number(event.target.value))}
              required
              value={selectedProductionId ?? ""}
            >
              <option disabled value="">Pilih hasil produksi</option>
              {productions.map((item) => <option key={item.id_hasil} value={item.id_hasil}>{item.label}</option>)}
            </select>
          </label>
          {selectedProduction?.variants?.map((variant) => (
            <label className="demo-field" key={variant.id_varian}>
              <span>Jumlah Produk Rusak ({variant.nama_varian}, hasil {variant.jumlah_hasil_pcs} pcs)</span>
              <input
                defaultValue={variant.jumlah_rusak_pcs}
                max={variant.jumlah_hasil_pcs}
                min="0"
                name={`jumlah_rusak_${variant.id_varian}`}
                required
                type="number"
              />
            </label>
          ))}
          <label className="demo-field">
            <span>Alasan / Catatan Kualitas</span>
            <textarea maxLength={255} name="keterangan_kualitas" rows={3} />
          </label>
          {!productions.length ? <p className="demo-note">Belum ada hasil produksi yang dapat diperbarui.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Simpan Catatan Kerusakan" disabled={!productions.length} />
        </>
      )}
    </PostForm>
  );
}

export function MaterialUsageForm({
  productionDetails,
  usageMaterials,
  selectedMaterialId: initialSelectedMaterialId,
}: OperationalOptions) {
  const router = useRouter();
  const [selectedMaterialId, setSelectedMaterialId] = useState(
    initialSelectedMaterialId ? String(initialSelectedMaterialId) : "",
  );
  const selectedMaterial = usageMaterials.find(
    (material) => String(material.id_bahan) === selectedMaterialId,
  );
  return (
    <PostForm endpoint="/api/pemilik/bahan/pemakaian" onSuccess={() => { router.push("/dashboard/pembuat_donut/bahan-baku"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Hasil Produksi dan Varian</span>
            <select name="production_detail" required defaultValue="">
              <option disabled value="">Pilih hasil produksi</option>
              {productionDetails.map((detail) => (
                <option key={`${detail.id_hasil}-${detail.id_varian}`} value={`${detail.id_hasil}:${detail.id_varian}`}>
                  {detail.label}
                </option>
              ))}
            </select>
          </label>
          <label className="demo-field">
            <span>Bahan Baku</span>
            <select
              name="id_bahan"
              onChange={(event) => setSelectedMaterialId(event.target.value)}
              required
              value={selectedMaterialId}
            >
              <option disabled value="">Pilih bahan</option>
              {usageMaterials.map((material) => (
                <option key={material.id_bahan} value={material.id_bahan}>
                  {material.nama_bahan} ({material.jumlah_stok} {material.satuan})
                </option>
              ))}
            </select>
          </label>
          {selectedMaterial ? (
            <p className="demo-note">
              Stok {selectedMaterial.nama_bahan}: {selectedMaterial.jumlah_stok} {selectedMaterial.satuan}
            </p>
          ) : null}
          <label className="demo-field">
            <span>Jumlah Pemakaian</span>
            <input min="0.01" name="jumlah_pemakaian" required step="0.01" type="number" />
          </label>
          {!productionDetails.length || !usageMaterials.length ? (
            <p className="demo-note">Catat hasil produksi dan pastikan bahan baku serta stoknya tersedia terlebih dahulu.</p>
          ) : null}
          <SubmitButton
            saving={saving}
            completed={completed}
            label="Simpan Pemakaian Bahan"
            disabled={!productionDetails.length || !usageMaterials.length}
          />
        </>
      )}
    </PostForm>
  );
}

export function CourierShipmentForm({
  courierAllocations,
  selectedAllocationId: initialSelectedAllocationId,
}: OperationalOptions) {
  const router = useRouter();
  const [selectedAllocationId, setSelectedAllocationId] = useState(
    initialSelectedAllocationId ? String(initialSelectedAllocationId) : "",
  );
  const selectedAllocation = courierAllocations.find(
    (allocation) => String(allocation.id_alokasi) === selectedAllocationId,
  );
  return (
    <PostForm endpoint="/api/pengantar/pengiriman" onSuccess={() => { router.push("/dashboard/pengantar/pengiriman"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Alokasi Produk</span>
            <select
              name="id_alokasi"
              onChange={(event) => setSelectedAllocationId(event.target.value)}
              required
              value={selectedAllocationId}
            >
              <option disabled value="">Pilih alokasi</option>
              {courierAllocations.map((item) => <option key={item.id_alokasi} value={item.id_alokasi}>{item.label}</option>)}
            </select>
          </label>
          <input
            name="id_pengiriman"
            type="hidden"
            value={selectedAllocation?.id_pengiriman ?? ""}
          />
          <label className="demo-field">
            <span>Tanggal Pengiriman</span>
            <input name="tanggal_kirim" required type="date" />
          </label>
          <label className="demo-field">
            <span>Status Pengiriman</span>
            <select name="status_pengiriman" required defaultValue="dalam_perjalanan">
              <option value="dalam_perjalanan">Dalam perjalanan</option>
              <option value="terkirim">Terkirim</option>
            </select>
          </label>
          {!courierAllocations.length ? <p className="demo-note">Belum ada alokasi yang ditugaskan kepada akun ini.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Simpan Status Pengiriman" disabled={!courierAllocations.length} />
        </>
      )}
    </PostForm>
  );
}

export function GuardReceiptForm({
  incomingShipments,
  selectedShipmentId: initialSelectedShipmentId,
}: OperationalOptions) {
  const router = useRouter();
  const [selectedShipmentId, setSelectedShipmentId] = useState(
    initialSelectedShipmentId ? String(initialSelectedShipmentId) : "",
  );
  return (
    <PostForm endpoint="/api/penjaga/penerimaan" onSuccess={() => { router.push("/dashboard/penjaga_tempat/riwayat-penerimaan"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Pengiriman Masuk</span>
            <select
              name="id_pengiriman"
              onChange={(event) => setSelectedShipmentId(event.target.value)}
              required
              value={selectedShipmentId}
            >
              <option disabled value="">Pilih pengiriman</option>
              {incomingShipments.map((item) => (
                <option key={item.id_pengiriman} value={item.id_pengiriman}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="demo-field">
            <span>Jumlah Produk Diterima</span>
            <input min="1" name="jumlah_diterima" required type="number" />
          </label>
          <label className="demo-field">
            <span>Kondisi Produk</span>
            <input maxLength={100} name="kondisi_produksi" required />
          </label>
          <label className="demo-field">
            <span>Tanggal Penerimaan</span>
            <input name="tanggal_terima" required type="date" />
          </label>
          {!incomingShipments.length ? <p className="demo-note">Belum ada pengiriman yang menunggu penerimaan.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Konfirmasi Penerimaan" disabled={!incomingShipments.length} />
        </>
      )}
    </PostForm>
  );
}

export function ProductionReportForm({ productions }: OperationalOptions) {
  const router = useRouter();
  return (
    <PostForm endpoint="/api/pemilik/laporan" onSuccess={() => { router.push("/dashboard/pemilik/laporan"); router.refresh(); }}>
      {(saving, completed) => (
        <>
          <label className="demo-field">
            <span>Hasil Produksi</span>
            <select name="id_hasil" required defaultValue="">
              <option disabled value="">Pilih hasil produksi</option>
              {productions.map((item) => <option key={item.id_hasil} value={item.id_hasil}>{item.label}</option>)}
            </select>
          </label>
          <label className="demo-field">
            <span>Jenis Laporan</span>
            <input maxLength={50} name="jenis_laporan" required defaultValue="Laporan Produksi" />
          </label>
          <label className="demo-field">
            <span>Periode Awal</span>
            <input name="periode_awal" required type="date" />
          </label>
          <label className="demo-field">
            <span>Periode Akhir</span>
            <input name="periode_akhir" required type="date" />
          </label>
          <label className="demo-field">
            <span>Tanggal Laporan</span>
            <input name="tanggal_laporan" required type="date" />
          </label>
          {!productions.length ? <p className="demo-note">Laporan dapat dibuat setelah hasil produksi tersimpan.</p> : null}
          <SubmitButton saving={saving} completed={completed} label="Simpan Laporan" disabled={!productions.length} />
        </>
      )}
    </PostForm>
  );
}

export function PlanRowActions({
  id,
  date,
  quantity,
  note,
}: {
  id: number;
  date: string;
  quantity: number;
  note: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    const form = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/pemilik/rencana/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal_produksi: form.tanggal_produksi, jumlah_rencana: Number(form.jumlah_rencana), catatan: form.catatan }),
      });
      const body: unknown = await response.json();
      if (!response.ok) setError(readMessage(body, "Rencana gagal diperbarui."));
      else {
        setSuccess("Rencana berhasil diperbarui.");
        router.refresh();
      }
    } catch (requestError) {
      console.error("Production plan update request failed.", requestError);
      setError("Rencana gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (!window.confirm("Hapus rencana produksi ini? Rencana yang telah dipakai tidak dapat dihapus.")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/pemilik/rencana/${id}`, { method: "DELETE" });
      const body: unknown = await response.json();
      if (!response.ok) setError(readMessage(body, "Rencana gagal dihapus."));
      else {
        setSuccess("Rencana berhasil dihapus.");
        router.refresh();
      }
    } catch (requestError) {
      console.error("Production plan deletion request failed.", requestError);
      setError("Rencana gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <span className="account-row-actions">
      <form className="plan-row-edit" onSubmit={submit}>
        <input aria-label="Tanggal produksi" defaultValue={date} name="tanggal_produksi" required type="date" />
        <input aria-label="Jumlah rencana" defaultValue={quantity} min="1" name="jumlah_rencana" required type="number" />
        <input aria-label="Catatan rencana" defaultValue={note ?? ""} maxLength={5000} name="catatan" />
        <button className="demo-row-link action-button" disabled={saving} type="submit">{saving ? "..." : "Simpan"}</button>
      </form>
      <button className="demo-row-link action-button" disabled={saving} onClick={remove} type="button">Hapus</button>
      {error ? <span className="demo-error" role="alert">{error}</span> : null}
      {success ? <span className="demo-success" role="status">{success}</span> : null}
    </span>
  );
}

export function ProductStockAdjustment({
  variantId,
  quantity,
}: {
  variantId: number;
  quantity: number;
}) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  async function adjust() {
    const value = Number(delta);
    if (!Number.isSafeInteger(value) || value === 0) {
      setError("Masukkan perubahan stok berupa bilangan bulat, misalnya 5 atau -2.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/pemilik/stok/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah_perubahan: value }),
      });
      const body: unknown = await response.json();
      if (!response.ok) setError(readMessage(body, "Stok gagal diperbarui."));
      else {
        setDelta("");
        setSuccess("Stok produk berhasil diperbarui.");
        router.refresh();
      }
    } catch (requestError) {
      console.error("Product stock request failed.", requestError);
      setError("Stok gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <span className="stock-adjustment">
      <span>Stok saat ini: {quantity}</span>
      <input aria-label="Perubahan stok produk" onChange={(event) => setDelta(event.target.value)} placeholder="+/- jumlah" value={delta} />
      <button className="demo-row-link action-button" disabled={saving} onClick={adjust} type="button">{saving ? "..." : "Simpan"}</button>
      {error ? <span className="demo-error" role="alert">{error}</span> : null}
      {success ? <span className="demo-success" role="status">{success}</span> : null}
    </span>
  );
}

export function RawMaterialStockAdjustment({
  materialId,
  quantity,
}: {
  materialId: number;
  quantity: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(quantity);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/pemilik/bahan/${materialId}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah_stok: value }),
      });
      const body: unknown = await response.json();
      if (!response.ok) setError(readMessage(body, "Stok bahan gagal diperbarui."));
      else {
        setSuccess("Stok bahan berhasil diperbarui.");
        router.refresh();
      }
    } catch (requestError) {
      console.error("Material stock request failed.", requestError);
      setError("Stok bahan gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <span className="stock-adjustment">
      <input aria-label="Jumlah stok bahan" min="0" onChange={(event) => setValue(event.target.value)} step="0.001" type="number" value={value} />
      <button className="demo-row-link action-button" disabled={saving} onClick={save} type="button">{saving ? "..." : "Simpan Stok"}</button>
      {error ? <span className="demo-error" role="alert">{error}</span> : null}
      {success ? <span className="demo-success" role="status">{success}</span> : null}
    </span>
  );
}

function PostForm({
  endpoint,
  method = "POST",
  onSuccess,
  children,
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  onSuccess: () => void;
  children: (saving: boolean, completed: boolean) => ReactNode;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [completed, setCompleted] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || completed) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readMessage(body, "Data gagal disimpan."));
        return;
      }
      setSuccess("Data berhasil disimpan. Mengarahkan...");
      setCompleted(true);
      window.setTimeout(onSuccess, 700);
    } catch (requestError) {
      console.error("Database form request failed.", requestError);
      setError("Data gagal disimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="demo-form" onSubmit={submit}>
      <div className="demo-form-grid">{children(saving, completed)}</div>
      {error ? <p className="demo-error" role="alert">{error}</p> : null}
      {success ? <p className="demo-success" role="status">{success}</p> : null}
    </form>
  );
}

function SubmitButton({
  saving,
  completed = false,
  label,
  disabled = false,
}: {
  saving: boolean;
  completed?: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="demo-form-footer">
      <button className="demo-button demo-button-primary" disabled={saving || completed || disabled} type="submit">
        {completed ? "Tersimpan" : saving ? "Menyimpan..." : label}
      </button>
    </div>
  );
}

function readMessage(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : fallback;
}
