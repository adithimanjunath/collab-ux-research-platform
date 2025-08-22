const API_BASE = (() => {
  const host = window.location.hostname;
  // Local dev (React runs on 3000/5173 etc., Flask on 5050)
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5050';
  // Otherwise, same origin as the deployed site (no env needed)
  return `${window.location.protocol}//${window.location.host}`;
})();

export async function analyzeUX({ mode, file, text }) {
  const form = new FormData();
  if (mode === 'upload') form.append('file', file);
  else form.append('text', text);

  const res = await fetch(`${API_BASE}/api/ux/analyze`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}
