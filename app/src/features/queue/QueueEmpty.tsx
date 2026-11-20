"use client";
import { Inbox } from "lucide-react";
import { t } from "@/lib/i18n";
import { Kbd } from "@/ui/atoms";
import { Glass } from "@/ui/glass";

const KEYS: [string, string][] = [["J / K", t.keys.move], ["A", t.keys.approve], ["E", t.keys.edit], ["R", t.keys.reject], ["⌘K", t.keys.palette]];

export function QueueEmpty() {
  return (
    <Glass tone="clear" className="sq sq-lg grid min-h-[60vh] place-items-center p-10 text-center">
      <div>
        <Inbox className="mx-auto mb-4 size-8 text-muted" aria-hidden />
        <p className="text-section font-medium">{t.queue.pick}</p>
        <dl className="mx-auto mt-6 grid w-56 grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left text-body">
          {KEYS.map(([k, label]) => <div key={k} className="contents"><dt><Kbd>{k}</Kbd></dt><dd className="text-muted">{label}</dd></div>)}
        </dl>
      </div>
    </Glass>
  );
}
