import { notFound } from "next/navigation";

/** Catch-all segments call this so the nearest nested `not-found.tsx` renders. */
export function InvokeNotFound(): never {
  notFound();
}
