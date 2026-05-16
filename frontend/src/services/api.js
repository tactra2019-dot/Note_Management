import API_BASE_URL, { SOCKET_URL } from '../config/api.js';

export { API_BASE_URL };
export const WS_URL = SOCKET_URL;

const readErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.message || `Request failed with ${response.status}`;
  } catch {
    return `Server Error ${response.status}: ${response.statusText}`;
  }
};

export const getAuthToken = () => localStorage.getItem('token');

export const apiRequest = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || getAuthToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) return null;
  return response.json();
};

export const uploadRequest = async (endpoint, formData, method = 'POST', token = null) => {
  const headers = {};
  const authToken = token || getAuthToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json();
};

export const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${API_BASE_URL}${path}`;
};
