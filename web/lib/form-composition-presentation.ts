import type {
  ActivityFormSchema,
  FormCompositionNode,
} from "@/lib/activities-api";
import { getEffectiveComposition } from "@/lib/form-composition";

/** True when composition includes content or section blocks (not fieldRef-only). */
export function compositionHasPresentationBlocks(
  fields: ActivityFormSchema["fields"],
  composition: ActivityFormSchema["composition"]
): boolean {
  const effective = getEffectiveComposition(fields, composition ?? null);

  function walk(nodes: FormCompositionNode[]): boolean {
    for (const node of nodes) {
      if (node.kind === "content" || node.kind === "section") {
        return true;
      }
    }

    return false;
  }

  return walk(effective);
}

export const CONVERSATIONAL_PRESENTATION_NOTICE =
  "Conversational flow shows one question at a time. Headings, paragraphs, dividers, and sections are not shown on the public form—use Single page flow to display them.";
