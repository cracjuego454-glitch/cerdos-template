const Users = {
  _farms: [],

  async render() {
    const [users, farms] = await Promise.all([
      API.get('/api/users'),
      API.get('/api/farms')
    ]);
    this._farms = farms;
    const farmName = id => (farms.find(f => f.id == id) || {}).name || '—';

    const rows = users.map(u => `
      <tr>
        <td><strong>${u.name || u.username}</strong><br><span style="color:#888;font-size:0.8rem">@${u.username}</span></td>
        <td>${u.role === 'admin' ? '👑 Administrador' : '👷 Trabajador'}</td>
        <td>${u.role === 'admin' ? '<span style="color:#888">Todas</span>' : farmName(u.farm_id)}</td>
        <td>${u.active ? '<span style="color:#2e7d32">Activo</span>' : '<span style="color:#c62828">Inactivo</span>'}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="Users.edit(${u.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="Users.remove(${u.id}, '${u.username}')">🗑️</button>
        </td>
      </tr>`).join('');

    return `
      <div class="card">
        <div class="toolbar">
          <h2>👥 Usuarios</h2>
          <button class="btn btn-primary" onclick="Users.create()">➕ Nuevo usuario</button>
        </div>
        <div class="alert alert-info">
          El <strong>administrador</strong> ve todas las granjas y gestiona usuarios y respaldos.
          El <strong>trabajador</strong> solo ve y opera los datos de la granja asignada.
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Granja</th><th>Estado</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="empty">Sin usuarios</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>🔐 Mi contraseña</h2>
        <div class="form-row">
          <div class="form-group">
            <label>Contraseña actual</label>
            <input type="password" id="pwCur">
          </div>
          <div class="form-group">
            <label>Nueva contraseña</label>
            <input type="password" id="pwNew" placeholder="Mínimo 6 caracteres">
          </div>
        </div>
        <button class="btn btn-primary" onclick="Users.changePassword()">Cambiar contraseña</button>
      </div>

      <div id="userModal" class="modal">
        <div class="modal-content">
          <h2 id="userModalTitle">Nuevo usuario</h2>
          <div class="form-group">
            <label>Usuario *</label>
            <input type="text" id="mu-user">
          </div>
          <div class="form-group">
            <label>Nombre para mostrar</label>
            <input type="text" id="mu-name">
          </div>
          <div class="form-group">
            <label>Rol *</label>
            <select id="mu-role">
              <option value="trabajador">👷 Trabajador (solo su granja)</option>
              <option value="admin">👑 Administrador (todas)</option>
            </select>
          </div>
          <div class="form-group" id="mu-farm-group">
            <label>Granja asignada</label>
            <select id="mu-farm"></select>
          </div>
          <div class="form-group">
            <label id="mu-pass-label">Contraseña *</label>
            <input type="password" id="mu-pass" placeholder="Mínimo 6 caracteres">
          </div>
          <div class="form-group" id="mu-active-group" style="display:none">
            <label><input type="checkbox" id="mu-active"> Activo</label>
          </div>
          <div id="mu-error" class="alert alert-danger" style="display:none"></div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Users.save()">💾 Guardar</button>
            <button class="btn" onclick="Users.closeForm()">Cancelar</button>
          </div>
        </div>
      </div>`;
  },

  afterRender() {
    document.getElementById('mu-role').addEventListener('change', e => {
      document.getElementById('mu-farm-group').style.display = e.target.value === 'admin' ? 'none' : '';
    });
  },

  fillForm(u) {
    const farmOpts = '<option value="">— Sin asignar —</option>' +
      this._farms.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    document.getElementById('mu-farm').innerHTML = farmOpts;
    document.getElementById('userModalTitle').textContent = u ? '✏️ Editar usuario' : '➕ Nuevo usuario';
    document.getElementById('mu-user').value = u ? u.username : '';
    document.getElementById('mu-user').disabled = !!u;
    document.getElementById('mu-name').value = u ? (u.name || '') : '';
    document.getElementById('mu-role').value = u ? u.role : 'trabajador';
    document.getElementById('mu-farm').value = u && u.farm_id ? u.farm_id : '';
    document.getElementById('mu-farm-group').style.display = u && u.role === 'admin' ? 'none' : '';
    document.getElementById('mu-pass').value = '';
    document.getElementById('mu-pass-label').textContent = u ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *';
    document.getElementById('mu-active-group').style.display = u ? '' : 'none';
    if (u) document.getElementById('mu-active').checked = !!u.active;
    document.getElementById('mu-error').style.display = 'none';
    this._editing = u || null;
    document.getElementById('userModal').classList.add('open');
  },

  async create() {
    const users = await API.get('/api/users');
    this.fillForm(null);
    this._users = users;
  },

  async edit(id) {
    const users = await API.get('/api/users');
    this.fillForm(users.find(u => u.id == id) || null);
  },

  closeForm() { document.getElementById('userModal').classList.remove('open'); },

  async save() {
    const err = document.getElementById('mu-error');
    err.style.display = 'none';
    const u = this._editing;
    const payload = {
      name: document.getElementById('mu-name').value.trim(),
      role: document.getElementById('mu-role').value,
      farm_id: document.getElementById('mu-farm').value || null,
      password: document.getElementById('mu-pass').value
    };
    if (u) payload.active = document.getElementById('mu-active').checked ? 1 : 0;
    else payload.username = document.getElementById('mu-user').value.trim();

    try {
      if (u) await API.put(`/api/users/${u.id}`, payload);
      else await API.post('/api/users', payload);
      this.closeForm();
      App.navigate('users');
    } catch (e) {
      err.textContent = e.message;
      err.style.display = '';
    }
  },

  async remove(id, username) {
    if (!confirm(`¿Eliminar al usuario "${username}"?`)) return;
    try {
      await API.delete(`/api/users/${id}`);
      App.navigate('users');
    } catch (e) { alert(e.message); }
  },

  async changePassword() {
    const cur = document.getElementById('pwCur').value;
    const nw = document.getElementById('pwNew').value;
    if (!cur || !nw) return alert('Completa ambos campos');
    try {
      await API.put('/api/auth/password', { current_password: cur, new_password: nw });
      document.getElementById('pwCur').value = '';
      document.getElementById('pwNew').value = '';
      alert('✅ Contraseña actualizada');
    } catch (e) { alert(e.message); }
  }
};