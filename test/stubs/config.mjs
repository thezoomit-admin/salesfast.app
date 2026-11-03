// API base URL is set per test (a local HTTP server).
export let API_BASE_URL = 'http://127.0.0.1:1/api';
export function setApiBaseUrl(url) {
  API_BASE_URL = url;
}
