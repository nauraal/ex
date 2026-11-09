export type DashboardRole =
  | "pemilik"
  | "pembuat_donut"
  | "pengantar"
  | "penjaga_tempat";

export type DashboardTheme = "owner" | "maker" | "courier" | "guard";

export type DashboardModule = {
  id: string;
  label: string;
};

export type DashboardNavigationItem = DashboardModule & {
  href: string;
};

export type DemoRow = {
  values: string[];
  href: string;
  date?: string;
  actionLabel?: string;
  actions?: {
    label: string;
    href: string;
    registrationDecision?: "aktif" | "ditolak";
    userId?: number;
    accountId?: number;
    accountName?: string;
    accountUsername?: string;
    accountStatus?: string;
    planId?: number;
    planDate?: string;
    planQuantity?: number;
    planNote?: string | null;
    stockVariantId?: number;
    stockQuantity?: number;
    rawMaterialId?: number;
    rawMaterialQuantity?: string;
  }[];
};

export type DemoField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "select" | "textarea";
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
};

export type DemoScreen = {
  slug: string;
  menuId: string;
  title: string;
  description: string;
  kind: "table" | "detail" | "form" | "report";
  columns?: string[];
  rows?: DemoRow[];
  details?: { label: string; value: string }[];
  fields?: DemoField[];
  validation?: "allocation";
  submitLabel?: string;
  tabs?: { label: string; href: string }[];
  backHref?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  relatedLinks?: { label: string; href: string }[];
  note?: string;
};

export type DashboardConfig = {
  role: DashboardRole;
  label: string;
  theme: DashboardTheme;
  welcome: string;
  modules: DashboardModule[];
  metrics: { label: string; value: string; tone: string }[];
  screens: DemoScreen[];
};

const row = (values: string[], href: string, actionLabel = "Lihat") => ({
  values,
  href,
  actionLabel,
});

const field = (
  name: string,
  label: string,
  type: DemoField["type"] = "text",
  placeholder?: string,
  options?: string[],
): DemoField => ({ name, label, type, placeholder, options });

const ownerModules: DashboardModule[] = [
  { id: "verifikasi", label: "Verifikasi Registrasi" },
  { id: "produk", label: "Produk dan Varian" },
  { id: "rencana", label: "Rencana Produksi" },
  { id: "bahan", label: "Kebutuhan Bahan Baku" },
  { id: "stok", label: "Stok Produk" },
  { id: "alokasi", label: "Alokasi Produk" },
  { id: "laporan", label: "Laporan Produksi" },
];

const ownerScreens: DemoScreen[] = [
  {
    slug: "verifikasi",
    menuId: "verifikasi",
    title: "Verifikasi Registrasi",
    description: "Periksa dan tindak lanjuti permintaan akun mitra.",
    kind: "table",
    columns: ["No.", "Nama", "Username", "Jenis Stakeholder", "Status", "Aksi"],
    rows: [],
    tabs: [
      { label: "Permintaan Registrasi", href: "verifikasi" },
      { label: "Data Pengguna", href: "pengguna" },
      { label: "Riwayat Registrasi", href: "registrasi-riwayat" },
    ],
  },
  {
    slug: "pengguna",
    menuId: "verifikasi",
    title: "Data Pengguna",
    description: "Daftar akun stakeholder yang tersimpan di database.",
    kind: "table",
    columns: ["No.", "Nama", "Username", "Stakeholder", "Status", "Aksi"],
    rows: [],
    tabs: [
      { label: "Permintaan Registrasi", href: "verifikasi" },
      { label: "Data Pengguna", href: "pengguna" },
      { label: "Riwayat Registrasi", href: "registrasi-riwayat" },
    ],
    primaryAction: { label: "Tambah Pengguna", href: "pengguna-form" },
  },
  {
    slug: "registrasi-riwayat",
    menuId: "verifikasi",
    title: "Riwayat Registrasi",
    description: "Status registrasi, waktu perubahan, dan pemroses dari database.",
    kind: "table",
    columns: [
      "No.",
      "Nama",
      "Username",
      "Stakeholder",
      "Status",
      "Waktu",
      "Diproses oleh",
      "Aksi",
    ],
    rows: [],
    tabs: [
      { label: "Permintaan Registrasi", href: "verifikasi" },
      { label: "Data Pengguna", href: "pengguna" },
      { label: "Riwayat Registrasi", href: "registrasi-riwayat" },
    ],
  },
  {
    slug: "pengguna-form",
    menuId: "verifikasi",
    title: "Tambah Pengguna",
    description: "Buat akun pengguna yang tersimpan di database.",
    kind: "form",
    backHref: "pengguna",
  },
  {
    slug: "produk",
    menuId: "produk",
    title: "Produk dan Varian",
    description: "Daftar produk donat dan varian yang dikelola.",
    kind: "table",
    columns: ["No.", "Nama Produk", "Varian", "Harga", "Status", "Aksi"],
    rows: [],
    primaryAction: { label: "Tambah Produk", href: "produk-form" },
  },
  {
    slug: "produk-form",
    menuId: "produk",
    title: "Tambah Produk dan Varian",
    description: "Masukkan data produk dan varian yang akan disimpan.",
    kind: "form",
    backHref: "produk",
  },
  {
    slug: "rencana",
    menuId: "rencana",
    title: "Rencana Produksi",
    description: "Jadwal produksi donat yang perlu disiapkan.",
    kind: "table",
    columns: ["No.", "Kode Rencana", "Tanggal Produksi", "Produk", "Jumlah", "Status", "Aksi"],
    rows: [],
    primaryAction: { label: "Tambah Rencana", href: "rencana-form" },
  },
  {
    slug: "rencana-form",
    menuId: "rencana",
    title: "Tambah Rencana Produksi",
    description: "Tentukan produk dan target produksi.",
    kind: "form",
    backHref: "rencana",
    fields: [
      field("kode", "Kode Rencana Produksi", "text", "RP-004"),
      field("tanggal", "Tanggal Produksi", "date"),
      field("produk", "Nama Produk", "select", undefined, [
        "Donut Cheese",
        "Donut Chocolate",
        "Donut Strawberry",
      ]),
      field("jumlah", "Jumlah Produksi", "number", "Jumlah produk"),
      field("catatan", "Catatan", "textarea", "Catatan rencana produksi"),
    ],
  },
  {
    slug: "bahan",
    menuId: "bahan",
    title: "Kebutuhan Bahan Baku",
    description: "Kelola kebutuhan bahan untuk rencana produksi.",
    kind: "table",
    columns: ["No.", "Nama Bahan", "Rencana Produksi", "Kebutuhan", "Satuan", "Aksi"],
    rows: [],
    primaryAction: { label: "Tambah Kebutuhan", href: "bahan-form" },
    secondaryAction: { label: "Stok Bahan Baku", href: "bahan-stok" },
    relatedLinks: [{ label: "Tambah Bahan Baku", href: "bahan-material-form" }],
  },
  {
    slug: "bahan-form",
    menuId: "bahan",
    title: "Tambah Kebutuhan Bahan Baku",
    description: "Catat kebutuhan bahan pada rencana produksi.",
    kind: "form",
    backHref: "bahan",
    fields: [
      field("rencana", "Rencana Produksi", "select", undefined, ["RP-001", "RP-002", "RP-003"]),
      field("bahan", "Nama Bahan", "text", "Nama bahan baku"),
      field("jumlah", "Jumlah Kebutuhan", "number", "Jumlah"),
      field("satuan", "Satuan", "select", undefined, ["kg", "gram", "liter", "pcs"]),
    ],
  },
  {
    slug: "bahan-material-form",
    menuId: "bahan",
    title: "Tambah Bahan Baku",
    description: "Tambahkan bahan baku yang digunakan pada produksi.",
    kind: "form",
    backHref: "bahan",
  },
  {
    slug: "bahan-stok",
    menuId: "bahan",
    title: "Stok Bahan Baku",
    description: "Saldo bahan baku aktual yang tersimpan di database.",
    kind: "table",
    columns: ["No.", "Nama Bahan", "Stok", "Satuan", "Status", "Aksi"],
    rows: [],
    backHref: "bahan",
  },
  {
    slug: "stok",
    menuId: "stok",
    title: "Stok Produk",
    description: "Pantau jumlah produk yang tersedia.",
    kind: "table",
    primaryAction: { label: "Ubah Stok", href: "stok-form" },
    columns: ["No.", "Kode Produk", "Nama Produk", "Varian", "Jumlah Stok", "Aksi"],
    rows: [],
  },
  {
    slug: "stok-form",
    menuId: "stok",
    title: "Tambah Stok Produk",
    description: "Sesuaikan saldo stok produk yang tersimpan di database.",
    kind: "form",
    backHref: "stok",
    fields: [
      field("produk", "Produk", "select", undefined, ["Donut Cheese", "Donut Chocolate", "Donut Strawberry"]),
      field("jumlah", "Jumlah Produk", "number", "Jumlah"),
      field("tanggal", "Tanggal Pencatatan", "date"),
      field("catatan", "Catatan", "textarea", "Catatan stok"),
    ],
  },
  {
    slug: "alokasi",
    menuId: "alokasi",
    title: "Alokasi Produk",
    description: "Pilih hasil produksi yang akan dikirim ke lokasi.",
    kind: "table",
    columns: ["No.", "Kode Alokasi", "Produk", "Lokasi", "Jumlah", "Tanggal", "Aksi"],
    rows: [],
    primaryAction: { label: "Tambah Alokasi", href: "alokasi-form" },
    secondaryAction: { label: "Riwayat Alokasi", href: "alokasi-riwayat" },
  },
  {
    slug: "alokasi-lokasi",
    menuId: "alokasi",
    title: "Pilih Lokasi Penjualan",
    description: "Tentukan lokasi tujuan dan jumlah produk yang dikirim.",
    kind: "table",
    columns: ["No.", "Lokasi", "Penjaga Tempat", "Kapasitas", "Aksi"],
    rows: [
      row(["1", "Zazi Donut - Bandung", "Rina Kurnia", "50 pcs"], "alokasi-form", "Pilih"),
      row(["2", "Zazi Donut - Cimahi", "Sari Wulandari", "40 pcs"], "alokasi-form", "Pilih"),
    ],
    backHref: "alokasi",
  },
  {
    slug: "alokasi-riwayat",
    menuId: "alokasi",
    title: "Riwayat Alokasi Produk",
    description: "Daftar produk yang telah dialokasikan ke setiap lokasi.",
    kind: "table",
    columns: ["No.", "Kode Alokasi", "Produk", "Lokasi", "Jumlah", "Status", "Aksi"],
    rows: [
      row(["1", "AL-001", "Donut Cheese", "Bandung", "50 pcs", "Dikirim"], "laporan-detail"),
      row(["2", "AL-002", "Donut Chocolate", "Cimahi", "40 pcs", "Dikirim"], "laporan-detail"),
    ],
    backHref: "alokasi",
  },
  {
    slug: "alokasi-form",
    menuId: "alokasi",
    title: "Tambah Alokasi Produk",
    description: "Tentukan lokasi dan jumlah produk yang dialokasikan.",
    kind: "form",
    backHref: "alokasi-lokasi",
    fields: [
      field("rencana", "Kode Rencana Produksi", "select", undefined, ["RP-001", "RP-002"]),
      field("lokasi", "Lokasi Penjualan", "select", undefined, ["Zazi Donut - Bandung", "Zazi Donut - Cimahi"]),
      field("jumlah", "Jumlah Produk", "number", "Jumlah produk"),
      field("pengantar", "Pengantar", "select", undefined, ["Dimas Saputra", "Andi Pratama"]),
      field("tanggal", "Tanggal Pengiriman", "date"),
    ],
    validation: "allocation",
    note: "Jumlah yang melebihi kapasitas lokasi akan ditandai sebagai kesalahan simulasi.",
  },
  {
    slug: "laporan",
    menuId: "laporan",
    title: "Laporan Produksi",
    description: "Ringkasan rencana dan hasil produksi.",
    kind: "report",
    columns: ["No.", "Kode Rencana", "Produk", "Target", "Hasil Layak", "Produk Rusak", "Aksi"],
    rows: [],
    primaryAction: { label: "Buat Laporan", href: "laporan-form" },
    note: "Laporan ditampilkan dari hasil produksi yang tersimpan.",
  },
  {
    slug: "laporan-form",
    menuId: "laporan",
    title: "Buat Laporan Produksi",
    description: "Simpan laporan untuk hasil produksi pada periode yang dipilih.",
    kind: "form",
    backHref: "laporan",
  },
  {
    slug: "laporan-detail",
    menuId: "laporan",
    title: "Detail Laporan Produksi",
    description: "Rincian target, hasil produksi, dan produk yang rusak.",
    kind: "detail",
    backHref: "laporan",
    details: [
      { label: "Kode rencana", value: "RP-001" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Target produksi", value: "120 pcs" },
      { label: "Hasil layak", value: "116 pcs" },
      { label: "Produk rusak", value: "4 pcs" },
      { label: "Tanggal produksi", value: "12 Juni 2026" },
    ],
  },
];

const makerModules: DashboardModule[] = [
  { id: "hasil-produksi", label: "Hasil Produksi" },
  { id: "bahan-baku", label: "Bahan Baku" },
  { id: "kualitas-hasil", label: "Kualitas Hasil Produksi" },
];

const makerScreens: DemoScreen[] = [
  {
    slug: "hasil-produksi",
    menuId: "hasil-produksi",
    title: "Hasil Produksi",
    description: "Pilih rencana produksi yang sedang dikerjakan.",
    kind: "table",
    columns: ["No.", "Kode Rencana", "Produk", "Target", "Tanggal", "Status", "Aksi"],
    rows: [
      row(["1", "RP-001", "Donut Cheese", "120 pcs", "12/06/2026", "Menunggu hasil"], "hasil-produksi-detail"),
      row(["2", "RP-002", "Donut Chocolate", "100 pcs", "13/06/2026", "Dalam proses"], "hasil-produksi-detail"),
    ],
  },
  {
    slug: "hasil-produksi-detail",
    menuId: "hasil-produksi",
    title: "Detail Rencana Produksi RP-001",
    description: "Rencana kerja dan hasil produksi yang perlu dicatat.",
    kind: "detail",
    backHref: "hasil-produksi",
    details: [
      { label: "Kode rencana", value: "RP-001" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Target produksi", value: "120 pcs" },
      { label: "Tanggal produksi", value: "12 Juni 2026" },
      { label: "Bahan yang disiapkan", value: "Tepung, gula, telur, keju" },
    ],
    primaryAction: { label: "Catat Hasil Produksi", href: "catat-hasil" },
  },
  {
    slug: "catat-hasil",
    menuId: "hasil-produksi",
    title: "Catat Hasil Produksi",
    description: "Catat jumlah hasil produksi untuk rencana yang dikerjakan.",
    kind: "form",
    backHref: "hasil-produksi-detail",
    fields: [
      field("hasil", "Jumlah Hasil Produksi (buah)", "number", "Masukkan jumlah hasil produksi"),
    ],
    submitLabel: "Catat Hasil Produksi",
  },
  {
    slug: "bahan-baku",
    menuId: "bahan-baku",
    title: "Bahan Baku",
    description: "Periksa stok bahan yang tersedia untuk produksi.",
    kind: "table",
    columns: ["No.", "Nama Bahan", "Stok", "Satuan", "Status", "Aksi"],
    rows: [
      row(["1", "Tepung Terigu", "18", "kg", "Tersedia"], "bahan-baku-detail"),
      row(["2", "Gula", "9", "kg", "Menipis"], "bahan-baku-detail"),
      row(["3", "Keju", "7", "kg", "Menipis"], "bahan-baku-detail"),
    ],
  },
  {
    slug: "bahan-baku-detail",
    menuId: "bahan-baku",
    title: "Detail Penggunaan Bahan Baku",
    description: "Lihat stok dan catat bahan yang digunakan.",
    kind: "detail",
    backHref: "bahan-baku",
    details: [
      { label: "Nama bahan", value: "Tepung Terigu" },
      { label: "Stok tersedia", value: "18 kg" },
      { label: "Kebutuhan RP-001", value: "10 kg" },
      { label: "Lokasi penyimpanan", value: "Gudang Produksi" },
    ],
    primaryAction: { label: "Catat Penggunaan", href: "catat-penggunaan" },
  },
  {
    slug: "catat-penggunaan",
    menuId: "bahan-baku",
    title: "Catat Penggunaan Bahan Baku",
    description: "Catat penggunaan bahan untuk rencana yang dikerjakan.",
    kind: "form",
    backHref: "bahan-baku-detail",
    fields: [
      field("rencana", "Kode Rencana Produksi", "select", undefined, ["RP-001", "RP-002"]),
      field("bahan", "Nama Bahan", "select", undefined, ["Tepung Terigu", "Gula", "Keju"]),
      field("jumlah", "Jumlah Digunakan", "number", "Jumlah"),
      field("satuan", "Satuan", "select", undefined, ["kg", "gram", "liter", "pcs"]),
      field("tanggal", "Tanggal Penggunaan", "date"),
    ],
  },
  {
    slug: "kualitas-hasil",
    menuId: "kualitas-hasil",
    title: "Kualitas Hasil Produksi",
    description: "Tinjau hasil produksi dan catatan kualitas.",
    kind: "table",
    columns: ["No.", "Kode Rencana", "Produk", "Produk Layak", "Produk Rusak", "Status", "Aksi"],
    rows: [
      row(["1", "RP-001", "Donut Cheese", "116 pcs", "4 pcs", "Perlu tindak lanjut"], "kualitas-detail"),
      row(["2", "RP-002", "Donut Chocolate", "100 pcs", "0 pcs", "Baik"], "kualitas-detail"),
    ],
    primaryAction: { label: "Catat Produk Rusak", href: "catat-rusak" },
  },
  {
    slug: "kualitas-detail",
    menuId: "kualitas-hasil",
    title: "Detail Kualitas Hasil Produksi",
    description: "Periksa catatan kualitas dari hasil produksi.",
    kind: "detail",
    backHref: "kualitas-hasil",
    details: [
      { label: "Kode rencana", value: "RP-001" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Produk layak", value: "116 pcs" },
      { label: "Produk rusak", value: "4 pcs" },
      { label: "Catatan", value: "Kemasan rusak pada beberapa produk." },
    ],
    primaryAction: { label: "Catat Produk Rusak", href: "catat-rusak" },
  },
  {
    slug: "catat-rusak",
    menuId: "kualitas-hasil",
    title: "Catat Produk Rusak",
    description: "Tambahkan catatan produk yang tidak memenuhi kualitas.",
    kind: "form",
    backHref: "kualitas-hasil",
    fields: [
      field("rencana", "Kode Rencana Produksi", "select", undefined, ["RP-001", "RP-002"]),
      field("produk", "Nama Produk", "select", undefined, ["Donut Cheese", "Donut Chocolate"]),
      field("jumlah", "Jumlah Produk Rusak", "number", "Jumlah"),
      field("alasan", "Alasan Kerusakan", "select", undefined, ["Bentuk tidak sesuai", "Kemasan rusak", "Produk gosong"]),
      field("catatan", "Keterangan", "textarea", "Keterangan tambahan"),
    ],
  },
];

const courierModules: DashboardModule[] = [
  { id: "pengiriman", label: "Pengiriman Produk" },
  { id: "riwayat-pengiriman", label: "Riwayat Pengiriman" },
  { id: "informasi-produk", label: "Informasi Produk" },
];

const courierScreens: DemoScreen[] = [
  {
    slug: "pengiriman",
    menuId: "pengiriman",
    title: "Pengiriman Produk",
    description: "Daftar alokasi produk yang harus dikirim.",
    kind: "table",
    primaryAction: { label: "Perbarui Status Pengiriman", href: "konfirmasi-pengiriman" },
    columns: ["No.", "Kode Pengiriman", "Tujuan", "Produk", "Jumlah", "Status", "Aksi"],
    rows: [
      row(["1", "AL-001", "Zazi Donut - Bandung", "Donut Cheese", "50 pcs", "Siap dikirim"], "pengiriman-detail"),
      row(["2", "AL-002", "Zazi Donut - Cimahi", "Donut Chocolate", "40 pcs", "Dalam perjalanan"], "pengiriman-detail"),
    ],
  },
  {
    slug: "pengiriman-detail",
    menuId: "pengiriman",
    title: "Detail Pengiriman Produk",
    description: "Periksa tujuan dan barang sebelum mengonfirmasi pengiriman.",
    kind: "detail",
    backHref: "pengiriman",
    details: [
      { label: "Kode alokasi", value: "AL-001" },
      { label: "Rencana produksi", value: "RP-001" },
      { label: "Tujuan", value: "Zazi Donut - Bandung" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Jumlah", value: "50 pcs" },
      { label: "Status", value: "Siap dikirim" },
    ],
    primaryAction: { label: "Perbarui Status Pengiriman", href: "konfirmasi-pengiriman" },
  },
  {
    slug: "konfirmasi-pengiriman",
    menuId: "pengiriman",
    title: "Perbarui Status Pengiriman",
    description: "Catat waktu dan status perjalanan produk.",
    kind: "form",
    backHref: "pengiriman-detail",
    fields: [
      field("pengiriman", "Kode Pengiriman", "select", undefined, ["AL-001", "AL-002"]),
      field("status", "Status Pengiriman", "select", undefined, ["Dalam perjalanan", "Selesai dikirim"]),
      field("tanggal", "Tanggal Pengiriman", "date"),
      field("waktu", "Waktu Pengiriman", "text", "Contoh: 10:30"),
      field("catatan", "Catatan", "textarea", "Catatan pengiriman"),
    ],
  },
  {
    slug: "riwayat-pengiriman",
    menuId: "riwayat-pengiriman",
    title: "Riwayat Pengiriman",
    description: "Daftar pengiriman yang telah diselesaikan.",
    kind: "table",
    columns: ["No.", "Kode Pengiriman", "Tujuan", "Produk", "Tanggal", "Status", "Aksi"],
    rows: [
      row(["1", "AL-013", "Zazi Donut - Bandung", "Donut Cheese", "10/06/2026", "Diterima"], "riwayat-detail"),
      row(["2", "AL-012", "Zazi Donut - Cimahi", "Donut Strawberry", "09/06/2026", "Diterima"], "riwayat-detail"),
    ],
  },
  {
    slug: "riwayat-detail",
    menuId: "riwayat-pengiriman",
    title: "Detail Riwayat Pengiriman",
    description: "Informasi perjalanan dan penerimaan produk.",
    kind: "detail",
    backHref: "riwayat-pengiriman",
    details: [
      { label: "Kode pengiriman", value: "AL-013" },
      { label: "Tujuan", value: "Zazi Donut - Bandung" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Jumlah", value: "50 pcs" },
      { label: "Tanggal diterima", value: "10 Juni 2026" },
      { label: "Status", value: "Diterima oleh penjaga tempat" },
    ],
  },
  {
    slug: "informasi-produk",
    menuId: "informasi-produk",
    title: "Informasi Produk",
    description: "Lihat produk dan jumlah yang telah dialokasikan.",
    kind: "table",
    columns: ["No.", "Kode Produk", "Nama Produk", "Varian", "Jumlah", "Tujuan", "Aksi"],
    rows: [
      row(["1", "P-001", "Donut", "Cheese", "50 pcs", "Bandung"], "produk-detail"),
      row(["2", "P-002", "Donut", "Chocolate", "40 pcs", "Cimahi"], "produk-detail"),
    ],
  },
  {
    slug: "produk-detail",
    menuId: "informasi-produk",
    title: "Detail Informasi Produk",
    description: "Periksa ringkasan produk yang akan dibawa.",
    kind: "detail",
    backHref: "informasi-produk",
    details: [
      { label: "Kode produk", value: "P-001" },
      { label: "Nama produk", value: "Donut" },
      { label: "Varian", value: "Cheese" },
      { label: "Jumlah dialokasikan", value: "50 pcs" },
      { label: "Tujuan pengiriman", value: "Zazi Donut - Bandung" },
    ],
  },
];

const guardModules: DashboardModule[] = [
  { id: "menerima-produk", label: "Menerima Produk" },
  { id: "status-pengiriman", label: "Status Pengiriman Masuk" },
  { id: "riwayat-penerimaan", label: "Riwayat Penerimaan" },
];

const guardScreens: DemoScreen[] = [
  {
    slug: "menerima-produk",
    menuId: "menerima-produk",
    title: "Menerima Produk",
    description: "Periksa daftar pengiriman produk ke lokasi.",
    kind: "table",
    primaryAction: { label: "Konfirmasi Penerimaan", href: "konfirmasi-penerimaan" },
    columns: ["No.", "Kode Pengiriman", "Pengantar", "Produk", "Jumlah", "Tanggal", "Aksi"],
    rows: [
      row(["1", "AL-001", "Dimas Saputra", "Donut Cheese", "50 pcs", "12/06/2026"], "detail-penerimaan"),
      row(["2", "AL-002", "Andi Pratama", "Donut Chocolate", "40 pcs", "12/06/2026"], "detail-penerimaan"),
    ],
  },
  {
    slug: "detail-penerimaan",
    menuId: "menerima-produk",
    title: "Detail Produk yang Diterima",
    description: "Cocokkan informasi produk dengan barang yang datang.",
    kind: "detail",
    backHref: "menerima-produk",
    details: [
      { label: "Kode pengiriman", value: "AL-001" },
      { label: "Pengantar", value: "Dimas Saputra" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Jumlah dikirim", value: "50 pcs" },
      { label: "Tujuan", value: "Zazi Donut - Bandung" },
      { label: "Status", value: "Menunggu penerimaan" },
    ],
    primaryAction: { label: "Konfirmasi Penerimaan", href: "konfirmasi-penerimaan" },
  },
  {
    slug: "konfirmasi-penerimaan",
    menuId: "menerima-produk",
    title: "Konfirmasi Penerimaan Produk",
    description: "Catat hasil pemeriksaan barang yang diterima.",
    kind: "form",
    backHref: "detail-penerimaan",
    fields: [
      field("pengiriman", "Kode Pengiriman", "select", undefined, ["AL-001", "AL-002"]),
      field("diterima", "Jumlah Produk Diterima", "number", "Jumlah"),
      field("kondisi", "Kondisi Produk", "select", undefined, ["Baik", "Sebagian rusak", "Rusak"]),
      field("tanggal", "Tanggal Penerimaan", "date"),
      field("catatan", "Catatan Penerimaan", "textarea", "Keterangan kondisi produk"),
    ],
  },
  {
    slug: "status-pengiriman",
    menuId: "status-pengiriman",
    title: "Status Pengiriman Masuk",
    description: "Pantau pengiriman yang menuju lokasi Anda.",
    kind: "table",
    columns: ["No.", "Kode Pengiriman", "Pengantar", "Produk", "Perkiraan Tiba", "Status", "Aksi"],
    rows: [
      row(["1", "AL-001", "Dimas Saputra", "Donut Cheese", "10:30", "Dalam perjalanan"], "detail-status"),
      row(["2", "AL-002", "Andi Pratama", "Donut Chocolate", "11:00", "Dalam perjalanan"], "detail-status"),
    ],
  },
  {
    slug: "detail-status",
    menuId: "status-pengiriman",
    title: "Detail Status Pengiriman",
    description: "Lihat informasi pengiriman menuju lokasi.",
    kind: "detail",
    backHref: "status-pengiriman",
    details: [
      { label: "Kode pengiriman", value: "AL-001" },
      { label: "Nama pengantar", value: "Dimas Saputra" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Jumlah", value: "50 pcs" },
      { label: "Perkiraan tiba", value: "12 Juni 2026, 10:30" },
      { label: "Status", value: "Dalam perjalanan" },
    ],
    primaryAction: { label: "Buka Penerimaan", href: "menerima-produk" },
  },
  {
    slug: "riwayat-penerimaan",
    menuId: "riwayat-penerimaan",
    title: "Riwayat Penerimaan",
    description: "Daftar produk yang telah diterima di lokasi.",
    kind: "table",
    columns: ["No.", "Kode Pengiriman", "Produk", "Jumlah Diterima", "Tanggal", "Kondisi", "Aksi"],
    rows: [
      row(["1", "AL-013", "Donut Cheese", "50 pcs", "10/06/2026", "Baik"], "riwayat-penerimaan-detail"),
      row(["2", "AL-012", "Donut Strawberry", "40 pcs", "09/06/2026", "Baik"], "riwayat-penerimaan-detail"),
    ],
  },
  {
    slug: "riwayat-penerimaan-detail",
    menuId: "riwayat-penerimaan",
    title: "Detail Riwayat Penerimaan",
    description: "Rincian produk yang telah diterima.",
    kind: "detail",
    backHref: "riwayat-penerimaan",
    details: [
      { label: "Kode pengiriman", value: "AL-013" },
      { label: "Produk", value: "Donut Cheese" },
      { label: "Jumlah diterima", value: "50 pcs" },
      { label: "Tanggal penerimaan", value: "10 Juni 2026" },
      { label: "Kondisi produk", value: "Baik" },
    ],
  },
];

const dashboards: Record<DashboardRole, DashboardConfig> = {
  pemilik: {
    role: "pemilik",
    label: "Pemilik",
    theme: "owner",
    welcome: "Selamat datang, Pemilik Zazi. Pilih menu untuk memulai.",
    modules: ownerModules,
    metrics: [
      { label: "Registrasi menunggu", value: "—", tone: "orange" },
      { label: "Rencana belum dicatat", value: "—", tone: "green" },
      { label: "Produk layak belum dialokasikan", value: "—", tone: "blue" },
      { label: "Pengiriman berjalan", value: "—", tone: "pink" },
      { label: "Sudah diterima", value: "—", tone: "orange" },
    ],
    screens: ownerScreens,
  },
  pembuat_donut: {
    role: "pembuat_donut",
    label: "Pembuat Donut",
    theme: "maker",
    welcome: "Selamat datang. Pilih pekerjaan produksi untuk memulai.",
    modules: makerModules,
    metrics: [
      { label: "Rencana menunggu dicatat", value: "—", tone: "orange" },
      { label: "Bahan baku menipis (<10)", value: "—", tone: "green" },
      { label: "Produk rusak tercatat", value: "—", tone: "blue" },
    ],
    screens: makerScreens,
  },
  pengantar: {
    role: "pengantar",
    label: "Pengantar",
    theme: "courier",
    welcome: "Selamat datang. Pilih daftar pengiriman untuk melanjutkan.",
    modules: courierModules,
    metrics: [
      { label: "Menunggu dikirim", value: "—", tone: "orange" },
      { label: "Dikirim hari ini", value: "—", tone: "green" },
    ],
    screens: courierScreens,
  },
  penjaga_tempat: {
    role: "penjaga_tempat",
    label: "Penjaga Tempat",
    theme: "guard",
    welcome: "Selamat datang. Periksa penerimaan produk di lokasi Anda.",
    modules: guardModules,
    metrics: [
      { label: "Pengiriman akan diterima", value: "—", tone: "orange" },
      { label: "Diterima hari ini", value: "—", tone: "green" },
      { label: "Jumlah produk pernah diterima", value: "—", tone: "blue" },
    ],
    screens: guardScreens,
  },
};

export function getDashboardConfig(role: string) {
  return isDashboardRole(role) ? dashboards[role] : undefined;
}

export function getDashboardScreen(role: string, slug: string) {
  return getDashboardConfig(role)?.screens.find((screen) => screen.slug === slug);
}

export function dashboardHref(role: DashboardRole, screen?: string) {
  const root = `/dashboard/${role}`;
  if (!screen) {
    return role === "pemilik" ? "/pemilik" : root;
  }
  return `${root}/${screen}`;
}

export function dashboardRoleStaticParams() {
  return Object.values(dashboards).map((dashboard) => ({
    role: dashboard.role,
  }));
}

export function dashboardScreenStaticParams() {
  return Object.values(dashboards).flatMap((dashboard) =>
    dashboard.screens.map((screen) => ({
      role: dashboard.role,
      screen: screen.slug,
    })),
  );
}

function isDashboardRole(role: string): role is DashboardRole {
  return Object.hasOwn(dashboards, role);
}
