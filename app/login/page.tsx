import { redirect } from "next/navigation";
import { dashboardPath, getAuthenticatedUser } from "../../lib/auth";
import LoginDemoForm from "./login-demo-form";

export const instant = false;

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect(dashboardPath(user.role));
  return <LoginDemoForm />;
}
