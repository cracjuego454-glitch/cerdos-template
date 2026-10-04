const Pigs = {
  pigs: [],
  batches: [],
  async render() {
    this.pigs = await API.getPigs();
    this.batches = await API.getBatches();
    return `
      <div class="toolbar"><h2>🐖 Registro de Cerdos</h2><button class="btn btn-primary" onclick="Pigs.openForm()">+ Nuevo Cerdo</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>ID</th><th>Nombre</th><th>Sexo</th><th>Raza</th><th>Compra</th><th>Costo</th><th>Estado</th><th>Lote</th><th>Acciones</th></tr>
              ${this.pigs.length ? this.pigs.map(p => `
              <tr>
                <td>${p.identifier}</td><td>${p.name || '-'}</td>
                <td>${p.sex === 'hembra' ? '♀ Hembra' : p.sex === 'macho' ? '♂ Macho' : '-'}</td>
                <td>${p.breed || '-'}</td>
                <td>${p.purchase_date || '-'}</td><td>$${(p.purchase_cost || 0).toFixed(2)}</td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>${p.batch_name || '-'}</td>
                <td><button class="btn btn-sm btn-primary" onclick="Pigs.openForm(${p.id})">✏️</button> <button class="btn btn-sm btn-danger" onclick="Pigs.delete(${p.id})">🗑️</button></td>
              </tr>
            `).join('') : '<tr><td colspan="9" class="empty"><p>No hay cerdos registrados</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="pigModal" class="modal">
        <div class="modal-content">
          <h2 id="pigModalTitle">Nuevo Cerdo</h2>
          <form id="pigForm" onsubmit="Pigs.save(event)">
            <input type="hidden" name="id" id="pigId">
            <div class="form-row">
              <div class="form-group"><label>Identificador *</label><input type="text" name="identifier" id="pigIdentifier" required placeholder="Ej: CERDO-001"></div>
              <div class="form-group"><label>Nombre</label><input type="text" name="name" id="pigName" placeholder="Opcional"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Sexo</label>
                <select name="sex" id="pigSex">
                  <option value="macho">♂ Macho</option>
                  <option value="hembra">♀ Hembra</option>
                </select>
              </div>
              <div class="form-group"><label>Raza</label><input type="text" name="breed" id="pigBreed"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Nacimiento</label><input type="date" name="birth_date" id="pigBirth"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Compra</label><input type="date" name="purchase_date" id="pigPurchaseDate"></div>
              <div class="form-group"><label>Costo de Compra ($)</label><input type="number" step="0.01" name="purchase_cost" id="pigPurchaseCost"></div>
            </div>
            <div class="form-group"><label>Lote</label>
              <select name="batch_id" id="pigBatch">
                <option value="">Sin lote</option>
                ${this.batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Notas</label><textarea name="notes" id="pigNotes" rows="2"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Pigs.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  async afterRender() {},
  openForm(id) {
    document.getElementById('pigModal').classList.add('open');
    document.getElementById('pigForm').reset();
    document.getElementById('pigId').value = '';
    if (id) {
      const p = this.pigs.find(x => x.id === id);
      if (!p) return;
      document.getElementById('pigModalTitle').textContent = 'Editar Cerdo';
      document.getElementById('pigId').value = p.id;
      document.getElementById('pigIdentifier').value = p.identifier;
      document.getElementById('pigName').value = p.name || '';
      document.getElementById('pigSex').value = p.sex || 'macho';
      document.getElementById('pigBreed').value = p.breed || '';
      document.getElementById('pigBirth').value = p.birth_date || '';
      document.getElementById('pigPurchaseDate').value = p.purchase_date || '';
      document.getElementById('pigPurchaseCost').value = p.purchase_cost || '';
      document.getElementById('pigBatch').value = p.batch_id || '';
      document.getElementById('pigNotes').value = p.notes || '';
    } else {
      document.getElementById('pigModalTitle').textContent = 'Nuevo Cerdo';
    }
  },
  closeForm() { document.getElementById('pigModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('pigId').value;
    const data = {
      id: id ? parseInt(id) : null,
      identifier: document.getElementById('pigIdentifier').value,
      name: document.getElementById('pigName').value,
      sex: document.getElementById('pigSex').value,
      breed: document.getElementById('pigBreed').value,
      birth_date: document.getElementById('pigBirth').value || null,
      purchase_date: document.getElementById('pigPurchaseDate').value || null,
      purchase_cost: parseFloat(document.getElementById('pigPurchaseCost').value) || 0,
      batch_id: parseInt(document.getElementById('pigBatch').value) || null,
      notes: document.getElementById('pigNotes').value || null
    };
    await API.savePig(data);
    this.closeForm();
    App.navigate('pigs');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este cerdo y todos sus registros?')) return;
    await API.deletePig(id);
    App.navigate('pigs');
  }
};
