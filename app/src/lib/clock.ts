/** The mock's "now": Thursday 19 Nov 2026, 11:40 in Madrid. Every fixture time is relative to it. */
export const MOCK_NOW = Date.parse("2026-11-19T10:40:00Z");

export const clockNow = () => new Date(MOCK_NOW);
