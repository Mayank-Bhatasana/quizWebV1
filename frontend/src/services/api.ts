const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

type ApiOptions = {
  method?: string;
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }

  return (await response.json()) as T;
}
