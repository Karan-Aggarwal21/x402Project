/**
 * OWNER: UI
 * Mirrors PolicyRules from @/shared/types. Server-side validation errors are shown inline;
 * never re-implement the validation rules in the browser.
 */
import type { PolicyRules } from "@/shared/types";

export function PolicyForm({ value }: { value?: PolicyRules }) {
  void value;
  return <form>{/* TODO: financial / merchant / velocity / rail / risk sections */}</form>;
}

