// Dynamically resolve backend API base URL based on current window hostname (e.g. localhost or 192.168.0.59)
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:5001`;
  }
  return 'http://localhost:5001';
};

export const API_BASE_URL = getApiBaseUrl();

export const getFileUrl = (fileUrl?: string): string => {
  if (!fileUrl) return '#';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const base = getApiBaseUrl();
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${base}${path}`;
};
