const FeedOrders = {
  orders: [],
  async render() {
    this.orders = await API.get('/api/feed-orders');
    return `
      <div class="toolbar"><h2>🛒 Pedidos de Alimento</h2><button class="btn btn-primary" onclick="FeedOrders.openForm()">+ Nuevo Pedido</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Proveedor</th><th>Pedido</th><th>Ítem</th><th>Cantidad</th><th>Recibido</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>
            ${this.orders.length ? this.orders.map(o => `
              <tr>
                <td>${o.supplier}</td><td>${o.order_date}</td>
                <td>${o.item_name}</td><td>${o.quantity_ordered} ${o.unit_cost ? '@ $' + o.unit_cost.toFixed(2) : ''}</td>
                <td>${o.quantity_received || 0}</td>
                <td>$${(o.total_cost || 0).toFixed(2)}</td>
                <td><span class="badge badge-${o.status === 'received' ? 'active' : o.status === 'pending' ? 'warning' : 'dead'}">${o.status}</span></td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="FeedOrders.openForm(${o.id})">✏️</button>
                  ${o.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="FeedOrders.receive(${o.id})">📦 Recibir</button>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="FeedOrders.delete(${o.id})">🗑️</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty"><p>No hay pedidos registrados</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="feedOrderModal" class="modal">
        <div class="modal-content">
          <h2 id="feedOrderModalTitle">Nuevo Pedido</h2>
          <form id="feedOrderForm" onsubmit="FeedOrders.save(event)">
            <input type="hidden" id="feedOrderId">
            <div class="form-row">
              <div class="form-group"><label>Proveedor *</label><input type="text" id="feedOrderSupplier" required></div>
              <div class="form-group"><label>Ítem *</label><input type="text" id="feedOrderItem" required placeholder="Ej: Maíz, Concentrado..."></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Pedido *</label><input type="date" id="feedOrderDate" required></div>
              <div class="form-group"><label>Fecha de Entrega</label><input type="date" id="feedOrderDelivery"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Cantidad * (kg)</label><input type="number" id="feedOrderQty" step="0.1" required></div>
              <div class="form-group"><label>Costo x kg ($)</label><input type="number" id="feedOrderCost" step="0.01"></div>
            </div>
            <div class="form-group"><label>Notas</label><textarea id="feedOrderNotes" rows="2"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="FeedOrders.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm(id) {
    document.getElementById('feedOrderModal').classList.add('open');
    document.getElementById('feedOrderForm').reset();
    document.getElementById('feedOrderId').value = '';
    document.getElementById('feedOrderDate').value = new Date().toISOString().split('T')[0];
    if (id) {
      const o = this.orders.find(x => x.id === id);
      if (!o) return;
      document.getElementById('feedOrderModalTitle').textContent = 'Editar Pedido';
      document.getElementById('feedOrderId').value = o.id;
      document.getElementById('feedOrderSupplier').value = o.supplier;
      document.getElementById('feedOrderItem').value = o.item_name;
      document.getElementById('feedOrderDate').value = o.order_date;
      document.getElementById('feedOrderDelivery').value = o.delivery_date || '';
      document.getElementById('feedOrderQty').value = o.quantity_ordered;
      document.getElementById('feedOrderCost').value = o.unit_cost || 0;
      document.getElementById('feedOrderNotes').value = o.notes || '';
    }
  },
  closeForm() { document.getElementById('feedOrderModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('feedOrderId').value;
    const data = {
      supplier: document.getElementById('feedOrderSupplier').value,
      order_date: document.getElementById('feedOrderDate').value,
      item_name: document.getElementById('feedOrderItem').value,
      quantity_ordered: parseFloat(document.getElementById('feedOrderQty').value),
      unit_cost: parseFloat(document.getElementById('feedOrderCost').value) || 0,
      delivery_date: document.getElementById('feedOrderDelivery').value || null,
      notes: document.getElementById('feedOrderNotes').value || null
    };
    if (id) { await API.put(`/api/feed-orders/${id}`, { ...data, status: 'pending', quantity_received: 0 }); }
    else { await API.post('/api/feed-orders', data); }
    this.closeForm();
    App.navigate('feedorders');
  },
  async receive(id) {
    const o = this.orders.find(x => x.id === id);
    if (!o) return;
    const qty = prompt(`¿Cuántos kg recibió de ${o.item_name}?`, o.quantity_ordered);
    if (!qty) return;
    await API.put(`/api/feed-orders/${id}`, {
      supplier: o.supplier, order_date: o.order_date, delivery_date: new Date().toISOString().split('T')[0],
      item_name: o.item_name, quantity_ordered: o.quantity_ordered, quantity_received: parseFloat(qty),
      unit_cost: o.unit_cost || 0, status: 'received', notes: o.notes
    });
    App.navigate('feedorders');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este pedido?')) return;
    await API.delete(`/api/feed-orders/${id}`);
    App.navigate('feedorders');
  }
};