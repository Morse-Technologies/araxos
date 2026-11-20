/**
 * UI strings in Castilian Spanish (ADR-F29). Every visible string of the console and the phone screens lives here.
 * To add English, copy this file to `en.ts` with the same shape (`Labels`) and pick it in `index.ts`.
 * Galician and Catalan UI follow the same pattern (ADR-F21). Sample transcripts stay in their own language.
 */
export const es = {
  app: { name: "Field", full: "Araxos Field", tagline: "Hablas al salir de la visita y tu sistema queda actualizado." },
  nav: {
    queue: "Bandeja", history: "Historial", admin: "Administración", mobile: "App móvil", search: "Buscar",
    searchHint: "Busca una nota o salta a una pantalla", palette: "Buscar o ejecutar", nothing: "Nada coincide.",
    groups: { notes: "Notas", screens: "Pantallas", actions: "Acciones" },
  },
  theme: { toLight: "Cambiar a tema claro", toDark: "Cambiar a tema oscuro", light: "Claro", dark: "Oscuro", system: "Sistema" },
  states: {
    recording: "Grabando", draft: "Borrador", needs_answer: "Falta una respuesta", ready: "Lista para aprobar",
    awaiting_second: "Falta la segunda firma", applied: "Aplicada", rejected: "Rechazada", failed: "Fallida",
  },
  kinds: { report: "Parte", order: "Pedido", visit: "Cita", crm: "CRM" },
  entities: { customer: "Cliente", product: "Producto", asset: "Equipo", date: "Fecha", duration: "Duración", person: "Persona", address: "Lugar", quantity: "Cantidad" },
  langs: { es: "castellano", gl: "gallego", ca: "catalán" },
  channels: { app: "App", whatsapp: "WhatsApp" },
  roles: { field: "Técnico o comercial", approver: "Aprobación", approver_senior: "Segunda firma", admin: "Administración", auditor: "Auditoría" },
  queue: {
    title: "Bandeja", empty: "No queda nada por aprobar.", emptyHint: "Las notas nuevas aparecerán aquí en cuanto lleguen.",
    pick: "Elige una nota de la bandeja.", count: (n: number) => (n === 1 ? "1 nota" : `${n} notas`),
    questions: (n: number) => (n === 1 ? "1 pregunta" : `${n} preguntas`), conflicts: "Conflicto", double: "Doble firma",
  },
  detail: {
    said: "Lo que se dijo", proposed: "Lo que se propone", willChange: "Lo que cambiará",
    audioNote: "El audio no se guarda: solo la transcripción.", language: "Idiomas", duration: "Duración", channel: "Canal",
    from: "De", inferred: "Deducido", edited: "Editado", source: "Origen", clickToEdit: "Pulsa para editar",
    save: "Guardar", cancel: "Cancelar", fullDiff: "Ver diff completo", noPreview: "Sin cambios que mostrar.",
    newRecord: "Registro nuevo", now: "Ahora", after: "Después", field: "Campo",
    computed: (t: string) => `Calculado contra el sistema a las ${t}`, back: "Volver a la nota",
    alternatives: "Alternativas", rememberAlias: (who: string) => `Recordar como alias para ${who}`, choose: "Usar esta",
    confidence: { high: "Seguro", medium: "Probable", low: "Dudoso" },
    question: "Pregunta", conflict: "Conflicto de agenda", resolved: "Resuelto",
  },
  approve: {
    approve: "Aprobar", reject: "Rechazar", undo: "Deshacer", hold: "Mantén para firmar",
    willCreate: (parts: string) => `Creará ${parts}`, blockedQuestion: "Responde la pregunta para poder aprobar.",
    blockedConflict: "Resuelve el conflicto de agenda para poder aprobar.",
    secondSignature: (who: string) => `Firmada por ${who}. Falta la segunda firma (más de 3.000 €).`,
    signAs: (who: string) => `Firmar como ${who} (demostración)`,
    applied: (n: string) => `Nota ${n} aplicada`, appliedIn: (s: string) => `Aplicado · ${s}`,
    rejected: (n: string) => `Nota ${n} rechazada`, firstSigned: "Primera firma registrada",
    rejectTitle: "Rechazar la nota", rejectReason: "Motivo (lo verá quien la grabó)", rejectPlaceholder: "Por ejemplo: duplicada, el cliente no es este…",
    stamp: "Aplicado",
  },
  keys: { title: "Atajos", move: "Mover", approve: "Aprobar", edit: "Editar", reject: "Rechazar", search: "Buscar", palette: "Paleta" },
  history: {
    title: "Historial", notes: "Notas", audit: "Auditoría", empty: "Todavía no hay notas cerradas.",
    verify: "Verificar la cadena", verified: (n: number) => `Cadena íntegra: ${n} eventos comprobados.`, broken: (n: number) => `La cadena se rompe en el evento ${n}.`,
    chainNote: "Cada evento enlaza el anterior con un hash (en el servidor, SHA-256 con anclas Ed25519).",
    cols: { when: "Cuándo", who: "Quién", event: "Evento", subject: "Nota", detail: "Detalle", hash: "Hash" },
    reason: "Motivo",
  },
  admin: {
    title: "Administración", connectors: "Conectores", actions: "Tipos de acción", vocabulary: "Vocabulario", users: "Personas", settings: "Ajustes",
    sync: "Sincronizar", synced: (n: string) => `${n} sincronizado`, lastSync: "Última sincronización", status: { connected: "Conectado", degraded: "Revisar", off: "Apagado" },
    families: "Acciones", mirrors: "Espejo para el anclaje", configure: "Configurar",
    schemaVersion: (v: number) => `v${v}`, policy: { review: "Revisión", auto: "Automática", double: "Doble firma" }, mapsTo: "Se escribe en", required: "Obligatorio", optional: "Opcional",
    mappings: "Destinos", field: "Campo", type: "Tipo",
    aliasAdd: "Añadir alias", aliasPlaceholder: "Cómo lo dice la gente", learned: "Aprendido de una corrección", remove: "Quitar", term: "Término", aliases: "Alias",
    usersCols: { name: "Nombre", role: "Rol", team: "Equipo", langs: "Idiomas", phone: "Teléfono", devices: "Dispositivos" },
  },
  settings: {
    appearance: "Apariencia", theme: "Tema", transparency: "Reducir transparencia", transparencyHint: "Superficies sólidas en lugar de vidrio. También se activa si el sistema lo pide.",
    sun: "Modo sol", sunHint: "Alto contraste y sin vidrio, para leer a pleno sol.", motion: "Movimiento", motionHint: "Se reduce solo si el sistema lo pide (preferencia de accesibilidad).",
    motionSystemReduced: "El sistema pide menos movimiento: solo fundidos.", motionFull: "Movimiento completo.",
    language: "Idioma de la interfaz", languageSoon: "La interfaz está en castellano. Inglés, gallego y catalán se añadirán con el mismo fichero de textos.",
    voiceLangs: "Idiomas de las notas de voz", voiceLangsHint: "Field entiende notas en castellano y, además, en gallego y catalán.",
    uiLangs: { es: "Castellano", en: "English (próximamente)", gl: "Galego (próximamente)", ca: "Català (próximamente)" }, policy: "Política de aprobación",
    doubleAbove: (v: string) => `Doble firma por encima de ${v}`, undoWindow: (s: number) => `Ventana para deshacer: ${s} s`,
    refraction: "Refracción del vidrio", refractionOn: "Activa (Chromium).", refractionOff: "No disponible en este navegador: vidrio sin refracción.",
  },
  mobile: {
    frameCaption: "Prototipo web de la app de Field. La app nativa (KMP) llegará después con estas mismas pantallas.",
    hello: (n: string) => `Hola, ${n}`, today: "Hoy", record: "Grabar nota", recordHint: "Mantén pulsado o toca para empezar",
    tabs: { home: "Inicio", record: "Grabar", history: "Notas", car: "Coche" },
    recent: "Tus últimas notas", seeAll: "Ver todas",
    scenario: "Escenario de demostración", listening: "Escuchando…", stop: "Terminar", cancel: "Cancelar", start: "Empezar a grabar",
    micReal: "Micrófono", micFallback: "Sin micrófono: onda simulada", micAsk: "Pide permiso al empezar",
    understanding: "Entendiendo la nota…", understandingSteps: ["Transcribiendo", "Buscando clientes y productos", "Preparando acciones"],
    review: "Revisa antes de enviar", send: "Enviar a la oficina", sent: "Enviada a la oficina", discard: "Descartar",
    tapEntity: "Toca una palabra subrayada para corregirla.", answer: "Responde", alternatives: "¿Qué querías decir?",
    car: { title: "Modo coche", ready: "Toca para grabar", recording: "Grabando · toca para terminar", lastNote: "Última nota", readBack: "Field te lo leerá en voz alta y responderás «sí» o «no».", exit: "Salir del modo coche", sent: "Nota enviada" },
    historyTitle: "Tus notas", noteNo: (n: string) => `Nota ${n}`,
  },
  common: { loading: "Cargando…", error: "Algo ha fallado.", retry: "Reintentar", close: "Cerrar", demo: "Demostración", seconds: (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` },
} as const;

export type Labels = typeof es;
