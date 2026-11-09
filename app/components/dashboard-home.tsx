import Link from "next/link";
import DashboardShell from "./dashboard-shell";
import {
  dashboardHref,
  type DashboardConfig,
  type DashboardNavigationItem,
} from "../../lib/dashboard-config";

export default function DashboardHome({
  config,
  accountName,
  metricValues,
}: {
  config: DashboardConfig;
  accountName: string;
  metricValues: string[];
}) {
  const navigation: DashboardNavigationItem[] = [
    { id: "beranda", label: "Beranda", href: dashboardHref(config.role) },
    ...config.modules.map((module) => ({
      id: module.id,
      label: module.label,
      href: dashboardHref(config.role, module.id),
    })),
  ];

  return (
    <DashboardShell
      activeItem="beranda"
      homeHref={dashboardHref(config.role)}
      navigation={navigation}
      stakeholder={config.label}
      accountName={accountName}
      theme={config.theme}
    >
      <section className="dashboard-home-panel">
        <div className="dashboard-heading">
          <div>
            <p className="dashboard-eyebrow">Beranda</p>
            <h1>Beranda {config.label}</h1>
            <p className="dashboard-intro">{config.welcome}</p>
          </div>
        </div>

        <section className="dashboard-metrics" aria-label="Ringkasan data">
          {config.metrics.map((metric, index) => (
            <article className="metric-card" key={metric.label}>
              <span
                className={`metric-accent-bar metric-accent-${metric.tone}`}
                aria-hidden="true"
              />
              <div>
                <p>{metric.label}</p>
                <strong>{metricValues[index] ?? "—"}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-shortcuts-section">
          <h2>Menu {config.label}</h2>
          <div className="dashboard-shortcuts">
            {config.modules.map((module) => (
              <Link
                className="dashboard-shortcut"
                href={dashboardHref(config.role, module.id)}
                key={module.id}
              >
                {module.label}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </DashboardShell>
  );
}
