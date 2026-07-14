let accessToken = null;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;

export async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;

  const buildHeaders = (token) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    // Don't force Content-Type for FormData — the browser needs to set its own boundary
    if (!isFormData) headers["Content-Type"] = "application/json";
    return headers;
  };

  let res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setAccessToken(data.token);

      res = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: buildHeaders(data.token),
        credentials: "include",
      });
    } else {
      setAccessToken(null);
      window.location.href = "/login";
    }
  }

  return res;
}

// Called once when the app loads, to silently restore a session
// using the httpOnly refresh cookie (since accessToken resets on page reload)
export async function restoreSession() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.token);
      return true;
    }
  } catch (err) {
    console.error("Session restore failed", err);
  }
  return false;
}