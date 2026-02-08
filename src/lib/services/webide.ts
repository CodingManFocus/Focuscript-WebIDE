import { apiGetJson, apiGetText, apiPostJson } from '$lib/api';

export type StatusInfo = {
  pluginVersion: string;
  loadedModules: number;
  bind: string;
  port: number;
};

export type Workspace = {
  id: string;
  loaded: boolean;
};

export type JobInfo = {
  status: 'queued' | 'running' | 'success' | 'error';
  message: string;
};

export type ApiClass = {
  name: string;
  kind: string;
  fields?: string[];
  methods?: string[];
};

export async function getStatus(token: string): Promise<StatusInfo> {
  return await apiGetJson<StatusInfo>('/status', token);
}

export async function getWorkspaces(token: string): Promise<Workspace[]> {
  return await apiGetJson<Workspace[]>('/workspaces', token);
}

export async function getFiles(token: string, ws: string): Promise<string[]> {
  return await apiGetJson<string[]>('/files', token, { ws });
}

export async function readFile(token: string, ws: string, path: string): Promise<string> {
  return await apiGetText('/file', token, { ws, path });
}

export async function writeFile(token: string, ws: string, path: string, body: string): Promise<any> {
  return await apiPostJson('/file', token, { ws, path }, body);
}

export async function newFile(token: string, ws: string, path: string): Promise<any> {
  return await apiPostJson('/newFile', token, { ws, path }, '');
}

export async function newWorkspace(
  token: string,
  args: { id: string; name: string; version: string; load: 'enable' | 'disable' }
): Promise<{ id: string }> {
  return await apiPostJson<{ id: string }>('/newWorkspace', token, args, '');
}

export async function reloadWorkspace(token: string, ws: string): Promise<{ jobId: string }> {
  return await apiPostJson<{ jobId: string }>('/reload', token, { ws }, '');
}

export async function reloadAll(token: string): Promise<{ jobId: string }> {
  return await apiPostJson<{ jobId: string }>('/reloadAll', token, {}, '');
}

export async function getJob(token: string, id: string | number): Promise<JobInfo> {
  return await apiGetJson<JobInfo>('/job', token, { id });
}

export async function getApiIndex(token: string): Promise<ApiClass[]> {
  return await apiGetJson<ApiClass[]>('/apiIndex', token);
}
