"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, Download, Mail, Pencil, Phone, User } from "lucide-react";

import { PhoneCountrySelect } from "@/components/activities/phone-country-select";
import { useAuth } from "@/components/auth/auth-provider";
import { BillingPaymentMethodDialog } from "@/components/billing/billing-payment-method-dialog";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  cancelSubscriptionWithAuth,
  fetchBillingDetailsWithAuth,
  formatCardBrand,
  formatInvoiceAmount,
  resumeSubscriptionWithAuth,
  updateBillingContactWithAuth,
  type BillingDetails,
} from "@/lib/billing/billing-details-api";
import { syncBillingFromStripeWithAuth } from "@/lib/billing/billing-api";
import {
  formatPhoneDisplay,
  getPhonePlaceholder,
  getPhonePrefixLabel,
  parsePhoneForEdit,
  validatePhoneLocalNumber,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type InAppBillingPanelProps = {
  shellPlan: string;
  shellBillingStatus: string;
  shellTrialEndsAt: string | null;
  onRefreshShell: () => Promise<void>;
};

function BillingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-warm bg-card p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function InAppBillingPanel({
  shellPlan,
  shellBillingStatus,
  shellTrialEndsAt,
  onRefreshShell,
}: InAppBillingPanelProps) {
  const { authFetch, profile } = useAuth();
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhoneCountry, setContactPhoneCountry] = useState("SG");
  const [contactPhoneLocal, setContactPhoneLocal] = useState("");
  const [contactPhoneError, setContactPhoneError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [subscriptionUpdating, setSubscriptionUpdating] = useState(false);

  const applyContactForm = useCallback((contact: BillingDetails["contact"]) => {
    setContactName(contact?.name ?? "");
    const parsed = parsePhoneForEdit(contact?.phone);
    setContactPhoneCountry(parsed.countryCode);
    setContactPhoneLocal(parsed.localNumber);
    setContactPhoneError(null);
  }, []);

  const operatorEmail = profile?.email ?? "";

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchBillingDetailsWithAuth(authFetch);
      setDetails(next);
      applyContactForm(next.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing details.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, applyContactForm]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const refreshAll = async () => {
    setSyncing(true);
    try {
      await syncBillingFromStripeWithAuth(authFetch);
      await onRefreshShell();
      await loadDetails();
    } finally {
      setSyncing(false);
    }
  };

  if (shellPlan === "Basic") {
    return (
      <div className="space-y-4">
        <UpgradePanel
          title="Upgrade your workspace"
          description="Compare Core and Pro, choose monthly or yearly billing, then continue to Stripe Checkout to start your trial."
          requiredPlan="Core"
          isTenantAdmin
        />
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-text-muted-warm")}
          disabled={syncing}
          onClick={() => void refreshAll()}
        >
          {syncing ? "Refreshing…" : "Refresh billing status"}
        </button>
      </div>
    );
  }

  if (loading && !details) {
    return <p className="text-sm text-text-muted-warm">Loading billing details…</p>;
  }

  if (error && !details) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadDetails()}>
          Try again
        </Button>
      </div>
    );
  }

  const paymentMethod = details?.paymentMethod ?? null;
  const contact = details?.contact;
  const subscription = details?.subscription;
  const invoices = details?.invoices ?? [];
  const stripeConfigured = details?.summary.stripeConfigured ?? false;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border-warm bg-muted/20 p-4 text-sm text-text-muted-warm">
        <p>
          Plan: <span className="font-medium text-text-warm">{shellPlan}</span>
          {" · "}
          Status: <span className="font-medium text-text-warm">{shellBillingStatus}</span>
        </p>
        {shellTrialEndsAt ? (
          <p className="mt-2">
            Trial ends{" "}
            {new Date(shellTrialEndsAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        ) : null}
        {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd ? (
          <p className="mt-2 text-amber-800 dark:text-amber-200">
            Cancellation scheduled for{" "}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            .
          </p>
        ) : null}
      </div>

      {!stripeConfigured ? (
        <p className="text-sm text-text-muted-warm">Stripe is not configured in this environment.</p>
      ) : (
        <>
          <BillingSection title="Payment method">
            {paymentMethod ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-text-warm">
                  <CreditCard className="size-4 text-text-muted-warm" aria-hidden />
                  {formatCardBrand(paymentMethod.brand)} ending in {paymentMethod.last4}
                  <span className="text-text-muted-warm">
                    · Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  Update payment method
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted-warm">No payment method on file.</p>
                <Button type="button" size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  Add payment method
                </Button>
              </div>
            )}
          </BillingSection>

          <BillingSection title="Billing information">
            {editingContact ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const phoneError = validatePhoneLocalNumber(
                    contactPhoneCountry,
                    contactPhoneLocal,
                    false
                  );
                  if (phoneError) {
                    setContactPhoneError(phoneError);
                    return;
                  }

                  setContactSaving(true);
                  setContactPhoneError(null);
                  void updateBillingContactWithAuth(authFetch, {
                    name: contactName.trim() || undefined,
                    phoneCountry: contactPhoneCountry,
                    phoneLocal: contactPhoneLocal.trim(),
                  })
                    .then(() => {
                      setEditingContact(false);
                      return loadDetails();
                    })
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : "Could not update contact.");
                    })
                    .finally(() => setContactSaving(false));
                }}
              >
                <label className="block space-y-1">
                  <span className="text-xs text-text-muted-warm">Name</span>
                  <input
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="w-full rounded-lg border border-border-warm bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-text-muted-warm">Email</span>
                  <input
                    type="email"
                    value={operatorEmail}
                    readOnly
                    disabled
                    className="w-full rounded-lg border border-border-warm bg-muted/30 px-3 py-2 text-sm text-text-muted-warm"
                  />
                  <p className="text-xs text-text-muted-warm">
                    Billing uses your signed-in account email.
                  </p>
                </label>
                <PhoneCountrySelect
                  id="billing-phone-country"
                  value={contactPhoneCountry}
                  label="Mobile country"
                  helperText="Choose your country first — the calling code fills in automatically."
                  onChange={(value) => {
                    setContactPhoneError(null);
                    setContactPhoneCountry(value);
                  }}
                />
                <label className="block space-y-1">
                  <span className="text-xs text-text-muted-warm">Mobile number</span>
                  <div className="flex overflow-hidden rounded-lg border border-border-warm bg-background focus-within:border-lagoon/40 focus-within:ring-2 focus-within:ring-lagoon/20">
                    <span className="flex min-h-10 items-center border-r border-border-warm bg-muted/40 px-3 text-sm text-text-muted-warm">
                      {getPhonePrefixLabel(contactPhoneCountry)}
                    </span>
                    <input
                      type="tel"
                      autoComplete="tel-national"
                      value={contactPhoneLocal}
                      placeholder={getPhonePlaceholder(contactPhoneCountry)}
                      aria-invalid={contactPhoneError ? true : undefined}
                      onChange={(event) => {
                        setContactPhoneError(null);
                        setContactPhoneLocal(event.target.value);
                      }}
                      className="min-h-10 w-full bg-transparent px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  {contactPhoneError ? (
                    <p className="text-xs text-destructive">{contactPhoneError}</p>
                  ) : null}
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={contactSaving}>
                    {contactSaving ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingContact(false);
                      applyContactForm(contact ?? null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 text-sm text-text-warm">
                  <p className="flex items-center gap-2">
                    <User className="size-4 text-text-muted-warm" aria-hidden />
                    {contact?.name?.trim() || "—"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="size-4 text-text-muted-warm" aria-hidden />
                    {operatorEmail || contact?.email?.trim() || "—"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 text-text-muted-warm" aria-hidden />
                    {formatPhoneDisplay(contact?.phone)?.display ?? "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setEditingContact(true)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Update information
                </Button>
              </div>
            )}
          </BillingSection>

          <BillingSection title="Invoice history">
            {invoices.length === 0 ? (
              <p className="text-sm text-text-muted-warm">No invoice history yet.</p>
            ) : (
              <ul className="divide-y divide-border-warm">
                {invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-text-warm">
                        {formatInvoiceAmount(invoice.amountDueCents, invoice.currency)}
                      </p>
                      <p className="text-text-muted-warm">
                        {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {" · "}
                        {invoice.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                        >
                          <Download className="size-4" aria-hidden />
                          PDF
                        </a>
                      ) : null}
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          View
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </BillingSection>

          <BillingSection title="Plan management">
            <div className="space-y-3 text-sm text-text-muted-warm">
              <p>Upgrade plan or change billing interval from checkout.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/billing/checkout?plan=pro&interval=monthly&start=1" className={buttonVariants({ size: "sm" })}>
                  Change plan
                </Link>
                {subscription?.cancelAtPeriodEnd ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={subscriptionUpdating}
                    onClick={() => {
                      setSubscriptionUpdating(true);
                      void resumeSubscriptionWithAuth(authFetch)
                        .then(() => refreshAll())
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : "Could not resume subscription.");
                        })
                        .finally(() => setSubscriptionUpdating(false));
                    }}
                  >
                    {subscriptionUpdating ? "Updating…" : "Keep subscription"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={subscriptionUpdating}
                    onClick={() => {
                      setSubscriptionUpdating(true);
                      void cancelSubscriptionWithAuth(authFetch)
                        .then(() => refreshAll())
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : "Could not schedule cancellation.");
                        })
                        .finally(() => setSubscriptionUpdating(false));
                    }}
                  >
                    {subscriptionUpdating ? "Updating…" : "Cancel at period end"}
                  </Button>
                )}
              </div>
            </div>
          </BillingSection>
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="button"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-text-muted-warm")}
        disabled={syncing}
        onClick={() => void refreshAll()}
      >
        {syncing ? "Refreshing…" : "Refresh billing status"}
      </button>

      <BillingPaymentMethodDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onSaved={() => void loadDetails()}
      />
    </div>
  );
}
