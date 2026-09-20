export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || "Đã có lỗi xảy ra.", response.status);
  return data as T;
}

