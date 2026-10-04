const Expenses = {
  pigs: [], partners: [],
  async render() {
    this.pigs = await API.getPigs();
    this.partners = await API.get('/api/partners/info').then(r => r.partners);
    const records = await API.getExpenses({ limit: 100 });
    const cats = { food: '🍽️ Alimento', medicine: '💊 Medicina', utilities: '🔧 Servicios', equipment: '🛠️ Equipo', other: '📦 Otros' };
    return `
      <div class="toolbar"><h2>💰 Registro de Gastos</h2><button class="btn btn-primary" onclick="Expenses.openForm()">+ Nuevo Gasto</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Cerdo</th><th>Pagado por</th><th>Monto</th><th></th></tr>
            ${records.length ? records.map(r => `
              <tr>
                <td>${r.date}</td><td>${cats[r.category] || r.category}</td><td>${r.description || '-'}</td>
                <td>${r.pig_identifier || '-'}</td><td>${r.partner_name || '-'}</td>
                <td><strong>$${r.amount.toFixed(2)}</strong></td>
                <td><button class="btn btn-sm btn-danger" onclick="Expenses.delete(${r.id})">🗑️</button></td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty"><p>No hay gastos registrados</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="expenseModal" class="modal">
        <div class="modal-content">
          <h2>Nuevo Gasto</h2>
          <form onsubmit="Expenses.save(event)">
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="expDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Categoría *</label>
                <select id="expCategory" required>
                  <option value="food">🍽️ Alimento</option>
                  <option value="medicine">💊 Medicina</option>
                  <option value="utilities">🔧 Servicios</option>
                  <option value="equipment">🛠️ Equipo</option>
                  <option value="other">📦 Otros</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Descripción</label><input type="text" id="expDesc"></div>
            <div class="form-row">
              <div class="form-group"><label>Monto ($) *</label><input type="number" step="0.01" id="expAmount" required></div>
              <div class="form-group"><label>Cerdo (opcional)</label>
                <select id="expPigId"><option value="">Ninguno</option>${this.pigs.map(p => `<option value="${p.id}">${p.identifier}</option>`).join('')}</select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Pagado por</label>
                <select id="expPartnerId"><option value="">El negocio (general)</option>${this.partners.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
              </div>
              <div class="form-group"><label>Notas</label><input type="text" id="expNotes"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Expenses.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm() { document.getElementById('expenseModal').classList.add('open'); },
  closeForm() { document.getElementById('expenseModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    await API.saveExpense({
      date: document.getElementById('expDate').value,
      category: document.getElementById('expCategory').value,
      description: document.getElementById('expDesc').value || null,
      amount: parseFloat(document.getElementById('expAmount').value),
      pig_id: parseInt(document.getElementById('expPigId').value) || null,
      partner_id: parseInt(document.getElementById('expPartnerId').value) || null,
      notes: document.getElementById('expNotes').value || null
    });
    this.closeForm();
    App.navigate('expenses');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    await API.deleteExpense(id);
    App.navigate('expenses');
  }
};
