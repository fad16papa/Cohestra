"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FormFieldPaletteDialog } from "@/components/activities/form-field-palette-dialog";

import { PhoneCountrySelect } from "@/components/activities/phone-country-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ActivityFormSchema,
  FormFieldDefinition,
  FormFieldOption,
  FormFieldStep,
  FormFieldType,
  FormFieldVisibleWhen,
} from "@/lib/activities-api";
import {
  createDefaultField,
  fieldAllowsMinMax,
  fieldNeedsConsentText,
  fieldNeedsInfoText,
  fieldNeedsOptions,
  formFieldTypeLabels,
  formFieldTypeOptions,
  getDuplicateFieldIds,
  isHiddenFieldType,
  isNonInputFieldType,
  isValidFieldId,
  reorderFields,
} from "@/lib/form-schema-utils";
import {
  DEFAULT_PHONE_COUNTRY,
  getPhonePrefixLabel,
} from "@/lib/phone-countries";
import { autoBucketField, formStepLabels } from "@/lib/form-steps";
import { recipeSummary } from "@/lib/form-visibility";
import { cn } from "@/lib/utils";

type FormFieldEditorProps = {
  schema: ActivityFormSchema;
  onChange: (schema: ActivityFormSchema) => void;
  disabled?: boolean;
  className?: string;
  recipesLocked?: boolean;
  stepsEnabled?: boolean;
  stepsLocked?: boolean;
};

const editorPanelShellClassName =
  "flex min-h-[16rem] min-w-0 flex-col rounded-xl border border-border-warm bg-card md:min-h-[24rem] lg:min-h-[28rem]";
const editorPanelScrollClassName =
  "min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]";

function collectFieldIds(fields: FormFieldDefinition[]): Set<string> {
  return new Set(fields.map((field) => field.id));
}

function adjustSelectedIndexAfterReorder(
  selectedIndex: number | null,
  fromIndex: number,
  toIndex: number
): number | null {
  if (selectedIndex === null) {
    return null;
  }

  if (selectedIndex === fromIndex) {
    return toIndex;
  }

  if (fromIndex < selectedIndex && toIndex >= selectedIndex) {
    return selectedIndex - 1;
  }

  if (fromIndex > selectedIndex && toIndex <= selectedIndex) {
    return selectedIndex + 1;
  }

  return selectedIndex;
}

export function FormFieldEditor({
  schema,
  onChange,
  disabled = false,
  className,
  recipesLocked = false,
  stepsEnabled = false,
  stepsLocked = false,
}: FormFieldEditorProps) {
  const [addType, setAddType] = useState<FormFieldType>("text");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    schema.fields.length > 0 ? 0 : null
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const fieldIds = useMemo(() => collectFieldIds(schema.fields), [schema.fields]);
  const duplicateFieldIds = useMemo(
    () => getDuplicateFieldIds(schema.fields),
    [schema.fields]
  );

  useEffect(() => {
    if (schema.fields.length === 0) {
      setSelectedIndex(null);
      return;
    }

    if (selectedIndex === null || selectedIndex >= schema.fields.length) {
      setSelectedIndex(Math.max(0, schema.fields.length - 1));
    }
  }, [schema.fields.length, selectedIndex]);

  function updateFields(fields: FormFieldDefinition[]) {
    onChange({ ...schema, fields });
  }

  function updateField(index: number, patch: Partial<FormFieldDefinition>) {
    const next = schema.fields.map((field, fieldIndex) => {
      if (fieldIndex !== index) {
        return field;
      }

      const updated = { ...field, ...patch };

      if (patch.type && patch.type !== field.type) {
        if (fieldNeedsOptions(patch.type) && !updated.options?.length) {
          updated.options = [
            { value: "option_a", label: "Option A" },
            { value: "option_b", label: "Option B" },
          ];
        }

        if (!fieldNeedsOptions(patch.type)) {
          updated.options = null;
        }

        if (fieldNeedsConsentText(patch.type) && !updated.consentText) {
          updated.consentText = "I agree to be contacted about this activity.";
        }

        if (!fieldNeedsConsentText(patch.type)) {
          updated.consentText = null;
        }

        if (isNonInputFieldType(patch.type)) {
          updated.required = false;
          updated.placeholder = null;
          updated.options = null;
          updated.consentText = null;
          updated.phoneCountry = null;
          updated.min = null;
          updated.max = null;
        }

        if (patch.type === "info") {
          if (!updated.infoText) {
            updated.infoText = "Add a short note for participants.";
          }
        } else {
          updated.infoText = null;
        }

        if (!fieldAllowsMinMax(patch.type)) {
          updated.min = null;
          updated.max = null;
        }

        if (isHiddenFieldType(patch.type)) {
          updated.placeholder = null;
          updated.options = null;
          updated.consentText = null;
          updated.phoneCountry = null;
        } else {
          updated.defaultValue = null;
        }
      }

      return updated;
    });

    updateFields(next);
  }

  function addFieldOfType(type: FormFieldType) {
    const field = createDefaultField(type, fieldIds);
    if (stepsEnabled) {
      field.step = autoBucketField(field);
    }
    updateFields([...schema.fields, field]);
    setSelectedIndex(schema.fields.length);
  }

  function addField() {
    addFieldOfType(addType);
  }

  const openPalette = useCallback(() => {
    if (!disabled) {
      setPaletteOpen(true);
    }
  }, [disabled]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (paletteOpen || event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      setPaletteOpen(true);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, paletteOpen]);

  function removeField(index: number) {
    updateFields(schema.fields.filter((_, fieldIndex) => fieldIndex !== index));
  }

  function reorderFieldTo(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) {
      return;
    }

    updateFields(reorderFields(schema.fields, fromIndex, toIndex));
    setSelectedIndex((current) =>
      adjustSelectedIndexAfterReorder(current, fromIndex, toIndex)
    );
  }

  function reorderField(index: number, direction: -1 | 1) {
    reorderFieldTo(index, index + direction);
  }

  function handleFieldDragStart(index: number, event: React.DragEvent) {
    if (disabled) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    setDragIndex(index);
    setDropIndex(index);
  }

  function handleFieldDragOver(index: number, event: React.DragEvent) {
    if (disabled || dragIndex === null) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function handleFieldDrop(index: number, event: React.DragEvent) {
    if (disabled || dragIndex === null) {
      return;
    }

    event.preventDefault();
    reorderFieldTo(dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleFieldDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function updateOption(
    fieldIndex: number,
    optionIndex: number,
    patch: Partial<FormFieldOption>
  ) {
    const field = schema.fields[fieldIndex];
    const options = [...(field.options ?? [])];
    options[optionIndex] = { ...options[optionIndex], ...patch };
    updateField(fieldIndex, { options });
  }

  function addOption(fieldIndex: number) {
    const field = schema.fields[fieldIndex];
    const options = [...(field.options ?? [])];
    const suffix = options.length + 1;
    options.push({ value: `option_${suffix}`, label: `Option ${suffix}` });
    updateField(fieldIndex, { options });
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    const field = schema.fields[fieldIndex];
    const options = (field.options ?? []).filter(
      (_, index) => index !== optionIndex
    );
    updateField(fieldIndex, { options });
  }

  const selectedField =
    selectedIndex !== null ? schema.fields[selectedIndex] ?? null : null;

  return (
    <div className={cn("space-y-4", className)}>
      <FormFieldPaletteDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSelect={addFieldOfType}
      />

      <div>
        <h3 className="text-section text-text-warm">Form fields</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Arrange fields in order, then edit each field&apos;s properties. Saved
          changes apply to new registrations only.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-stretch">
        <section className={editorPanelShellClassName}>
          <div className="border-b border-border-warm px-4 py-3">
            <h4 className="text-sm font-semibold text-text-warm">Field order</h4>
            <p className="mt-1 text-xs text-text-muted-warm">
              Top to bottom matches the registration form. Drag the handle or use
              the arrows to reorder.
            </p>
          </div>

          {schema.fields.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
              <p className="text-sm text-text-muted-warm">
                No fields yet. Add your first field with the toolbox palette.
              </p>
              <Button type="button" disabled={disabled} onClick={openPalette}>
                <Plus className="size-4" />
                Add field
              </Button>
              <p className="text-xs text-text-muted-warm">
                Tip: press <kbd className="rounded border border-border-warm px-1">/</kbd> anywhere
                on this tab to open the palette.
              </p>
            </div>
          ) : (
            <ul
              className={cn(
                editorPanelScrollClassName,
                "divide-y divide-border-warm px-2 py-2"
              )}
              role="listbox"
              aria-label="Form fields"
            >
              {schema.fields.map((field, index) => {
                const isSelected = selectedIndex === index;
                const isDragging = dragIndex === index;
                const isDropTarget =
                  dragIndex !== null && dropIndex === index && dragIndex !== index;
                const hasIdIssue =
                  !isValidFieldId(field.id) || duplicateFieldIds.has(field.id);

                return (
                  <li
                    key={field.id}
                    onDragOver={(event) => handleFieldDragOver(index, event)}
                    onDrop={(event) => handleFieldDrop(index, event)}
                  >
                    <div
                      className={cn(
                        "rounded-lg border border-transparent p-2 transition-colors",
                        isSelected && "border-border-warm bg-muted/40",
                        isDragging && "opacity-50",
                        isDropTarget && "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          draggable={!disabled}
                          disabled={disabled}
                          aria-label={`Drag to reorder ${field.label || field.id}`}
                          aria-grabbed={isDragging}
                          onDragStart={(event) => handleFieldDragStart(index, event)}
                          onDragEnd={handleFieldDragEnd}
                          className={cn(
                            "mt-0.5 shrink-0 rounded-md p-1 text-text-muted-warm outline-none touch-none",
                            "hover:bg-muted/60 hover:text-text-warm",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            disabled
                              ? "cursor-not-allowed opacity-50"
                              : "cursor-grab active:cursor-grabbing"
                          )}
                        >
                          <GripVertical className="size-4" aria-hidden="true" />
                        </button>

                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            disabled={disabled || index === 0}
                            aria-label={`Move ${field.label || field.id} up`}
                            onClick={() => reorderField(index, -1)}
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            disabled={disabled || index === schema.fields.length - 1}
                            aria-label={`Move ${field.label || field.id} down`}
                            onClick={() => reorderField(index, 1)}
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                        </div>

                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={disabled}
                          onClick={() => setSelectedIndex(index)}
                          className="min-w-0 flex-1 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <p className="truncate text-sm font-medium text-text-warm">
                            {index + 1}. {field.label || "Untitled field"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-text-muted-warm">
                            {formFieldTypeLabels[field.type]}
                            {field.required ? " · Required" : ""}
                          </p>
                          {stepsEnabled && field.step ? (
                            <p className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted-warm">
                              {formStepLabels[field.step]}
                            </p>
                          ) : null}
                          {recipeSummary(field.visibleWhen) ? (
                            <p className="mt-1 truncate text-[11px] text-text-muted-warm">
                              {recipeSummary(field.visibleWhen)}
                            </p>
                          ) : null}
                          {hasIdIssue ? (
                            <p className="mt-1 text-xs text-destructive">Fix field ID</p>
                          ) : null}
                        </button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          disabled={disabled}
                          aria-label={`Remove ${field.label || field.id}`}
                          onClick={() => removeField(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-auto border-t border-border-warm p-3">
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="default"
                disabled={disabled}
                className="w-full sm:w-auto"
                onClick={openPalette}
              >
                <Plus className="size-4" />
                Add field
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="add-field-type" className="text-xs">
                    Or pick a type (fallback)
                  </Label>
                  <select
                    id="add-field-type"
                    value={addType}
                    disabled={disabled}
                    onChange={(event) => setAddType(event.target.value as FormFieldType)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {formFieldTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {formFieldTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="outline" disabled={disabled} onClick={addField}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className={editorPanelShellClassName}>
          <div className="border-b border-border-warm px-4 py-3">
            <h4 className="text-sm font-semibold text-text-warm">Field properties</h4>
            <p className="mt-1 text-xs text-text-muted-warm">
              {selectedField
                ? `Editing field ${(selectedIndex ?? 0) + 1} of ${schema.fields.length}`
                : "Select a field to edit its properties."}
            </p>
          </div>

          <div className={cn(editorPanelScrollClassName, "px-4 py-4")}>
            {!selectedField || selectedIndex === null ? (
              <p className="text-sm text-text-muted-warm">
                Choose a field from the list to configure type, label, validation, and
                options.
              </p>
            ) : (
              <FieldPropertiesEditor
                field={selectedField}
                index={selectedIndex}
                fields={schema.fields}
                disabled={disabled}
                recipesLocked={recipesLocked}
                stepsEnabled={stepsEnabled}
                stepsLocked={stepsLocked}
                duplicateFieldIds={duplicateFieldIds}
                onUpdate={(patch) => updateField(selectedIndex, patch)}
                onAddOption={() => addOption(selectedIndex)}
                onUpdateOption={(optionIndex, patch) =>
                  updateOption(selectedIndex, optionIndex, patch)
                }
                onRemoveOption={(optionIndex) => removeOption(selectedIndex, optionIndex)}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

type FieldPropertiesEditorProps = {
  field: FormFieldDefinition;
  index: number;
  fields: FormFieldDefinition[];
  disabled: boolean;
  recipesLocked: boolean;
  stepsEnabled: boolean;
  stepsLocked: boolean;
  duplicateFieldIds: Set<string>;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
  onAddOption: () => void;
  onUpdateOption: (optionIndex: number, patch: Partial<FormFieldOption>) => void;
  onRemoveOption: (optionIndex: number) => void;
};

function FieldPropertiesEditor({
  field,
  index,
  fields,
  disabled,
  recipesLocked,
  stepsEnabled,
  stepsLocked,
  duplicateFieldIds,
  onUpdate,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: FieldPropertiesEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`field-type-${index}`}>Type</Label>
          <select
            id={`field-type-${index}`}
            value={field.type}
            disabled={disabled}
            onChange={(event) => {
              const nextType = event.target.value as FormFieldType;
              if (nextType === "phone") {
                const country = field.phoneCountry ?? DEFAULT_PHONE_COUNTRY;
                onUpdate({
                  type: nextType,
                  phoneCountry: country,
                  placeholder:
                    field.placeholder ?? `${getPhonePrefixLabel(country)} …`,
                });
                return;
              }

              onUpdate({
                type: nextType,
                phoneCountry: null,
              });
            }}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {formFieldTypeOptions.map((type) => (
              <option key={type} value={type}>
                {formFieldTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`field-label-${index}`}>Label</Label>
          <Input
            id={`field-label-${index}`}
            value={field.label}
            disabled={disabled}
            onChange={(event) => onUpdate({ label: event.target.value })}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`field-id-${index}`}>Field ID</Label>
          <Input
            id={`field-id-${index}`}
            value={field.id}
            disabled={disabled}
            onChange={(event) => onUpdate({ id: event.target.value })}
            aria-invalid={!isValidFieldId(field.id) || duplicateFieldIds.has(field.id)}
          />
          {!isValidFieldId(field.id) ? (
            <p className="text-xs text-destructive" role="alert">
              Use lowercase letters, numbers, underscores, or hyphens (max 64 characters).
            </p>
          ) : null}
          {isValidFieldId(field.id) && duplicateFieldIds.has(field.id) ? (
            <p className="text-xs text-destructive" role="alert">
              This field ID is already used elsewhere in the form.
            </p>
          ) : null}
          {isHiddenFieldType(field.type) ? (
            <p className="text-xs text-text-muted-warm">
              Field ID is the query key. Example: id <code>ref</code> reads{" "}
              <code>?ref=wa</code>.
            </p>
          ) : null}
        </div>

        {!fieldNeedsOptions(field.type) &&
        !fieldNeedsConsentText(field.type) &&
        !isNonInputFieldType(field.type) &&
        !isHiddenFieldType(field.type) ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`field-placeholder-${index}`}>Placeholder</Label>
            <Input
              id={`field-placeholder-${index}`}
              value={field.placeholder ?? ""}
              disabled={disabled}
              onChange={(event) =>
                onUpdate({
                  placeholder: event.target.value || null,
                })
              }
            />
          </div>
        ) : null}

        {isHiddenFieldType(field.type) ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`field-default-${index}`}>Default value</Label>
            <Input
              id={`field-default-${index}`}
              value={field.defaultValue ?? ""}
              disabled={disabled}
              maxLength={200}
              onChange={(event) =>
                onUpdate({
                  defaultValue: event.target.value || null,
                })
              }
            />
            <p className="text-xs text-text-muted-warm">
              Used when the public link omits this query key. Use campaign refs
              (e.g. <code>wa</code>, <code>ig</code>). Do not put email addresses
              in the registration link.
            </p>
          </div>
        ) : null}

        {field.type === "phone" ? (
          <div className="sm:col-span-2">
            <PhoneCountrySelect
              id={`field-phone-country-${index}`}
              value={field.phoneCountry ?? DEFAULT_PHONE_COUNTRY}
              disabled={disabled}
              onChange={(nextCountry) =>
                onUpdate({
                  phoneCountry: nextCountry,
                  placeholder: `${getPhonePrefixLabel(nextCountry)} …`,
                })
              }
            />
          </div>
        ) : null}

        {fieldNeedsConsentText(field.type) ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`field-consent-${index}`}>Consent text</Label>
            <Input
              id={`field-consent-${index}`}
              value={field.consentText ?? ""}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.value;
                if (!next.trim()) {
                  return;
                }

                onUpdate({ consentText: next });
              }}
            />
          </div>
        ) : null}

        {fieldNeedsInfoText(field.type) ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`field-info-${index}`}>Info text</Label>
            <textarea
              id={`field-info-${index}`}
              value={field.infoText ?? ""}
              disabled={disabled}
              rows={4}
              onChange={(event) =>
                onUpdate({
                  infoText: event.target.value || null,
                })
              }
              className="flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        ) : null}

        {fieldAllowsMinMax(field.type) ? (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`field-min-${index}`}>
                {field.type === "multi_choice" ? "Min selections" : "Minimum"}
              </Label>
              <Input
                id={`field-min-${index}`}
                type="number"
                value={field.min ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  onUpdate({
                    min: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-max-${index}`}>
                {field.type === "multi_choice" ? "Max selections" : "Maximum"}
              </Label>
              <Input
                id={`field-max-${index}`}
                type="number"
                value={field.max ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  onUpdate({
                    max: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
              />
            </div>
          </div>
        ) : null}

        {!isNonInputFieldType(field.type) ? (
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id={`field-required-${index}`}
              type="checkbox"
              checked={field.required}
              disabled={disabled}
              onChange={(event) => onUpdate({ required: event.target.checked })}
              className="size-4 rounded border-input"
            />
            <Label htmlFor={`field-required-${index}`}>Required field</Label>
          </div>
        ) : (
          <p className="text-xs text-text-muted-warm sm:col-span-2">
            {field.type === "info"
              ? "Info blocks are display-only. They do not collect an answer."
              : "Section headers are display-only dividers between field groups."}
          </p>
        )}

        {stepsEnabled ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`field-step-${index}`}>Step</Label>
            <select
              id={`field-step-${index}`}
              value={field.step ?? "details"}
              disabled={disabled || stepsLocked}
              onChange={(event) =>
                onUpdate({ step: event.target.value as FormFieldStep })
              }
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="identity">Identity</option>
              <option value="details">Details</option>
              <option value="consent">Consent</option>
            </select>
          </div>
        ) : null}

        <RecipePicker
          field={field}
          fields={fields}
          disabled={disabled}
          locked={recipesLocked}
          onUpdate={onUpdate}
        />
      </div>

      {fieldNeedsOptions(field.type) ? (
        <div className="space-y-3 border-t border-border-warm pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onAddOption}
            >
              Add option
            </Button>
          </div>
          {(field.options ?? []).map((option, optionIndex) => (
            <div
              key={`${field.id}-option-${optionIndex}`}
              className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            >
              <Input
                aria-label={`Option value ${optionIndex + 1}`}
                placeholder="Value"
                value={option.value}
                disabled={disabled}
                onChange={(event) =>
                  onUpdateOption(optionIndex, {
                    value: event.target.value,
                  })
                }
              />
              <Input
                aria-label={`Option label ${optionIndex + 1}`}
                placeholder="Label"
                value={option.label}
                disabled={disabled}
                onChange={(event) =>
                  onUpdateOption(optionIndex, {
                    label: event.target.value,
                  })
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={disabled || (field.options?.length ?? 0) <= 1}
                aria-label="Remove option"
                onClick={() => onRemoveOption(optionIndex)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const RECIPE_PRESETS = [
  { id: "none", label: "Always shown" },
  { id: "guest", label: "Guest name (when bringing a guest is yes)" },
  { id: "dietary", label: "Dietary (when dietary needs is yes)" },
  { id: "member", label: "Member ID (when is member is yes)" },
  { id: "visitor", label: "Visitor company (when is visitor is yes)" },
  { id: "custom", label: "Custom equals / not equals" },
] as const;

function RecipePicker({
  field,
  fields,
  disabled,
  locked,
  onUpdate,
}: {
  field: FormFieldDefinition;
  fields: FormFieldDefinition[];
  disabled: boolean;
  locked: boolean;
  onUpdate: (patch: Partial<FormFieldDefinition>) => void;
}) {
  const controllers = fields.filter(
    (candidate) => candidate.id !== field.id && !isNonInputFieldType(candidate.type)
  );
  const rule = field.visibleWhen;
  const preset = inferRecipePreset(rule);

  return (
    <div className="space-y-3 sm:col-span-2">
      <Label htmlFor={`field-recipe-${field.id}`}>Show only when</Label>
      {locked ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-text-muted-warm">
            Recipes require Core or Pro. Upgrade to hide guest name until “bringing a
            guest?” is yes.
          </p>
          {rule ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onUpdate({ visibleWhen: null })}
            >
              Remove Recipe so you can save
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <select
            id={`field-recipe-${field.id}`}
            value={preset}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "none") {
                onUpdate({ visibleWhen: null });
                return;
              }

              const controllerId =
                rule?.fieldId && controllers.some((item) => item.id === rule.fieldId)
                  ? rule.fieldId
                  : (controllers[0]?.id ?? "");
              if (!controllerId) {
                return;
              }

              const nextRule: FormFieldVisibleWhen =
                next === "custom"
                  ? {
                      fieldId: controllerId,
                      equals: rule?.equals ?? "yes",
                      notEquals: rule?.notEquals ?? null,
                    }
                  : { fieldId: controllerId, equals: "yes", notEquals: null };
              onUpdate({ visibleWhen: nextRule });
            }}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {RECIPE_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {rule ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`field-recipe-controller-${field.id}`}>
                  Controller field
                </Label>
                <select
                  id={`field-recipe-controller-${field.id}`}
                  value={rule.fieldId}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate({
                      visibleWhen: { ...rule, fieldId: event.target.value },
                    })
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {controllers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label || item.id}
                    </option>
                  ))}
                </select>
              </div>
              {preset === "custom" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`field-recipe-op-${field.id}`}>Match</Label>
                    <select
                      id={`field-recipe-op-${field.id}`}
                      value={rule.notEquals ? "notEquals" : "equals"}
                      disabled={disabled}
                      onChange={(event) => {
                        const value = rule.equals ?? rule.notEquals ?? "yes";
                        onUpdate({
                          visibleWhen:
                            event.target.value === "notEquals"
                              ? { fieldId: rule.fieldId, equals: null, notEquals: value }
                              : { fieldId: rule.fieldId, equals: value, notEquals: null },
                        });
                      }}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="equals">Equals</option>
                      <option value="notEquals">Does not equal</option>
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`field-recipe-value-${field.id}`}>Value</Label>
                    <Input
                      id={`field-recipe-value-${field.id}`}
                      value={rule.equals ?? rule.notEquals ?? ""}
                      disabled={disabled}
                      onChange={(event) => {
                        const value = event.target.value;
                        onUpdate({
                          visibleWhen: rule.notEquals
                            ? { fieldId: rule.fieldId, equals: null, notEquals: value }
                            : { fieldId: rule.fieldId, equals: value, notEquals: null },
                        });
                      }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function inferRecipePreset(rule: FormFieldVisibleWhen | null | undefined): string {
  if (!rule) {
    return "none";
  }

  if (rule.equals === "yes" && !rule.notEquals) {
    return "guest";
  }

  return "custom";
}

