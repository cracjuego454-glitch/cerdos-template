const Deaths = {
  pigs: [],
  async render() {
    this.pigs = await API.get('/api/pigs?status=dead');
    const totalDeaths = this.pigs.length;
    const totalInvested = this.pigs.reduce((s, p) => s + (p.purchase_cost || 0), 0);
    return `
      <div class="toolbar"><h2>⚰️ Mortalidad</h2><button class="btn btn-primary" onclick="Deaths.openForm()">+ Registrar Muerte</button></div>
      <div class="grid-2">
        <div class="card">
          <h3>Resumen</h3>
          <table>
            <tr><td>Total muertes</td><td><strong>${totalDeaths}</strong></td></tr>
            <tr><td>Inversión perdida</td><td><strong>$${totalInvested.toFixed(2)}</strong></td></tr>
          </table>
        </div>
        <div class="card">
          <h3>Registrar Muerte</h3>
          <p>Selecciona un cerdo activo y registra su fallecimiento</p>
        </div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>ID</th><th>Nombre</th><th>Fecha muerte</th><th>Causa</th><th>Inversión</th><th>Notas</th><th>Acciones</th></tr>
            ${this.pigs.length ? this.pigs.map(p => `
              <tr>
                <td>${p.identifier}</td><td>${p.name || '-'}</td>
                <td>${p.death_date || '-'}</td>
                <td>${p.death_cause || '-'}</td>
                <td>$${(p.purchase_cost || 0).toFixed(2)}</td>
                <td>${p.notes ? p.notes.substring(0, 50) : '-'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="Deaths.reactivate(${p.id})">🔄 Reactivar</button></td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty"><p>No hay muertes registradas</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="deathModal" class="modal">
        <div class="modal-content">
          <h2>Registrar Muerte</h2>
          <form id="deathForm" onsubmit="Deaths.save(event)">
            <div class="form-group"><label>Cerdo *</label>
              <select id="deathPigId" required>
                <option value="">Seleccionar...</option>
              </select>
            </div>
            <div class="form-group"><label>Fecha de Muerte *</label><input type="date" id="deathDate" required></div>
            <div class="form-group"><label>Causa</label>
              <select id="deathCause">
                <option value="">Seleccionar...</option>
                <option value="Enfermedad">Enfermedad</option>
                <option value="Accidente">Accidente</option>
                <option value="Vejez">Vejez</option>
                <option value="Infección">Infección</option>
                <option value="Parásitos">Parásitos</option>
                <option value="Desnutrición">Desnutrición</option>
                <option value="Otra">Otra</option>
              </select>
            </div>
            <div class="form-group"><label>Notas</label><textarea id="deathNotes" rows="2" placeholder="Detalles adicionales..."></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Deaths.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-danger">Confirmar Muerte</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  async afterRender() {
    const activePigs = await API.get('/api/pigs?status=active');
    const sel = document.getElementById('deathPigId');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccionar...</option>' + activePigs.map(p =>
        `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`
      ).join('');
    }
  },
  openForm() { document.getElementById('deathModal').classList.add('open'); },
  closeForm() { document.getElementById('deathModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const pigId = parseInt(document.getElementById('deathPigId').value);
    const date = document.getElementById('deathDate').value;
    const cause = document.getElementById('deathCause').value;
    const notes = document.getElementById('deathNotes').value;
    if (!confirm(`¿Registrar muerte de ${document.getElementById('deathPigId').options[document.getElementById('deathPigId').selectedIndex].text}?`)) return;
    await API.post(`/api/pigs/${pigId}/death`, { death_date: date, death_cause: cause || null, notes: notes || null });
    this.closeForm();
    App.navigate('deaths');
  },
  async reactivate(id) {
    if (!confirm('¿Reactivar este cerdo? (lo vuelve a estado activo)')) return;
    const pig = await API.getPig(id);
    await API.savePig({ ...pig, status: 'active', death_date: null, death_cause: null, id });
    App.navigate('deaths');
  }
};