/**
 * ──────────────────────────────────────────────────────────────────────────────
 * API CONFIGURATION
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO CHANGE THE BACKEND URL:
 *   - Development : Set VITE_API_URL in frontend/.env
 *   - Production  : Set VITE_API_URL as an environment variable on your
 *                   deployment platform (Render / Vercel / Netlify etc.)
 *
 * Example .env:
 *   VITE_API_URL=https://srf-startupfinaledition-backend.onrender.com
 *
 * Never hardcode a URL inside components — always import from this file.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── Base URL ─────────────────────────────────────────────────────────────────

/**
 * Resolves the backend base URL.
 * Priority: VITE_API_URL env var → localhost fallback (dev only)
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // Strip any trailing slash so callers can safely append /api/...
    return envUrl.replace(/\/$/, '');
  }

  // Warn during development if the env var is missing
  if (import.meta.env.DEV) {
    console.warn(
      '[API Config] VITE_API_URL is not set. ' +
        'Falling back to http://localhost:5001. ' +
        'Create a frontend/.env file with VITE_API_URL to suppress this warning.'
    );
  }

  return 'http://localhost:5001';
};

/** Singleton base URL used across the entire app */
export const API_BASE_URL = getApiBaseUrl();

// ─── File URL Helper ──────────────────────────────────────────────────────────

/**
 * Converts a relative file path returned by the backend (e.g. "/uploads/abc.pdf")
 * into a fully-qualified URL. Absolute URLs (http / https) are returned as-is.
 */
export const getFileUrl = (fileUrl?: string): string => {
  if (!fileUrl) return '#';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const base = getApiBaseUrl();
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${base}${path}`;
};

// ─── Error Types ──────────────────────────────────────────────────────────────

export interface ApiError {
  type: 'ApiError';
  status: number;
  message: string;
  data?: any;
}

export interface NetworkError {
  type: 'NetworkError';
  message: string;
}

export type AppError = ApiError | NetworkError;

const createApiError = (status: number, message: string, data?: any): ApiError => ({
  type: 'ApiError',
  status,
  message,
  data,
});

const createNetworkError = (message = 'Network request failed. Please check your connection.'): NetworkError => ({
  type: 'NetworkError',
  message,
});

/** Type guard — true when err is a structured ApiError */
export const isApiError = (err: unknown): err is ApiError =>
  typeof err === 'object' && err !== null && (err as any).type === 'ApiError';

/** Type guard — true when err is a NetworkError */
export const isNetworkError = (err: unknown): err is NetworkError =>
  typeof err === 'object' && err !== null && (err as any).type === 'NetworkError';

/** Returns a user-friendly error message from any thrown error */
export const getErrorMessage = (err: unknown): string => {
  if (isApiError(err) || isNetworkError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred. Please try again.';
};

// ─── Centralized API Request Helper ──────────────────────────────────────────

export interface ApiRequestOptions extends RequestInit {
  /** Skip automatic Authorization header injection */
  skipAuth?: boolean;
}

/**
 * Centralized fetch wrapper used by all API calls in this app.
 *
 * Features:
 *  - Automatically injects the JWT token from localStorage
 *  - Sets Content-Type: application/json for non-FormData bodies
 *  - Throws ApiError for non-2xx responses (includes parsed server message)
 *  - Throws NetworkError when the server is unreachable
 *  - Returns the parsed JSON response
 *
 * @example
 *   const data = await apiRequest('/api/editions');
 *   const data = await apiRequest('/api/editions', { method: 'POST', body: JSON.stringify(payload) });
 */
export const apiRequest = async <T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { skipAuth = false, headers: extraHeaders, body, ...restOptions } = options;

  const token = localStorage.getItem('token');

  // Build headers
  const headers: Record<string, string> = {};

  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON bodies (not FormData)
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Merge caller-supplied headers (they take precedence)
  Object.assign(headers, extraHeaders);

  const url = `${API_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { ...restOptions, headers, body });
  } catch (err: any) {
    // fetch() itself threw — server unreachable / CORS / no internet
    console.error(`[API] Network error on ${url}:`, err);
    throw createNetworkError(
      `Cannot reach the server at ${API_BASE_URL}. ` +
        'Please check your internet connection or try again later.'
    );
  }

  // Handle non-2xx responses
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorData: any;

    try {
      errorData = await response.json();
      errorMessage = errorData?.error || errorData?.message || errorMessage;
    } catch {
      // Response body is not JSON
    }

    // Specific user-friendly messages
    if (response.status === 401) {
      errorMessage = 'Your session has expired. Please log in again.';
    } else if (response.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (response.status === 404) {
      errorMessage = errorData?.error || 'The requested resource was not found.';
    } else if (response.status >= 500) {
      errorMessage = errorData?.error || 'A server error occurred. Please try again.';
    }

    console.error(`[API] ${response.status} on ${url}:`, errorMessage);
    throw createApiError(response.status, errorMessage, errorData);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    // Response isn't JSON (shouldn't happen for our API)
    return undefined as T;
  }
};
