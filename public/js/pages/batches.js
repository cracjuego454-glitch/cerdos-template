const Batches = {
  batches: [],
  pigs: [],
  selectedBatchId: null,
  async render() {
    this.batches = await API.getBatches();
    return `
      <div class="toolbar"><h2>🏷️ Lotes</h2><button class="btn btn-primary" onclick="Batches.openForm()">+ Nuevo Lote</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Nombre</th><th>Fecha inicio</th><th>Cerdos</th><th>Acciones</th></tr>
            ${this.batches.length ? this.batches.map(b => `
              <tr style="cursor:pointer" onclick="Batches.showPigs(${b.id})">
                <td><strong>${b.name}</strong></td>
                <td>${b.start_date || '-'}</td>
                <td>${b.pig_count}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();Batches.openForm(${b.id})">✏️</button>
                  <button class="btn btn-sm btn-info" onclick="event.stopPropagation();Batches.showQR(${b.id})">📱 QR</button>
                  <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();Batches.delete(${b.id})">🗑️</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="4" class="empty"><p>No hay lotes registrados</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="batchPigs" style="display:none">
        <div class="toolbar"><h3 id="batchTitle">Cerdos del lote</h3><button class="btn btn-sm" onclick="Batches.hidePigs()">✕ Cerrar</button></div>
        <div class="card">
          <div class="table-container">
            <table id="batchPigsTable">
              <tr><th>ID</th><th>Nombre</th><th>Raza</th><th>Compra</th><th>Estado</th></tr>
            </table>
          </div>
        </div>
      </div>
      <div id="qrModal" class="modal">
        <div class="modal-content" style="text-align:center">
          <h2>📱 QR del Lote</h2>
          <div id="qrImage" style="margin:16px 0;min-height:200px"></div>
          <p id="qrText" style="color:#999;font-size:0.85rem"></p>
          <div class="form-actions" style="justify-content:center">
            <button class="btn" onclick="Batches.closeQR()">Cerrar</button>
            <button class="btn btn-primary" onclick="Batches.printQR()">🖨️ Imprimir</button>
          </div>
        </div>
      </div>
      <div id="batchModal" class="modal">
        <div class="modal-content">
          <h2 id="batchModalTitle">Nuevo Lote</h2>
          <form id="batchForm" onsubmit="Batches.save(event)">
            <input type="hidden" name="id" id="batchId">
            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input type="text" name="name" id="batchName" required placeholder="Ej: Lote Primavera 2025"></div>
              <div class="form-group"><label>Fecha de inicio</label><input type="date" name="start_date" id="batchStartDate"></div>
            </div>
            <div class="form-group"><label>Notas</label><textarea name="notes" id="batchNotes" rows="2"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Batches.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm(id) {
    document.getElementById('batchModal').classList.add('open');
    document.getElementById('batchForm').reset();
    document.getElementById('batchId').value = '';
    if (id) {
      const b = this.batches.find(x => x.id === id);
      if (!b) return;
      document.getElementById('batchModalTitle').textContent = 'Editar Lote';
      document.getElementById('batchId').value = b.id;
      document.getElementById('batchName').value = b.name;
      document.getElementById('batchStartDate').value = b.start_date || '';
      document.getElementById('batchNotes').value = b.notes || '';
    } else {
      document.getElementById('batchModalTitle').textContent = 'Nuevo Lote';
    }
  },
  closeForm() { document.getElementById('batchModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('batchId').value;
    const data = {
      id: id ? parseInt(id) : null,
      name: document.getElementById('batchName').value,
      start_date: document.getElementById('batchStartDate').value || null,
      notes: document.getElementById('batchNotes').value || null
    };
    if (data.id) {
      await API.put(`/api/batches/${data.id}`, data);
    } else {
      await API.post('/api/batches', data);
    }
    this.closeForm();
    App.navigate('batches');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este lote? Los cerdos quedarán sin lote asignado.')) return;
    await API.deleteBatch(id);
    App.navigate('batches');
  },
  async showPigs(id) {
    this.selectedBatchId = id;
    const batch = this.batches.find(b => b.id === id);
    this.pigs = await API.getPigs();
    const batchPigs = this.pigs.filter(p => p.batch_id === id);
    const tbody = document.getElementById('batchPigsTable');
    tbody.innerHTML = `<tr><th>ID</th><th>Nombre</th><th>Raza</th><th>Compra</th><th>Estado</th></tr>` +
      (batchPigs.length ? batchPigs.map(p => `
        <tr>
          <td>${p.identifier}</td><td>${p.name || '-'}</td><td>${p.breed || '-'}</td>
          <td>${p.purchase_date || '-'}</td><td><span class="badge badge-${p.status}">${p.status}</span></td>
        </tr>
      `).join('') : '<tr><td colspan="5" class="empty"><p>No hay cerdos en este lote</p></td></tr>');
    document.getElementById('batchTitle').textContent = `🐖 Cerdos del lote: ${batch ? batch.name : ''}`;
    document.getElementById('batchPigs').style.display = 'block';
  },
  hidePigs() {
    document.getElementById('batchPigs').style.display = 'none';
    this.selectedBatchId = null;
  },
  showQR(id) {
    const batch = this.batches.find(b => b.id === id);
    if (!batch) return;
    const baseUrl = 'https://cerdos-control.onrender.com/batch-view.html?id=';
    document.getElementById('qrImage').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUrl + id)}" alt="QR ${batch.name}" style="border-radius:8px;background:#fff;padding:8px">`;
    document.getElementById('qrText').textContent = `📍 ${batch.name} · Escanea para abrir la app`;
    document.getElementById('qrModal').classList.add('open');
  },
  closeQR() { document.getElementById('qrModal').classList.remove('open'); },
  printQR() {
    const img = document.getElementById('qrImage').querySelector('img');
    if (!img) return;
    const w = window.open('', '', 'width=300,height=300');
    w.document.write(`<html><head><title>QR Lote</title></head><body style="text-align:center;padding:20px"><img src="${img.src}" style="width:250px"><p>${document.getElementById('qrText').textContent}</p></body></html>`);
    w.print();
  }
};