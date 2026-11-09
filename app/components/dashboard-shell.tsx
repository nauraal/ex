import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type {
  DashboardNavigationItem,
  DashboardTheme,
} from "../../lib/dashboard-config";

import LogoutButton from "./logout-button";

type DashboardShellProps = {
  stakeholder: string;
  accountName: string;
  navigation: DashboardNavigationItem[];
  activeItem: string;
  theme: DashboardTheme;
  homeHref: string;
  children: ReactNode;
};

export default function DashboardShell({
  stakeholder,
  accountName,
  navigation,
  activeItem,
  theme,
  homeHref,
  children,
}: DashboardShellProps) {
  return (
    <div className={`dashboard-layout dashboard-theme-${theme}`}>
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href={homeHref}>
          <Image
            className="dashboard-brand-mark"
            src="/zazi/donut.png"
            alt=""
            width={42}
            height={42}
          />
          <span>
            <strong>ZAZI DONUT</strong>
            <small>Sistem Informasi</small>
          </span>
        </Link>

        <nav className="dashboard-navigation" aria-label="Navigasi dashboard">
          {navigation.map((item) => (
            <Link
              aria-current={item.id === activeItem ? "page" : undefined}
              className={`dashboard-nav-item${item.id === activeItem ? " is-active" : ""}`}
              href={item.href}
              key={item.id}
            >
              <span className="dashboard-nav-icon" aria-hidden="true">
                <DashboardIcon id={item.id} />
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-account">
            <span className="dashboard-avatar" aria-hidden="true">
              {stakeholder.charAt(0)}
            </span>
            <span>
              <strong>{accountName}</strong>
              <small>{stakeholder}</small>
            </span>
          </div>
          <LogoutButton />
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

function DashboardIcon({ id }: { id: string }) {
  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
  };

  switch (id) {
    case "beranda":
      return (
        <svg {...commonProps}>
          <path d="m3.5 10 8.5-7 8.5 7v10.5h-6v-7h-5v7h-6z" />
        </svg>
      );
    case "verifikasi":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16.5 9" />
        </svg>
      );
    case "produk":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "rencana":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="5" width="17" height="16" rx="1.5" />
          <path d="M7.5 3v4M16.5 3v4M3.5 9h17" />
        </svg>
      );
    case "bahan":
    case "bahan-baku":
    case "persediaan":
      return (
        <svg {...commonProps}>
          <path d="m12 2.8 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );
    case "stok":
      return (
        <svg {...commonProps}>
          <path d="m12 2.8 8.7 4.8v9.1L12 21.5l-8.7-4.8V7.6z" />
          <path d="m3.7 7.7 8.3 4.7 8.3-4.7M12 12.4v9" />
        </svg>
      );
    case "alokasi":
      return (
        <svg {...commonProps}>
          <path d="M4 12h8M12 12l6-6M12 12l6 6M18 6h2M18 18h2" />
          <circle cx="4" cy="12" r="1.5" />
        </svg>
      );
    case "laporan":
      return (
        <svg {...commonProps}>
          <path d="M4 20V4M4 20h17M8 16v-4M12 16V8M16 16v-6M20 16V5" />
        </svg>
      );
    case "produksi":
    case "hasil-produksi":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="m8 9 1.5 1.5L12 8M14 9h3M8 15l1.5 1.5L12 14M14 15h3" />
        </svg>
      );
    case "pengiriman":
    case "pengirimanMasuk":
    case "riwayat-pengiriman":
    case "informasi-produk":
    case "status-pengiriman":
      return (
        <svg {...commonProps}>
          <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </svg>
      );
    case "riwayat":
    case "riwayat-penerimaan":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "informasi":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case "penerimaan":
    case "menerima-produk":
      return (
        <svg {...commonProps}>
          <path d="M4 5h16l1 14H3zM4 10h5l1.5 3h3L15 10h5" />
        </svg>
      );
    case "kualitas":
    case "kualitas-hasil":
      return (
        <svg {...commonProps}>
          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
