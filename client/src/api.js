const TOKEN_KEY = 'tradex.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the TradeX server. Check that it is running.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('tradex:unauthorized'));
    throw new Error(data.error || `Request failed (${res.status}).`);
  }
  return data;
}

const qs = (o) => new URLSearchParams(o).toString();

export const api = {
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  me: () => request('/auth/me'),
  updateMe: (b) => request('/auth/me', { method: 'PATCH', body: b }),
  summary: (base) => request(`/portfolio/summary${base ? `?base=${encodeURIComponent(base)}` : ''}`),
  buy: (b) => request('/holdings', { method: 'POST', body: b }),
  sell: (id, quantity) => request(`/holdings/${id}/sell`, { method: 'POST', body: { quantity } }),
  edit: (id, b) => request(`/holdings/${id}`, { method: 'PUT', body: b }),
  remove: (id) => request(`/holdings/${id}`, { method: 'DELETE' }),
  search: (q) => request(`/market/search?${qs({ q })}`),
  quotes: (symbols, base) => request(`/market/quotes?${qs({ symbols: symbols.join(','), ...(base && { base }) })}`),
  convert: (from, to, amount = 1) => request(`/market/convert?${qs({ from, to, amount })}`),
  ticker: () => request('/market/ticker'),
  history: (symbol, range) => request(`/market/history?${qs({ symbol, range })}`),
};
