"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CodeInput } from "@/features/access/CodeInput";
import { useSign } from "@/features/hooks";
import { Problem, type ProcedureVersion, type SignatureRole, type User } from "@/lib/api";
import { HoldButton, Input } from "@/ui/atoms";
import { Field, Modal } from "@/ui/cells";

const SAFETY_HOLD_MS = 1200;

/**
 * Re-authentication for a signature (§29.4): password and a fresh authenticator code, then hold. The signature
 * binds to the body hash shown, so any later edit clears it.
 */
export function SignModal({ open, onOpenChange, v, role, me, label }: {
  open: boolean; onOpenChange: (o: boolean) => void; v: ProcedureVersion; role: SignatureRole; me: User; label: string;
}) {
  const sign = useSign();
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const roleLabel = role === "engineering" ? "engineer" : "safety approver";
  const go = () => sign.mutateAsync({ versionId: v.id, sha256: v.bodySha256, role, reauth: { userId: me.id, password, totp } })
    .then((x) => {
      onOpenChange(false);
      toast.success(x.status === "approved" ? `${label} approved` : "Signature recorded", {
        description: x.status === "approved" ? "Both signatures are on the same hash. It is now the version in use; the previous one is retired." : "Waiting for the other signature.",
      });
    })
    .catch((e: unknown) => { setProblem(e instanceof Problem ? e : new Problem("unknown", "Could not sign.")); setTotp(""); });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Sign ${label} as ${roleLabel}`}>
      <div className="flex flex-col gap-4 px-5 pt-3 pb-5">
        <p className="text-body">You sign this exact text:</p>
        <code className="rounded-control bg-raised px-3 py-2 font-mono text-small break-all">sha256 {v.bodySha256}</code>
        <Field label="Password">{(f) => <Input {...f} type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setProblem(null); }} />}</Field>
        <div className="flex flex-col gap-2">
          <span className="text-body font-medium">Authenticator code</span>
          <CodeInput value={totp} onChange={(x) => { setTotp(x); setProblem(null); }} onComplete={() => undefined} autoFocus={false} />
          <p id="otp-help" className="text-small text-muted">Mock: any password and any six digits except 000000.</p>
        </div>
        {problem && (
          <div role="alert" className="rounded-card border border-negative p-3">
            <p className="text-body font-medium text-negative">{problem.title}</p>
            <p className="font-mono text-small text-muted">{problem.type}</p>
          </div>
        )}
        <HoldButton variant="primary" size="lg" holdMs={SAFETY_HOLD_MS} doneLabel="Signed" disabled={!password || totp.length !== 6 || sign.isPending} onConfirm={go}>
          Hold to sign
        </HoldButton>
      </div>
    </Modal>
  );
}
