"use client";
import { CalendarDays, Cable, Database, Plug, RefreshCw, Webhook, X, type LucideIcon } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { ConnectorKind, Lang, VocabTerm } from "@/lib/api";
import { cn } from "@/lib/cn";
import { euros, when } from "@/lib/format";
import { useEnter } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { STAGGER } from "@/lib/motion";
import { useReducedTransparency, useSunMode, useTheme, type ThemeChoice } from "@/lib/prefs";
import { refractionOn } from "@/lib/liquid";
import { Avatar, Band, Button, Pill, Skeleton, Switch, type Tone } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { LinkTabs } from "@/ui/tabs";
import { useActionTypes, useAliasMutations, useConnectors, usePolicy, useSyncConnector, useUsers, useVocab } from "@/features/hooks";
import { ENTITY_ICON } from "@/features/queue/entityIcons";

const TABS = [
  { href: "/admin/connectors", label: t.admin.connectors }, { href: "/admin/actions", label: t.admin.actions },
  { href: "/admin/vocabulary", label: t.admin.vocabulary }, { href: "/admin/users", label: t.admin.users }, { href: "/admin/settings", label: t.admin.settings },
];

export function AdminHeader() {
  return (
    <div className="mb-6 flex items-end justify-between gap-6 px-1">
      <h1 className="text-display font-semibold tracking-tight">{t.admin.title}</h1>
      <LinkTabs items={TABS} label={t.admin.title} />
    </div>
  );
}

const KIND_ICON: Record<ConnectorKind, LucideIcon> = { odoo: Database, gcal: CalendarDays, hubspot: Cable, holded: Database, webhook: Webhook, mcp: Plug };
const STATUS_TONE: Record<string, Tone> = { connected: "positive", degraded: "warning", off: "neutral" };

export function Connectors() {
  const { data } = useConnectors();
  const sync = useSyncConnector();
  const grid = useRef<HTMLDivElement>(null);
  useEnter(grid, { stagger: STAGGER.cards });
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div ref={grid} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((k) => {
        const Icon = KIND_ICON[k.kind];
        return (
          <Glass key={k.id} tone="strong" className="sq sq-lg flex flex-col p-5" data-testid="connector">
            <div className="flex items-start gap-3">
              <span className="sq sq-sm grid size-11 place-items-center bg-[var(--pill-neutral-bg)]"><Icon className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-section font-semibold">{k.name}</h2>
                <p className="truncate text-small text-muted">{k.detail}</p>
              </div>
              <Pill tone={STATUS_TONE[k.status]}>{t.admin.status[k.status]}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">{k.families.map((f) => <Band key={f} kind={f} />)}</div>
            {k.mirrors.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-body">
                {k.mirrors.map((m) => <div key={m.object} className="flex justify-between"><dt className="text-muted">{m.object}</dt><dd className="tabular">{m.count.toLocaleString("es-ES")}</dd></div>)}
              </dl>
            )}
            <div className="mt-auto flex items-center gap-2 pt-5">
              <span className="text-small text-muted">{k.lastSync ? `${t.admin.lastSync}: ${when(k.lastSync)}` : "—"}</span>
              <Button size="sm" className="ml-auto" disabled={k.status === "off"} busy={sync.isPending && sync.variables === k.id}
                onClick={() => sync.mutate(k.id, { onSuccess: () => toast.success(t.admin.synced(k.name)) })}>
                <RefreshCw />{k.status === "off" ? t.admin.configure : t.admin.sync}
              </Button>
            </div>
          </Glass>
        );
      })}
    </div>
  );
}

export function ActionTypes() {
  const { data } = useActionTypes();
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {data.map((a) => (
        <Glass key={a.kind} tone="strong" className="sq sq-lg p-5" data-testid="action-type">
          <div className="flex items-center gap-3">
            <Band kind={a.kind} />
            <h2 className="text-section font-semibold">{a.name}</h2>
            <span className="font-mono text-small text-muted">{t.admin.schemaVersion(a.version)}</span>
            <Pill tone={a.policy === "double" ? "warning" : "neutral"} className="ml-auto">{t.admin.policy[a.policy]}</Pill>
          </div>
          <p className="mt-1 text-muted">{a.description}</p>
          <table className="mt-4 w-full text-body">
            <thead><tr className="text-left text-small text-muted"><th className="pb-1 font-medium">{t.admin.field}</th><th className="pb-1 font-medium">{t.admin.type}</th><th className="pb-1 font-medium">{t.admin.mapsTo}</th><th /></tr></thead>
            <tbody>
              {a.fields.map((f) => (
                <tr key={f.key} className="border-t border-[var(--rule)]">
                  <td className="py-1.5 font-mono text-small">{f.key}</td>
                  <td className="py-1.5 text-muted">{f.type}{f.max ? ` ≤ ${f.max}` : ""}</td>
                  <td className="py-1.5 font-mono text-small text-muted">{f.mapsTo}</td>
                  <td className="py-1.5 text-right text-small text-muted">{f.required ? t.admin.required : t.admin.optional}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-small text-muted">{t.admin.mappings}: {a.mappings.map((m) => `${m.connector} · ${m.model}`).join(" — ")}</p>
        </Glass>
      ))}
    </div>
  );
}

function TermRow({ term }: { term: VocabTerm }) {
  const [text, setText] = useState("");
  const [lang, setLang] = useState<Lang>("es");
  const { add, remove } = useAliasMutations();
  const Icon = ENTITY_ICON[term.type];
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 px-5 py-4" data-testid="term">
      <div className="flex min-w-0 items-center gap-2"><Icon className="size-4 shrink-0 text-muted" /><span className="truncate font-medium">{term.term}</span></div>
      <div>
        <div className="flex flex-wrap gap-1.5">
          {term.aliases.map((a) => (
            <Pill key={a.text} tone={a.learned ? "accent" : "neutral"} className="pr-1">
              <span title={a.learned ? t.admin.learned : undefined}>{a.text}</span>
              <span className="text-[10px] uppercase opacity-70">{a.lang}</span>
              <button type="button" aria-label={`${t.admin.remove} ${a.text}`} onClick={() => remove.mutate({ termId: term.id, text: a.text })} className="grid size-4 place-items-center rounded-full hover:bg-black/10"><X className="size-3" /></button>
            </Pill>
          ))}
        </div>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate({ termId: term.id, text, lang }, { onSuccess: () => setText("") }); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.admin.aliasPlaceholder} aria-label={t.admin.aliasAdd}
            className="sq sq-xs h-8 min-w-0 flex-1 bg-surface/70 px-2.5 ring-1 ring-[var(--rule)] outline-none focus:ring-2 focus:ring-accent dark:bg-white/5" />
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Idioma" className="sq sq-xs h-8 bg-surface/70 px-2 ring-1 ring-[var(--rule)] dark:bg-white/5">
            {(["es", "gl", "ca"] as const).map((l) => <option key={l} value={l}>{t.langs[l]}</option>)}
          </select>
          <Button size="sm" type="submit" disabled={!text.trim()}>{t.admin.aliasAdd}</Button>
        </form>
      </div>
    </li>
  );
}

export function Vocabulary() {
  const { data } = useVocab();
  if (!data) return <Skeleton className="h-64" />;
  return (
    <Glass tone="strong" className="sq sq-lg">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 border-b border-[var(--rule)] px-5 py-3 text-small text-muted"><span>{t.admin.term}</span><span>{t.admin.aliases}</span></div>
      <ul className="divide-y divide-[var(--rule)]">{data.map((v) => <TermRow key={v.id} term={v} />)}</ul>
    </Glass>
  );
}

export function Users() {
  const { data } = useUsers();
  if (!data) return <Skeleton className="h-64" />;
  const c = t.admin.usersCols;
  return (
    <Glass tone="strong" className="sq sq-lg overflow-hidden">
      <table className="w-full text-body">
        <thead><tr className="border-b border-[var(--rule)] text-left text-small text-muted">{[c.name, c.role, c.team, c.langs, c.phone, c.devices].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id} className={cn("border-b border-[var(--rule)] last:border-0", !u.active && "text-muted")} data-testid="user">
              <td className="px-5 py-3"><span className="flex items-center gap-3"><Avatar initials={u.initials} />{u.name}</span></td>
              <td className="px-5 py-3">{t.roles[u.role]}</td>
              <td className="px-5 py-3 text-muted">{u.team}</td>
              <td className="px-5 py-3 text-muted">{u.langs.map((l) => t.langs[l]).join(", ")}</td>
              <td className="px-5 py-3 font-mono text-small text-muted">{u.phone ?? "—"}</td>
              <td className="px-5 py-3 tabular">{u.devices}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Glass>
  );
}

function SettingRow({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-6 border-b border-[var(--rule)] py-4 last:border-0">
      <div className="min-w-0 flex-1"><p className="font-medium">{title}</p>{hint && <p className="text-small text-muted">{hint}</p>}</div>
      {children}
    </div>
  );
}

export function Settings() {
  const { choice, setTheme } = useTheme();
  const [lessGlass, setLessGlass] = useReducedTransparency();
  const [sun, setSun] = useSunMode();
  const { data: policy } = usePolicy();
  const s = t.settings;
  const refract = useSyncExternalStore(() => () => {}, refractionOn, () => false);
  const choices: [ThemeChoice, string][] = [["light", t.theme.light], ["dark", t.theme.dark], ["system", t.theme.system]];
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Glass tone="strong" className="sq sq-lg px-6 py-2">
        <h2 className="pt-4 pb-1 text-section font-semibold">{s.appearance}</h2>
        <SettingRow title={s.theme}>
          <div role="radiogroup" aria-label={s.theme} className="sq sq-sm flex gap-1 bg-[var(--pill-neutral-bg)] p-1">
            {choices.map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={choice === v} onClick={() => setTheme(v)}
                className={cn("sq sq-xs h-8 px-3 text-body font-medium text-muted", choice === v && "bg-surface text-text shadow-[0_1px_2px_rgb(0_0_0/0.12)] dark:bg-white/10")}>{label}</button>
            ))}
          </div>
        </SettingRow>
        <SettingRow title={s.transparency} hint={s.transparencyHint}><Switch checked={lessGlass} onCheckedChange={setLessGlass} label={s.transparency} /></SettingRow>
        <SettingRow title={s.sun} hint={s.sunHint}><Switch checked={sun} onCheckedChange={setSun} label={s.sun} /></SettingRow>
        <SettingRow title={s.refraction} hint={refract ? s.refractionOn : s.refractionOff}><span /></SettingRow>
        <SettingRow title={s.motion} hint={s.motionHint}><span /></SettingRow>
      </Glass>
      <Glass tone="strong" className="sq sq-lg px-6 py-2">
        <h2 className="pt-4 pb-1 text-section font-semibold">{s.language}</h2>
        <SettingRow title={s.language} hint={s.languageSoon}>
          <select aria-label={s.language} defaultValue="es" className="sq sq-xs h-9 bg-surface/70 px-3 ring-1 ring-[var(--rule)] dark:bg-white/5">
            {(Object.entries(s.uiLangs) as [string, string][]).map(([k, v]) => <option key={k} value={k} disabled={k !== "es"}>{v}</option>)}
          </select>
        </SettingRow>
        <SettingRow title={s.voiceLangs} hint={s.voiceLangsHint}>
          <div className="flex gap-1.5">{(["es", "gl", "ca"] as const).map((l) => <Pill key={l} tone={l === "es" ? "accent" : "neutral"}>{t.langs[l]}</Pill>)}</div>
        </SettingRow>
        <h2 className="pt-6 pb-1 text-section font-semibold">{s.policy}</h2>
        {policy && <>
          <SettingRow title={s.doubleAbove(euros(policy.doubleAbove))} hint={`policy.v1 · v${policy.version}`}><span /></SettingRow>
          <SettingRow title={s.undoWindow(policy.undoWindowSec)}><span /></SettingRow>
        </>}
      </Glass>
    </div>
  );
}
