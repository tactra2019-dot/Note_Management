const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = configuredApiUrl
  ? trimTrailingSlash(configuredApiUrl)
  : 'http://localhost:5000';

export const SOCKET_URL = API_BASE_URL;

export default API_BASE_URL;
