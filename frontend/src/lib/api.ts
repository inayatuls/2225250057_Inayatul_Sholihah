import { useAuth } from './auth';
import type { AuthResponse } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

/** Minta access token baru memakai cookie refresh. Dipanggil sekali walau ada banyak permintaan. */
export function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = (await res.json()) as AuthResponse;
        useAuth.getState().setSession(data.access_token, data.user);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function send(path: string, method: string, body?: unknown): Promise<Response> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Tidak ada koneksi internet. Periksa jaringanmu, lalu coba lagi.', 'OFFLINE', 0);
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res = await send(path, method, body);
  if (res.status === 401 && useAuth.getState().token && !path.startsWith('/auth/')) {
    if (await tryRefresh()) res = await send(path, method, body);
    else useAuth.getState().clear();
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { detail?: { code?: string; message?: string } } | null;
    throw new ApiError(
      data?.detail?.message ?? 'Terjadi kesalahan. Coba lagi sebentar lagi.',
      data?.detail?.code ?? 'UNKNOWN',
      res.status,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body),
  del: <T>(path: string) => request<T>(path, 'DELETE'),
};

/** Unduh file (mis. CSV) dengan header otorisasi. */
export async function download(path: string, filename: string): Promise<void> {
  let res = await send(path, 'GET');
  if (res.status === 401 && (await tryRefresh())) res = await send(path, 'GET');
  if (!res.ok) throw new ApiError('Gagal mengunduh file.', 'DOWNLOAD_FAILED', res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** UUID v4 yang juga berjalan di http (crypto.randomUUID hanya tersedia di HTTPS/localhost). */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Terjadi kesalahan.';
}
