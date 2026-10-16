let csrfToken = "";
export const setCsrf = (value: string | null) => {
  csrfToken = value || "";
};
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        "X-Gtech-Request": "1",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach Gtech. Check your connection and make sure the API server is running.",
      0,
    );
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json"))
    throw new ApiError(
      "The API is unavailable. Start the full application with npm run dev.",
      503,
    );
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      result.error || "Something went wrong. Please try again.",
      response.status,
    );
  return result as T;
}
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
export const put = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const patch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const remove = (path: string) =>
  api<{ success: boolean }>(path, { method: "DELETE" });
export function uploadFile<T>(
  file: File,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/uploads");
    xhr.timeout = 10 * 60 * 1000;
    xhr.setRequestHeader("X-Gtech-Request", "1");
    xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () =>
      reject(
        new Error("The upload connection was interrupted. Please try again."),
      );
    xhr.ontimeout = () =>
      reject(
        new Error(
          "The upload timed out. Try a smaller file or a faster connection.",
        ),
      );
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 400)
          reject(new Error(result.error || "Upload failed."));
        else resolve(result as T);
      } catch {
        reject(new Error("Unexpected upload response. Please try again."));
      }
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
