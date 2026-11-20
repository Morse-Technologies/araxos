import { mockApi } from "./mock";
import type { FieldApi } from "./types";

export * from "./types";
export { ApiError, noteTotal, openConflicts, openQuestions, resetMock, setMockActor, setMockLatency } from "./mock";
export { USERS, CONSOLE_ACTOR, MOBILE_ACTOR } from "./fixtures/people";
export { SCENARIOS } from "./fixtures/scenarios";

/** The only API the screens use. Swap `mockApi` for the HTTP client (same `FieldApi` shape) when the Rust server lands. */
export const api: FieldApi = mockApi;
