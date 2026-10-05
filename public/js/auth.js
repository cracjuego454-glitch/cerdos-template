const Auth = {
  status: null,

  async init() {
    this.status = await fetch('/api/auth/status').then(r => r.json());
    if (!this.status.initialized) return this.showSetup();
    return this.showLogin();
  },

  showSetup() {
    document.getElementById('auth-loading').style.display = 'none';
    document.getElementById('setup-form').style.display = '';
  },

  async showLogin() {
    document.getElementById('auth-loading').style.display = 'none';
    document.getElementById('login-form').style.display = '';
    try {
      const me = await fetch('/api/auth/me');
      if (me.ok) {
        const { farms } = await me.json();
        const f = farms && farms[0];
        const el = document.getElementById('login-farm');
        if (f) el.textContent = f.name;
      }
    } catch (e) { /* sin sesion, se muestra el login normal */ }
  },

  fail(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.style.display = '';
  },

  async submitSetup(e) {
    e.preventDefault();
    const farm = document.getElementById('su-farm').value.trim();
    const location = document.getElementById('su-loc').value.trim();
    const username = document.getElementById('su-user').value.trim();
    const name = document.getElementById('su-name').value.trim();
    const password = document.getElementById('su-pass').value;
    const password2 = document.getElementById('su-pass2').value;

    document.getElementById('su-error').style.display = 'none';
    if (password !== password2) return this.fail('su-error', 'Las contraseñas no coinciden');
    if (password.length < 6) return this.fail('su-error', 'La contraseña debe tener al menos 6 caracteres');

    const r = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_name: farm, farm_location: location, username, password, name })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return this.fail('su-error', data.error || 'No se pudo completar la configuración');

    localStorage.setItem('farm_id', data.user.farm_id);
    location.href = 'index.html';
  },

  async submitLogin(e) {
    e.preventDefault();
    const username = document.getElementById('li-user').value.trim();
    const password = document.getElementById('li-pass').value;

    document.getElementById('li-error').style.display = 'none';
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return this.fail('li-error', data.error || 'No se pudo iniciar sesión');

    if (data.user.role !== 'admin') localStorage.setItem('farm_id', data.user.farm_id);
    location.href = 'index.html';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  document.getElementById('setup-form').addEventListener('submit', e => Auth.submitSetup(e));
  document.getElementById('login-form').addEventListener('submit', e => Auth.submitLogin(e));
});