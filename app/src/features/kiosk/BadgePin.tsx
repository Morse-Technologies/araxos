"use client";
import { CreditCard, Delete } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBadgeLogin, useUsers } from "@/features/hooks";
import { DEMO_BADGES, DEMO_PIN, Problem, type User } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Avatar, Button, Input } from "@/ui/atoms";

const PIN_LEN = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/**
 * Badge then PIN, the shared-terminal sign-in (§15.11, ADR-A39). A USB/NFC reader types the badge code and Enter,
 * so the badge field is a normal input; the keypad has 64 px keys for gloves.
 */
export function BadgePin({ terminalId, onSignedIn, title = "Scan your badge" }: { terminalId: string; onSignedIn: (u: User) => void; title?: string }) {
  const login = useBadgeLogin();
  const users = useUsers();
  const [badge, setBadge] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [holder, setHolder] = useState<User | null>(null);
  const badgeRef = useRef<HTMLInputElement>(null);
  const demo = Object.entries(DEMO_BADGES).map(([code, id]) => ({ code, user: users.data?.find((u) => u.id === id) })).filter((d) => d.user);

  useEffect(() => { badgeRef.current?.focus(); }, []);
  const readBadge = (code: string) => {
    const id = DEMO_BADGES[code.trim().toUpperCase()];
    const u = users.data?.find((x) => x.id === id) ?? null;
    setBadge(code); setHolder(u); setError(u ? null : "This badge is not registered here. Ask an administrator."); setPin("");
  };
  const press = (k: string) => {
    if (k === "del") return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, PIN_LEN);
    setPin(next);
    if (next.length === PIN_LEN) login.mutate({ terminalId, badge, userId: null, pin: next }, {
      onSuccess: onSignedIn,
      onError: (e) => { setError(e instanceof Problem ? e.title : "Could not sign in."); setPin(""); },
    });
  };

  if (!holder) return (
    <div className="flex flex-col gap-5">
      <h2 className="flex items-center gap-3 text-title font-medium"><CreditCard className="size-7" aria-hidden />{title}</h2>
      <form onSubmit={(e) => { e.preventDefault(); readBadge(badge); }} className="flex gap-2">
        <Input ref={badgeRef} aria-label="Badge code" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Hold the badge to the reader" className="font-mono" />
        <Button type="submit" variant="outline" disabled={!badge}>Read</Button>
      </form>
      {error && <p role="alert" className="text-body text-negative">{error}</p>}
      <div className="flex flex-col gap-2">
        <p className="text-small text-muted">Demo badges (mock). PIN for everyone: {DEMO_PIN}</p>
        <div className="flex flex-wrap gap-2">
          {demo.map((d) => (
            <button key={d.code} type="button" onClick={() => readBadge(d.code)} className="flex items-center gap-2 rounded-control border border-control px-3 py-2 text-body hover:bg-raised">
              <Avatar name={d.user!.name} hue={d.user!.hue} size={24} />{d.user!.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3"><Avatar name={holder.name} hue={holder.hue} size={32} /><span className="text-section font-medium">{holder.name}</span></div>
      <p className="text-body text-muted">Type your PIN</p>
      <div className="flex gap-3" aria-label={`${pin.length} of ${PIN_LEN} digits`}>
        {Array.from({ length: PIN_LEN }, (_, i) => <span key={i} className={cn("size-4 rounded-full border-2 border-text transition-colors duration-[var(--dur-1)]", i < pin.length && "bg-text")} />)}
      </div>
      {error && <p role="alert" className="text-body text-negative">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) => k === "" ? <span key={i} /> : (
          <button key={k} type="button" disabled={login.isPending} onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k}
            className="grid size-16 place-items-center rounded-card border border-control text-title font-medium num transition-[background-color,transform] duration-[var(--dur-1)] hover:bg-raised active:scale-[0.96]">
            {k === "del" ? <Delete className="size-6" /> : k}
          </button>
        ))}
      </div>
      <Button variant="ghost" onClick={() => { setHolder(null); setBadge(""); setPin(""); setError(null); }}>Not you?</Button>
    </div>
  );
}
