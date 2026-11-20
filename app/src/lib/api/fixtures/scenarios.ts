import type { Action, Entity, Note, ScenarioId, Word } from "../types";
import { span, speak, spokenSeconds } from "./script";

type Meta = { id: string; number: number; recordedAt: string };
type Ent = Omit<Entity, "from" | "to" | "chosen"> & { phrase: string; chosen?: string };

function entities(words: Word[], list: Ent[]): Entity[] {
  return list.map(({ phrase, ...e }) => {
    const [from, to] = span(words, phrase);
    return { ...e, from, to, chosen: e.chosen ?? e.candidates[0].id };
  });
}

const words = (w: Word[], phrase: string) => span(w, phrase);

/** Javier, refrigeration technician (ARAXOS-FIELD.md §5). Odoo + Google Calendar. */
function javierCantabrico(m: Meta): Note {
  const w = speak([
    { lang: "es", text: "Hola, soy Javier. Acabo de salir de Conservas del Cantábrico, en Santoña. He cambiado la bomba de recirculación de la cámara dos, la Grundfos, y ha quedado funcionando bien. Falta la junta del filtro, hay que pedirla. Vuelvo el jueves por la mañana. Han sido dos horas y media más el desplazamiento… y que me llame el encargado, que no me cuadra el consumo del compresor." },
  ], ["junta", "filtro"]);
  const ents = entities(w, [
    { id: "e1", type: "customer", phrase: "Conservas del Cantábrico", value: "Conservas del Cantábrico S.L.", confidence: 0.86, candidates: [
      { id: "c1", label: "Conservas del Cantábrico S.L.", detail: "Santoña · res.partner 1184", score: 0.92, ref: "res.partner:1184" },
      { id: "c2", label: "Conservas del Cantábrico (Laredo)", detail: "Laredo · res.partner 2207", score: 0.61, ref: "res.partner:2207" }] },
    { id: "e2", type: "address", phrase: "Santoña", value: "Santoña (Cantabria)", confidence: 0.95, candidates: [{ id: "c1", label: "Santoña", detail: "Cantabria", score: 0.95 }] },
    { id: "e3", type: "asset", phrase: "la bomba de recirculación de la cámara dos", value: "Bomba recirculación Grundfos CR 10 · Cámara 2", confidence: 0.9, candidates: [
      { id: "c1", label: "Bomba recirculación Grundfos CR 10", detail: "Cámara 2 · equipo 0412", score: 0.9, ref: "maintenance.equipment:412" },
      { id: "c2", label: "Bomba recirculación Grundfos CR 5", detail: "Cámara 1 · equipo 0409", score: 0.31, ref: "maintenance.equipment:409" }] },
    { id: "e4", type: "product", phrase: "la junta del filtro", value: "Junta filtro (por confirmar)", confidence: 0.55, candidates: [
      { id: "c1", label: "JF-3020 · Junta filtro 45×62", detail: "Suministros Frío Norte · 18,40 €", score: 0.58, ref: "product.product:3020" },
      { id: "c2", label: "JF-3025 · Junta filtro 52×70", detail: "Suministros Frío Norte · 21,90 €", score: 0.52, ref: "product.product:3025" }] },
    { id: "e5", type: "date", phrase: "el jueves por la mañana", value: "Jueves 26-11, 09:00–11:00", confidence: 0.88, candidates: [{ id: "c1", label: "Jue 26-11 · 09:00–11:00", detail: "«por la mañana» = franja de mañana", score: 0.88 }] },
    { id: "e6", type: "duration", phrase: "dos horas y media", value: "2 h 30 min", confidence: 0.93, candidates: [{ id: "c1", label: "2 h 30 min", detail: "+ desplazamiento (tarifa de zona)", score: 0.93 }] },
    { id: "e7", type: "person", phrase: "el encargado", value: "Manuel Otero (encargado)", confidence: 0.72, candidates: [
      { id: "c1", label: "Manuel Otero", detail: "Encargado de planta · Conservas del Cantábrico", score: 0.72, ref: "res.partner:1190" },
      { id: "c2", label: "Pilar Ríos", detail: "Gerencia · Conservas del Cantábrico", score: 0.4, ref: "res.partner:1185" }] },
  ]);
  const a = (n: number) => `${m.id}-a${n}`;
  const actions: Action[] = [
    { id: a(1), noteId: m.id, kind: "report", title: "Parte de trabajo", system: "Odoo", model: "project.task", op: "create", state: "proposed", fields: [
      { key: "partner", label: "Cliente", target: "partner_id", after: "Conservas del Cantábrico S.L. (Santoña)", source: { entityId: "e1" } },
      { key: "equipment", label: "Equipo", target: "x_equipment_id", after: "Bomba recirculación Grundfos CR 10 · Cámara 2", source: { entityId: "e3" } },
      { key: "work", label: "Trabajo realizado", target: "description", after: "Sustitución de la bomba de recirculación de la cámara 2 (Grundfos). Queda funcionando.", source: { words: words(w, "He cambiado la bomba de recirculación de la cámara dos, la Grundfos, y ha quedado funcionando bien.") } },
      { key: "hours", label: "Horas", target: "timesheet_ids.unit_amount", after: "2,5 h + desplazamiento", source: { entityId: "e6" } },
      { key: "user", label: "Técnico", target: "user_ids", after: "Javier Morales", source: { inferred: "Autor de la nota" } }] },
    { id: a(2), noteId: m.id, kind: "report", title: "Estado del equipo", system: "Odoo", model: "maintenance.equipment", op: "update", state: "proposed", fields: [
      { key: "state", label: "Estado", target: "x_state", before: "Averiado", after: "Operativo", source: { words: words(w, "ha quedado funcionando bien.") } }] },
    { id: a(3), noteId: m.id, kind: "order", title: "Pedido de compra", system: "Odoo", model: "purchase.order", op: "create", state: "proposed", amount: 18.4, fields: [
      { key: "vendor", label: "Proveedor", target: "partner_id", after: "Suministros Frío Norte", source: { inferred: "Proveedor habitual del producto" } },
      { key: "product", label: "Producto", target: "order_line.product_id", after: "JF-3020 · Junta filtro 45×62", source: { entityId: "e4" }, mono: true },
      { key: "qty", label: "Cantidad", target: "order_line.product_qty", after: "1 ud.", source: { inferred: "Sin cantidad en la nota: 1" } },
      { key: "price", label: "Precio", target: "order_line.price_unit", after: "18,40 €", source: { inferred: "Tarifa del proveedor" } }],
      question: { id: "q1", prompt: "¿Qué junta del filtro?", options: [
        { id: "c1", label: "JF-3020 · 45×62", detail: "18,40 € · la última que se montó en la cámara 2", patch: { product: "JF-3020 · Junta filtro 45×62", price: "18,40 €" }, amount: 18.4 },
        { id: "c2", label: "JF-3025 · 52×70", detail: "21,90 €", patch: { product: "JF-3025 · Junta filtro 52×70", price: "21,90 €" }, amount: 21.9 }] } },
    { id: a(4), noteId: m.id, kind: "visit", title: "Visita de seguimiento", system: "Google Calendar", model: "event", op: "create", state: "proposed", fields: [
      { key: "when", label: "Cuándo", target: "start / end", after: "Jue 26-11 · 09:00–11:00", source: { entityId: "e5" } },
      { key: "where", label: "Dónde", target: "location", after: "Conservas del Cantábrico · Santoña", source: { entityId: "e2" } },
      { key: "what", label: "Motivo", target: "summary", after: "Montar junta del filtro · Conservas del Cantábrico", source: { entityId: "e4" } }],
      conflict: { id: "k1", message: "Javier ya tiene «Visita Frutas Ribera» de 09:30 a 10:30.", fix: { label: "Mover a las 11:00", field: "when", value: "Jue 26-11 · 11:00–13:00" } } },
    { id: a(5), noteId: m.id, kind: "crm", title: "Actividad: llamar", system: "Odoo", model: "mail.activity", op: "create", state: "proposed", fields: [
      { key: "who", label: "Contacto", target: "res_id", after: "Manuel Otero (encargado)", source: { entityId: "e7" } },
      { key: "what", label: "Asunto", target: "summary", after: "Llamar a Javier: consumo del compresor que no cuadra", source: { words: words(w, "que no me cuadra el consumo del compresor.") } },
      { key: "due", label: "Vence", target: "date_deadline", after: "Lun 23-11", source: { inferred: "Siguiente día laborable" } }] },
  ];
  return { id: m.id, number: m.number, authorId: "u-javier", channel: "app", recordedAt: m.recordedAt, durationSec: spokenSeconds(w), langs: ["es"],
    customer: "Conservas del Cantábrico", place: "Santoña", summary: "Bomba cambiada en la cámara 2; falta la junta del filtro; volver el jueves.", state: "needs_answer",
    transcript: { schema: "transcript.v1", words: w, model: "whisper-large-v3-turbo (simulado)" }, entities: ents, actions, approvals: [] };
}

/** Marta, sales rep, via WhatsApp (§5). Holded + HubSpot. */
function martaHornos(m: Meta): Note {
  const w = speak([{ lang: "es", text: "Soy Marta. Salgo de Hornos Hermanos Ruiz, en Valencia. He hablado con Pilar: quieren veinte sacos más de harina de fuerza para el lunes, y que les mandemos el presupuesto del horno nuevo antes del viernes. Ah, y se quejan de que la última entrega llegó tarde, a las doce en vez de a las ocho." }]);
  const ents = entities(w, [
    { id: "e1", type: "customer", phrase: "Hornos Hermanos Ruiz", value: "Hornos Hermanos Ruiz S.L.", confidence: 0.94, candidates: [{ id: "c1", label: "Hornos Hermanos Ruiz S.L.", detail: "Valencia · Holded 00318", score: 0.94 }] },
    { id: "e2", type: "address", phrase: "Valencia", value: "Valencia", confidence: 0.96, candidates: [{ id: "c1", label: "Valencia", detail: "Comunidad Valenciana", score: 0.96 }] },
    { id: "e3", type: "person", phrase: "Pilar", value: "Pilar Ruiz", confidence: 0.9, candidates: [{ id: "c1", label: "Pilar Ruiz", detail: "Compras · Hornos Hermanos Ruiz", score: 0.9 }] },
    { id: "e4", type: "quantity", phrase: "veinte sacos", value: "20 sacos", confidence: 0.97, candidates: [{ id: "c1", label: "20 sacos (25 kg)", detail: "«veinte» = 20", score: 0.97 }] },
    { id: "e5", type: "product", phrase: "harina de fuerza", value: "Harina de fuerza W380 · 25 kg", confidence: 0.81, candidates: [
      { id: "c1", label: "Harina de fuerza W380 · 25 kg", detail: "La que compran siempre · 21,10 €/saco", score: 0.81 },
      { id: "c2", label: "Harina de fuerza W320 · 25 kg", detail: "19,60 €/saco", score: 0.44 }] },
    { id: "e6", type: "date", phrase: "para el lunes", value: "Lunes 23-11", confidence: 0.9, candidates: [{ id: "c1", label: "Lun 23-11", detail: "«el lunes» = el próximo lunes", score: 0.9 }] },
    { id: "e7", type: "date", phrase: "antes del viernes", value: "Antes del viernes 27-11", confidence: 0.88, candidates: [{ id: "c1", label: "Vie 27-11", detail: "Plazo", score: 0.88 }] },
  ]);
  const a = (n: number) => `${m.id}-a${n}`;
  const actions: Action[] = [
    { id: a(1), noteId: m.id, kind: "order", title: "Pedido de venta", system: "Holded", model: "salesorder", op: "create", state: "proposed", amount: 422, fields: [
      { key: "contact", label: "Cliente", target: "contactId", after: "Hornos Hermanos Ruiz S.L.", source: { entityId: "e1" } },
      { key: "product", label: "Producto", target: "items[].name", after: "Harina de fuerza W380 · 25 kg", source: { entityId: "e5" } },
      { key: "qty", label: "Cantidad", target: "items[].units", after: "20 sacos", source: { entityId: "e4" } },
      { key: "date", label: "Entrega", target: "date", after: "Lun 23-11", source: { entityId: "e6" } },
      { key: "total", label: "Importe", target: "total", after: "422,00 €", source: { inferred: "20 × 21,10 € (tarifa del cliente)" } }] },
    { id: a(2), noteId: m.id, kind: "crm", title: "Tarea: presupuesto del horno", system: "HubSpot", model: "task", op: "create", state: "proposed", fields: [
      { key: "subject", label: "Asunto", target: "hs_task_subject", after: "Enviar presupuesto del horno nuevo a Hornos Hermanos Ruiz", source: { words: words(w, "el presupuesto del horno nuevo") } },
      { key: "due", label: "Vence", target: "hs_timestamp", after: "Jue 26-11", source: { entityId: "e7" } },
      { key: "contact", label: "Contacto", target: "associations.contact", after: "Pilar Ruiz", source: { entityId: "e3" } }] },
    { id: a(3), noteId: m.id, kind: "crm", title: "Nota: incidencia de entrega", system: "HubSpot", model: "note", op: "create", state: "proposed", fields: [
      { key: "body", label: "Texto", target: "hs_note_body", after: "La última entrega llegó a las 12:00 en lugar de a las 8:00.", source: { words: words(w, "la última entrega llegó tarde, a las doce en vez de a las ocho.") } }] },
  ];
  return { id: m.id, number: m.number, authorId: "u-marta", channel: "whatsapp", recordedAt: m.recordedAt, durationSec: spokenSeconds(w), langs: ["es"],
    customer: "Hornos Hermanos Ruiz", place: "Valencia", summary: "20 sacos de harina para el lunes, presupuesto del horno y queja de entrega.", state: "ready",
    transcript: { schema: "transcript.v1", words: w, model: "whisper-large-v3-turbo (simulado)" }, entities: ents, actions, approvals: [] };
}

/** Luis, compressors. Includes a quote above the double-approval threshold. */
function talleresPerez(m: Meta): Note {
  const w = speak([{ lang: "es", text: "Soy Luis. Salgo de Talleres Pérez e Hijos, en Getafe. Revisé el compresor dos, el Atlas Copco GA22: pierde aceite por la junta de la tapa. Hay que pedir la junta de cuarenta y cinco por sesenta y dos, la JF-4562, y volver el jueves por la mañana. Fueron dos horas y media hora de desplazamiento. Y quieren presupuesto para cambiar el secador, unos cuatro mil doscientos euros." }]);
  const ents = entities(w, [
    { id: "e1", type: "customer", phrase: "Talleres Pérez e Hijos", value: "Talleres Pérez e Hijos S.L.", confidence: 0.95, candidates: [{ id: "c1", label: "Talleres Pérez e Hijos S.L.", detail: "Getafe · res.partner 0877", score: 0.95 }] },
    { id: "e2", type: "address", phrase: "Getafe", value: "Getafe (Madrid)", confidence: 0.97, candidates: [{ id: "c1", label: "Getafe", detail: "Madrid", score: 0.97 }] },
    { id: "e3", type: "asset", phrase: "el compresor dos, el Atlas Copco GA22", value: "Compresor 2 · Atlas Copco GA22", confidence: 0.91, candidates: [{ id: "c1", label: "Compresor 2 · Atlas Copco GA22", detail: "Equipo 0231", score: 0.91 }] },
    { id: "e4", type: "product", phrase: "la JF-4562", value: "JF-4562 · Junta tapa 45×62", confidence: 0.96, candidates: [{ id: "c1", label: "JF-4562 · Junta tapa 45×62", detail: "Suministros Frío Norte · 12,75 €", score: 0.96 }] },
    { id: "e5", type: "date", phrase: "el jueves por la mañana", value: "Jueves 26-11, 09:00–11:00", confidence: 0.9, candidates: [{ id: "c1", label: "Jue 26-11 · 09:00–11:00", detail: "Franja de mañana", score: 0.9 }] },
    { id: "e6", type: "duration", phrase: "dos horas", value: "2 h", confidence: 0.95, candidates: [{ id: "c1", label: "2 h", detail: "+ 0,5 h de desplazamiento", score: 0.95 }] },
    { id: "e7", type: "quantity", phrase: "cuatro mil doscientos euros", value: "4.200 €", confidence: 0.93, candidates: [{ id: "c1", label: "4.200,00 €", detail: "Importe orientativo", score: 0.93 }] },
  ]);
  const a = (n: number) => `${m.id}-a${n}`;
  const actions: Action[] = [
    { id: a(1), noteId: m.id, kind: "report", title: "Parte de trabajo", system: "Odoo", model: "project.task", op: "create", state: "proposed", fields: [
      { key: "partner", label: "Cliente", target: "partner_id", after: "Talleres Pérez e Hijos S.L.", source: { entityId: "e1" } },
      { key: "equipment", label: "Equipo", target: "x_equipment_id", after: "Compresor 2 · Atlas Copco GA22", source: { entityId: "e3" } },
      { key: "work", label: "Trabajo realizado", target: "description", after: "Revisión: fuga de aceite por la junta de la tapa.", source: { words: words(w, "pierde aceite por la junta de la tapa.") } },
      { key: "hours", label: "Horas", target: "timesheet_ids.unit_amount", after: "2 h + 0,5 h desplazamiento", source: { entityId: "e6" } }] },
    { id: a(2), noteId: m.id, kind: "order", title: "Pedido de compra", system: "Odoo", model: "purchase.order", op: "create", state: "proposed", amount: 12.75, fields: [
      { key: "product", label: "Producto", target: "order_line.product_id", after: "JF-4562 · Junta tapa 45×62", source: { entityId: "e4" }, mono: true },
      { key: "qty", label: "Cantidad", target: "order_line.product_qty", after: "1 ud.", source: { inferred: "Sin cantidad en la nota: 1" } }] },
    { id: a(3), noteId: m.id, kind: "visit", title: "Visita para montar la junta", system: "Google Calendar", model: "event", op: "create", state: "proposed", fields: [
      { key: "when", label: "Cuándo", target: "start / end", after: "Jue 26-11 · 09:00–11:00", source: { entityId: "e5" } },
      { key: "where", label: "Dónde", target: "location", after: "Talleres Pérez e Hijos · Getafe", source: { entityId: "e2" } }] },
    { id: a(4), noteId: m.id, kind: "crm", title: "Presupuesto: secador nuevo", system: "Odoo", model: "sale.order", op: "create", state: "proposed", amount: 4200, fields: [
      { key: "partner", label: "Cliente", target: "partner_id", after: "Talleres Pérez e Hijos S.L.", source: { entityId: "e1" } },
      { key: "line", label: "Concepto", target: "order_line.name", after: "Sustitución del secador de aire", source: { words: words(w, "cambiar el secador,") } },
      { key: "amount", label: "Importe", target: "amount_total", after: "4.200,00 €", source: { entityId: "e7" } }] },
  ];
  return { id: m.id, number: m.number, authorId: "u-luis", channel: "app", recordedAt: m.recordedAt, durationSec: spokenSeconds(w), langs: ["es"],
    customer: "Talleres Pérez e Hijos", place: "Getafe", summary: "Fuga en el compresor 2, pedir junta JF-4562, volver el jueves y presupuesto del secador.", state: "ready",
    transcript: { schema: "transcript.v1", words: w, model: "whisper-large-v3-turbo (simulado)" }, entities: ents, actions, approvals: [] };
}

export const SCENARIOS: Record<ScenarioId, { label: string; lang: string; build: (m: Meta) => Note }> = {
  "javier-cantabrico": { label: "Javier · Conservas del Cantábrico", lang: "Castellano", build: javierCantabrico },
  "talleres-perez": { label: "Luis · Talleres Pérez", lang: "Castellano", build: talleresPerez },
  "marta-hornos": { label: "Marta · Hornos Hermanos Ruiz", lang: "Castellano", build: martaHornos },
};
