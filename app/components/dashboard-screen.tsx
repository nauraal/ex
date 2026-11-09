import Link from "next/link";
import DashboardShell from "./dashboard-shell";
import DemoForm from "./demo-form";
import DemoReportFilters from "./demo-report-filters";
import {
  dashboardHref,
  type DashboardConfig,
  type DashboardNavigationItem,
  type DemoScreen,
} from "../../lib/dashboard-config";

export default function DashboardScreen({
  config,
  screen,
  accountName,
}: {
  config: DashboardConfig;
  screen: DemoScreen;
  accountName: string;
}) {
  const activeModule = config.modules.find(
    (module) => module.id === screen.menuId,
  );
  const navigation: DashboardNavigationItem[] = [
    { id: "beranda", label: "Beranda", href: dashboardHref(config.role) },
    ...config.modules.map((module) => ({
      id: module.id,
      label: module.label,
      href: dashboardHref(config.role, module.id),
    })),
  ];
  const backHref = screen.backHref
    ? dashboardHref(config.role, screen.backHref)
    : dashboardHref(config.role);
  const primaryHref = screen.primaryAction
    ? dashboardHref(config.role, screen.primaryAction.href)
    : undefined;
  const secondaryHref = screen.secondaryAction
    ? dashboardHref(config.role, screen.secondaryAction.href)
    : undefined;
  const tableColumns =
    screen.columns?.[screen.columns.length - 1] === "Aksi"
      ? screen.columns.slice(0, -1)
      : screen.columns;

  return (
    <DashboardShell
      activeItem={screen.menuId}
      homeHref={dashboardHref(config.role)}
      navigation={navigation}
      stakeholder={config.label}
      accountName={accountName}
      theme={config.theme}
    >
      <section className="dashboard-home-panel dashboard-screen-panel">
        <div className="dashboard-heading dashboard-screen-heading">
          <div>
            <p className="dashboard-eyebrow">{activeModule?.label ?? "Menu"}</p>
            <h1>{screen.title}</h1>
            <p className="dashboard-intro">{screen.description}</p>
          </div>
          {primaryHref || secondaryHref ? (
            <div className="dashboard-screen-actions">
              {secondaryHref ? (
                <Link
                  className="demo-button demo-button-secondary"
                  href={secondaryHref}
                >
                  {screen.secondaryAction?.label}
                </Link>
              ) : null}
              {primaryHref ? (
                <Link
                  className="demo-button demo-button-primary"
                  href={primaryHref}
                >
                  {screen.primaryAction?.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {screen.tabs?.length ? (
          <nav className="demo-tabs" aria-label="Bagian halaman">
            {screen.tabs.map((tab) => (
              <Link
                aria-current={tab.href === screen.slug ? "page" : undefined}
                className={`demo-tab${tab.href === screen.slug ? " is-active" : ""}`}
                href={dashboardHref(config.role, tab.href)}
                key={tab.href}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {screen.kind === "form" && screen.fields ? (
          <div className="demo-card">
            <DemoForm
              fields={screen.fields}
              submitLabel={screen.submitLabel}
              validation={screen.validation}
            />
          </div>
        ) : null}

        {screen.kind === "detail" && screen.details ? (
          <div className="demo-card">
            <dl className="demo-details">
              {screen.details.map((item) => (
                <div className="demo-detail-row" key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            {screen.primaryAction && primaryHref ? (
              <Link className="demo-button demo-button-primary" href={primaryHref}>
                {screen.primaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}

        {(screen.kind === "table" || screen.kind === "report") &&
        screen.columns &&
        screen.rows ? (
          <div className="demo-card">
            {screen.kind === "report" ? (
              <DemoReportFilters
                columns={tableColumns ?? []}
                role={config.role}
                rows={screen.rows}
              />
            ) : (
              <div className="demo-table-wrap">
                <table className="demo-table">
                  <thead>
                    <tr>
                      {tableColumns?.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screen.rows.map((item, index) => (
                      <tr key={`${item.values[0]}-${index}`}>
                        {item.values.map((value, cellIndex) => (
                          <td key={`${cellIndex}-${value}`}>{value}</td>
                        ))}
                        <td>
                          <div className="demo-row-actions">
                            {(item.actions ?? [
                              {
                                label: item.actionLabel ?? "Lihat",
                                href: item.href,
                              },
                            ]).map((action) => (
                              <Link
                                className="demo-row-link"
                                href={dashboardHref(config.role, action.href)}
                                key={`${action.label}-${action.href}`}
                              >
                                {action.label}
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {screen.note ? <p className="demo-note">{screen.note}</p> : null}
        {screen.relatedLinks?.length ? (
          <nav className="demo-related-links" aria-label="Halaman terkait">
            {screen.relatedLinks.map((item) => (
              <Link
                className="demo-text-link"
                href={dashboardHref(config.role, item.href)}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="demo-screen-footer">
          <Link className="demo-button demo-button-secondary" href={backHref}>
            Kembali
          </Link>
          <Link className="demo-text-link" href={dashboardHref(config.role)}>
            Beranda {config.label}
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
