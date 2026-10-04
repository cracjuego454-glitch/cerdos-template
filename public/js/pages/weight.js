const Weight = {
  pigs: [],
  async render() {
    this.pigs = await API.getPigs('active');
    const records = await API.getWeights({ limit: 100 });
    return `
      <div class="toolbar"><h2>⚖️ Control de Pesos</h2><button class="btn btn-primary" onclick="Weight.openForm()">+ Registrar Peso</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Fecha</th><th>Cerdo</th><th>Peso (kg)</th><th>Notas</th><th></th></tr>
            ${records.length ? records.map(r => `
              <tr>
                <td>${r.date}</td><td>${r.pig_identifier}</td><td>${r.weight_kg} kg</td><td>${r.notes || '-'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="Weight.delete(${r.id})">🗑️</button></td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="empty"><p>No hay registros de peso</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="weightModal" class="modal">
        <div class="modal-content">
          <h2>Registrar Peso</h2>
          <form onsubmit="Weight.save(event)">
            <div class="form-group">
              <label>Cerdo *</label>
              <select id="weightPigId" required>
                <option value="">Seleccionar...</option>
                ${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="weightDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Peso (kg) *</label><input type="number" step="0.1" id="weightKg" required></div>
            </div>
            <div class="form-group"><label>Notas</label><input type="text" id="weightNotes"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Weight.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm() { document.getElementById('weightModal').classList.add('open'); },
  closeForm() { document.getElementById('weightModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    await API.saveWeight({
      pig_id: parseInt(document.getElementById('weightPigId').value),
      date: document.getElementById('weightDate').value,
      weight_kg: parseFloat(document.getElementById('weightKg').value),
      notes: document.getElementById('weightNotes').value || null
    });
    this.closeForm();
    App.navigate('weight');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await API.deleteWeight(id);
    App.navigate('weight');
  }
};
