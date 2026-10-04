const Inventory = {
  items: [],
  categories: [],
  movements: [],
  async render() {
    this.items = await API.getInventoryItems();
    this.categories = await API.getInventoryCategories();
    const lowStock = this.items.filter(i => i.current_qty <= i.min_qty);
    return `
      <div class="toolbar"><h2>📦 Inventario</h2><button class="btn btn-primary" onclick="Inventory.openForm()">+ Nuevo Item</button></div>
      ${lowStock.length ? `<div class="alert alert-danger"><strong>⚠️ ${lowStock.length} item(s) con stock bajo:</strong> ${lowStock.map(i => `${i.name} (${i.current_qty} ${i.unit})`).join(', ')}</div>` : ''}
      <div class="grid-4" style="margin-bottom:20px">
        <div class="card stat-card"><div class="stat-value">${this.items.length}</div><div class="stat-label">Total items</div></div>
        <div class="card stat-card"><div class="stat-value">${this.categories.length}</div><div class="stat-label">Categorías</div></div>
        <div class="card stat-card"><div class="stat-value">${lowStock.length}</div><div class="stat-label">Stock bajo</div></div>
        <div class="card stat-card"><div class="stat-value">$${this.items.reduce((s,i) => s + i.current_qty * i.unit_cost, 0).toFixed(2)}</div><div class="stat-label">Valor total</div></div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Item</th><th>Categoría</th><th>Cantidad</th><th>Unidad</th><th>Stock mín</th><th>Costo uni.</th><th>Acciones</th></tr>
            ${this.items.length ? this.items.map(i => `
              <tr style="${i.current_qty <= i.min_qty ? 'background:#fff3e0' : ''}">
                <td><strong>${i.name}</strong></td><td>${i.category_name || '-'}</td>
                <td>${i.current_qty}</td><td>${i.unit}</td>
                <td>${i.min_qty}</td><td>$${(i.unit_cost || 0).toFixed(2)}</td>
                <td>
                  <button class="btn btn-sm btn-success" onclick="Inventory.openMovement(${i.id})">📦 Mov.</button>
                  <button class="btn btn-sm btn-primary" onclick="Inventory.openForm(${i.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="Inventory.delete(${i.id})">🗑️</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="empty"><p>No hay items en inventario</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="inventoryFormModal" class="modal">
        <div class="modal-content">
          <h2 id="invModalTitle">Nuevo Item</h2>
          <form id="invForm" onsubmit="Inventory.save(event)">
            <input type="hidden" id="invId">
            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input type="text" id="invName" required></div>
              <div class="form-group"><label>Categoría</label>
                <select id="invCategory">${this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Cantidad actual</label><input type="number" step="0.01" id="invQty" value="0"></div>
              <div class="form-group"><label>Unidad</label><input type="text" id="invUnit" value="kg"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Stock mínimo</label><input type="number" step="0.01" id="invMin" value="0"></div>
              <div class="form-group"><label>Costo unitario ($)</label><input type="number" step="0.01" id="invCost" value="0"></div>
            </div>
            <div class="form-group"><label>Notas</label><textarea id="invNotes" rows="2"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Inventory.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
      <div id="movementModal" class="modal">
        <div class="modal-content">
          <h2>📦 Movimiento de inventario</h2>
          <form id="movForm" onsubmit="Inventory.saveMovement(event)">
            <input type="hidden" id="movItemId">
            <div class="form-row">
              <div class="form-group"><label>Tipo</label>
                <select id="movType"><option value="in">Entrada</option><option value="out">Salida</option></select>
              </div>
              <div class="form-group"><label>Fecha *</label><input type="date" id="movDate" required value="${new Date().toISOString().split('T')[0]}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Cantidad *</label><input type="number" step="0.01" id="movQty" required></div>
              <div class="form-group"><label>Descripción</label><input type="text" id="movDesc"></div>
            </div>
            <div id="movHistory" style="margin-top:12px;max-height:200px;overflow-y:auto;font-size:0.85rem"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Inventory.closeMovement()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm(id) {
    document.getElementById('inventoryFormModal').classList.add('open');
    document.getElementById('invForm').reset();
    document.getElementById('invId').value = '';
    if (id) {
      const i = this.items.find(x => x.id === id);
      if (!i) return;
      document.getElementById('invModalTitle').textContent = 'Editar Item';
      document.getElementById('invId').value = i.id;
      document.getElementById('invName').value = i.name;
      document.getElementById('invCategory').value = i.category_id || '';
      document.getElementById('invQty').value = i.current_qty;
      document.getElementById('invUnit').value = i.unit;
      document.getElementById('invMin').value = i.min_qty;
      document.getElementById('invCost').value = i.unit_cost;
      document.getElementById('invNotes').value = i.notes || '';
    } else {
      document.getElementById('invModalTitle').textContent = 'Nuevo Item';
    }
  },
  closeForm() { document.getElementById('inventoryFormModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('invId').value;
    const data = {
      id: id ? parseInt(id) : null,
      name: document.getElementById('invName').value,
      category_id: parseInt(document.getElementById('invCategory').value) || null,
      current_qty: parseFloat(document.getElementById('invQty').value) || 0,
      unit: document.getElementById('invUnit').value || 'kg',
      min_qty: parseFloat(document.getElementById('invMin').value) || 0,
      unit_cost: parseFloat(document.getElementById('invCost').value) || 0,
      notes: document.getElementById('invNotes').value || null
    };
    if (data.id) {
      await API.put(`/api/inventory/items/${data.id}`, data);
    } else {
      await API.post('/api/inventory/items', data);
    }
    this.closeForm();
    App.navigate('inventory');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este item del inventario?')) return;
    await API.deleteInventoryItem(id);
    App.navigate('inventory');
  },
  async openMovement(id) {
    this.movements = await API.getInventoryMovements(id);
    document.getElementById('movementModal').classList.add('open');
    document.getElementById('movItemId').value = id;
    document.getElementById('movForm').reset();
    document.getElementById('movDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('movHistory').innerHTML = this.movements.length
      ? `<strong>Historial:</strong><br>` + this.movements.slice(0, 20).map(m =>
          `${m.date} - ${m.type === 'in' ? '➕ Entrada' : '➖ Salida'} - ${m.quantity} - ${m.description || ''}`
        ).join('<br>')
      : '<span style="color:#999">Sin movimientos</span>';
  },
  closeMovement() { document.getElementById('movementModal').classList.remove('open'); },
  async saveMovement(e) {
    e.preventDefault();
    const itemId = parseInt(document.getElementById('movItemId').value);
    await API.saveInventoryMovement({
      item_id: itemId,
      date: document.getElementById('movDate').value,
      type: document.getElementById('movType').value,
      quantity: parseFloat(document.getElementById('movQty').value),
      description: document.getElementById('movDesc').value || null
    });
    this.closeMovement();
    App.navigate('inventory');
  }
};