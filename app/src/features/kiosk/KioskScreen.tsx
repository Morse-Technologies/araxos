"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSwitchUser, useTerminal } from "@/features/hooks";
import { setStation, useApplyDensity, useStation } from "@/features/session";
import { BadgePin } from "./BadgePin";
import { KioskFrame } from "./KioskFrame";

const DEFAULT_TERMINAL = "t-taller2";

/** T1: the shared terminal's lock screen. Badge and PIN open the person's work at the terminal's density. */
export function KioskScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const station = useStation();
  const terminalId = params.get("terminal") ?? station.terminalId ?? DEFAULT_TERMINAL;
  const { data: t } = useTerminal(terminalId);
  const switchUser = useSwitchUser();
  useApplyDensity(t?.density ?? "workshop");
  return (
    <KioskFrame terminalId={terminalId}>
      <BadgePin terminalId={terminalId} onSignedIn={(u) => switchUser.mutate(u.id, {
        onSuccess: () => {
          setStation({ terminalId, kioskUser: u.id, density: t?.density ?? "workshop" });
          toast.success(`Hello, ${u.name.split(" ")[0]}`, { description: "This terminal locks itself after a few idle minutes." });
          router.push("/work");
        },
      })} />
    </KioskFrame>
  );
}
