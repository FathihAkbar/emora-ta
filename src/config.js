// ============================================================
//  API CONFIGURATION
//  Change the values below when connecting to the real backend.
// ============================================================

// Your FastAPI backend address.
//   ""                              -> same-origin (frontend served by the same FastAPI app)
//   "https://api.deteksiemosi.com"  -> backend on a separate VM/domain
export const API_BASE_URL = "https://api.deteksiemosi.com";

// When true, the app uses dummy data (never calls the backend).
// Useful for viewing the UI without a backend.
// Set to false once you're ready to use the real backend.
export const USE_MOCK = false;
