"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { PhoneFieldInput } from "@/components/registration/phone-field-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityFormSchema, FormFieldDefinition } from "@/lib/activities-api";
import { isHiddenFieldType, isNonInputFieldType } from "@/lib/form-schema-utils";
import { collectHiddenAnswers } from "@/lib/hidden-field-query";
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

  if (field.type === "select" || field.type === "referral_source") {
    const text = typeof value === "string" ? value.trim() : "";
    if (field.required && !text) {
      return "This field is required.";
    }

    return null;
  }

  if (field.type === "phone") {
    return validatePhoneField(field, value, field.required);
  }

  if (field.type === "email") {
    return validateEmailField(value, field.required);
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
  const stepIds = stepsOn ? usedFormSteps(schema.fields) : [];
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
      field.type === "email" ? "email" : "text";

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
        "flex flex-col gap-[20px]",
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
            submitErrorCode === "activity_full" || submitErrorCode === "plan_registration_limit"
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

      <div className={cn("flex flex-col gap-2", stepsOn && "sm:flex-row")}>
        {stepsOn && stepIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            className={cn(isPublic && "min-h-12 w-full text-base")}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>
        ) : null}
        <Button
          type="submit"
          className={cn(isPublic && "min-h-12 w-full text-base")}
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
