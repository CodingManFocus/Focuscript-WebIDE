import { get, writable } from 'svelte/store';

export type ApiParams = Record<string, string | number | boolean | null | undefined>;

const STORAGE_BASE_URL = 'focuscript_webide_baseUrl_v1';

function getDefaultBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/\/+$/, '');
}

function stripApiSuffix(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  if (/\/api$/i.test(trimmed)) return trimmed.slice(0, -4);
  return trimmed;
}

export function normalizeBaseUrl(value: string): string {
  const raw = stripApiSuffix((value || '').trim());
  if (!raw) return getDefaultBaseUrl();
  return raw;
}

function safeReadBaseUrl(): string {
  if (typeof localStorage === 'undefined') return getDefaultBaseUrl();
  const stored = localStorage.getItem(STORAGE_BASE_URL);
  if (stored === null) return getDefaultBaseUrl();
  return normalizeBaseUrl(stored);
}

export const baseUrl = writable<string>(safeReadBaseUrl());

baseUrl.subscribe((base) => {
  try {
    localStorage.setItem(STORAGE_BASE_URL, normalizeBaseUrl(base));
  } catch {
    // ignore
  }
});

export function defaultBaseUrl(): string {
  return getDefaultBaseUrl();
}

export function setBaseUrl(base: string): void {
  baseUrl.set(normalizeBaseUrl(base));
}

export function resetBaseUrl(): void {
  baseUrl.set(getDefaultBaseUrl());
}

function getBaseUrl(): string {
  return normalizeBaseUrl(get(baseUrl));
}

function joinApiRoot(base: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean ? `${clean}/api` : '/api';
}

function normalizeParams(params: ApiParams = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}

export function apiUrl(path: string, token: string, params: ApiParams = {}): string {
  const apiRoot = joinApiRoot(getBaseUrl());
  const cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;
  const p = normalizeParams(params);
  if (token && !("token" in p)) p.token = token;
  const qs = new URLSearchParams(p);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return `${apiRoot}${cleanPath}${suffix}`;
}

export async function apiGetJson<T>(
  path: string,
  token: string,
  params: ApiParams = {},
  fetchFn: typeof fetch = fetch
): Promise<T> {
  const res = await fetchFn(apiUrl(path, token, params));
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export async function apiGetText(
  path: string,
  token: string,
  params: ApiParams = {},
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const res = await fetchFn(apiUrl(path, token, params));
  if (!res.ok) throw new Error(await res.text());
  return await res.text();
}

export async function apiPostJson<T>(
  path: string,
  token: string,
  params: ApiParams = {},
  bodyText: string = '',
  fetchFn: typeof fetch = fetch
): Promise<T> {
  const res = await fetchFn(apiUrl(path, token, params), {
    method: 'POST',
    body: bodyText
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}
