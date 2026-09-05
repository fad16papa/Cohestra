"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { PhoneFieldInput } from "@/components/registration/phone-field-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityFormSchema, FormFieldDefinition } from "@/lib/activities-api";
import { isHiddenFieldType, isNonInputFieldType } from "@/lib/form-schema-utils";
import { collectHiddenAnswers } from "@/lib/hidden-field-query";
import { isIsoCalendarDate } from "@/lib/iso-calendar-date";
import { isIsoClockTime } from "@/lib/iso-clock-time";
import { isSupportedPhoneCountry, phoneCountryOptions } from "@/lib/phone-countries";
import {
  getScaleFieldLabel,
  isScaleFieldValue,
  scaleFieldValues,
} from "@/lib/scale-labels";
import {
  fieldsForStep,
  formStepLabels,
  usedFormSteps,
} from "@/lib/form-steps";
import { isFieldVisible } from "@/lib/form-visibility";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { validatePhoneLocalNumber } from "@/lib/phone-countries";
import { PUBLIC_PLAN_REGISTRATION_LIMIT_COPY } from "@/lib/public-registration-messages";
import {
  submitPublicRegistration,
  type PublicRegistrationSubmitResult,
} from "@/lib/public-registration-api";
import { cn } from "@/lib/utils";

type RegistrationFormProps = {
  schema: ActivityFormSchema;
  variant?: "public" | "preview";
  className?: string;
  activitySlug?: string;
  onSubmitted?: (result: PublicRegistrationSubmitResult) => void;
  onSubmitError?: (message: string | null) => void;
};

type FieldErrors = Record<string, string>;

type EmergencyContactValue = {
  name: string;
  phone: string;
};

function readEmergencyValue(value: unknown): EmergencyContactValue {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : "",
      phone: typeof record.phone === "string" ? record.phone : "",
    };
  }

  return { name: "", phone: "" };
}

const TEXTAREA_MAX_LENGTH = 2000;
const EMERGENCY_NAME_MAX_LENGTH = 200;

function validateEmailField(value: unknown, required: boolean): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) {
    return "This field is required.";
  }

  if (text && !text.includes("@")) {
    return "Enter a valid email address.";
  }

  return null;
}

function validatePhoneField(
  field: FormFieldDefinition,
  value: unknown,
  required: boolean
): string | null {
  return validatePhoneLocalNumber(
    field.phoneCountry ?? null,
    value,
    required
  );
}

function validateField(field: FormFieldDefinition, value: unknown): string | null {
  if (isNonInputFieldType(field.type) || isHiddenFieldType(field.type)) {
    return null;
  }

  if (field.type === "checkbox" || field.type === "consent") {
    if (field.required && value !== true) {
      return field.type === "consent"
        ? "Consent is required."
        : "This field is required.";
    }

    return null;
  }

  if (field.type === "select" || field.type === "referral_source" || field.type === "choice") {
    const text = typeof value === "string" ? value.trim() : "";
    if (field.required && !text) {
      return "This field is required.";
    }

    return null;
  }

  if (field.type === "yes_no") {
    if (field.required && value !== true && value !== false) {
      return "This field is required.";
    }

    return null;
  }

  if (field.type === "multi_choice") {
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    if (field.required && selected.length === 0) {
      return "This field is required.";
    }

    if (field.min != null && selected.length > 0 && selected.length < field.min) {
      return `Select at least ${field.min}.`;
    }

    if (field.max != null && selected.length > field.max) {
      return `Select at most ${field.max}.`;
    }

    return null;
  }

  if (field.type === "phone") {
    return validatePhoneField(field, value, field.required);
  }

  if (field.type === "email") {
    return validateEmailField(value, field.required);
  }

  if (field.type === "textarea") {
    const text = typeof value === "string" ? value.trim() : "";
    if (field.required && !text) {
      return "This field is required.";
    }

    if (text.length > TEXTAREA_MAX_LENGTH) {
      return `This field cannot exceed ${TEXTAREA_MAX_LENGTH} characters.`;
    }

    return null;
  }

  if (field.type === "date") {
    const text = typeof value === "string" ? value.trim() : "";
    if (field.required && !text) {
      return "This field is required.";
    }

    if (text && !isIsoCalendarDate(text)) {
      return "Enter a valid date.";
    }

    return null;
  }

  if (field.type === "number") {
    const numberText =
      typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
    if (field.required && !numberText) {
      return "This field is required.";
    }

    if (numberText) {
      const parsed = Number(numberText);
      if (!Number.isFinite(parsed)) {
        return "Enter a number.";
      }

      if (field.min != null && parsed < field.min) {
        return `Must be at least ${field.min}.`;
      }

      if (field.max != null && parsed > field.max) {
        return `Must be at most ${field.max}.`;
      }
    }

    return null;
  }

  if (field.type === "url") {
    const urlText = typeof value === "string" ? value.trim() : "";
    if (field.required && !urlText) {
      return "This field is required.";
    }

    if (urlText) {
      try {
        const parsedUrl = new URL(urlText);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return "Enter an http or https URL.";
        }
      } catch {
        return "Enter an http or https URL.";
      }
    }

    return null;
  }

  if (field.type === "time") {
    const timeText = typeof value === "string" ? value.trim() : "";
    if (field.required && !timeText) {
      return "This field is required.";
    }

    if (timeText && !isIsoClockTime(timeText)) {
      return "Enter a valid time.";
    }

    return null;
  }

  if (field.type === "country") {
    const countryText = typeof value === "string" ? value.trim() : "";
    if (field.required && !countryText) {
      return "This field is required.";
    }

    if (countryText && !isSupportedPhoneCountry(countryText)) {
      return "Select a supported country.";
    }

    return null;
  }

  if (field.type === "scale") {
    const scaleText = typeof value === "string" ? value.trim() : "";
    if (field.required && !scaleText) {
      return "This field is required.";
    }

    if (scaleText && !isScaleFieldValue(scaleText)) {
      return "Select a value from 1 to 5.";
    }

    return null;
  }

  if (field.type === "emergency") {
    const emergency = readEmergencyValue(value);
    const name = emergency.name.trim();
    const phone = emergency.phone.trim();

    if (field.required && (!name || !phone)) {
      return "This field is required.";
    }

    if (!name && !phone) {
      return null;
    }

    if (name.length > EMERGENCY_NAME_MAX_LENGTH) {
      return `Contact name cannot exceed ${EMERGENCY_NAME_MAX_LENGTH} characters.`;
    }

    if (phone) {
      const phoneError = validatePhoneLocalNumber(field.phoneCountry ?? null, phone, false);
      if (phoneError) {
        return phoneError;
      }
    }

    return null;
  }

  const text = typeof value === "string" ? value.trim() : "";
  if (field.required && !text) {
    return "This field is required.";
  }

  return null;
}

export function RegistrationForm({
  schema,
  variant = "public",
  className,
  activitySlug,
  onSubmitted,
  onSubmitError,
}: RegistrationFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isPreview = variant === "preview";
  const isPublic = !isPreview;

  const publicControlClass = isPublic ? "min-h-12 text-base" : undefined;
  const publicSelectClass = cn(
    "flex w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    isPublic ? "min-h-12 text-base" : "h-9"
  );

  function markTouched(fieldId: string) {
    setTouched((current) => ({ ...current, [fieldId]: true }));
  }

  function validateOnBlur(field: FormFieldDefinition) {
    markTouched(field.id);
    const message = validateField(field, values[field.id]);
    setErrors((current) => {
      const next = { ...current };
      if (message) {
        next[field.id] = message;
      } else {
        delete next[field.id];
      }
      return next;
    });
  }

  const stepsOn = Boolean(schema.meta?.splitIntoSteps);
  const stepIds = stepsOn
    ? usedFormSteps(schema.fields, { includeHidden: isPreview })
    : [];
  const currentStep = stepIds[Math.min(stepIndex, Math.max(stepIds.length - 1, 0))] ?? stepIds[0] ?? null;
  const isLastStep = !stepsOn || stepIndex >= stepIds.length - 1;

  useEffect(() => {
    if (!stepsOn) {
      setStepIndex(0);
      return;
    }

    setStepIndex((current) =>
      stepIds.length === 0 ? 0 : Math.min(current, stepIds.length - 1)
    );
  }, [stepsOn, stepIds.length]);

  function validateFields(fields: FormFieldDefinition[]): boolean {
    const nextErrors: FieldErrors = {};
    const nextTouched: Record<string, boolean> = {};

    for (const field of fields) {
      if (isNonInputFieldType(field.type) || !isFieldVisible(field, values, schema.fields)) {
        continue;
      }

      nextTouched[field.id] = true;
      const message = validateField(field, values[field.id]);
      if (message) {
        nextErrors[field.id] = message;
      }
    }

    setTouched((current) => ({ ...current, ...nextTouched }));
    setErrors((current) => {
      const next = { ...current };
      for (const field of fields) {
        if (nextErrors[field.id]) {
          next[field.id] = nextErrors[field.id];
        } else {
          delete next[field.id];
        }
      }
      return next;
    });

    return Object.keys(nextErrors).length === 0;
  }

  function validateAllFields(): boolean {
    return validateFields(schema.fields);
  }

  function validateCurrentStep(): boolean {
    if (!stepsOn || !currentStep) {
      return validateAllFields();
    }

    return validateFields(fieldsForStep(schema.fields, currentStep));
  }

  function performSubmit() {
    if (isPreview || !activitySlug || isSubmitting) {
      return;
    }

    if (!validateAllFields()) {
      if (stepsOn && stepIds.length > 0) {
        const firstInvalid = stepIds.findIndex((step) =>
          fieldsForStep(schema.fields, step).some((field) => {
            if (isNonInputFieldType(field.type) || !isFieldVisible(field, values, schema.fields)) {
              return false;
            }

            return validateField(field, values[field.id]) !== null;
          })
        );
        if (firstInvalid >= 0) {
          setStepIndex(firstInvalid);
        }
      }

      return;
    }

    setSubmitError(null);
    setSubmitErrorCode(null);
    onSubmitError?.(null);
    setIsSubmitting(true);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createIdempotencyKey();
    }

    const answers = {
      ...values,
      ...collectHiddenAnswers(
        schema.fields,
        new URLSearchParams(window.location.search)
      ),
    };

    void submitPublicRegistration(activitySlug, answers, {
      idempotencyKey: idempotencyKeyRef.current,
    })
      .then((result) => {
        idempotencyKeyRef.current = null;
        onSubmitted?.(result);
      })
      .catch((error) => {
        const registrationError = error as Error & { errorCode?: string };
        const message =
          registrationError instanceof Error && registrationError.message
            ? registrationError.message
            : "Could not submit registration. Check your connection and try again.";
        const errorCode = registrationError.errorCode ?? null;
        setSubmitError(message);
        setSubmitErrorCode(errorCode);
        onSubmitError?.(message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stepsOn && !isLastStep) {
      if (validateCurrentStep()) {
        setStepIndex((current) => current + 1);
      }
      return;
    }

    performSubmit();
  }

  function renderFieldError(fieldId: string, error?: string) {
    if (!error) {
      return null;
    }

    return (
      <p
        id={`${fieldId}-error`}
        className="text-xs text-destructive"
        role="alert"
      >
        {error}
      </p>
    );
  }

  function renderField(field: FormFieldDefinition) {
    if (!isFieldVisible(field, values, schema.fields)) {
      return null;
    }

    if (field.type === "section_header") {
      const heading = field.label.trim() || "Section";
      return (
        <div key={field.id} className="border-t border-border-warm pt-5 first:border-t-0 first:pt-0">
          <h3 className="text-sm font-semibold text-text-warm">{heading}</h3>
        </div>
      );
    }

    if (isHiddenFieldType(field.type)) {
      if (!isPreview) {
        return null;
      }

      return (
        <div key={field.id}>
          <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-text-muted-warm">
            Hidden · filled from link
          </span>
        </div>
      );
    }

    if (field.type === "info") {
      const heading = field.label.trim() || "Info";
      const body = (field.infoText ?? "").replace(/<[^>]*>/g, "").trim();
      const paragraphs = body
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      return (
        <div key={field.id} className="space-y-2 rounded-lg border border-border-warm bg-muted/30 p-3">
          <h3 className="text-sm font-semibold text-text-warm">{heading}</h3>
          {paragraphs.map((paragraph, index) => (
            <p key={`${field.id}-${index}`} className="text-sm leading-relaxed text-text-muted-warm">
              {paragraph}
            </p>
          ))}
        </div>
      );
    }

    const error = touched[field.id] ? errors[field.id] : undefined;
    const fieldId = `registration-${field.id}`;
    const errorDescribedBy = error ? `${fieldId}-error` : undefined;

    if (field.type === "consent") {
      return (
        <div key={field.id} className="space-y-2">
          <label
            htmlFor={fieldId}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border-warm bg-muted/30 p-3",
              isPublic && "min-h-12"
            )}
          >
            <input
              id={fieldId}
              type="checkbox"
              checked={values[field.id] === true}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.id]: event.target.checked,
                }))
              }
              onBlur={() => validateOnBlur(field)}
              aria-invalid={Boolean(error)}
              aria-describedby={errorDescribedBy}
              className={cn(
                "mt-0.5 shrink-0 rounded border-input",
                isPublic ? "size-5" : "size-4"
              )}
            />
            <span className="text-sm text-text-warm">
              {field.consentText ?? field.label}
              {field.required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </span>
          </label>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div key={field.id} className="space-y-2">
          <div className={cn("flex items-center gap-2", isPublic && "min-h-12")}>
            <input
              id={fieldId}
              type="checkbox"
              checked={values[field.id] === true}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.id]: event.target.checked,
                }))
              }
              onBlur={() => validateOnBlur(field)}
              aria-invalid={Boolean(error)}
              aria-describedby={errorDescribedBy}
              className={cn(
                "rounded border-input",
                isPublic ? "size-5" : "size-4"
              )}
            />
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required ? (
                <span className="text-destructive" aria-hidden>
                  {" "}
                  *
                </span>
              ) : null}
            </Label>
          </div>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "select" || field.type === "referral_source") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </Label>
          <select
            id={fieldId}
            value={
              typeof values[field.id] === "string"
                ? (values[field.id] as string)
                : ""
            }
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
            onBlur={() => validateOnBlur(field)}
            aria-invalid={Boolean(error)}
            aria-describedby={errorDescribedBy}
            className={publicSelectClass}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "yes_no") {
      const selected =
        values[field.id] === true ? true : values[field.id] === false ? false : null;
      return (
        <div key={field.id} className="space-y-2">
          <p className="text-sm font-medium text-text-warm">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    [field.id]: option.value,
                  }))
                }
                onBlur={() => validateOnBlur(field)}
                aria-pressed={selected === option.value}
                className={cn(
                  "inline-flex min-h-12 min-w-11 items-center justify-center rounded-lg border px-4 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected === option.value
                    ? "border-ring bg-muted text-text-warm"
                    : "border-input bg-background text-text-warm"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "choice") {
      const selected =
        typeof values[field.id] === "string" ? (values[field.id] as string) : "";
      return (
        <div key={field.id} className="space-y-2">
          <p className="text-sm font-medium text-text-warm">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </p>
          <div className="flex flex-col gap-2">
            {(field.options ?? []).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    [field.id]: option.value,
                  }))
                }
                onBlur={() => validateOnBlur(field)}
                aria-pressed={selected === option.value}
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-start rounded-lg border px-4 text-left text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected === option.value
                    ? "border-ring bg-muted text-text-warm"
                    : "border-input bg-background text-text-warm"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "multi_choice") {
      const selected = Array.isArray(values[field.id])
        ? (values[field.id] as string[])
        : [];
      return (
        <div key={field.id} className="space-y-2">
          <p className="text-sm font-medium text-text-warm">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </p>
          <div className="flex flex-col gap-2">
            {(field.options ?? []).map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-input px-3",
                    isPublic && "min-h-12"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((item) => item !== option.value);
                      setValues((current) => ({
                        ...current,
                        [field.id]: next,
                      }));
                    }}
                    onBlur={() => validateOnBlur(field)}
                    className={cn("rounded border-input", isPublic ? "size-5" : "size-4")}
                  />
                  <span className="text-sm text-text-warm">{option.label}</span>
                </label>
              );
            })}
          </div>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "country") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </Label>
          <select
            id={fieldId}
            value={
              typeof values[field.id] === "string"
                ? (values[field.id] as string)
                : ""
            }
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
            onBlur={() => validateOnBlur(field)}
            aria-invalid={Boolean(error)}
            aria-describedby={errorDescribedBy}
            className={publicSelectClass}
          >
            <option value="">Select…</option>
            {phoneCountryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "scale") {
      const selected =
        typeof values[field.id] === "string" ? (values[field.id] as string) : "";
      return (
        <fieldset key={field.id} className="space-y-2 border-0 p-0">
          <legend className="text-sm font-medium text-text-warm">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </legend>
          <div
            role="radiogroup"
            aria-required={field.required}
            aria-invalid={Boolean(error)}
            aria-describedby={errorDescribedBy}
            className="grid gap-2 sm:grid-cols-5"
          >
            {scaleFieldValues.map((scaleValue) => {
              const label = getScaleFieldLabel(scaleValue) ?? scaleValue;
              const isSelected = selected === scaleValue;
              return (
                <button
                  key={scaleValue}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() =>
                    setValues((current) => {
                      const next = { ...current };
                      if (!field.required && isSelected) {
                        delete next[field.id];
                      } else {
                        next[field.id] = scaleValue;
                      }
                      return next;
                    })
                  }
                  onBlur={() => validateOnBlur(field)}
                  className={cn(
                    "inline-flex min-h-12 min-w-11 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    isSelected
                      ? "border-ring bg-muted text-text-warm"
                      : "border-input bg-background text-text-warm"
                  )}
                >
                  <span>{scaleValue}</span>
                  <span className="mt-0.5 text-[11px] font-normal leading-tight text-text-muted-warm">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          {renderFieldError(fieldId, error)}
        </fieldset>
      );
    }

    if (field.type === "emergency") {
      const emergency = readEmergencyValue(values[field.id]);
      const nameFieldId = `${fieldId}-name`;
      const phoneFieldId = `${fieldId}-phone`;

      return (
        <div key={field.id} className="space-y-3">
          <p className="text-sm font-medium text-text-warm">
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </p>
          <div className="space-y-2">
            <Label htmlFor={nameFieldId}>Contact name</Label>
            <Input
              id={nameFieldId}
              value={emergency.name}
              maxLength={EMERGENCY_NAME_MAX_LENGTH}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.id]: {
                    ...readEmergencyValue(current[field.id]),
                    name: event.target.value,
                  },
                }))
              }
              onBlur={() => validateOnBlur(field)}
              aria-invalid={Boolean(error)}
              aria-describedby={errorDescribedBy}
              className={publicControlClass}
            />
          </div>
          <PhoneFieldInput
            field={field}
            fieldId={phoneFieldId}
            label="Contact phone"
            showRequired={false}
            value={emergency.phone}
            error={error}
            isPublic={isPublic}
            onChange={(nextValue) =>
              setValues((current) => ({
                ...current,
                [field.id]: {
                  ...readEmergencyValue(current[field.id]),
                  phone: nextValue,
                },
              }))
            }
            onBlur={() => validateOnBlur(field)}
          />
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </Label>
          <textarea
            id={fieldId}
            placeholder={field.placeholder ?? undefined}
            value={
              typeof values[field.id] === "string"
                ? (values[field.id] as string)
                : ""
            }
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
            onBlur={() => validateOnBlur(field)}
            aria-invalid={Boolean(error)}
            aria-describedby={errorDescribedBy}
            rows={3}
            className={cn(
              "flex min-h-20 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
              isPublic && "min-h-12 text-base"
            )}
          />
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "date") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={fieldId}>
            {field.label}
            {field.required ? (
              <span className="text-destructive" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </Label>
          <Input
            id={fieldId}
            type="date"
            placeholder={field.placeholder ?? undefined}
            value={
              typeof values[field.id] === "string"
                ? (values[field.id] as string)
                : ""
            }
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
            onBlur={() => validateOnBlur(field)}
            aria-invalid={Boolean(error)}
            aria-describedby={errorDescribedBy}
            className={publicControlClass}
          />
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    if (field.type === "phone") {
      return (
        <div key={field.id}>
          <PhoneFieldInput
            field={field}
            fieldId={fieldId}
            value={
              typeof values[field.id] === "string"
                ? (values[field.id] as string)
                : ""
            }
            error={error}
            isPublic={isPublic}
            onChange={(nextValue) =>
              setValues((current) => ({
                ...current,
                [field.id]: nextValue,
              }))
            }
            onBlur={() => validateOnBlur(field)}
          />
          {renderFieldError(fieldId, error)}
        </div>
      );
    }

    const inputType =
      field.type === "email"
        ? "email"
        : field.type === "number"
          ? "number"
          : field.type === "url"
            ? "url"
            : field.type === "time"
              ? "time"
              : "text";

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={fieldId}>
          {field.label}
          {field.required ? (
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </Label>
        <Input
          id={fieldId}
          type={inputType}
          placeholder={field.placeholder ?? undefined}
          value={
            typeof values[field.id] === "string"
              ? (values[field.id] as string)
              : ""
          }
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              [field.id]: event.target.value,
            }))
          }
          onBlur={() => validateOnBlur(field)}
          aria-invalid={Boolean(error)}
          aria-describedby={errorDescribedBy}
          className={publicControlClass}
        />
        {renderFieldError(fieldId, error)}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className={cn(
        "flex min-w-0 flex-col gap-[20px]",
        isPreview &&
          "rounded-xl border border-dashed border-border-warm bg-card p-6",
        className
      )}
      onSubmit={handleSubmit}
      noValidate
    >
      {isPreview ? (
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
          Registration preview
        </p>
      ) : null}

      {schema.fields.length === 0 ? (
        <p className="text-sm text-text-muted-warm">
          {isPreview
            ? "Add fields in the editor to preview the registration form."
            : "Registration is not open for this activity yet."}
        </p>
      ) : (
        <>
          {stepsOn && currentStep ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
              {formStepLabels[currentStep]} ({stepIndex + 1} of {stepIds.length})
            </p>
          ) : null}
          {(stepsOn && currentStep
            ? fieldsForStep(schema.fields, currentStep)
            : schema.fields
          ).map((field) => renderField(field))}
        </>
      )}

      {submitError ? (
        <div
          role="alert"
          className={cn(
            "space-y-3 rounded-lg border p-4",
            submitErrorCode === "activity_full" ||
            submitErrorCode === "plan_registration_limit" ||
            submitErrorCode === "registration_closed_at"
              ? "border-border-warm bg-muted/30"
              : "border-destructive/30 bg-destructive/5"
          )}
        >
          {submitErrorCode === "activity_full" ? (
            <>
              <p className="text-sm font-medium text-text-warm">Activity full</p>
              <p className="text-sm text-text-muted-warm">{submitError}</p>
            </>
          ) : submitErrorCode === "plan_registration_limit" ? (
            <>
              <p className="text-sm font-medium text-text-warm">
                {PUBLIC_PLAN_REGISTRATION_LIMIT_COPY.title}
              </p>
              <p className="text-sm text-text-muted-warm">
                {PUBLIC_PLAN_REGISTRATION_LIMIT_COPY.description}
              </p>
            </>
          ) : submitErrorCode === "registration_closed_at" ? (
            <>
              <p className="text-sm font-medium text-text-warm">Registration closed</p>
              <p className="text-sm text-text-muted-warm">{submitError}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-destructive">{submitError}</p>
              <Button
                type="button"
                variant="outline"
                className={cn(isPublic && "min-h-12 w-full")}
                disabled={isSubmitting}
                onClick={performSubmit}
              >
                Try again
              </Button>
            </>
          )}
        </div>
      ) : null}

      <div className="flex w-full min-w-0 flex-col gap-2">
        {stepsOn && stepIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            className={cn(
              isPublic && "min-h-12 w-full min-w-0 max-w-full shrink text-base"
            )}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
        ) : null}
        <Button
          type="submit"
          className={cn(
            isPublic && "min-h-12 w-full min-w-0 max-w-full shrink text-base"
          )}
          disabled={
            (isPreview && !stepsOn) ||
            schema.fields.length === 0 ||
            isSubmitting ||
            (!isPreview && !activitySlug && isLastStep)
          }
        >
          {isPreview && isLastStep
            ? "Preview only"
            : isSubmitting
              ? "Submitting…"
              : stepsOn && !isLastStep
                ? "Next"
                : "Join activity"}
        </Button>
      </div>
    </form>
  );
}
