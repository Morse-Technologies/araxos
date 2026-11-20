import type { User } from "../types";

/** Fictitious people of the demo tenant «Servicios Técnicos Iberia S.L.» (industrial maintenance and refrigeration, nationwide). */
export const USERS: User[] = [
  { id: "u-carmen", name: "Carmen Ortega", initials: "CO", role: "approver", team: "Oficina técnica", langs: ["es"], devices: 1, active: true },
  { id: "u-rosa", name: "Rosa Méndez", initials: "RM", role: "approver_senior", team: "Dirección", langs: ["es"], devices: 1, active: true },
  { id: "u-daniel", name: "Daniel Soto", initials: "DS", role: "admin", team: "Sistemas", langs: ["es"], devices: 2, active: true },
  { id: "u-javier", name: "Javier Morales", initials: "JM", role: "field", team: "Frío industrial", langs: ["es"], phone: "+34 6•• ••• 412", devices: 1, active: true },
  { id: "u-luis", name: "Luis Herrera", initials: "LH", role: "field", team: "Compresores", langs: ["es"], phone: "+34 6•• ••• 087", devices: 1, active: true },
  { id: "u-lucia", name: "Lucía Navarro", initials: "LN", role: "field", team: "Elevación", langs: ["es", "gl"], phone: "+34 6•• ••• 230", devices: 1, active: true },
  { id: "u-marta", name: "Marta Gil", initials: "MG", role: "field", team: "Comercial Levante", langs: ["es", "ca"], phone: "+34 6•• ••• 951", devices: 1, active: true },
  { id: "u-auditor", name: "Auditoría externa", initials: "AE", role: "auditor", team: "—", langs: ["es"], devices: 0, active: false },
];

export const CONSOLE_ACTOR = "u-carmen";
export const MOBILE_ACTOR = "u-javier";
