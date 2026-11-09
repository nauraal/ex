import { redirect } from "next/navigation";
import AccountFlowForm from "../components/account-flow-form";
import { getStakeholder } from "../../lib/stakeholders";

export const instant = false;

export default async function RecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const { role: roleParam } = await searchParams;
  const stakeholder = getStakeholder(roleParam);
  if (!stakeholder) redirect("/");

  return (
    <AccountFlowForm
      mode="recovery"
      role={stakeholder.id}
      stakeholder={stakeholder.label}
    />
  );
}
