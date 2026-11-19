"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useBadges, useUsers } from "@/features/hooks";
import type { Role, User } from "@/lib/api/types";
import { fmtAgo } from "@/lib/format";
import { roleInfo } from "@/lib/labels";
import { Avatar, Button, Checkbox, Pill } from "@/ui/atoms";
import { DataTable, ErrorState, LoadingRows, Sheet } from "@/ui/cells";

const ROLES = Object.keys(roleInfo) as Role[];

/** People and their roles. Roles add up; the server still refuses one person signing both halves of a version (§29.4). */
export function UsersPanel() {
  const users = useUsers();
  const badges = useBadges();
  const [edits, setEdits] = useState<Record<string, Role[]>>({});
  const [open, setOpen] = useState<User | null>(null);
  const rolesOf = (u: User) => edits[u.id] ?? u.roles;

  if (users.isPending) return <LoadingRows rows={8} pitch="h-14" />;
  if (users.isError) return <ErrorState what="people" onRetry={() => users.refetch()} />;
  return (
    <>
      <DataTable label="People" rows={users.data} rowKey={(u) => u.id} onRow={setOpen} columns={[
        { key: "p", label: "Person", cell: (u) => (
          <span className="flex items-center gap-3"><Avatar name={u.name} hue={u.hue} size={32} /><span><span className="block font-medium">{u.name}</span><span className="text-small text-muted">{u.email}</span></span></span>
        ) },
        { key: "r", label: "Roles", cell: (u) => <span className="flex flex-wrap gap-1">{rolesOf(u).map((r) => <Pill key={r}>{roleInfo[r].label}</Pill>)}</span> },
        { key: "a", label: "Area", cell: (u) => <span className="text-muted">{u.area}</span> },
        { key: "t", label: "Two-step", cell: (u) => <Pill tone={u.totp ? "positive" : "warning"}>{u.totp ? "On" : "Off"}</Pill> },
        { key: "b", label: "Badge", cell: (u) => (badges.data?.some((b) => b.userId === u.id && b.status === "active") ? "Active" : <span className="text-muted">None</span>) },
        { key: "s", label: "Last seen", cell: (u) => <span className="text-muted">{fmtAgo(u.lastSeenAt)}</span> },
      ]} />
      <Sheet open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }} title={open?.name ?? ""} description="Roles for this plant">
        {open && <RoleEditor user={open} roles={rolesOf(open)} onSave={(roles) => {
          setEdits((e) => ({ ...e, [open.id]: roles }));
          setOpen(null);
          toast.success(`Roles updated for ${open.name}`, { description: "Recorded in the audit log." });
        }} />}
      </Sheet>
    </>
  );
}

function RoleEditor({ user, roles, onSave }: { user: User; roles: Role[]; onSave: (r: Role[]) => void }) {
  const [picked, setPicked] = useState<Role[]>(roles);
  const toggle = (r: Role, on: boolean) => setPicked((p) => (on ? [...p, r] : p.filter((x) => x !== r)));
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <ul className="flex flex-col divide-y divide-rule">
        {ROLES.map((r) => (
          <li key={r} className="flex items-start gap-3 py-3">
            <Checkbox id={`role-${r}`} checked={picked.includes(r)} onCheckedChange={(on) => toggle(r, on)} />
            <label htmlFor={`role-${r}`} className="min-w-0"><span className="block text-body font-medium">{roleInfo[r].label}</span><span className="text-small text-muted">{roleInfo[r].help}</span></label>
          </li>
        ))}
      </ul>
      {picked.includes("engineer") && picked.includes("safety_approver") && (
        <p className="text-small text-muted">{user.name} can hold both roles, but never sign both halves of the same version.</p>
      )}
      <Button variant="primary" disabled={!picked.length} onClick={() => onSave(picked)}>Save roles</Button>
    </div>
  );
}
