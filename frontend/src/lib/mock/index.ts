export { handleMockRequest } from "./handler";
export { MOCK_TOKEN, resetMockStore } from "./store";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
