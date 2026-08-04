'use strict';

(function () {
  const STORAGE_KEY = 'trivia_supabase_session_v1';

  class LiteError extends Error {
    constructor(message, status = 0, details = null) {
      super(message || 'Error de conexión');
      this.name = 'SupabaseLiteError';
      this.status = status;
      this.details = details;
    }
  }

  function safeJsonParse(value, fallback = null) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function parseResponseError(payload, status) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || `Error ${status}`;
    return new LiteError(message, status, payload);
  }

  function encodeFilterValue(value) {
    if (value === null) return 'null';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    return String(value).replace(/,/g, '\\,');
  }

  function encodeInValues(values) {
    return values.map(value => {
      const text = String(value).replace(/"/g, '\\"');
      return `"${text}"`;
    }).join(',');
  }

  function parseHashOrQuerySession() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const accessToken = hash.get('access_token') || query.get('access_token');
    const refreshToken = hash.get('refresh_token') || query.get('refresh_token');
    const expiresIn = Number(hash.get('expires_in') || query.get('expires_in') || 3600);
    const type = hash.get('type') || query.get('type');
    if (!accessToken) return null;
    return {
      session: {
        access_token: accessToken,
        refresh_token: refreshToken || '',
        expires_in: expiresIn,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        token_type: 'bearer',
        user: null
      },
      type
    };
  }

  class QueryBuilder {
    constructor(client, table) {
      this.client = client;
      this.table = table;
      this.method = 'GET';
      this.columns = '*';
      this.body = undefined;
      this.filters = [];
      this.orders = [];
      this.limitValue = null;
      this.countMode = null;
      this.headOnly = false;
      this.resultMode = 'many';
    }

    select(columns = '*', options = {}) {
      this.columns = columns || '*';
      this.countMode = options.count || null;
      this.headOnly = Boolean(options.head);
      return this;
    }

    insert(payload) {
      this.method = 'POST';
      this.body = payload;
      return this;
    }

    update(payload) {
      this.method = 'PATCH';
      this.body = payload;
      return this;
    }

    eq(column, value) { this.filters.push([column, `eq.${encodeFilterValue(value)}`]); return this; }
    gte(column, value) { this.filters.push([column, `gte.${encodeFilterValue(value)}`]); return this; }
    lt(column, value) { this.filters.push([column, `lt.${encodeFilterValue(value)}`]); return this; }
    in(column, values) { this.filters.push([column, `in.(${encodeInValues(values || [])})`]); return this; }

    order(column, options = {}) {
      this.orders.push(`${column}.${options.ascending === false ? 'desc' : 'asc'}`);
      return this;
    }

    limit(value) { this.limitValue = Number(value); return this; }
    single() { this.resultMode = 'single'; return this; }
    maybeSingle() { this.resultMode = 'maybeSingle'; return this; }

    then(resolve, reject) { return this.execute().then(resolve, reject); }

    async execute() {
      try {
        const params = new URLSearchParams();
        if (this.method === 'GET' || this.headOnly) params.set('select', this.columns);
        this.filters.forEach(([column, value]) => params.append(column, value));
        if (this.orders.length) params.set('order', this.orders.join(','));
        if (Number.isFinite(this.limitValue)) params.set('limit', String(this.limitValue));

        const headers = await this.client._headers();
        headers.set('Accept', 'application/json');
        if (this.countMode) headers.set('Prefer', `count=${this.countMode}`);
        if (this.method === 'POST' || this.method === 'PATCH') {
          headers.set('Content-Type', 'application/json');
          headers.set('Prefer', 'return=representation');
        }

        const response = await fetch(`${this.client.url}/rest/v1/${encodeURIComponent(this.table)}?${params.toString()}`, {
          method: this.headOnly ? 'HEAD' : this.method,
          headers,
          body: this.body === undefined ? undefined : JSON.stringify(this.body)
        });

        let payload = null;
        if (!this.headOnly && response.status !== 204) {
          const text = await response.text();
          payload = text ? safeJsonParse(text, text) : null;
        }
        if (!response.ok) return { data: null, error: parseResponseError(payload, response.status), count: null };

        const contentRange = response.headers.get('content-range');
        const count = contentRange?.includes('/') ? Number(contentRange.split('/').pop()) : null;
        let data = payload;
        if (this.resultMode === 'single') {
          if (!Array.isArray(payload) || payload.length !== 1) {
            return { data: null, error: new LiteError('No se encontró un único registro.', response.status), count };
          }
          data = payload[0];
        } else if (this.resultMode === 'maybeSingle') {
          if (Array.isArray(payload) && payload.length > 1) {
            return { data: null, error: new LiteError('Se encontraron múltiples registros.', response.status), count };
          }
          data = Array.isArray(payload) ? (payload[0] || null) : payload;
        }
        return { data, error: null, count };
      } catch (error) {
        return { data: null, error: new LiteError(error?.message || 'No fue posible conectar con Supabase.'), count: null };
      }
    }
  }

  class SupabaseLiteClient {
    constructor(url, publishableKey, options = {}) {
      this.url = String(url).replace(/\/$/, '');
      this.key = publishableKey;
      this.options = options;
      this.listeners = new Set();
      this.session = safeJsonParse(localStorage.getItem(STORAGE_KEY));
      this.auth = {
        signInWithPassword: args => this.signInWithPassword(args),
        signUp: args => this.signUp(args),
        signOut: () => this.signOut(),
        getSession: () => this.getSession(),
        resetPasswordForEmail: (email, opts) => this.resetPasswordForEmail(email, opts),
        updateUser: attrs => this.updateUser(attrs),
        onAuthStateChange: callback => this.onAuthStateChange(callback)
      };
      this._consumeRecoveryLink();
    }

    _storeSession(session) {
      this.session = session || null;
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    }

    _notify(event, session = this.session) {
      this.listeners.forEach(callback => {
        try { callback(event, session); } catch (error) { console.error(error); }
      });
    }

    async _consumeRecoveryLink() {
      const parsed = parseHashOrQuerySession();
      if (!parsed) return;
      this._storeSession(parsed.session);
      try {
        const user = await this._fetchUser(parsed.session.access_token);
        this.session.user = user;
        this._storeSession(this.session);
      } catch (error) {
        console.warn('No se pudo recuperar el usuario del enlace:', error);
      }
      history.replaceState({}, document.title, window.location.pathname);
      queueMicrotask(() => this._notify(parsed.type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN'));
    }

    onAuthStateChange(callback) {
      this.listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => this.listeners.delete(callback) } } };
    }

    async _authRequest(path, { method = 'POST', body, token } = {}) {
      const headers = new Headers({ apikey: this.key, 'Content-Type': 'application/json' });
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await fetch(`${this.url}/auth/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const text = response.status === 204 ? '' : await response.text();
      const payload = text ? safeJsonParse(text, text) : null;
      if (!response.ok) throw parseResponseError(payload, response.status);
      return payload;
    }

    async _fetchUser(token) {
      return this._authRequest('/user', { method: 'GET', token });
    }

    async _refreshSession() {
      if (!this.session?.refresh_token) return this.session;
      try {
        const payload = await this._authRequest('/token?grant_type=refresh_token', {
          body: { refresh_token: this.session.refresh_token }
        });
        const session = {
          ...payload,
          expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600)
        };
        this._storeSession(session);
        this._notify('TOKEN_REFRESHED', session);
        return session;
      } catch (error) {
        this._storeSession(null);
        return null;
      }
    }

    async _validSession() {
      if (!this.session?.access_token) return null;
      const now = Math.floor(Date.now() / 1000);
      if (this.session.expires_at && this.session.expires_at <= now + 30) return this._refreshSession();
      return this.session;
    }

    async _headers() {
      const headers = new Headers({ apikey: this.key });
      const session = await this._validSession();
      if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
      return headers;
    }

    async signInWithPassword({ email, password }) {
      try {
        const payload = await this._authRequest('/token?grant_type=password', { body: { email, password } });
        const session = {
          ...payload,
          expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600)
        };
        this._storeSession(session);
        this._notify('SIGNED_IN', session);
        return { data: { user: payload.user, session }, error: null };
      } catch (error) {
        return { data: { user: null, session: null }, error };
      }
    }

    async signUp({ email, password, options = {} }) {
      try {
        const payload = await this._authRequest('/signup', {
          body: { email, password, data: options.data || {} }
        });
        let session = null;
        if (payload?.access_token) {
          session = {
            ...payload,
            expires_at: Math.floor(Date.now() / 1000) + Number(payload.expires_in || 3600)
          };
          this._storeSession(session);
          this._notify('SIGNED_IN', session);
        }
        return { data: { user: payload?.user || payload, session }, error: null };
      } catch (error) {
        return { data: { user: null, session: null }, error };
      }
    }

    async signOut() {
      const token = this.session?.access_token;
      try {
        if (token) await this._authRequest('/logout', { token });
      } catch (error) {
        console.warn('Cierre remoto no disponible:', error);
      }
      this._storeSession(null);
      this._notify('SIGNED_OUT', null);
      return { error: null };
    }

    async getSession() {
      const session = await this._validSession();
      if (session?.access_token && !session.user) {
        try {
          session.user = await this._fetchUser(session.access_token);
          this._storeSession(session);
        } catch (error) {
          this._storeSession(null);
          return { data: { session: null }, error };
        }
      }
      return { data: { session }, error: null };
    }

    async resetPasswordForEmail(email, options = {}) {
      try {
        const redirectTo = options.redirectTo ? `?redirect_to=${encodeURIComponent(options.redirectTo)}` : '';
        await this._authRequest(`/recover${redirectTo}`, { body: { email } });
        return { data: {}, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }

    async updateUser(attributes) {
      try {
        const session = await this._validSession();
        if (!session?.access_token) throw new LiteError('Debes iniciar sesión.');
        const user = await this._authRequest('/user', { method: 'PUT', token: session.access_token, body: attributes });
        session.user = user;
        this._storeSession(session);
        this._notify('USER_UPDATED', session);
        return { data: { user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }

    from(table) { return new QueryBuilder(this, table); }

    async rpc(functionName, args = {}) {
      try {
        const headers = await this._headers();
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'application/json');
        const response = await fetch(`${this.url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
          method: 'POST', headers, body: JSON.stringify(args || {})
        });
        const text = response.status === 204 ? '' : await response.text();
        const payload = text ? safeJsonParse(text, text) : null;
        if (!response.ok) return { data: null, error: parseResponseError(payload, response.status) };
        return { data: payload, error: null };
      } catch (error) {
        return { data: null, error: new LiteError(error?.message || 'No fue posible conectar con Supabase.') };
      }
    }
  }

  window.createSupabaseLiteClient = function createSupabaseLiteClient(url, publishableKey, options) {
    if (!url || !publishableKey) throw new LiteError('Falta configurar la conexión con Supabase.');
    return new SupabaseLiteClient(url, publishableKey, options);
  };
})();
