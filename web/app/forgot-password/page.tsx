import { AuthFlowShell } from "@/components/auth/auth-flow-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthFlowShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="We'll email you a one-time code to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthFlowShell>
  );
}
