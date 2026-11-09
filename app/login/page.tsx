import { redirect } from "next/navigation";
import { getStakeholder } from "../../lib/stakeholders";
import LoginDemoForm from "./login-demo-form";

export const instant = false;

type LoginPageProps = {
  searchParams: Promise<{ role?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { role: roleParam } = await searchParams;
  const stakeholder = getStakeholder(roleParam);

  if (!stakeholder) {
    redirect("/");
  }

  return (
    <LoginDemoForm role={stakeholder.id} stakeholder={stakeholder.label} />
  );
}
