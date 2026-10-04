const Partners = {
  partners: [],
  async render() {
    const info = await API.get('/api/partners/info');
    this.allPartners = info.allPartners || [];
    this.partners = info.partners;
    const total = info.totalInvestment;
    const allTotal = this.allPartners.reduce((s, p) => s + p.investment, 0);
    return `
      <div class="toolbar"><h2>🤝 Socios e Inversiones</h2><button class="btn btn-primary" onclick="Partners.openForm()">+ Nuevo Socio</button></div>
      <div class="grid-3" style="margin-bottom:20px">
        <div class="card stat-card"><div class="stat-value">${this.partners.length}</div><div class="stat-label">Socios activos</div></div>
        <div class="card stat-card"><div class="stat-value">$${total.toFixed(2)}</div><div class="stat-label">Inversión activa total</div></div>
        <div class="card stat-card"><div class="stat-value">${this.partners.length ? Math.max(...this.partners.map(p => p.investment / total * 100)).toFixed(1) : 0}%</div><div class="stat-label">Mayor % activo</div></div>
      </div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Nombre</th><th>Inversión</th><th>%</th><th>Estado</th><th>Pagado</th><th></th></tr>
            ${this.allPartners.length ? this.allPartners.map(p => {
              const pct = allTotal > 0 ? (p.investment / allTotal * 100) : 0;
              const returned = p.total_returned || 0;
              const active = p.status === 'active';
              return `<tr style="${active ? '' : 'opacity:0.5'}">
                <td><strong>${p.name}</strong></td>
                <td>$${p.investment.toFixed(2)}</td>
                <td>${pct.toFixed(1)}%</td>
                <td><span class="badge badge-${active ? 'active' : 'sold'}">${active ? 'Activo' : 'Liquidado'}</span></td>
                <td>$${returned.toFixed(2)}</td>
                <td>
                  ${active ? `<button class="btn btn-sm btn-success" onclick="Partners.openTx(${p.id})">💰 Pago</button>
                  <button class="btn btn-sm btn-warning" onclick="Partners.liquidate(${p.id})">🛑 Liquidar</button>` : ''}
                  <button class="btn btn-sm btn-primary" onclick="Partners.openForm(${p.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="Partners.delete(${p.id})">🗑️</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="6" class="empty"><p>No hay socios registrados</p></td></tr>'}
          </table>
        </div>
      </div>
      <div id="partnerModal" class="modal">
        <div class="modal-content">
          <h2 id="partnerModalTitle">Nuevo Socio</h2>
          <form id="partnerForm" onsubmit="Partners.save(event)">
            <input type="hidden" id="partnerId">
            <div class="form-row">
              <div class="form-group"><label>Nombre *</label><input type="text" id="partnerName" required></div>
              <div class="form-group"><label>Tipo de inversión</label>
                <select id="partnerType">
                  <option value="capital">Capital</option>
                  <option value="infraestructura">Infraestructura</option>
                  <option value="equipo">Equipo</option>
                  <option value="terreno">Terreno</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Monto invertido ($)</label><input type="number" step="0.01" id="partnerInvestment" value="0"></div>
              <div class="form-group"><label>Fecha</label><input type="date" id="partnerDate"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Teléfono</label><input type="text" id="partnerPhone"></div>
              <div class="form-group"><label>Notas</label><input type="text" id="partnerNotes"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Partners.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
      <div id="txModal" class="modal">
        <div class="modal-content">
          <h2>💰 Registrar pago a socio</h2>
          <form onsubmit="Partners.saveTx(event)">
            <input type="hidden" id="txPartnerId">
            <div class="form-row">
              <div class="form-group"><label>Fecha *</label><input type="date" id="txDate" required value="${new Date().toISOString().split('T')[0]}"></div>
              <div class="form-group"><label>Tipo</label>
                <select id="txType">
                  <option value="return">Devolución</option>
                  <option value="profit">Reparto de ganancia</option>
                  <option value="withdrawal">Retiro</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Monto ($) *</label><input type="number" step="0.01" id="txAmount" required></div>
              <div class="form-group"><label>Descripción</label><input type="text" id="txDesc"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Partners.closeTx()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
      <div id="liquidateModal" class="modal">
        <div class="modal-content">
          <h2>🛑 Liquidar Socio</h2>
          <div id="liquidateInfo"></div>
          <form onsubmit="Partners.confirmLiquidate(event)">
            <input type="hidden" id="liqPartnerId">
            <div class="form-group"><label>Monto a pagar para liquidar ($)</label><input type="number" step="0.01" id="liqAmount" required></div>
            <div class="form-group"><label>Notas</label><input type="text" id="liqNotes"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Partners.closeLiquidate()">Cancelar</button>
              <button type="submit" class="btn btn-warning">✅ Liquidar y marcar como inactivo</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  afterRender() {},
  openForm(id) {
    document.getElementById('partnerModal').classList.add('open');
    document.getElementById('partnerForm').reset();
    document.getElementById('partnerId').value = '';
    if (id) {
      const p = this.allPartners.find(x => x.id === id);
      if (!p) return;
      document.getElementById('partnerModalTitle').textContent = 'Editar Socio';
      document.getElementById('partnerId').value = p.id;
      document.getElementById('partnerName').value = p.name;
      document.getElementById('partnerType').value = p.investment_type;
      document.getElementById('partnerInvestment').value = p.investment;
      document.getElementById('partnerDate').value = p.date || '';
      document.getElementById('partnerPhone').value = p.phone || '';
      document.getElementById('partnerNotes').value = p.notes || '';
    } else {
      document.getElementById('partnerModalTitle').textContent = 'Nuevo Socio';
    }
  },
  closeForm() { document.getElementById('partnerModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('partnerId').value;
    const data = {
      id: id ? parseInt(id) : null,
      name: document.getElementById('partnerName').value,
      investment: parseFloat(document.getElementById('partnerInvestment').value) || 0,
      investment_type: document.getElementById('partnerType').value,
      date: document.getElementById('partnerDate').value || null,
      phone: document.getElementById('partnerPhone').value || null,
      notes: document.getElementById('partnerNotes').value || null
    };
    if (data.id) {
      await API.put(`/api/partners/${data.id}`, data);
    } else {
      await API.post('/api/partners', data);
    }
    this.closeForm();
    App.navigate('partners');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este socio definitivamente?')) return;
    await API.delete(`/api/partners/${id}`);
    App.navigate('partners');
  },
  openTx(id) {
    document.getElementById('txModal').classList.add('open');
    document.getElementById('txPartnerId').value = id;
  },
  closeTx() { document.getElementById('txModal').classList.remove('open'); },
  async saveTx(e) {
    e.preventDefault();
    const pid = document.getElementById('txPartnerId').value;
    await API.post(`/api/partners/${pid}/transactions`, {
      date: document.getElementById('txDate').value,
      type: document.getElementById('txType').value,
      amount: parseFloat(document.getElementById('txAmount').value),
      description: document.getElementById('txDesc').value || null
    });
    this.closeTx();
    App.navigate('partners');
  },
  async liquidate(id) {
    const p = this.allPartners.find(x => x.id === id);
    const s = await API.getSummary();
    const totalInv = s.partners.reduce((a, p) => a + p.total_invested, 0);
    const extra = (p.total_expenses_paid || 0) + (p.total_feed_paid || 0) + (p.total_pigs_paid || 0);
    const totalInvested = p.investment + extra;
    const pct = totalInv > 0 ? (totalInvested / totalInv * 100) : 0;
    const profitShare = s.profit > 0 ? s.profit * (pct / 100) : 0;
    const returned = p.total_returned || 0;
    const totalOwed = totalInvested + profitShare - returned;

    document.getElementById('liquidateModal').classList.add('open');
    document.getElementById('liqPartnerId').value = id;
    document.getElementById('liqAmount').value = totalOwed > 0 ? totalOwed.toFixed(2) : '0';
    document.getElementById('liquidateInfo').innerHTML = `
      <table>
        <tr><td>Socio</td><td><strong>${p.name}</strong></td></tr>
        <tr><td>Aporte inicial</td><td>$${p.investment.toFixed(2)}</td></tr>
        <tr><td>Gastos pagados por él</td><td>$${extra.toFixed(2)}</td></tr>
        <tr><td>Inversión total</td><td><strong>$${totalInvested.toFixed(2)}</strong></td></tr>
        <tr><td>Participación</td><td>${pct.toFixed(1)}%</td></tr>
        <tr><td>Ganancia que le corresponde</td><td>$${profitShare.toFixed(2)}</td></tr>
        <tr><td>Ya se le ha pagado</td><td>$${returned.toFixed(2)}</td></tr>
        <tr style="font-weight:700;background:#fff3e0"><td><strong>Total a pagar para liquidar</strong></td><td style="color:#e65100"><strong>$${totalOwed > 0 ? totalOwed.toFixed(2) : '0.00'}</strong></td></tr>
      </table>
      <p style="font-size:0.85rem;color:#666;margin:8px 0">Al liquidarlo, el socio queda inactivo y ya no participa en ganancias futuras. Todos los activos pasan a ser del negocio.</p>
    `;
  },
  closeLiquidate() { document.getElementById('liquidateModal').classList.remove('open'); },
  async confirmLiquidate(e) {
    e.preventDefault();
    const pid = document.getElementById('liqPartnerId').value;
    const amount = parseFloat(document.getElementById('liqAmount').value);
    if (amount > 0) {
      await API.post(`/api/partners/${pid}/transactions`, {
        date: new Date().toISOString().split('T')[0],
        type: 'return',
        amount,
        description: document.getElementById('liqNotes').value || 'Liquidación total'
      });
    }
    await API.put(`/api/partners/${pid}`, { status: 'liquidated' });
    this.closeLiquidate();
    App.navigate('partners');
  }
};