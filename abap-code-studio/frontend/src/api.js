"""Frontend API Client — TypeScript-style module for connecting to the cloud backend.

This would normally be TypeScript, but we write it as a JS module
that mirrors the API structure for the React frontend.
"""

// ═══════════════════════════════════════════════════════════════
// API CLIENT — Connects React Frontend to Cloud Backend
// ═══════════════════════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('auth_token') || '';
    this.ws = null;
  }

  // ─── AUTH ────────────────────────────────────────────────

  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  async _fetch(path, options = {}) {
    const resp = await fetch(`${API_BASE}${path}`, {
      headers: this._headers(),
      ...options,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `API Error: ${resp.status}`);
    }
    return resp.json();
  }

  // ─── SYSTEMS ─────────────────────────────────────────────

  async listSystems() {
    return this._fetch('/api/systems');
  }

  async registerSystem(data) {
    return this._fetch('/api/systems', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── AI SESSIONS ─────────────────────────────────────────

  async createSession(prompt, targetSystem, modelPreference = 'auto') {
    return this._fetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        target_system: targetSystem,
        model_preference: modelPreference,
      }),
    });
  }

  async getSession(sessionId) {
    return this._fetch(`/api/sessions/${sessionId}`);
  }

  async reviewSession(sessionId, action, comment = null) {
    return this._fetch(`/api/sessions/${sessionId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  }

  // ─── OBJECTS ─────────────────────────────────────────────

  async listObjects(system = null, objectType = null) {
    const params = new URLSearchParams();
    if (system) params.set('system', system);
    if (objectType) params.set('object_type', objectType);
    return this._fetch(`/api/objects?${params}`);
  }

  // ─── AUDIT ───────────────────────────────────────────────

  async getAuditLog(limit = 50) {
    return this._fetch(`/api/audit?limit=${limit}`);
  }

  // ─── AI GENERATION ───────────────────────────────────────

  async generateCode(prompt, targetSystem, model = 'auto') {
    return this._fetch('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        target_system: targetSystem,
        model_preference: model,
      }),
    });
  }

  // ─── WEBSOCKET (Real-time updates) ───────────────────────

  connectWebSocket(onMessage) {
    const wsUrl = API_BASE.replace('http', 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.token,
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connectWebSocket(onMessage), 3000);
    };

    return this.ws;
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── HEALTH ──────────────────────────────────────────────

  async health() {
    return this._fetch('/health');
  }
}

export const api = new APIClient();
export default api;
