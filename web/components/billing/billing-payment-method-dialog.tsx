"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  confirmPaymentMethodSetupWithAuth,
  createPaymentMethodSetupWithAuth,
} from "@/lib/billing/billing-details-api";

type BillingPaymentMethodDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function PaymentMethodForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { authFetch } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!stripe || !elements) {
          return;
        }

        setSubmitting(true);
        setError(null);

        void stripe
          .confirmSetup({
            elements,
            redirect: "if_required",
          })
          .then(async (result) => {
            if (result.error) {
              throw new Error(result.error.message ?? "Could not save payment method.");
            }

            const setupIntentId = result.setupIntent?.id;
            if (!setupIntentId) {
              throw new Error("Setup did not complete.");
            }

            await confirmPaymentMethodSetupWithAuth(authFetch, setupIntentId);
            onSaved();
            onClose();
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : "Could not save payment method.");
          })
          .finally(() => setSubmitting(false));
      }}
    >
      <PaymentElement options={{ layout: "tabs" }} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || !elements || submitting}>
          {submitting ? "Saving…" : "Save payment method"}
        </Button>
      </div>
    </form>
  );
}

export function BillingPaymentMethodDialog({
  open,
  onClose,
  onSaved,
}: BillingPaymentMethodDialogProps) {
  const { authFetch } = useAuth();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStripePromise(null);
      setClientSecret(null);
      setError(null);
      return;
    }

    setLoading(true);
    void createPaymentMethodSetupWithAuth(authFetch)
      .then((setup) => {
        setStripePromise(loadStripe(setup.publishableKey));
        setClientSecret(setup.clientSecret);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not start payment setup.");
      })
      .finally(() => setLoading(false));
  }, [authFetch, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-payment-method-title"
        className="w-full max-w-lg rounded-2xl border border-border-warm bg-card p-5 shadow-xl sm:p-6"
      >
        <h3 id="billing-payment-method-title" className="text-base font-semibold text-text-warm">
          Add payment method
        </h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Card details are processed securely by Stripe. Cohestra never stores your full card number.
        </p>

        <div className="mt-5">
          {loading ? <p className="text-sm text-text-muted-warm">Loading secure form…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && stripePromise && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentMethodForm onClose={onClose} onSaved={onSaved} />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}
