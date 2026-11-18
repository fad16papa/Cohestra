"use client";

import { useEffect, useState } from "react";

import { ClientPhoneDisplay } from "@/components/clients/client-phone-display";
import { ContactNumberField } from "@/components/clients/contact-number-field";
import { NationalityField } from "@/components/clients/nationality-field";
import {
  clientProfileCardClassName,
  clientProfileFieldRowClassName,
} from "@/components/clients/client-profile-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  updateClientMasterProfile,
  type ClientDetail,
} from "@/lib/clients-api";
import {
  parsePhoneForEdit,
  validatePhoneLocalNumber,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ClientMasterFieldsProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
  /** Single-column layout for narrow sidebar placement. */
  compact?: boolean;
};

type MasterProfileFormState = {
  fullName: string;
  phoneCountry: string;
  phoneLocal: string;
  email: string;
  profession: string;
  nationality: string;
  residency: string;
  consentGiven: boolean;
  referralSource: string;
  notes: string;
};

function createFormState(client: ClientDetail): MasterProfileFormState {
  const phoneParts = parsePhoneForEdit(client.phone);

  return {
    fullName: client.fullName,
    phoneCountry: phoneParts.countryCode,
    phoneLocal: phoneParts.localNumber,
    email: client.email ?? "",
    profession: client.profession ?? "",
    nationality: client.nationality ?? "",
    residency: client.residency ?? "",
    consentGiven: client.consentGiven,
    referralSource: client.referralSource ?? "",
    notes: client.notes ?? "",
  };
}

function displayValue(value: string | null | undefined, emptyLabel = "Not provided") {
  if (!value || value.trim().length === 0) {
    return emptyLabel;
  }

  return value;
}

export function ClientMasterFields({
  client,
  onUpdated,
  compact = false,
}: ClientMasterFieldsProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<MasterProfileFormState>(() =>
    createFormState(client)
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setForm(createFormState(client));
      setPhoneError(null);
    }
  }, [client, isEditing]);

  function handleCancel() {
    setForm(createFormState(client));
    setPhoneError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    const trimmedName = form.fullName.trim();
    if (!trimmedName) {
      showToast("Name is required.");
      return;
    }

    const phoneValidation = form.phoneLocal.trim()
      ? validatePhoneLocalNumber(form.phoneCountry, form.phoneLocal, true)
      : null;

    if (phoneValidation) {
      setPhoneError(phoneValidation);
      return;
    }

    setPhoneError(null);
    setIsSaving(true);

    try {
      const updated = await updateClientMasterProfile(authFetch, client.id, {
        fullName: trimmedName,
        phone: form.phoneLocal.trim() || null,
        phoneCountry: form.phoneCountry,
        email: form.email.trim() || null,
        profession: form.profession.trim() || null,
        nationality: form.nationality.trim() || null,
        residency: form.residency.trim() || null,
        consentGiven: form.consentGiven,
        referralSource: form.referralSource.trim() || null,
        notes: form.notes.trim() || null,
      });

      onUpdated(updated);
      setIsEditing(false);
      showToast("Master profile updated.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update master profile."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className={clientProfileCardClassName}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Master profile</CardTitle>
          <CardDescription>
            Consolidated contact and follow-up fields. Edit to correct or enrich
            the master record after registrations.
          </CardDescription>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setIsEditing(true)}
          >
            Edit profile
          </Button>
        ) : (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <dl
            className={cn(
              "grid gap-2",
              compact ? "gap-3" : "sm:grid-cols-2 sm:gap-4"
            )}
          >
            {[
              { label: "Name", value: client.fullName },
              {
                label: "Contact number",
                value: <ClientPhoneDisplay phone={client.phone} />,
              },
              { label: "Email / social", value: displayValue(client.email) },
              { label: "Profession", value: displayValue(client.profession) },
              { label: "Nationality", value: displayValue(client.nationality) },
              { label: "Residency", value: displayValue(client.residency) },
              {
                label: "Consent",
                value: client.consentGiven ? "Given" : "Not given",
              },
              {
                label: "Referral source",
                value: displayValue(client.referralSource),
              },
              {
                label: "Notes",
                value: displayValue(client.notes, "No notes yet"),
              },
            ].map((field) => (
              <div
                key={field.label}
                className={cn("space-y-1", clientProfileFieldRowClassName)}
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                  {field.label}
                </dt>
                <dd className="text-sm text-text-warm">{field.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="master-full-name">Name</Label>
              <Input
                id="master-full-name"
                value={form.fullName}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
              />
            </div>

            <ContactNumberField
              countryId="master-phone-country"
              numberId="master-phone-local"
              countryCode={form.phoneCountry}
              localNumber={form.phoneLocal}
              disabled={isSaving}
              error={phoneError}
              onCountryChange={(phoneCountry) => {
                setPhoneError(null);
                setForm((current) => ({ ...current, phoneCountry }));
              }}
              onLocalNumberChange={(phoneLocal) => {
                setPhoneError(null);
                setForm((current) => ({ ...current, phoneLocal }));
              }}
            />

            <div className="min-w-0 space-y-2">
              <Label htmlFor="master-email">Email / social</Label>
              <Input
                id="master-email"
                type="email"
                value={form.email}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="master-profession">Profession</Label>
              <Input
                id="master-profession"
                value={form.profession}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    profession: event.target.value,
                  }))
                }
              />
            </div>

            <NationalityField
              id="master-nationality"
              value={form.nationality}
              savedValue={client.nationality ?? ""}
              disabled={isSaving}
              onChange={(nationality) =>
                setForm((current) => ({ ...current, nationality }))
              }
            />

            <div className="min-w-0 space-y-2">
              <Label htmlFor="master-residency">Residency</Label>
              <Input
                id="master-residency"
                value={form.residency}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    residency: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="master-referral">Referral source</Label>
              <Input
                id="master-referral"
                value={form.referralSource}
                disabled={isSaving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    referralSource: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="master-consent"
                type="checkbox"
                checked={form.consentGiven}
                disabled={isSaving}
                className="size-4 rounded border-input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    consentGiven: event.target.checked,
                  }))
                }
              />
              <Label htmlFor="master-consent" className="font-normal">
                Consent given for contact
              </Label>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="master-notes">Notes</Label>
              <textarea
                id="master-notes"
                rows={4}
                value={form.notes}
                disabled={isSaving}
                className="flex min-h-[5rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
