const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('safespace_access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('safespace_refresh_token');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('safespace_access_token', accessToken);
  localStorage.setItem('safespace_refresh_token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('safespace_access_token');
  localStorage.removeItem('safespace_refresh_token');
}

interface BackendErrorBody {
  message?: string | string[] | { message?: string | string[] };
}

function extractMessage(body: unknown, fallback: string): string {
  const data = body as BackendErrorBody | undefined;
  const raw = data?.message;
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.join(' ');
  if (typeof raw === 'object' && raw.message) {
    return Array.isArray(raw.message) ? raw.message.join(' ') : String(raw.message);
  }
  return fallback;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}, allowRetry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && allowRetry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(res.status, extractMessage(body, `Request failed with status ${res.status}`));
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
