const Sales = {
  pigs: [],
  async render() {
    this.pigs = await API.getPigs('active');
    const records = await API.getSales({ limit: 100 });
    return `
      <div class="toolbar"><h2>📈 Registro de Ventas</h2><button class="btn btn-primary" onclick="Sales.openForm()">+ Nueva Venta</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Fecha</th><th>Cerdo</th><th>Comprador</th><th>Tipo</th><th>Cant (kg)</th><th>$/kg</th><th>Total</th><th></th></tr>
            ${records.length ? records.map(r => `
              <tr>
                <td>${r.date}</td><td>${r.pig_identifier || '-'}</td><td>${r.buyer_name || '-'}</td>
                <td>${r.sale_type}</td><td>${r.quantity_kg || '-'}</td><td>${r.price_per_kg ? '$' + r.price_per_kg.toFixed(2) : '-'}</td>
                <td><strong>$${r.total_amount.toFixed(2)}</strong></td>
                <td><button class="btn btn-sm btn-danger" onclick="Sales.delete(${r.id})">🗑️</button></td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty"><p>No hay ventas registradas</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="saleModal" class="modal">
        <div class="modal-content">
          <h2>Nueva Venta</h2>
          <form onsubmit="Sales.save(event)">
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="saleDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Tipo</label>
                <select id="saleType"><option value="pig">Cerdo entero</option><option value="meat">Carne (kg)</option><option value="other">Otro</option></select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Cerdo</label>
                <select id="salePigId"><option value="">Ninguno</option>${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`).join('')}</select>
              </div>
              <div class="form-group"><label>Comprador</label><input type="text" id="saleBuyer"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Cantidad (kg)</label><input type="number" step="0.1" id="saleQty"></div>
              <div class="form-group"><label>Precio por kg ($)</label><input type="number" step="0.01" id="salePriceKg"></div>
            </div>
            <div class="form-group"><label>Monto Total ($) *</label><input type="number" step="0.01" id="saleTotal" required></div>
            <div class="form-group"><label>Notas</label><input type="text" id="saleNotes"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Sales.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm() { document.getElementById('saleModal').classList.add('open'); },
  closeForm() { document.getElementById('saleModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    await API.saveSale({
      date: document.getElementById('saleDate').value,
      sale_type: document.getElementById('saleType').value,
      pig_id: parseInt(document.getElementById('salePigId').value) || null,
      buyer_name: document.getElementById('saleBuyer').value || null,
      quantity_kg: parseFloat(document.getElementById('saleQty').value) || null,
      price_per_kg: parseFloat(document.getElementById('salePriceKg').value) || null,
      total_amount: parseFloat(document.getElementById('saleTotal').value),
      notes: document.getElementById('saleNotes').value || null
    });
    this.closeForm();
    App.navigate('sales');
  },
  async delete(id) {
    if (!confirm('¿Eliminar esta venta?')) return;
    await API.deleteSale(id);
    App.navigate('sales');
  }
};
