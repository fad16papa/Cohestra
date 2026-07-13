import Link from "next/link";

import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthFlowShell
      eyebrow="First-time setup"
      title="Create your operator account"
      description="One workspace, one operator — set up Cohestra with your email, nickname, and password."
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
