import { mockApi } from "./mock";
import type { AraxosApi } from "./types";

export * from "./types";
export { MOCK_STORAGE_KEY, reloadFromStorage, resetMock } from "./mock";

/** The only API the screens use. Swap `mockApi` for the HTTP client (same `AraxosApi` shape) when the server lands. */
export const api: AraxosApi = mockApi;
