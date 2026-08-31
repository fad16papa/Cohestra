"use client";

import { Braces } from "lucide-react";

import type { ActivityFormSchema } from "@/lib/activities-api";
import { listPipingFieldTokens } from "@/lib/registration-piping";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PipingCheatsheetProps = {
  schema: ActivityFormSchema;
  onInsert: (token: string) => void;
  disabled?: boolean;
};

const BASE_TOKENS = ["{{full_name}}", "{{email}}", "{{phone}}"] as const;

export function PipingCheatsheet({
  schema,
  onInsert,
  disabled = false,
}: PipingCheatsheetProps) {
  const fieldTokens = listPipingFieldTokens(schema);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
          >
            <Braces className="size-3.5" aria-hidden />
            Insert token
          </Button>
        }
      />
      <PopoverContent align="start" className="w-72 space-y-3 p-3">
        <p className="text-xs text-text-muted-warm">
          Personalize with submitted values. Hidden fields are not listed.
        </p>
        <ul className="space-y-1">
          {BASE_TOKENS.map((token) => (
            <li key={token}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-muted"
                onClick={() => onInsert(token)}
              >
                {token}
              </button>
            </li>
          ))}
          {fieldTokens.map((token) => (
            <li key={token}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-muted"
                onClick={() => onInsert(token)}
              >
                {token}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
