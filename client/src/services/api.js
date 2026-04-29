const API_BASE = import.meta.env.VITE_API_BASE === undefined ? "" : import.meta.env.VITE_API_BASE;

export async function fetchJson(url, options = {}) {
  const token = localStorage.getItem('cms-access-token');

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { "Authorization": `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (!response.ok) {
    // If token expired, try refresh (optional enhancement)
    if (response.status === 401 && token) {
      // Could attempt refresh token flow here
      // For now, redirect to login
      window.location.href = '/';
      throw new Error('Session expired. Please login again.');
    }

    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchBibleChapter(book, chapter, version = "kjv") {
  const params = new URLSearchParams({ book, chapter, version });
  return fetchJson(`/api/bible/chapter?${params}`);
}

export async function fetchBibleBooks() {
  return fetchJson("/api/bible/books");
}

export async function fetchDailyDevotional() {
  return fetchJson("/api/bible/daily");
}

export async function fetchDevotionals() {
  return fetchJson("/api/bible/devotionals");
}

export async function fetchBibleGroups() {
  return fetchJson("/api/bible/groups");
}