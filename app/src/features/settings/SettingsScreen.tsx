"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useMe } from "@/features/hooks";
import { PageHeader, Tabs } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";
import { DevicesPanel } from "./DevicesPanel";
import { LicencePanel } from "./LicencePanel";
import { McpPanel } from "./McpPanel";
import { PlantPanel } from "./PlantPanel";
import { StationPanel } from "./StationPanel";
import { UsersPanel } from "./UsersPanel";

const ADMIN_TABS = [
  { value: "users", label: "People & roles" },
  { value: "devices", label: "Devices & terminals" },
  { value: "plant", label: "Plant" },
  { value: "mcp", label: "MCP" },
  { value: "licence", label: "Licence" },
] as const;
const STATION_TAB = { value: "station", label: "This station" } as const;
type Tab = (typeof ADMIN_TABS)[number]["value"] | "station";

/** D8. Administrators see the plant's configuration; everyone else only this station's appearance and density. */
export function SettingsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: me } = useMe();
  const admin = !!me?.roles.includes("admin");
  const tabs: { value: Tab; label: string }[] = admin ? [...ADMIN_TABS, STATION_TAB] : [STATION_TAB];
  const raw = params.get("tab");
  const tab: Tab = tabs.find((t) => t.value === raw)?.value ?? tabs[0].value;

  const setTab = useCallback((next: Tab) => {
    const q = new URLSearchParams(params.toString());
    q.set("tab", next);
    router.replace(`?${q.toString()}`, { scroll: false });
  }, [params, router]);

  return (
    <Canvas>
      <PageHeader
        title="Settings"
        subline={admin ? "People, devices, terminals, badges, the engine's threshold, MCP access and retention for North Plant." : "How this screen looks. Plant settings are for administrators."}
      />
      {tabs.length > 1 && <Tabs className="mt-6" label="Settings sections" tabs={tabs} value={tab} onChange={setTab} />}
      <div key={tab} className="mt-6 animate-enter">
        {tab === "users" && <UsersPanel />}
        {tab === "devices" && <DevicesPanel />}
        {tab === "plant" && <PlantPanel />}
        {tab === "mcp" && <McpPanel />}
        {tab === "licence" && <LicencePanel />}
        {tab === "station" && <StationPanel />}
      </div>
    </Canvas>
  );
}
