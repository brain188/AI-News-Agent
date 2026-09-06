const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  // Declared as a field rather than a constructor parameter property, which
  // `erasableSyntaxOnly` in tsconfig.app.json disallows.
  readonly status: number;

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Fetch JSON from the API, raising ApiError on non-2xx responses. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (cause) {
    // A dead API and a 500 are different problems for the reader, so a
    // network failure gets its own status rather than being flattened.
    throw new ApiError(`Cannot reach the API at ${BASE_URL}`, 0, { cause });
  }

  if (!response.ok) {
    throw new ApiError(`Request failed: ${path}`, response.status);
  }
  return response.json() as Promise<T>;
}

export { BASE_URL };
