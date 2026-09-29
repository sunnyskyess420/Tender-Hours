// Small JSON fetch helper shared by the tools components.
// (Mirrors the local `api()` helper in the main page.)

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}
