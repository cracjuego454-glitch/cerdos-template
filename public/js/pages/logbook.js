const Logbook = {
  logs: [],
  async render() {
    this.logs = await API.getDailyLogs();
    return `
      <div class="toolbar"><h2>📅 Bitácora Diaria</h2><button class="btn btn-primary" onclick="Logbook.openForm()">+ Nueva Nota</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Fecha</th><th>Título</th><th>Contenido</th><th>Acciones</th></tr>
            ${this.logs.length ? this.logs.map(l => `
              <tr>
                <td>${l.date}</td><td><strong>${l.title || '(Sin título)'}</strong></td>
                <td style="max-width:400px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.content || ''}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="Logbook.openForm(${l.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="Logbook.delete(${l.id})">🗑️</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="4" class="empty"><p>No hay notas en la bitácora</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="logModal" class="modal">
        <div class="modal-content">
          <h2 id="logModalTitle">Nueva Nota</h2>
          <form id="logForm" onsubmit="Logbook.save(event)">
            <input type="hidden" id="logId">
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="logDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Título</label><input type="text" id="logTitle" placeholder="Opcional"></div>
            </div>
            <div class="form-group"><label>Contenido</label><textarea id="logContent" rows="6" style="min-height:120px"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Logbook.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm(id) {
    document.getElementById('logModal').classList.add('open');
    document.getElementById('logForm').reset();
    document.getElementById('logId').value = '';
    if (id) {
      const l = this.logs.find(x => x.id === id);
      if (!l) return;
      document.getElementById('logModalTitle').textContent = 'Editar Nota';
      document.getElementById('logId').value = l.id;
      document.getElementById('logDate').value = l.date;
      document.getElementById('logTitle').value = l.title || '';
      document.getElementById('logContent').value = l.content || '';
    } else {
      document.getElementById('logModalTitle').textContent = 'Nueva Nota';
    }
  },
  closeForm() { document.getElementById('logModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('logId').value;
    const data = {
      id: id ? parseInt(id) : null,
      date: document.getElementById('logDate').value,
      title: document.getElementById('logTitle').value || null,
      content: document.getElementById('logContent').value || null
    };
    if (data.id) {
      await API.put(`/api/daily_logs/${data.id}`, data);
    } else {
      await API.post('/api/daily_logs', data);
    }
    this.closeForm();
    App.navigate('logbook');
  },
  async delete(id) {
    if (!confirm('¿Eliminar esta nota?')) return;
    await API.deleteDailyLog(id);
    App.navigate('logbook');
  }
};