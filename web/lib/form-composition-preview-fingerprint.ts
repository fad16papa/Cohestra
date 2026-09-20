import type {
  ActivityFormSchema,
  FormCompositionNode,
} from "@/lib/activities-api";
import { getEffectiveComposition } from "@/lib/form-composition";

function fingerprintNode(node: FormCompositionNode): string {
  const segments = [
    node.id,
    node.kind,
    node.fieldId?.trim() ?? "",
    node.contentType?.trim() ?? "",
    node.content?.text ?? "",
    node.content?.level != null ? String(node.content.level) : "",
    node.title ?? "",
    node.description ?? "",
  ];

  if (node.kind === "section" && node.children?.length) {
    segments.push(
      `children(${node.children.map(fingerprintNode).join("\u001f")})`
    );
  }

  if (node.kind === "columns" && node.columns?.length === 2) {
    segments.push(
      `cols(${node.columns
        .map((column) => column.map(fingerprintNode).join("\u001f"))
        .join("\u001e")})`
    );
  }

  return segments.join("\u001e");
}

/** Recursive, order- and value-sensitive composition fingerprint for Preview invalidation. */
export function buildCompositionPreviewFingerprint(
  fields: ActivityFormSchema["fields"],
  composition: ActivityFormSchema["composition"]
): string {
  const effective = getEffectiveComposition(fields, composition ?? null);
  return effective.map(fingerprintNode).join("\u001d");
}
