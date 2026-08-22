const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '로그인 실패');
  localStorage.setItem('admin_token', data.data.token);
  return data;
}

export async function fetchMerchants() {
  const res = await fetch(`${API_BASE}/api/admin/merchants`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '가맹점 조회 실패');
  return data.data ?? [];
}

export async function approveMerchant(id: string, action: 'APPROVE' | 'REJECT', promotionId?: string) {
  const res = await fetch(`${API_BASE}/api/admin/merchants/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, promotion_id: promotionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '처리 실패');
  return data;
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/admin/coupons/stats`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '통계 조회 실패');
  return data.data;
}

export async function fetchBudget() {
  const res = await fetch(`${API_BASE}/api/admin/budget`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '예산 조회 실패');
  return data.data ?? [];
}

export async function fetchAdminFestivals() {
  const res = await fetch(`${API_BASE}/api/admin/festivals`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '수동 축제 조회 실패');
  return data.data ?? [];
}

export async function saveAdminFestival(payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/admin/festivals`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '축제 저장 실패');
  return data;
}

export async function deleteAdminFestival(contentId: string) {
  const res = await fetch(`${API_BASE}/api/admin/festivals/${encodeURIComponent(contentId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '축제 삭제 실패');
  return data;
}

export function logout() {
  localStorage.removeItem('admin_token');
}
