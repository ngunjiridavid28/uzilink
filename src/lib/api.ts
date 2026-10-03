const API_BASE = "/api";

/**
 * Read current token
 */
export function getToken(): string | null {
  return localStorage.getItem("uzilink_token");
}

/**
 * Write token
 */
export function setToken(token: string) {
  localStorage.setItem("uzilink_token", token);
}

/**
 * Remove token on signout
 */
export function removeToken() {
  localStorage.removeItem("uzilink_token");
}

/**
 * Simple authenticated API fetch client wrapper
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.message || `Request failed with code ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Authentication
  register: (body: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  signup: (body: any) => request<any>("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getProfile: () => request<any>("/auth/profile"),
  verifyAccount: () => request<any>("/auth/verify", { method: "POST" }),
  forgotPassword: (email: string) => request<any>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  // Listings
  getListings: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== "") query.set(key, String(val));
    });
    const queryString = query.toString();
    return request<any>(`/listings${queryString ? `?${queryString}` : ""}`);
  },
  getListing: (id: string) => request<any>(`/listings/${id}`),
  createListing: (body: any) => request<any>("/listings", { method: "POST", body: JSON.stringify(body) }),
  updateListing: (id: string, body: any) => request<any>(`/listings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteListing: (id: string) => request<any>(`/listings/${id}`, { method: "DELETE" }),
  requestQuotation: (body: any) => request<any>("/listings/quotation", { method: "POST", body: JSON.stringify(body) }),
  getBids: () => request<any>("/listings/bids"),
  updateBidStatus: (id: string, status: string) => request<any>(`/listings/bids/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Messaging
  getThreads: () => request<any>("/messages/threads"),
  getThread: (partnerId: string) => request<any>(`/messages/thread/${partnerId}`),
  sendMessage: (body: { receiverId: string; content: string; listingId?: string }) => 
    request<any>("/messages", { method: "POST", body: JSON.stringify(body) }),

  // Notifications
  getNotifications: () => request<any>("/notifications"),
  markNotificationsAsRead: () => request<any>("/notifications/read", { method: "POST" }),

  // Administration
  getAdminUsers: () => request<any>("/admin/users"),
  approveUser: (id: string, status: string) => request<any>(`/admin/users/approve/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  moderateListing: (id: string) => request<any>(`/admin/listings/moderate/${id}`, { method: "DELETE" }),
  getAnalytics: () => request<any>("/admin/analytics")
};
