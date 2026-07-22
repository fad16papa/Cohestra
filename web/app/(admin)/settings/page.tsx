import { AppearanceSection } from "@/components/settings/appearance-section";
import { BrandAccentSection } from "@/components/settings/brand-accent-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { SettingsAdminLinks } from "@/components/settings/settings-admin-links";
import { EmailDeliveryChecklist } from "@/components/campaigns/email-delivery-checklist";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="border-border-warm">
        <CardContent className="space-y-10 pt-6">
          <p className="text-sm text-text-muted-warm">
            Operator preferences for your admin workspace.
            <SettingsAdminLinks />
          </p>
          <AppearanceSection />
          <BrandAccentSection />
          <ChangePasswordSection />
        </CardContent>
      </Card>

      <Card className="border-border-warm">
        <CardContent className="pt-6">
          <EmailDeliveryChecklist variant="panel" showWhenReady />
        </CardContent>
      </Card>
    </div>
  );
}
