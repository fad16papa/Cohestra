"use client";

import type { ReactNode } from "react";

import type {
  ActivityFormSchema,
  FormCompositionNode,
  FormFieldDefinition,
} from "@/lib/activities-api";
import { getEffectiveComposition } from "@/lib/form-composition";
import { cn } from "@/lib/utils";

type RegistrationCompositionRendererProps = {
  schema: ActivityFormSchema;
  renderField: (field: FormFieldDefinition) => ReactNode;
  className?: string;
};

function renderContentNode(node: FormCompositionNode): ReactNode {
  const type = node.contentType ?? "";
  if (type === "heading") {
    const level = node.content?.level ?? 2;
    const text = node.content?.text?.trim() || "Heading";
    const Tag = level === 2 ? "h2" : level === 3 ? "h3" : "h4";
    return (
      <Tag
        key={node.id}
        className={cn(
          "font-semibold text-text-warm",
          level === 2 && "text-lg",
          level === 3 && "text-base",
          level === 4 && "text-sm"
        )}
      >
        {text}
      </Tag>
    );
  }

  if (type === "paragraph") {
    const text = node.content?.text?.trim() || "";
    if (!text) {
      return null;
    }

    return (
      <p key={node.id} className="text-sm leading-relaxed text-text-muted-warm">
        {text}
      </p>
    );
  }

  if (type === "divider") {
    return (
      <hr
        key={node.id}
        className="border-border-warm"
        aria-hidden="true"
      />
    );
  }

  return null;
}

function renderNodes(
  nodes: FormCompositionNode[],
  fieldsById: Map<string, FormFieldDefinition>,
  renderField: (field: FormFieldDefinition) => ReactNode
): ReactNode[] {
  const output: ReactNode[] = [];

  for (const node of nodes) {
    if (node.kind === "fieldRef" && node.fieldId) {
      const field = fieldsById.get(node.fieldId);
      if (field) {
        const rendered = renderField(field);
        if (rendered) {
          output.push(rendered);
        }
      }
      continue;
    }

    if (node.kind === "content") {
      const rendered = renderContentNode(node);
      if (rendered) {
        output.push(rendered);
      }
      continue;
    }

    if (node.kind === "section") {
      output.push(
        <section
          key={node.id}
          className="space-y-4 rounded-lg border border-border-warm/60 bg-muted/20 p-4"
          aria-label={node.title?.trim() || "Form section"}
        >
          {node.title?.trim() ? (
            <h2 className="text-base font-semibold text-text-warm">{node.title}</h2>
          ) : null}
          {node.description?.trim() ? (
            <p className="text-sm text-text-muted-warm">{node.description}</p>
          ) : null}
          <div className="space-y-4">
            {renderNodes(node.children ?? [], fieldsById, renderField)}
          </div>
        </section>
      );
      continue;
    }

    if (node.kind === "columns" && node.columns?.length === 2) {
      const [left, right] = node.columns;
      output.push(
        <div
          key={node.id}
          className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex min-w-0 flex-col gap-4">
            {renderNodes(left ?? [], fieldsById, renderField)}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {renderNodes(right ?? [], fieldsById, renderField)}
          </div>
        </div>
      );
    }
  }

  return output;
}

export function RegistrationCompositionRenderer({
  schema,
  renderField,
  className,
}: RegistrationCompositionRendererProps) {
  const composition = getEffectiveComposition(
    schema.fields,
    schema.composition ?? null
  );
  const fieldsById = new Map(schema.fields.map((field) => [field.id, field]));

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {renderNodes(composition, fieldsById, renderField)}
    </div>
  );
}
