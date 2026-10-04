const Health = {
  pigs: [],
  async render() {
    this.pigs = await API.getPigs('active');
    const records = await API.getHealth({ limit: 100 });
    return `
      <div class="toolbar"><h2>💊 Control de Salud</h2><button class="btn btn-primary" onclick="Health.openForm()">+ Nuevo Registro</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Fecha</th><th>Cerdo</th><th>Tipo</th><th>Descripción</th><th>Medicina</th><th>Costo</th><th>Próximo</th><th></th></tr>
            ${records.length ? records.map(r => `
              <tr>
                <td>${r.date}</td><td>${r.pig_identifier}</td>
                <td><span class="badge badge-${r.record_type === 'vaccination' ? 'active' : r.record_type === 'illness' ? 'sold' : 'deceased'}">${r.record_type}</span></td>
                <td>${r.description || '-'}</td><td>${r.medicine || '-'}</td>
                <td>$${(r.cost || 0).toFixed(2)}</td><td>${r.next_due_date || '-'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="Health.delete(${r.id})">🗑️</button></td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty"><p>No hay registros de salud</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="healthModal" class="modal">
        <div class="modal-content">
          <h2>Nuevo Registro de Salud</h2>
          <form onsubmit="Health.save(event)">
            <div class="form-group">
              <label>Cerdo *</label>
              <select id="healthPigId" required>
                <option value="">Seleccionar...</option>
                ${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="healthDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Tipo *</label>
                <select id="healthType" required>
                  <option value="">Seleccionar...</option>
                  <option value="vaccination">Vacunación</option>
                  <option value="illness">Enfermedad</option>
                  <option value="treatment">Tratamiento</option>
                  <option value="checkup">Revisión</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Descripción</label><input type="text" id="healthDesc"></div>
            <div class="form-row">
              <div class="form-group"><label>Medicina</label><input type="text" id="healthMedicine"></div>
              <div class="form-group"><label>Costo ($)</label><input type="number" step="0.01" id="healthCost" value="0"></div>
            </div>
            <div class="form-group"><label>Próxima fecha (ej: próxima vacuna)</label><input type="date" id="healthNext"></div>
            <div class="form-group"><label>Notas</label><input type="text" id="healthNotes"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Health.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm() { document.getElementById('healthModal').classList.add('open'); },
  closeForm() { document.getElementById('healthModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    await API.saveHealth({
      pig_id: parseInt(document.getElementById('healthPigId').value),
      date: document.getElementById('healthDate').value,
      record_type: document.getElementById('healthType').value,
      description: document.getElementById('healthDesc').value || null,
      medicine: document.getElementById('healthMedicine').value || null,
      cost: parseFloat(document.getElementById('healthCost').value) || 0,
      next_due_date: document.getElementById('healthNext').value || null,
      notes: document.getElementById('healthNotes').value || null
    });
    this.closeForm();
    App.navigate('health');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await API.deleteHealth(id);
    App.navigate('health');
  }
};
