import Link from "next/link";

import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthFlowShell
      eyebrow="First-time setup"
      title="Create your workspace admin account"
      description="This creates the initial admin account for your workspace. You can invite teammates later, according to your plan."
      footer={
        <p className="text-xs leading-relaxed text-text-muted-warm">
          By continuing, you agree to secure this workspace for authorized use only.
        </p>
      }
    >
      <RegisterForm />
    </AuthFlowShell>
  );
}
