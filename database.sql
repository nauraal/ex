--  DATABASE ZAZI DONUT  (PostgreSQL)

DROP TABLE IF EXISTS laporan, penerimaan_produk, pengiriman, alokasi_produk,
    pemakaian_bahan, detail_produksi, produksi, varian_produk, bahan_baku,
    produk, lokasi_penjualan, penjaga_tempat, pengantar, pembuat_donut, pemilik CASCADE;

-- =====================================================================
--  1. CREATE TABLE
-- =====================================================================

-- ---------- Tabel pengguna (4 peran, sesuai ERD) ----------
CREATE TABLE pemilik (
    id_pemilik        SERIAL PRIMARY KEY,
    nama_pemilik      VARCHAR(255) NOT NULL,
    username          VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    status_registrasi VARCHAR(255) NOT NULL
);

CREATE TABLE pembuat_donut (
    id_pembuat_donut   SERIAL PRIMARY KEY,
    nama_pembuat_donut VARCHAR(255) NOT NULL,
    username           VARCHAR(255) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
    status_registrasi  VARCHAR(255) NOT NULL
);

CREATE TABLE pengantar (
    id_pengantar      SERIAL PRIMARY KEY,
    nama_pengantar    VARCHAR(255) NOT NULL,
    username          VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    status_registrasi VARCHAR(255) NOT NULL
);

CREATE TABLE penjaga_tempat (
    id_penjaga_tempat   SERIAL PRIMARY KEY,
    nama_penjaga_tempat VARCHAR(255) NOT NULL,
    username            VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    status_registrasi   VARCHAR(255) NOT NULL
);

-- ---------- Master data ----------
CREATE TABLE lokasi_penjualan (
    id_lokasi     SERIAL PRIMARY KEY,
    nama_lokasi   VARCHAR(255) NOT NULL UNIQUE,
    alamat_lokasi VARCHAR(255) NOT NULL
);

CREATE TABLE produk (
    id_produk        SERIAL PRIMARY KEY,
    nama_produk      VARCHAR(100) NOT NULL,
    harga            NUMERIC(19,0) NOT NULL CHECK (harga >= 0),
    satuan           VARCHAR(20) NOT NULL,
    id_pemilik       INTEGER NOT NULL,
    id_pembuat_donut INTEGER NOT NULL,
    id_pengantar     INTEGER NOT NULL,
    id_penjaga_tempat INTEGER NOT NULL,
    FOREIGN KEY (id_pemilik)         REFERENCES pemilik(id_pemilik)               ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pembuat_donut)   REFERENCES pembuat_donut(id_pembuat_donut)   ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pengantar)       REFERENCES pengantar(id_pengantar)           ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_penjaga_tempat)  REFERENCES penjaga_tempat(id_penjaga_tempat) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE varian_produk (
    id_varian   SERIAL PRIMARY KEY,
    nama_varian VARCHAR(50) NOT NULL UNIQUE,
    id_produk   INTEGER NOT NULL,
    FOREIGN KEY (id_produk) REFERENCES produk(id_produk) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE bahan_baku (
    id_bahan         SERIAL PRIMARY KEY,
    nama_bahan       VARCHAR(50) NOT NULL UNIQUE,
    satuan           VARCHAR(20) NOT NULL,
    id_pembuat_donut INTEGER NOT NULL,
    id_pemilik       INTEGER NOT NULL,
    FOREIGN KEY (id_pembuat_donut) REFERENCES pembuat_donut(id_pembuat_donut) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pemilik)       REFERENCES pemilik(id_pemilik)             ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------- Produksi ----------
CREATE TABLE produksi (
    id_hasil            SERIAL PRIMARY KEY,
    tanggal_produksi    DATE NOT NULL,
    jumlah_rencana      INTEGER NOT NULL CHECK (jumlah_rencana > 0),
    jumlah_hasil        INTEGER NOT NULL CHECK (jumlah_hasil >= 0),
    jumlah_rusak        INTEGER NOT NULL CHECK (jumlah_rusak >= 0),
    keterangan_kualitas VARCHAR(255),
    id_rencana          INTEGER NOT NULL UNIQUE,
    id_pemilik          INTEGER NOT NULL,
    id_produk           INTEGER NOT NULL,
    id_pembuat_donut    INTEGER NOT NULL,
    FOREIGN KEY (id_pemilik)       REFERENCES pemilik(id_pemilik)           ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_produk)        REFERENCES produk(id_produk)             ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pembuat_donut) REFERENCES pembuat_donut(id_pembuat_donut) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE detail_produksi (
    id_hasil                  INTEGER NOT NULL,
    id_varian                 INTEGER NOT NULL,
    jumlah_rencana_varian_pcs INTEGER NOT NULL CHECK (jumlah_rencana_varian_pcs >= 0),
    jumlah_hasil_pcs          INTEGER NOT NULL CHECK (jumlah_hasil_pcs >= 0),
    jumlah_rusak_pcs          INTEGER NOT NULL CHECK (jumlah_rusak_pcs >= 0),
    PRIMARY KEY (id_hasil, id_varian),
    FOREIGN KEY (id_hasil)  REFERENCES produksi(id_hasil)      ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_varian) REFERENCES varian_produk(id_varian) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE pemakaian_bahan (
    id_bahan               INTEGER NOT NULL,
    id_hasil               INTEGER NOT NULL,
    id_varian              INTEGER NOT NULL,
    jumlah_pemakaian_bahan NUMERIC(15,2) NOT NULL CHECK (jumlah_pemakaian_bahan >= 0),
    PRIMARY KEY (id_bahan, id_hasil, id_varian),
    FOREIGN KEY (id_bahan)  REFERENCES bahan_baku(id_bahan)    ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_hasil)  REFERENCES produksi(id_hasil)      ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_varian) REFERENCES varian_produk(id_varian) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------- Distribusi ----------
CREATE TABLE alokasi_produk (
    id_alokasi       SERIAL PRIMARY KEY,
    tanggal_alokasi  DATE NOT NULL,
    jumlah_alokasi   INTEGER NOT NULL CHECK (jumlah_alokasi > 0),
    stok_tersedia    INTEGER NOT NULL CHECK (stok_tersedia >= 0),
    id_pemilik       INTEGER NOT NULL,
    id_hasil         INTEGER NOT NULL,
    id_pembuat_donut INTEGER NOT NULL,
    id_pengantar     INTEGER NOT NULL,
    id_produk        INTEGER NOT NULL,
    id_lokasi        INTEGER NOT NULL,
    id_varian        INTEGER NOT NULL,
    FOREIGN KEY (id_pemilik)       REFERENCES pemilik(id_pemilik)             ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_hasil)         REFERENCES produksi(id_hasil)              ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pembuat_donut) REFERENCES pembuat_donut(id_pembuat_donut) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pengantar)     REFERENCES pengantar(id_pengantar)         ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_produk)        REFERENCES produk(id_produk)               ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_lokasi)        REFERENCES lokasi_penjualan(id_lokasi)     ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_varian)        REFERENCES varian_produk(id_varian)        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE pengiriman (
    id_pengiriman     SERIAL PRIMARY KEY,
    tanggal_kirim     DATE NOT NULL,
    jumlah_dikirim    INTEGER NOT NULL CHECK (jumlah_dikirim > 0),
    status_pengiriman VARCHAR(20) NOT NULL,
    id_pengantar      INTEGER NOT NULL,
    id_pemilik        INTEGER NOT NULL,
    id_alokasi        INTEGER NOT NULL,
    id_lokasi         INTEGER NOT NULL,
    FOREIGN KEY (id_pengantar) REFERENCES pengantar(id_pengantar)     ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pemilik)   REFERENCES pemilik(id_pemilik)         ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_alokasi)   REFERENCES alokasi_produk(id_alokasi)  ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_lokasi)    REFERENCES lokasi_penjualan(id_lokasi) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE penerimaan_produk (
    id_penerimaan     SERIAL PRIMARY KEY,
    tanggal_terima    DATE NOT NULL,
    jumlah_diterima   INTEGER NOT NULL CHECK (jumlah_diterima >= 0),
    kondisi_produksi  VARCHAR(100) NOT NULL,
    status_penerimaan VARCHAR(20) NOT NULL,
    id_penjaga_tempat INTEGER NOT NULL,
    id_pengiriman     INTEGER NOT NULL UNIQUE,
    id_pemilik        INTEGER NOT NULL,
    FOREIGN KEY (id_penjaga_tempat) REFERENCES penjaga_tempat(id_penjaga_tempat) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pengiriman)     REFERENCES pengiriman(id_pengiriman)         ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pemilik)        REFERENCES pemilik(id_pemilik)               ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------- Laporan ----------
CREATE TABLE laporan (
    id_laporan     SERIAL PRIMARY KEY,
    tanggal_laporan DATE NOT NULL,
    periode_awal   DATE NOT NULL,
    periode_akhir  DATE NOT NULL,
    jenis_laporan  VARCHAR(50) NOT NULL,
    id_hasil       INTEGER,
    id_penerimaan  INTEGER,
    id_alokasi     INTEGER,
    id_pengiriman  INTEGER,
    id_pemilik     INTEGER NOT NULL,
    CHECK (periode_akhir >= periode_awal),
    FOREIGN KEY (id_hasil)      REFERENCES produksi(id_hasil)                ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_penerimaan) REFERENCES penerimaan_produk(id_penerimaan) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_alokasi)    REFERENCES alokasi_produk(id_alokasi)       ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pengiriman) REFERENCES pengiriman(id_pengiriman)        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pemilik)    REFERENCES pemilik(id_pemilik)              ON UPDATE CASCADE ON DELETE RESTRICT
);

-- =====================================================================
--  2. INSERT DATA
-- =====================================================================

-- ---------- Pengguna (U001-U004) ----------
INSERT INTO pemilik (nama_pemilik, username, password_hash, status_registrasi)
VALUES ('Pemilik Zazi Donut', 'pemilik01', '$2b$10$contohHashPemilik000000000000000000000000000000000000', 'aktif');

INSERT INTO pembuat_donut (nama_pembuat_donut, username, password_hash, status_registrasi)
VALUES ('Pembuat Donut 1', 'pembuat01', '$2b$10$contohHashPembuat00000000000000000000000000000000000', 'aktif');

INSERT INTO pengantar (nama_pengantar, username, password_hash, status_registrasi)
VALUES ('Pengantar 1', 'pengantar01', '$2b$10$contohHashPengantar0000000000000000000000000000000000', 'aktif');

INSERT INTO penjaga_tempat (nama_penjaga_tempat, username, password_hash, status_registrasi)
VALUES ('Penjaga Tempat 1', 'penjaga01', '$2b$10$contohHashPenjaga00000000000000000000000000000000000', 'aktif');

-- ---------- Lokasi penjualan (L001-L002) ----------
INSERT INTO lokasi_penjualan (id_lokasi, nama_lokasi, alamat_lokasi)
VALUES
    (1, 'Rumah Produksi', 'Jl. Musi'),
    (2, 'Cabang', 'Jl. Salak');

-- ---------- Produk (P001) ----------
INSERT INTO produk (id_produk, nama_produk, harga, satuan, id_pemilik, id_pembuat_donut, id_pengantar, id_penjaga_tempat)
VALUES
    (1, 'Donat', 5000, 'pcs', 1, 1, 1, 1);

-- ---------- Varian produk (V001-V016) ----------
INSERT INTO varian_produk (id_varian, id_produk, nama_varian)
VALUES
    (1, 1, 'Coklat Meses'),
    (2, 1, 'Coklat Kacang'),
    (3, 1, 'Choco Crumble'),
    (4, 1, 'Choco Crunchy'),
    (5, 1, 'Red Velvet'),
    (6, 1, 'Almond'),
    (7, 1, 'Cheese'),
    (8, 1, 'Vanila Kacang'),
    (9, 1, 'Tiramisu'),
    (10, 1, 'Regal'),
    (11, 1, 'Matcha'),
    (12, 1, 'Avocado'),
    (13, 1, 'Strawberry Meses'),
    (14, 1, 'Strawberry Choco'),
    (15, 1, 'Capucino'),
    (16, 1, 'Capucino Kacang');

-- ---------- Bahan baku (B001-B017) ----------
INSERT INTO bahan_baku (id_bahan, nama_bahan, satuan, id_pembuat_donut, id_pemilik)
VALUES
    (1, 'Tepung terigu', 'kg', 1, 1),
    (2, 'Gula pasir', 'kg', 1, 1),
    (3, 'Cokelat meses', 'kg', 1, 1),
    (4, 'Kacang', 'kg', 1, 1),
    (5, 'Cokelat bubuk', 'kg', 1, 1),
    (6, 'Cokelat crunchy', 'kg', 1, 1),
    (7, 'Bubuk red velvet', 'kg', 1, 1),
    (8, 'Almond', 'kg', 1, 1),
    (9, 'Keju', 'kg', 1, 1),
    (10, 'Vanila', 'liter', 1, 1),
    (11, 'Bahan tiramisu', 'kg', 1, 1),
    (12, 'Biskuit regal', 'kg', 1, 1),
    (13, 'Bubuk matcha', 'kg', 1, 1),
    (14, 'Pasta avocado', 'kg', 1, 1),
    (15, 'Topping stroberi', 'kg', 1, 1),
    (16, 'Cokelat chip', 'kg', 1, 1),
    (17, 'Bubuk capucino', 'kg', 1, 1);

-- ---------- Produksi (R001-R003) ----------
INSERT INTO produksi (id_hasil, tanggal_produksi, jumlah_rencana, jumlah_hasil, jumlah_rusak, keterangan_kualitas, id_rencana, id_pemilik, id_produk, id_pembuat_donut)
VALUES
    (1, '2026-10-16', 240, 234, 6, '6 pcs rusak saat produksi', 1, 1, 1, 1),
    (2, '2026-10-17', 256, 250, 6, '6 pcs rusak saat produksi', 2, 1, 1, 1),
    (3, '2026-10-18', 248, 242, 6, '6 pcs rusak saat produksi', 3, 1, 1, 1);

-- ---------- Detail produksi (3 rencana x 16 varian = 48 baris) ----------
INSERT INTO detail_produksi (id_hasil, id_varian, jumlah_rencana_varian_pcs, jumlah_hasil_pcs, jumlah_rusak_pcs)
VALUES
    (1, 1, 20, 19, 1),
    (1, 2, 18, 18, 0),
    (1, 3, 16, 16, 0),
    (1, 4, 15, 14, 1),
    (1, 5, 14, 14, 0),
    (1, 6, 13, 13, 0),
    (1, 7, 17, 16, 1),
    (1, 8, 14, 14, 0),
    (1, 9, 13, 13, 0),
    (1, 10, 12, 11, 1),
    (1, 11, 15, 15, 0),
    (1, 12, 12, 12, 0),
    (1, 13, 16, 15, 1),
    (1, 14, 15, 15, 0),
    (1, 15, 15, 15, 0),
    (1, 16, 15, 14, 1),
    (2, 1, 21, 20, 1),
    (2, 2, 19, 19, 0),
    (2, 3, 17, 17, 0),
    (2, 4, 16, 15, 1),
    (2, 5, 15, 15, 0),
    (2, 6, 14, 14, 0),
    (2, 7, 18, 17, 1),
    (2, 8, 15, 15, 0),
    (2, 9, 14, 14, 0),
    (2, 10, 13, 12, 1),
    (2, 11, 16, 16, 0),
    (2, 12, 13, 13, 0),
    (2, 13, 17, 16, 1),
    (2, 14, 16, 16, 0),
    (2, 15, 16, 16, 0),
    (2, 16, 16, 15, 1),
    (3, 1, 20, 19, 1),
    (3, 2, 18, 18, 0),
    (3, 3, 17, 17, 0),
    (3, 4, 15, 14, 1),
    (3, 5, 14, 14, 0),
    (3, 6, 14, 14, 0),
    (3, 7, 17, 16, 1),
    (3, 8, 15, 15, 0),
    (3, 9, 14, 14, 0),
    (3, 10, 13, 12, 1),
    (3, 11, 16, 16, 0),
    (3, 12, 13, 13, 0),
    (3, 13, 17, 16, 1),
    (3, 14, 16, 16, 0),
    (3, 15, 15, 15, 0),
    (3, 16, 14, 13, 1);

-- ---------- Pemakaian bahan (144 baris) ----------
INSERT INTO pemakaian_bahan (id_bahan, id_hasil, id_varian, jumlah_pemakaian_bahan)
VALUES
    (1, 1, 1, 0.17),
    (2, 1, 1, 0.04),
    (3, 1, 1, 0.03),
    (1, 1, 2, 0.16),
    (2, 1, 2, 0.04),
    (4, 1, 2, 0.03),
    (1, 1, 3, 0.14),
    (2, 1, 3, 0.03),
    (5, 1, 3, 0.02),
    (1, 1, 4, 0.13),
    (2, 1, 4, 0.03),
    (6, 1, 4, 0.02),
    (1, 1, 5, 0.13),
    (2, 1, 5, 0.03),
    (7, 1, 5, 0.02),
    (1, 1, 6, 0.12),
    (2, 1, 6, 0.03),
    (8, 1, 6, 0.02),
    (1, 1, 7, 0.14),
    (2, 1, 7, 0.03),
    (9, 1, 7, 0.02),
    (1, 1, 8, 0.13),
    (2, 1, 8, 0.03),
    (10, 1, 8, 0.02),
    (1, 1, 9, 0.12),
    (2, 1, 9, 0.03),
    (11, 1, 9, 0.02),
    (1, 1, 10, 0.10),
    (2, 1, 10, 0.02),
    (12, 1, 10, 0.02),
    (1, 1, 11, 0.13),
    (2, 1, 11, 0.03),
    (13, 1, 11, 0.02),
    (1, 1, 12, 0.11),
    (2, 1, 12, 0.02),
    (14, 1, 12, 0.02),
    (1, 1, 13, 0.13),
    (2, 1, 13, 0.03),
    (15, 1, 13, 0.02),
    (1, 1, 14, 0.13),
    (2, 1, 14, 0.03),
    (16, 1, 14, 0.02),
    (1, 1, 15, 0.13),
    (2, 1, 15, 0.03),
    (17, 1, 15, 0.02),
    (1, 1, 16, 0.13),
    (2, 1, 16, 0.03),
    (4, 1, 16, 0.02),
    (1, 2, 1, 0.18),
    (2, 2, 1, 0.04),
    (3, 2, 1, 0.03),
    (1, 2, 2, 0.17),
    (2, 2, 2, 0.04),
    (4, 2, 2, 0.03),
    (1, 2, 3, 0.15),
    (2, 2, 3, 0.03),
    (5, 2, 3, 0.03),
    (1, 2, 4, 0.13),
    (2, 2, 4, 0.03),
    (6, 2, 4, 0.02),
    (1, 2, 5, 0.13),
    (2, 2, 5, 0.03),
    (7, 2, 5, 0.02),
    (1, 2, 6, 0.13),
    (2, 2, 6, 0.03),
    (8, 2, 6, 0.02),
    (1, 2, 7, 0.15),
    (2, 2, 7, 0.03),
    (9, 2, 7, 0.03),
    (1, 2, 8, 0.13),
    (2, 2, 8, 0.03),
    (10, 2, 8, 0.02),
    (1, 2, 9, 0.13),
    (2, 2, 9, 0.03),
    (11, 2, 9, 0.02),
    (1, 2, 10, 0.11),
    (2, 2, 10, 0.02),
    (12, 2, 10, 0.02),
    (1, 2, 11, 0.14),
    (2, 2, 11, 0.03),
    (13, 2, 11, 0.02),
    (1, 2, 12, 0.12),
    (2, 2, 12, 0.03),
    (14, 2, 12, 0.02),
    (1, 2, 13, 0.14),
    (2, 2, 13, 0.03),
    (15, 2, 13, 0.02),
    (1, 2, 14, 0.14),
    (2, 2, 14, 0.03),
    (16, 2, 14, 0.02),
    (1, 2, 15, 0.14),
    (2, 2, 15, 0.03),
    (17, 2, 15, 0.02),
    (1, 2, 16, 0.13),
    (2, 2, 16, 0.03),
    (4, 2, 16, 0.02),
    (1, 3, 1, 0.17),
    (2, 3, 1, 0.04),
    (3, 3, 1, 0.03),
    (1, 3, 2, 0.16),
    (2, 3, 2, 0.04),
    (4, 3, 2, 0.03),
    (1, 3, 3, 0.15),
    (2, 3, 3, 0.03),
    (5, 3, 3, 0.03),
    (1, 3, 4, 0.13),
    (2, 3, 4, 0.03),
    (6, 3, 4, 0.02),
    (1, 3, 5, 0.13),
    (2, 3, 5, 0.03),
    (7, 3, 5, 0.02),
    (1, 3, 6, 0.13),
    (2, 3, 6, 0.03),
    (8, 3, 6, 0.02),
    (1, 3, 7, 0.14),
    (2, 3, 7, 0.03),
    (9, 3, 7, 0.02),
    (1, 3, 8, 0.13),
    (2, 3, 8, 0.03),
    (10, 3, 8, 0.02),
    (1, 3, 9, 0.13),
    (2, 3, 9, 0.03),
    (11, 3, 9, 0.02),
    (1, 3, 10, 0.11),
    (2, 3, 10, 0.02),
    (12, 3, 10, 0.02),
    (1, 3, 11, 0.14),
    (2, 3, 11, 0.03),
    (13, 3, 11, 0.02),
    (1, 3, 12, 0.12),
    (2, 3, 12, 0.03),
    (14, 3, 12, 0.02),
    (1, 3, 13, 0.14),
    (2, 3, 13, 0.03),
    (15, 3, 13, 0.02),
    (1, 3, 14, 0.14),
    (2, 3, 14, 0.03),
    (16, 3, 14, 0.02),
    (1, 3, 15, 0.13),
    (2, 3, 15, 0.03),
    (17, 3, 15, 0.02),
    (1, 3, 16, 0.12),
    (2, 3, 16, 0.03),
    (4, 3, 16, 0.02);

-- ---------- Alokasi produk (96 baris, 1 alokasi = 1 varian x 1 lokasi) ----------
INSERT INTO alokasi_produk (id_alokasi, tanggal_alokasi, jumlah_alokasi, stok_tersedia, id_pemilik, id_hasil, id_pembuat_donut, id_pengantar, id_produk, id_lokasi, id_varian)
VALUES
    (1, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 1, 1),
    (2, '2026-10-16', 11, 11, 1, 1, 1, 1, 1, 2, 1),
    (3, '2026-10-16', 7, 7, 1, 1, 1, 1, 1, 1, 2),
    (4, '2026-10-16', 11, 11, 1, 1, 1, 1, 1, 2, 2),
    (5, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 3),
    (6, '2026-10-16', 10, 10, 1, 1, 1, 1, 1, 2, 3),
    (7, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 4),
    (8, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 2, 4),
    (9, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 5),
    (10, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 2, 5),
    (11, '2026-10-16', 5, 5, 1, 1, 1, 1, 1, 1, 6),
    (12, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 2, 6),
    (13, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 7),
    (14, '2026-10-16', 10, 10, 1, 1, 1, 1, 1, 2, 7),
    (15, '2026-10-16', 5, 5, 1, 1, 1, 1, 1, 1, 8),
    (16, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 2, 8),
    (17, '2026-10-16', 5, 5, 1, 1, 1, 1, 1, 1, 9),
    (18, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 2, 9),
    (19, '2026-10-16', 4, 4, 1, 1, 1, 1, 1, 1, 10),
    (20, '2026-10-16', 7, 7, 1, 1, 1, 1, 1, 2, 10),
    (21, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 11),
    (22, '2026-10-16', 9, 9, 1, 1, 1, 1, 1, 2, 11),
    (23, '2026-10-16', 5, 5, 1, 1, 1, 1, 1, 1, 12),
    (24, '2026-10-16', 7, 7, 1, 1, 1, 1, 1, 2, 12),
    (25, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 13),
    (26, '2026-10-16', 9, 9, 1, 1, 1, 1, 1, 2, 13),
    (27, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 14),
    (28, '2026-10-16', 9, 9, 1, 1, 1, 1, 1, 2, 14),
    (29, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 15),
    (30, '2026-10-16', 9, 9, 1, 1, 1, 1, 1, 2, 15),
    (31, '2026-10-16', 6, 6, 1, 1, 1, 1, 1, 1, 16),
    (32, '2026-10-16', 8, 8, 1, 1, 1, 1, 1, 2, 16),
    (33, '2026-10-17', 8, 8, 1, 2, 1, 1, 1, 1, 1),
    (34, '2026-10-17', 12, 12, 1, 2, 1, 1, 1, 2, 1),
    (35, '2026-10-17', 8, 8, 1, 2, 1, 1, 1, 1, 2),
    (36, '2026-10-17', 11, 11, 1, 2, 1, 1, 1, 2, 2),
    (37, '2026-10-17', 7, 7, 1, 2, 1, 1, 1, 1, 3),
    (38, '2026-10-17', 10, 10, 1, 2, 1, 1, 1, 2, 3),
    (39, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 4),
    (40, '2026-10-17', 9, 9, 1, 2, 1, 1, 1, 2, 4),
    (41, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 5),
    (42, '2026-10-17', 9, 9, 1, 2, 1, 1, 1, 2, 5),
    (43, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 6),
    (44, '2026-10-17', 8, 8, 1, 2, 1, 1, 1, 2, 6),
    (45, '2026-10-17', 7, 7, 1, 2, 1, 1, 1, 1, 7),
    (46, '2026-10-17', 10, 10, 1, 2, 1, 1, 1, 2, 7),
    (47, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 8),
    (48, '2026-10-17', 9, 9, 1, 2, 1, 1, 1, 2, 8),
    (49, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 9),
    (50, '2026-10-17', 8, 8, 1, 2, 1, 1, 1, 2, 9),
    (51, '2026-10-17', 5, 5, 1, 2, 1, 1, 1, 1, 10),
    (52, '2026-10-17', 7, 7, 1, 2, 1, 1, 1, 2, 10),
    (53, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 11),
    (54, '2026-10-17', 10, 10, 1, 2, 1, 1, 1, 2, 11),
    (55, '2026-10-17', 5, 5, 1, 2, 1, 1, 1, 1, 12),
    (56, '2026-10-17', 8, 8, 1, 2, 1, 1, 1, 2, 12),
    (57, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 13),
    (58, '2026-10-17', 10, 10, 1, 2, 1, 1, 1, 2, 13),
    (59, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 14),
    (60, '2026-10-17', 10, 10, 1, 2, 1, 1, 1, 2, 14),
    (61, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 15),
    (62, '2026-10-17', 10, 10, 1, 2, 1, 1, 1, 2, 15),
    (63, '2026-10-17', 6, 6, 1, 2, 1, 1, 1, 1, 16),
    (64, '2026-10-17', 9, 9, 1, 2, 1, 1, 1, 2, 16),
    (65, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 1, 1),
    (66, '2026-10-18', 11, 11, 1, 3, 1, 1, 1, 2, 1),
    (67, '2026-10-18', 7, 7, 1, 3, 1, 1, 1, 1, 2),
    (68, '2026-10-18', 11, 11, 1, 3, 1, 1, 1, 2, 2),
    (69, '2026-10-18', 7, 7, 1, 3, 1, 1, 1, 1, 3),
    (70, '2026-10-18', 10, 10, 1, 3, 1, 1, 1, 2, 3),
    (71, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 4),
    (72, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 2, 4),
    (73, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 5),
    (74, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 2, 5),
    (75, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 6),
    (76, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 2, 6),
    (77, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 7),
    (78, '2026-10-18', 10, 10, 1, 3, 1, 1, 1, 2, 7),
    (79, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 8),
    (80, '2026-10-18', 9, 9, 1, 3, 1, 1, 1, 2, 8),
    (81, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 9),
    (82, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 2, 9),
    (83, '2026-10-18', 5, 5, 1, 3, 1, 1, 1, 1, 10),
    (84, '2026-10-18', 7, 7, 1, 3, 1, 1, 1, 2, 10),
    (85, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 11),
    (86, '2026-10-18', 10, 10, 1, 3, 1, 1, 1, 2, 11),
    (87, '2026-10-18', 5, 5, 1, 3, 1, 1, 1, 1, 12),
    (88, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 2, 12),
    (89, '2026-10-18', 7, 7, 1, 3, 1, 1, 1, 1, 13),
    (90, '2026-10-18', 9, 9, 1, 3, 1, 1, 1, 2, 13),
    (91, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 14),
    (92, '2026-10-18', 10, 10, 1, 3, 1, 1, 1, 2, 14),
    (93, '2026-10-18', 6, 6, 1, 3, 1, 1, 1, 1, 15),
    (94, '2026-10-18', 9, 9, 1, 3, 1, 1, 1, 2, 15),
    (95, '2026-10-18', 5, 5, 1, 3, 1, 1, 1, 1, 16),
    (96, '2026-10-18', 8, 8, 1, 3, 1, 1, 1, 2, 16);

-- ---------- Pengiriman (K001-K096) ----------
INSERT INTO pengiriman (id_pengiriman, tanggal_kirim, jumlah_dikirim, status_pengiriman, id_pengantar, id_pemilik, id_alokasi, id_lokasi)
VALUES
    (1, '2026-10-16', 8, 'Terkirim', 1, 1, 1, 1),
    (2, '2026-10-16', 11, 'Terkirim', 1, 1, 2, 2),
    (3, '2026-10-16', 7, 'Terkirim', 1, 1, 3, 1),
    (4, '2026-10-16', 11, 'Terkirim', 1, 1, 4, 2),
    (5, '2026-10-16', 6, 'Terkirim', 1, 1, 5, 1),
    (6, '2026-10-16', 10, 'Terkirim', 1, 1, 6, 2),
    (7, '2026-10-16', 6, 'Terkirim', 1, 1, 7, 1),
    (8, '2026-10-16', 8, 'Terkirim', 1, 1, 8, 2),
    (9, '2026-10-16', 6, 'Terkirim', 1, 1, 9, 1),
    (10, '2026-10-16', 8, 'Terkirim', 1, 1, 10, 2),
    (11, '2026-10-16', 5, 'Terkirim', 1, 1, 11, 1),
    (12, '2026-10-16', 8, 'Terkirim', 1, 1, 12, 2),
    (13, '2026-10-16', 6, 'Terkirim', 1, 1, 13, 1),
    (14, '2026-10-16', 10, 'Terkirim', 1, 1, 14, 2),
    (15, '2026-10-16', 5, 'Terkirim', 1, 1, 15, 1),
    (16, '2026-10-16', 8, 'Terkirim', 1, 1, 16, 2),
    (17, '2026-10-16', 5, 'Terkirim', 1, 1, 17, 1),
    (18, '2026-10-16', 8, 'Terkirim', 1, 1, 18, 2),
    (19, '2026-10-16', 4, 'Terkirim', 1, 1, 19, 1),
    (20, '2026-10-16', 7, 'Terkirim', 1, 1, 20, 2),
    (21, '2026-10-16', 6, 'Terkirim', 1, 1, 21, 1),
    (22, '2026-10-16', 9, 'Terkirim', 1, 1, 22, 2),
    (23, '2026-10-16', 5, 'Terkirim', 1, 1, 23, 1),
    (24, '2026-10-16', 7, 'Terkirim', 1, 1, 24, 2),
    (25, '2026-10-16', 6, 'Terkirim', 1, 1, 25, 1),
    (26, '2026-10-16', 9, 'Terkirim', 1, 1, 26, 2),
    (27, '2026-10-16', 6, 'Terkirim', 1, 1, 27, 1),
    (28, '2026-10-16', 9, 'Terkirim', 1, 1, 28, 2),
    (29, '2026-10-16', 6, 'Terkirim', 1, 1, 29, 1),
    (30, '2026-10-16', 9, 'Terkirim', 1, 1, 30, 2),
    (31, '2026-10-16', 6, 'Terkirim', 1, 1, 31, 1),
    (32, '2026-10-16', 8, 'Terkirim', 1, 1, 32, 2),
    (33, '2026-10-17', 8, 'Terkirim', 1, 1, 33, 1),
    (34, '2026-10-17', 12, 'Terkirim', 1, 1, 34, 2),
    (35, '2026-10-17', 8, 'Terkirim', 1, 1, 35, 1),
    (36, '2026-10-17', 11, 'Terkirim', 1, 1, 36, 2),
    (37, '2026-10-17', 7, 'Terkirim', 1, 1, 37, 1),
    (38, '2026-10-17', 10, 'Terkirim', 1, 1, 38, 2),
    (39, '2026-10-17', 6, 'Terkirim', 1, 1, 39, 1),
    (40, '2026-10-17', 9, 'Terkirim', 1, 1, 40, 2),
    (41, '2026-10-17', 6, 'Terkirim', 1, 1, 41, 1),
    (42, '2026-10-17', 9, 'Terkirim', 1, 1, 42, 2),
    (43, '2026-10-17', 6, 'Terkirim', 1, 1, 43, 1),
    (44, '2026-10-17', 8, 'Terkirim', 1, 1, 44, 2),
    (45, '2026-10-17', 7, 'Terkirim', 1, 1, 45, 1),
    (46, '2026-10-17', 10, 'Terkirim', 1, 1, 46, 2),
    (47, '2026-10-17', 6, 'Terkirim', 1, 1, 47, 1),
    (48, '2026-10-17', 9, 'Terkirim', 1, 1, 48, 2),
    (49, '2026-10-17', 6, 'Terkirim', 1, 1, 49, 1),
    (50, '2026-10-17', 8, 'Terkirim', 1, 1, 50, 2),
    (51, '2026-10-17', 5, 'Terkirim', 1, 1, 51, 1),
    (52, '2026-10-17', 7, 'Terkirim', 1, 1, 52, 2),
    (53, '2026-10-17', 6, 'Terkirim', 1, 1, 53, 1),
    (54, '2026-10-17', 10, 'Terkirim', 1, 1, 54, 2),
    (55, '2026-10-17', 5, 'Terkirim', 1, 1, 55, 1),
    (56, '2026-10-17', 8, 'Terkirim', 1, 1, 56, 2),
    (57, '2026-10-17', 6, 'Terkirim', 1, 1, 57, 1),
    (58, '2026-10-17', 10, 'Terkirim', 1, 1, 58, 2),
    (59, '2026-10-17', 6, 'Terkirim', 1, 1, 59, 1),
    (60, '2026-10-17', 10, 'Terkirim', 1, 1, 60, 2),
    (61, '2026-10-17', 6, 'Terkirim', 1, 1, 61, 1),
    (62, '2026-10-17', 10, 'Terkirim', 1, 1, 62, 2),
    (63, '2026-10-17', 6, 'Terkirim', 1, 1, 63, 1),
    (64, '2026-10-17', 9, 'Terkirim', 1, 1, 64, 2),
    (65, '2026-10-18', 8, 'Terkirim', 1, 1, 65, 1),
    (66, '2026-10-18', 11, 'Terkirim', 1, 1, 66, 2),
    (67, '2026-10-18', 7, 'Terkirim', 1, 1, 67, 1),
    (68, '2026-10-18', 11, 'Terkirim', 1, 1, 68, 2),
    (69, '2026-10-18', 7, 'Terkirim', 1, 1, 69, 1),
    (70, '2026-10-18', 10, 'Terkirim', 1, 1, 70, 2),
    (71, '2026-10-18', 6, 'Terkirim', 1, 1, 71, 1),
    (72, '2026-10-18', 8, 'Terkirim', 1, 1, 72, 2),
    (73, '2026-10-18', 6, 'Terkirim', 1, 1, 73, 1),
    (74, '2026-10-18', 8, 'Terkirim', 1, 1, 74, 2),
    (75, '2026-10-18', 6, 'Terkirim', 1, 1, 75, 1),
    (76, '2026-10-18', 8, 'Terkirim', 1, 1, 76, 2),
    (77, '2026-10-18', 6, 'Terkirim', 1, 1, 77, 1),
    (78, '2026-10-18', 10, 'Terkirim', 1, 1, 78, 2),
    (79, '2026-10-18', 6, 'Terkirim', 1, 1, 79, 1),
    (80, '2026-10-18', 9, 'Terkirim', 1, 1, 80, 2),
    (81, '2026-10-18', 6, 'Terkirim', 1, 1, 81, 1),
    (82, '2026-10-18', 8, 'Terkirim', 1, 1, 82, 2),
    (83, '2026-10-18', 5, 'Terkirim', 1, 1, 83, 1),
    (84, '2026-10-18', 7, 'Terkirim', 1, 1, 84, 2),
    (85, '2026-10-18', 6, 'Terkirim', 1, 1, 85, 1),
    (86, '2026-10-18', 10, 'Terkirim', 1, 1, 86, 2),
    (87, '2026-10-18', 5, 'Terkirim', 1, 1, 87, 1),
    (88, '2026-10-18', 8, 'Terkirim', 1, 1, 88, 2),
    (89, '2026-10-18', 7, 'Terkirim', 1, 1, 89, 1),
    (90, '2026-10-18', 9, 'Terkirim', 1, 1, 90, 2),
    (91, '2026-10-18', 6, 'Terkirim', 1, 1, 91, 1),
    (92, '2026-10-18', 10, 'Terkirim', 1, 1, 92, 2),
    (93, '2026-10-18', 6, 'Terkirim', 1, 1, 93, 1),
    (94, '2026-10-18', 9, 'Terkirim', 1, 1, 94, 2),
    (95, '2026-10-18', 5, 'Terkirim', 1, 1, 95, 1),
    (96, '2026-10-18', 8, 'Terkirim', 1, 1, 96, 2);

-- ---------- Penerimaan produk (PR001-PR096) ----------
INSERT INTO penerimaan_produk (id_penerimaan, tanggal_terima, jumlah_diterima, kondisi_produksi, status_penerimaan, id_penjaga_tempat, id_pengiriman, id_pemilik)
VALUES
    (1, '2026-10-16', 8, 'Baik', 'Diterima', 1, 1, 1),
    (2, '2026-10-16', 11, 'Baik', 'Diterima', 1, 2, 1),
    (3, '2026-10-16', 7, 'Baik', 'Diterima', 1, 3, 1),
    (4, '2026-10-16', 11, 'Baik', 'Diterima', 1, 4, 1),
    (5, '2026-10-16', 6, 'Baik', 'Diterima', 1, 5, 1),
    (6, '2026-10-16', 10, 'Baik', 'Diterima', 1, 6, 1),
    (7, '2026-10-16', 6, 'Baik', 'Diterima', 1, 7, 1),
    (8, '2026-10-16', 8, 'Baik', 'Diterima', 1, 8, 1),
    (9, '2026-10-16', 6, 'Baik', 'Diterima', 1, 9, 1),
    (10, '2026-10-16', 8, 'Baik', 'Diterima', 1, 10, 1),
    (11, '2026-10-16', 5, 'Baik', 'Diterima', 1, 11, 1),
    (12, '2026-10-16', 8, 'Baik', 'Diterima', 1, 12, 1),
    (13, '2026-10-16', 6, 'Baik', 'Diterima', 1, 13, 1),
    (14, '2026-10-16', 10, 'Baik', 'Diterima', 1, 14, 1),
    (15, '2026-10-16', 5, 'Baik', 'Diterima', 1, 15, 1),
    (16, '2026-10-16', 8, 'Baik', 'Diterima', 1, 16, 1),
    (17, '2026-10-16', 5, 'Baik', 'Diterima', 1, 17, 1),
    (18, '2026-10-16', 8, 'Baik', 'Diterima', 1, 18, 1),
    (19, '2026-10-16', 4, 'Baik', 'Diterima', 1, 19, 1),
    (20, '2026-10-16', 7, 'Baik', 'Diterima', 1, 20, 1),
    (21, '2026-10-16', 6, 'Baik', 'Diterima', 1, 21, 1),
    (22, '2026-10-16', 9, 'Baik', 'Diterima', 1, 22, 1),
    (23, '2026-10-16', 5, 'Baik', 'Diterima', 1, 23, 1),
    (24, '2026-10-16', 7, 'Baik', 'Diterima', 1, 24, 1),
    (25, '2026-10-16', 6, 'Baik', 'Diterima', 1, 25, 1),
    (26, '2026-10-16', 9, 'Baik', 'Diterima', 1, 26, 1),
    (27, '2026-10-16', 6, 'Baik', 'Diterima', 1, 27, 1),
    (28, '2026-10-16', 9, 'Baik', 'Diterima', 1, 28, 1),
    (29, '2026-10-16', 6, 'Baik', 'Diterima', 1, 29, 1),
    (30, '2026-10-16', 9, 'Baik', 'Diterima', 1, 30, 1),
    (31, '2026-10-16', 6, 'Baik', 'Diterima', 1, 31, 1),
    (32, '2026-10-16', 8, 'Baik', 'Diterima', 1, 32, 1),
    (33, '2026-10-17', 8, 'Baik', 'Diterima', 1, 33, 1),
    (34, '2026-10-17', 12, 'Baik', 'Diterima', 1, 34, 1),
    (35, '2026-10-17', 8, 'Baik', 'Diterima', 1, 35, 1),
    (36, '2026-10-17', 11, 'Baik', 'Diterima', 1, 36, 1),
    (37, '2026-10-17', 7, 'Baik', 'Diterima', 1, 37, 1),
    (38, '2026-10-17', 10, 'Baik', 'Diterima', 1, 38, 1),
    (39, '2026-10-17', 6, 'Baik', 'Diterima', 1, 39, 1),
    (40, '2026-10-17', 9, 'Baik', 'Diterima', 1, 40, 1),
    (41, '2026-10-17', 6, 'Baik', 'Diterima', 1, 41, 1),
    (42, '2026-10-17', 9, 'Baik', 'Diterima', 1, 42, 1),
    (43, '2026-10-17', 6, 'Baik', 'Diterima', 1, 43, 1),
    (44, '2026-10-17', 8, 'Baik', 'Diterima', 1, 44, 1),
    (45, '2026-10-17', 7, 'Baik', 'Diterima', 1, 45, 1),
    (46, '2026-10-17', 10, 'Baik', 'Diterima', 1, 46, 1),
    (47, '2026-10-17', 6, 'Baik', 'Diterima', 1, 47, 1),
    (48, '2026-10-17', 9, 'Baik', 'Diterima', 1, 48, 1),
    (49, '2026-10-17', 6, 'Baik', 'Diterima', 1, 49, 1),
    (50, '2026-10-17', 8, 'Baik', 'Diterima', 1, 50, 1),
    (51, '2026-10-17', 5, 'Baik', 'Diterima', 1, 51, 1),
    (52, '2026-10-17', 7, 'Baik', 'Diterima', 1, 52, 1),
    (53, '2026-10-17', 6, 'Baik', 'Diterima', 1, 53, 1),
    (54, '2026-10-17', 10, 'Baik', 'Diterima', 1, 54, 1),
    (55, '2026-10-17', 5, 'Baik', 'Diterima', 1, 55, 1),
    (56, '2026-10-17', 8, 'Baik', 'Diterima', 1, 56, 1),
    (57, '2026-10-17', 6, 'Baik', 'Diterima', 1, 57, 1),
    (58, '2026-10-17', 10, 'Baik', 'Diterima', 1, 58, 1),
    (59, '2026-10-17', 6, 'Baik', 'Diterima', 1, 59, 1),
    (60, '2026-10-17', 10, 'Baik', 'Diterima', 1, 60, 1),
    (61, '2026-10-17', 6, 'Baik', 'Diterima', 1, 61, 1),
    (62, '2026-10-17', 10, 'Baik', 'Diterima', 1, 62, 1),
    (63, '2026-10-17', 6, 'Baik', 'Diterima', 1, 63, 1),
    (64, '2026-10-17', 9, 'Baik', 'Diterima', 1, 64, 1),
    (65, '2026-10-18', 8, 'Baik', 'Diterima', 1, 65, 1),
    (66, '2026-10-18', 11, 'Baik', 'Diterima', 1, 66, 1),
    (67, '2026-10-18', 7, 'Baik', 'Diterima', 1, 67, 1),
    (68, '2026-10-18', 11, 'Baik', 'Diterima', 1, 68, 1),
    (69, '2026-10-18', 7, 'Baik', 'Diterima', 1, 69, 1),
    (70, '2026-10-18', 10, 'Baik', 'Diterima', 1, 70, 1),
    (71, '2026-10-18', 6, 'Baik', 'Diterima', 1, 71, 1),
    (72, '2026-10-18', 8, 'Baik', 'Diterima', 1, 72, 1),
    (73, '2026-10-18', 6, 'Baik', 'Diterima', 1, 73, 1),
    (74, '2026-10-18', 8, 'Baik', 'Diterima', 1, 74, 1),
    (75, '2026-10-18', 6, 'Baik', 'Diterima', 1, 75, 1),
    (76, '2026-10-18', 8, 'Baik', 'Diterima', 1, 76, 1),
    (77, '2026-10-18', 6, 'Baik', 'Diterima', 1, 77, 1),
    (78, '2026-10-18', 10, 'Baik', 'Diterima', 1, 78, 1),
    (79, '2026-10-18', 6, 'Baik', 'Diterima', 1, 79, 1),
    (80, '2026-10-18', 9, 'Baik', 'Diterima', 1, 80, 1),
    (81, '2026-10-18', 6, 'Baik', 'Diterima', 1, 81, 1),
    (82, '2026-10-18', 8, 'Baik', 'Diterima', 1, 82, 1),
    (83, '2026-10-18', 5, 'Baik', 'Diterima', 1, 83, 1),
    (84, '2026-10-18', 7, 'Baik', 'Diterima', 1, 84, 1),
    (85, '2026-10-18', 6, 'Baik', 'Diterima', 1, 85, 1),
    (86, '2026-10-18', 10, 'Baik', 'Diterima', 1, 86, 1),
    (87, '2026-10-18', 5, 'Baik', 'Diterima', 1, 87, 1),
    (88, '2026-10-18', 8, 'Baik', 'Diterima', 1, 88, 1),
    (89, '2026-10-18', 7, 'Baik', 'Diterima', 1, 89, 1),
    (90, '2026-10-18', 9, 'Baik', 'Diterima', 1, 90, 1),
    (91, '2026-10-18', 6, 'Baik', 'Diterima', 1, 91, 1),
    (92, '2026-10-18', 10, 'Baik', 'Diterima', 1, 92, 1),
    (93, '2026-10-18', 6, 'Baik', 'Diterima', 1, 93, 1),
    (94, '2026-10-18', 9, 'Baik', 'Diterima', 1, 94, 1),
    (95, '2026-10-18', 5, 'Baik', 'Diterima', 1, 95, 1),
    (96, '2026-10-18', 8, 'Baik', 'Diterima', 1, 96, 1);

-- ---------- Laporan (data contoh, tidak ada di Excel) ----------
INSERT INTO laporan (tanggal_laporan, periode_awal, periode_akhir, jenis_laporan, id_hasil, id_penerimaan, id_alokasi, id_pengiriman, id_pemilik)
VALUES
    ('2026-10-19', '2026-10-16', '2026-10-16', 'Laporan Produksi',    1,    NULL, NULL, NULL, 1),
    ('2026-10-19', '2026-10-17', '2026-10-17', 'Laporan Produksi',    2,    NULL, NULL, NULL, 1),
    ('2026-10-19', '2026-10-18', '2026-10-18', 'Laporan Produksi',    3,    NULL, NULL, NULL, 1),
    ('2026-10-19', '2026-10-16', '2026-10-18', 'Laporan Alokasi',     NULL, NULL, 1,    NULL, 1),
    ('2026-10-19', '2026-10-16', '2026-10-18', 'Laporan Pengiriman',  NULL, NULL, NULL, 1,    1),
    ('2026-10-19', '2026-10-16', '2026-10-18', 'Laporan Penerimaan',  NULL, 1,    NULL, NULL, 1);

-- ---------- Sinkronkan penghitung SERIAL (karena id diisi manual) ----------
SELECT setval(pg_get_serial_sequence('lokasi_penjualan','id_lokasi'),        (SELECT MAX(id_lokasi)    FROM lokasi_penjualan));
SELECT setval(pg_get_serial_sequence('produk','id_produk'),                  (SELECT MAX(id_produk)    FROM produk));
SELECT setval(pg_get_serial_sequence('varian_produk','id_varian'),           (SELECT MAX(id_varian)    FROM varian_produk));
SELECT setval(pg_get_serial_sequence('bahan_baku','id_bahan'),               (SELECT MAX(id_bahan)     FROM bahan_baku));
SELECT setval(pg_get_serial_sequence('produksi','id_hasil'),                 (SELECT MAX(id_hasil)     FROM produksi));
SELECT setval(pg_get_serial_sequence('alokasi_produk','id_alokasi'),         (SELECT MAX(id_alokasi)   FROM alokasi_produk));
SELECT setval(pg_get_serial_sequence('pengiriman','id_pengiriman'),         (SELECT MAX(id_pengiriman) FROM pengiriman));
SELECT setval(pg_get_serial_sequence('penerimaan_produk','id_penerimaan'),   (SELECT MAX(id_penerimaan) FROM penerimaan_produk));

-- =====================================================================
--  3. SELECT (sesuai contoh: semua kolom, kolom tertentu, WHERE, ORDER BY)
-- =====================================================================

SELECT * FROM pemilik;
SELECT * FROM produk;
SELECT * FROM varian_produk;

SELECT nama_bahan, satuan FROM bahan_baku;

SELECT * FROM bahan_baku
WHERE satuan = 'kg';

SELECT * FROM varian_produk
ORDER BY nama_varian ASC;

SELECT * FROM produksi;
SELECT * FROM detail_produksi;
SELECT * FROM pemakaian_bahan;
SELECT * FROM alokasi_produk;
SELECT * FROM pengiriman;
SELECT * FROM penerimaan_produk;
SELECT * FROM laporan;

-- Varian yang ada produk rusaknya
SELECT * FROM detail_produksi
WHERE jumlah_rusak_pcs > 0
ORDER BY id_hasil, id_varian;

-- =====================================================================
--  4. SELECT dengan JOIN & agregasi (untuk cek data)
-- =====================================================================

-- Hasil produksi per varian
SELECT p.id_hasil, p.tanggal_produksi, v.nama_varian,
       d.jumlah_rencana_varian_pcs, d.jumlah_hasil_pcs, d.jumlah_rusak_pcs
FROM detail_produksi d
JOIN produksi p      ON p.id_hasil = d.id_hasil
JOIN varian_produk v ON v.id_varian = d.id_varian
ORDER BY p.id_hasil, v.id_varian;

-- Total pemakaian tiap bahan baku
SELECT b.nama_bahan, b.satuan, SUM(pb.jumlah_pemakaian_bahan) AS total_pemakaian
FROM pemakaian_bahan pb
JOIN bahan_baku b ON b.id_bahan = pb.id_bahan
GROUP BY b.nama_bahan, b.satuan
ORDER BY b.nama_bahan;

-- Alur lengkap: alokasi -> pengiriman -> penerimaan
SELECT a.id_alokasi, v.nama_varian, l.nama_lokasi, l.alamat_lokasi,
       a.jumlah_alokasi, pg.status_pengiriman, pn.jumlah_diterima, pn.kondisi_produksi
FROM alokasi_produk a
JOIN varian_produk v     ON v.id_varian = a.id_varian
JOIN lokasi_penjualan l  ON l.id_lokasi = a.id_lokasi
JOIN pengiriman pg       ON pg.id_alokasi = a.id_alokasi
JOIN penerimaan_produk pn ON pn.id_pengiriman = pg.id_pengiriman
ORDER BY a.id_alokasi;

-- Total donat diterima per lokasi
SELECT l.nama_lokasi, SUM(pn.jumlah_diterima) AS total_diterima
FROM penerimaan_produk pn
JOIN pengiriman pg      ON pg.id_pengiriman = pn.id_pengiriman
JOIN lokasi_penjualan l ON l.id_lokasi = pg.id_lokasi
GROUP BY l.nama_lokasi
ORDER BY l.nama_lokasi;

-- Cek: hasil produksi = total alokasi per rencana (harus selisih 0)
SELECT p.id_hasil, p.jumlah_hasil, SUM(a.jumlah_alokasi) AS total_alokasi,
       p.jumlah_hasil - SUM(a.jumlah_alokasi) AS selisih
FROM produksi p
JOIN alokasi_produk a ON a.id_hasil = p.id_hasil
GROUP BY p.id_hasil, p.jumlah_hasil
ORDER BY p.id_hasil;