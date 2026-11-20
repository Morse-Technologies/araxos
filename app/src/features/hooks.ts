"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Correction, type Lang, type Note, type NoteState } from "@/lib/api";

/** Query keys in one place so mutations invalidate exactly what they change. */
export const keys = {
  queue: ["queue"] as const,
  notes: (q?: object) => ["notes", q ?? {}] as const,
  note: (id: string) => ["note", id] as const,
  preview: (actionId: string) => ["preview", actionId] as const,
  connectors: ["connectors"] as const,
  actionTypes: ["actionTypes"] as const,
  vocab: ["vocab"] as const,
  users: ["users"] as const,
  me: ["me"] as const,
  policy: ["policy"] as const,
  audit: ["audit"] as const,
};

export const useQueue = () => useQuery({ queryKey: keys.queue, queryFn: api.queue });
export const useNotes = (q?: { author?: string; state?: NoteState }) => useQuery({ queryKey: keys.notes(q), queryFn: () => api.notes(q) });
export const useNote = (id: string | undefined) => useQuery({ queryKey: keys.note(id ?? ""), queryFn: () => api.note(id!), enabled: !!id });
export const usePreview = (actionId: string) => useQuery({ queryKey: keys.preview(actionId), queryFn: () => api.preview(actionId) });
export const useConnectors = () => useQuery({ queryKey: keys.connectors, queryFn: api.connectors });
export const useActionTypes = () => useQuery({ queryKey: keys.actionTypes, queryFn: api.actionTypes });
export const useVocab = () => useQuery({ queryKey: keys.vocab, queryFn: api.vocab });
export const useUsers = () => useQuery({ queryKey: keys.users, queryFn: api.users, staleTime: Infinity });
export const usePolicy = () => useQuery({ queryKey: keys.policy, queryFn: api.policy, staleTime: Infinity });
export const useAudit = () => useQuery({ queryKey: keys.audit, queryFn: api.audit });

const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : "Algo ha fallado.");

/** Every note change goes through here: the note is updated in place, and lists and audit are refreshed. */
export function useNoteMutation<V>(fn: (v: V) => Promise<Note>, onDone?: (n: Note, v: V) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (n, v) => {
      qc.setQueryData(keys.note(n.id), n);
      void qc.invalidateQueries({ queryKey: keys.queue });
      void qc.invalidateQueries({ queryKey: ["notes"] });
      void qc.invalidateQueries({ queryKey: ["preview"] });
      void qc.invalidateQueries({ queryKey: keys.audit });
      onDone?.(n, v);
    },
    onError: fail,
  });
}

export const useAnswer = (noteId: string) => useNoteMutation((v: { actionId: string; optionId: string }) => api.answer(noteId, v));
export const useCorrect = (noteId: string) => {
  const qc = useQueryClient();
  return useNoteMutation((c: Correction) => api.correct(noteId, c), (_n, c) => { if (c.kind === "entity" && c.rememberAlias) void qc.invalidateQueries({ queryKey: keys.vocab }); });
};
export const useResolveConflict = () => useNoteMutation((actionId: string) => api.resolveConflict(actionId));

export function useSyncConnector() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.syncConnector, onSuccess: () => qc.invalidateQueries({ queryKey: keys.connectors }), onError: fail });
}

export function useAliasMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: keys.vocab });
  return {
    add: useMutation({ mutationFn: (v: { termId: string; text: string; lang: Lang }) => api.addAlias(v.termId, { text: v.text, lang: v.lang }), onSuccess: done, onError: fail }),
    remove: useMutation({ mutationFn: (v: { termId: string; text: string }) => api.removeAlias(v.termId, v.text), onSuccess: done, onError: fail }),
  };
}

export const userName = (users: { id: string; name: string }[] | undefined, id: string) => (id === "system" ? "Field" : users?.find((u) => u.id === id)?.name ?? id);
