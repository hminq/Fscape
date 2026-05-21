const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function resolveUrl(path) {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) {
    return path || API_BASE_URL;
  }
  return API_BASE_URL
    ? `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
    : path;
}

function getToken() {
  return localStorage.getItem("token");
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, headers: custom, withAuth = true, ...rest } = options;
  const headers = {
    "ngrok-skip-browser-warning": "true",
    ...(custom || {}),
  };
  const isFormData = body instanceof FormData;

  if (body && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return fetch(resolveUrl(path), {
    method,
    headers,
    body: body && !isFormData ? JSON.stringify(body) : body,
    ...rest,
  });
}

export async function apiJson(path, options = {}) {
  const response = await apiRequest(path, options);
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && options.withAuth !== false) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    const message =
      data && typeof data.message === "string"
        ? data.message
        : "Yêu cầu không thành công. Vui lòng thử lại.";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => apiJson(path),
  post: (path, data) => apiJson(path, { method: "POST", body: data }),
  put: (path, data) => apiJson(path, { method: "PUT", body: data }),
  patch: (path, data) => apiJson(path, { method: "PATCH", body: data }),
  delete: (path) => apiJson(path, { method: "DELETE" }),
};
