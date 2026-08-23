"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { Button } from "@/components/ui/button";
import {
  confirmPaymentMethodSetupWithAuth,
  createPaymentMethodSetupWithAuth,
} from "@/lib/billing/billing-details-api";
import { openPaddleCheckoutOverlay } from "@/lib/billing/paddle-checkout";

type BillingPaymentMethodDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function BillingPaymentMethodDialog({
  open,
  onClose,
  onSaved,
}: BillingPaymentMethodDialogProps) {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const workspaceLabel = shell?.tenantName?.trim() || "this workspace";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void createPaymentMethodSetupWithAuth(authFetch)
      .then(async (setup) => {
        await openPaddleCheckoutOverlay({
          clientToken: setup.clientToken,
          transactionId: setup.clientSecret,
          successUrl: window.location.href,
          onCompleted: (transactionId) => {
            void confirmPaymentMethodSetupWithAuth(authFetch, transactionId)
              .then(() => {
                if (!cancelled) {
                  onSaved();
                  onClose();
                }
              })
              .catch((err) => {
                if (!cancelled) {
                  setError(err instanceof Error ? err.message : "Could not save payment method.");
                }
              });
          },
          onClosed: () => {
            if (!cancelled) {
              onClose();
            }
          },
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not start payment setup.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, onClose, onSaved, open]);

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
          Card details are processed securely by Paddle and saved to workspace{" "}
          <span className="font-medium text-text-warm">{workspaceLabel}</span>. Cohestra never
          stores your full card number.
        </p>

        <div className="mt-5 space-y-4">
          {loading ? <p className="text-sm text-text-muted-warm">Opening secure card form…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
