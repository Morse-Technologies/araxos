import type { Action, ActionType, AuditEvent, Connector, Note, Policy, VocabTerm } from "../types";
import { speak, spokenSeconds } from "./script";
import { SCENARIOS } from "./scenarios";

const at = (day: number, hhmm: string) => `2026-11-${String(day).padStart(2, "0")}T${hhmm}:00+01:00`;

type Brief = { id: string; number: number; author: string; day: number; time: string; lang: "es"; text: string; customer: string; place: string; summary: string; state: Note["state"]; urgent?: boolean; actions: Omit<Action, "noteId" | "state">[] };

/** A short note with one or two actions and no open questions. */
function brief(b: Brief): Note {
  const w = speak([{ lang: b.lang, text: b.text }]);
  const done = b.state === "applied";
  const actions = b.actions.map((a) => ({ ...a, noteId: b.id, state: done ? "applied" as const : b.state === "rejected" ? "rejected" as const : "proposed" as const, appliedAt: done ? at(b.day, "18:02") : undefined }));
  return { id: b.id, number: b.number, authorId: b.author, channel: "app", recordedAt: at(b.day, b.time), durationSec: spokenSeconds(w), langs: [b.lang], customer: b.customer, place: b.place,
    summary: b.summary, state: b.state, urgent: b.urgent, transcript: { schema: "transcript.v1", words: w, model: "whisper-large-v3-turbo (simulado)" }, entities: [], actions, approvals: done ? [{ userId: "u-carmen", at: at(b.day, "18:01"), step: 1 }] : [],
    rejectedReason: b.state === "rejected" ? "Duplicada: ya se registró en la nota 000471." : undefined };
}

const field = (label: string, target: string, after: string, before?: string) => ({ key: target, label, target, after, before, source: { inferred: "Dictado" } });

export function buildNotes(): Note[] {
  return [
    brief({ id: "n-485", number: 485, author: "u-lucia", day: 20, time: "15:42", lang: "es", urgent: true, customer: "Ascensores Levante", place: "Alicante", state: "ready",
      summary: "Ascensor parado en el portal 3; volver hoy con la placa de maniobra.",
      text: "Soy Lucía. En la comunidad de la calle Mayor, en Alicante, el ascensor del portal tres está parado por la placa de maniobra. No hay nadie atrapado. Tengo que volver hoy a las seis con la placa nueva, la referencia PM-220.",
      actions: [
        { id: "n-485-a1", kind: "report", title: "Avería", system: "Odoo", model: "maintenance.request", op: "create", fields: [field("Equipo", "equipment_id", "Ascensor portal 3 · C/ Mayor"), field("Prioridad", "priority", "Urgente", "Normal")] },
        { id: "n-485-a2", kind: "visit", title: "Visita hoy", system: "Google Calendar", model: "event", op: "create", fields: [field("Cuándo", "start / end", "Hoy · 18:00–19:30")] }] }),
    SCENARIOS["javier-cantabrico"].build({ id: "n-482", number: 482, recordedAt: at(20, "13:18") }),
    SCENARIOS["talleres-perez"].build({ id: "n-481", number: 481, recordedAt: at(20, "12:05") }),
    SCENARIOS["marta-hornos"].build({ id: "n-480", number: 480, recordedAt: at(20, "11:47") }),
    brief({ id: "n-479", number: 479, author: "u-javier", day: 20, time: "09:58", lang: "es", customer: "Cámaras Frigoríficas del Sur", place: "Sevilla", state: "ready",
      summary: "Revisión del túnel de congelación; todo correcto.",
      text: "Cámaras Frigoríficas del Sur, en Sevilla. Revisión del túnel de congelación hecha, todo correcto. Una hora. Sin material.",
      actions: [{ id: "n-479-a1", kind: "report", title: "Parte de trabajo", system: "Odoo", model: "project.task", op: "create", fields: [field("Trabajo realizado", "description", "Revisión del túnel de congelación. Correcto."), field("Horas", "unit_amount", "1 h")] }] }),
    brief({ id: "n-478", number: 478, author: "u-lucia", day: 19, time: "17:21", lang: "es", customer: "Cooperativa Lechera del Valle", place: "León", state: "ready",
      summary: "Tanque de leche 2: termostato cambiado.",
      text: "Cooperativa Lechera del Valle. En el tanque de leche dos he cambiado el termostato. Hora y media. He gastado un termostato TH-12.",
      actions: [
        { id: "n-478-a1", kind: "report", title: "Parte de trabajo", system: "Odoo", model: "project.task", op: "create", fields: [field("Trabajo realizado", "description", "Cambio de termostato en el tanque de leche 2."), field("Horas", "unit_amount", "1,5 h")] },
        { id: "n-478-a2", kind: "order", title: "Consumo de material", system: "Odoo", model: "stock.move", op: "create", amount: 46.2, fields: [field("Producto", "product_id", "TH-12 · Termostato"), field("Cantidad", "quantity", "1 ud.")] }] }),
    brief({ id: "n-476", number: 476, author: "u-javier", day: 19, time: "12:40", lang: "es", customer: "Frigoríficos Duero", place: "Valladolid", state: "applied",
      summary: "Carga de gas en la cámara de congelados.",
      text: "Frigoríficos Duero, en Valladolid. He hecho carga de gas en la cámara de congelados, tres kilos de R-448A. Dos horas.",
      actions: [{ id: "n-476-a1", kind: "report", title: "Parte de trabajo", system: "Odoo", model: "project.task", op: "create", externalRef: "project.task:9911", fields: [field("Trabajo realizado", "description", "Carga de 3 kg de R-448A en la cámara de congelados."), field("Horas", "unit_amount", "2 h")] }] }),
    brief({ id: "n-475", number: 475, author: "u-luis", day: 18, time: "16:05", lang: "es", customer: "Hotel Plaza Mayor", place: "Salamanca", state: "rejected",
      summary: "Revisión de la cámara de la cocina (duplicada).",
      text: "Hotel Plaza Mayor. Revisión de la cámara de la cocina, todo bien. Una hora.",
      actions: [{ id: "n-475-a1", kind: "report", title: "Parte de trabajo", system: "Odoo", model: "project.task", op: "create", fields: [field("Trabajo realizado", "description", "Revisión de la cámara de la cocina.")] }] }),
  ];
}

export const POLICY: Policy = { version: 3, doubleAbove: 3000, undoWindowSec: 30, autoKinds: [] };

export function buildConnectors(): Connector[] {
  return [
    { id: "k-odoo", kind: "odoo", name: "Odoo 19", detail: "iberiatec.odoo.com · JSON-2 API", status: "connected", lastSync: "2026-11-20T15:50:00+01:00", families: ["report", "order", "crm"],
      mirrors: [{ object: "Clientes", count: 1284 }, { object: "Productos", count: 6120 }, { object: "Equipos", count: 2311 }, { object: "Empleados", count: 38 }] },
    { id: "k-gcal", kind: "gcal", name: "Google Calendar", detail: "12 calendarios de técnicos", status: "connected", lastSync: "2026-11-20T15:55:00+01:00", families: ["visit"], mirrors: [{ object: "Calendarios", count: 12 }] },
    { id: "k-holded", kind: "holded", name: "Holded", detail: "Delegación Levante", status: "connected", lastSync: "2026-11-20T15:31:00+01:00", families: ["order"], mirrors: [{ object: "Contactos", count: 412 }, { object: "Productos", count: 233 }] },
    { id: "k-hubspot", kind: "hubspot", name: "HubSpot", detail: "Token caducado el 18-11", status: "degraded", lastSync: "2026-11-18T09:12:00+01:00", families: ["crm"], mirrors: [{ object: "Contactos", count: 2045 }] },
    { id: "k-fenix", kind: "webhook", name: "Webhook genérico", detail: "Sin configurar", status: "off", families: [], mirrors: [] },
  ];
}

export function buildActionTypes(): ActionType[] {
  const odoo = (model: string) => ({ connector: "Odoo 19", model });
  return [
    { kind: "report", name: "Parte de trabajo", version: 4, description: "Trabajo hecho en una visita: equipo, descripción, horas y material.", policy: "review", mappings: [odoo("project.task"), odoo("maintenance.equipment")], fields: [
      { key: "customer", type: "ref", required: true, mapsTo: "partner_id" }, { key: "asset", type: "ref", required: false, mapsTo: "x_equipment_id" },
      { key: "work", type: "string", required: true, max: 600, mapsTo: "description" }, { key: "hours", type: "number", required: true, mapsTo: "timesheet_ids.unit_amount" }] },
    { kind: "order", name: "Pedido", version: 2, description: "Pedido de compra o de venta con líneas de producto.", policy: "review", mappings: [odoo("purchase.order"), { connector: "Holded", model: "salesorder" }], fields: [
      { key: "product", type: "ref", required: true, mapsTo: "order_line.product_id" }, { key: "qty", type: "number", required: true, mapsTo: "order_line.product_qty" }, { key: "vendor", type: "ref", required: false, mapsTo: "partner_id" }] },
    { kind: "visit", name: "Cita", version: 3, description: "Visita en el calendario del técnico, con comprobación de huecos.", policy: "review", mappings: [{ connector: "Google Calendar", model: "event" }], fields: [
      { key: "when", type: "date", required: true, mapsTo: "start / end" }, { key: "where", type: "string", required: false, max: 160, mapsTo: "location" }, { key: "purpose", type: "string", required: true, max: 200, mapsTo: "summary" }] },
    { kind: "crm", name: "CRM", version: 2, description: "Actividad, tarea, nota o presupuesto en el CRM.", policy: "double", mappings: [odoo("mail.activity"), odoo("sale.order"), { connector: "HubSpot", model: "task / note" }], fields: [
      { key: "subject", type: "string", required: true, max: 200, mapsTo: "summary" }, { key: "contact", type: "ref", required: false, mapsTo: "res_id" }, { key: "amount", type: "number", required: false, mapsTo: "amount_total" }] },
  ];
}

export function buildVocab(): VocabTerm[] {
  return [
    { id: "v1", term: "Conservas del Cantábrico S.L.", type: "customer", aliases: [{ text: "la conservera de Santoña", lang: "es", userId: "u-javier", learned: true }, { text: "Cantábrico", lang: "es" }] },
    { id: "v2", term: "JF-3020 · Junta filtro 45×62", type: "product", aliases: [{ text: "junta del filtro", lang: "es" }, { text: "xunta do filtro", lang: "gl" }] },
    { id: "v3", term: "Compresor 2 · Atlas Copco GA22", type: "asset", aliases: [{ text: "el GA22", lang: "es" }, { text: "compresor dos", lang: "es" }] },
    { id: "v4", term: "Harina de fuerza W380 · 25 kg", type: "product", aliases: [{ text: "la de siempre", lang: "es", userId: "u-marta", learned: true }, { text: "farina de força", lang: "ca" }] },
    { id: "v5", term: "Suministros Frío Norte", type: "customer", aliases: [{ text: "Frío Norte", lang: "es" }] },
    { id: "v6", term: "Bomba recirculación Grundfos CR 10", type: "asset", aliases: [{ text: "la Grundfos", lang: "es" }, { text: "bomba de recirculación", lang: "es" }] },
  ];
}

export const SEED_AUDIT: Omit<AuditEvent, "seq" | "hash" | "prev">[] = [
  { at: "2026-11-19T12:41:00+01:00", actorId: "u-javier", type: "note.received", subject: "N.º 000476", detail: "App · 0:24 · es" },
  { at: "2026-11-19T18:01:00+01:00", actorId: "u-carmen", type: "action.approved", subject: "N.º 000476", detail: "1 acción" },
  { at: "2026-11-19T18:02:00+01:00", actorId: "system", type: "action.applied", subject: "N.º 000476", detail: "Odoo · project.task:9911" },
  { at: "2026-11-20T09:12:00+01:00", actorId: "u-carmen", type: "note.rejected", subject: "N.º 000475", detail: "Duplicada: ya se registró en la nota 000471." },
  { at: "2026-11-20T11:47:00+01:00", actorId: "u-marta", type: "note.received", subject: "N.º 000480", detail: "WhatsApp · 0:21 · es" },
  { at: "2026-11-20T12:05:00+01:00", actorId: "u-luis", type: "note.received", subject: "N.º 000481", detail: "App · 0:31 · es" },
  { at: "2026-11-20T13:18:00+01:00", actorId: "u-javier", type: "note.received", subject: "N.º 000482", detail: "App · 0:28 · es" },
  { at: "2026-11-20T13:19:00+01:00", actorId: "system", type: "note.needs_answer", subject: "N.º 000482", detail: "¿Qué junta del filtro?" },
  { at: "2026-11-20T15:42:00+01:00", actorId: "u-lucia", type: "note.received", subject: "N.º 000485", detail: "App · 0:19 · es · urgente" },
];
