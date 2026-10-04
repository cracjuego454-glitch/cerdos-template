const Reproduction = {
  records: [],
  async render() {
    this.records = await API.get('/api/reproduction');
    const sows = await API.get('/api/pigs?status=active');
    return `
      <div class="toolbar"><h2>🧬 Reproducción</h2><button class="btn btn-primary" onclick="Reproduction.openForm()">+ Nueva Monta</button></div>
      <div class="card">
        <div class="table-container">
          <table>
            <tr><th>Cerda</th><th>Verraco</th><th>Monta</th><th>Parto esperado</th><th>Parto real</th><th>Lechones vivos</th><th>Resultado</th><th>Acciones</th></tr>
            ${this.records.length ? this.records.map(r => `
              <tr>
                <td>${r.sow_identifier}</td><td>${r.boar_identifier || '-'}</td>
                <td>${r.mating_date}</td>
                <td>${r.expected_farrowing_date || '-'}</td>
                <td>${r.farrowing_date || '-'}</td>
                <td>${r.piglets_alive || 0} v / ${r.piglets_dead || 0} m</td>
                <td>${r.result || 'Pendiente'}</td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="Reproduction.openForm(${r.id})">✏️</button>
                  ${r.farrowing_date && r.piglets_alive > 0 ? `<button class="btn btn-sm btn-success" onclick="Reproduction.createPiglets(${r.id})">➕ Lechones</button>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="Reproduction.delete(${r.id})">🗑️</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="8" class="empty"><p>No hay registros de reproducción</p></td></tr>'}
          </table>
        </div>
      </div>
      <div class="card">
        <h3>Cerda</h3>
        <div class="form-group">
          <label>Cerda (Hembra)</label>
          <select id="reproSowId" onchange="Reproduction.loadSowInfo()">
            <option value="">Seleccionar...</option>
            ${sows.filter(s => s.sex === 'hembra').map(s => `<option value="${s.id}">${s.identifier}${s.name ? ' - ' + s.name : ''}</option>`).join('')}
          </select>
          <div id="reproSowInfo" style="font-size:0.85rem;margin-top:4px"></div>
        </div>
      </div>
      <div id="pigletModal" class="modal">
        <div class="modal-content">
          <h2>🐷 Registrar Lechones como Cerdos</h2>
          <form id="pigletForm" onsubmit="Reproduction.savePiglets(event)">
            <input type="hidden" id="pigletReproId">
            <div class="form-group"><label>Prefijo para identificador</label>
              <input type="text" id="pigletPrefix" placeholder="Ej: LECHON-001" required>
              <small style="color:#999">Se auto-incrementará (ej: LECHON-001, LECHON-002...)</small>
            </div>
            <div class="form-row">
              <div class="form-group"><label>¿Cuántos?</label>
                <input type="number" id="pigletCount" min="1" max="20" required>
              </div>
              <div class="form-group"><label>Sexo</label>
                <select id="pigletSex">
                  <option value="macho">♂ Machos</option>
                  <option value="hembra">♀ Hembras</option>
                  <option value="mixto">♂ ♀ Mixto (mitad y mitad)</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Lote (opcional)</label>
              <select id="pigletBatch">
                <option value="">Sin lote</option>
              </select>
            </div>
            <div class="form-group"><label>Notas comunes</label>
              <textarea id="pigletNotes" rows="2" placeholder="Ej: Hijos de CERDA-X con VERRACO-Y"></textarea>
            </div>
            <div style="background:#f5f5f5;padding:10px;border-radius:8px;margin:8px 0">
              <strong>🐖 Se crearán: <span id="pigletPreview">0</span> cerdos</strong>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Reproduction.closePigletForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">✅ Crear Lechones</button>
            </div>
          </form>
        </div>
      </div>
      <div id="reproductionModal" class="modal">
        <div class="modal-content">
          <h2 id="reproductionModalTitle">Nueva Monta</h2>
          <form id="reproductionForm" onsubmit="Reproduction.save(event)">
            <input type="hidden" id="reproductionId">
            <div class="form-row">
              <div class="form-group"><label>Cerda *</label>
                <select id="reproductionSowId" required>
                  <option value="">Seleccionar...</option>
                  ${sows.filter(s => s.sex === 'hembra').map(s => `<option value="${s.id}">${s.identifier}${s.name ? ' - ' + s.name : ''}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label>Verraco</label>
                <select id="reproductionBoarId">
                  <option value="">Seleccionar...</option>
                  ${sows.filter(s => s.sex === 'macho').map(s => `<option value="${s.id}">${s.identifier}${s.name ? ' - ' + s.name : ''}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Monta *</label><input type="date" id="reproductionMatingDate" required></div>
              <div class="form-group"><label>Fecha Esperada de Parto</label><input type="date" id="reproductionExpectedDate"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Fecha de Parto Real</label><input type="date" id="reproductionFarrowingDate" onchange="Reproduction.calcResult()"></div>
              <div class="form-group"><label>Lechones Vivos</label><input type="number" id="reproductionPigletsAlive" onchange="Reproduction.calcResult()"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Lechones Muertos</label><input type="number" id="reproductionPigletsDead" onchange="Reproduction.calcResult()"></div>
              <div class="form-group"><label>Resultado</label>
                <select id="reproductionResult">
                  <option value="">Pendiente</option>
                  <option value="Exitosa">✅ Exitosa</option>
                  <option value="Fallida">❌ Fallida</option>
                  <option value="En proceso">🔄 En proceso</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Notas</label><textarea id="reproductionNotes" rows="2"></textarea></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="Reproduction.closeForm()">Cancelar</button>
              <button type="submit" class="btn btn-success">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
  async createPiglets(id) {
    const r = this.records.find(x => x.id === id);
    if (!r) return;
    document.getElementById('pigletReproId').value = id;
    document.getElementById('pigletCount').value = r.piglets_alive || 1;
    document.getElementById('pigletNotes').value = `Hijos de ${r.sow_identifier}${r.boar_identifier ? ' con ' + r.boar_identifier : ''} (monta: ${r.mating_date})`;
    const prefix = r.sow_identifier + '-L';
    document.getElementById('pigletPrefix').value = prefix;
    document.getElementById('pigletPreview').textContent = r.piglets_alive || 1;
    const batches = await API.getBatches();
    const batchSel = document.getElementById('pigletBatch');
    batchSel.innerHTML = '<option value="">Sin lote</option>' + batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    const countInput = document.getElementById('pigletCount');
    countInput.oninput = () => {
      document.getElementById('pigletPreview').textContent = countInput.value || 0;
    };
    document.getElementById('pigletModal').classList.add('open');
  },
  closePigletForm() { document.getElementById('pigletModal').classList.remove('open'); },
  async savePiglets(e) {
    e.preventDefault();
    const count = parseInt(document.getElementById('pigletCount').value);
    const prefix = document.getElementById('pigletPrefix').value.trim();
    const sex = document.getElementById('pigletSex').value;
    const batchId = parseInt(document.getElementById('pigletBatch').value) || null;
    const notes = document.getElementById('pigletNotes').value || '';
    if (!prefix || !count) return alert('Completa los campos');
    if (!confirm(`¿Crear ${count} cerdos con prefijo "${prefix}"?`)) return;
    const reproId = document.getElementById('pigletReproId').value;
    const r = this.records.find(x => x.id === parseInt(reproId));
    for (let i = 1; i <= count; i++) {
      const pigSex = sex === 'mixto' ? (i <= Math.ceil(count / 2) ? 'macho' : 'hembra') : sex;
      const identifier = `${prefix}${String(i).padStart(2, '0')}`;
      await API.post('/api/pigs', {
        identifier, sex: pigSex, notes,
        batch_id: batchId,
        birth_date: r ? r.farrowing_date || null : null,
        purchase_cost: 0
      });
    }
    this.closePigletForm();
    App.navigate('reproduction');
  },
  afterRender() {
    const matingInput = document.getElementById('reproductionMatingDate');
    const expectedInput = document.getElementById('reproductionExpectedDate');
    if (matingInput && expectedInput) {
      matingInput.addEventListener('change', () => {
        if (matingInput.value && !expectedInput.value) {
          const d = new Date(matingInput.value);
          d.setDate(d.getDate() + 114);
          expectedInput.value = d.toISOString().split('T')[0];
        }
      });
    }
  },
  calcResult() {
    const alive = parseInt(document.getElementById('reproductionPigletsAlive').value) || 0;
    const dead = parseInt(document.getElementById('reproductionPigletsDead').value) || 0;
    const farrowing = document.getElementById('reproductionFarrowingDate').value;
    if (farrowing && alive > 0) {
      document.getElementById('reproductionResult').value = 'Exitosa';
    } else if (farrowing && alive === 0 && dead > 0) {
      document.getElementById('reproductionResult').value = 'Fallida';
    }
  },
  loadSowInfo() {
    const id = parseInt(document.getElementById('reproSowId').value);
    const info = document.getElementById('reproSowInfo');
    if (!id) { info.innerHTML = ''; return; }
    const prev = this.records.filter(r => r.sow_id === id).sort((a,b) => b.id - a.id);
    info.innerHTML = `<span style="color:#1565c0">🧬 ${prev.length} montas registradas — última: ${prev[0] ? prev[0].mating_date + (prev[0].result ? ' (' + prev[0].result + ')' : '') : 'ninguna'}</span>`;
  },
  openForm(id) {
    document.getElementById('reproductionModal').classList.add('open');
    document.getElementById('reproductionForm').reset();
    document.getElementById('reproductionId').value = '';
    document.getElementById('reproductionModalTitle').textContent = 'Nueva Monta';
    if (id) {
      const r = this.records.find(x => x.id === id);
      if (!r) return;
      document.getElementById('reproductionModalTitle').textContent = 'Editar Monta';
      document.getElementById('reproductionId').value = r.id;
      document.getElementById('reproductionSowId').value = r.sow_id;
      document.getElementById('reproductionBoarId').value = r.boar_id || '';
      document.getElementById('reproductionMatingDate').value = r.mating_date;
      document.getElementById('reproductionExpectedDate').value = r.expected_farrowing_date || '';
      document.getElementById('reproductionFarrowingDate').value = r.farrowing_date || '';
      document.getElementById('reproductionPigletsAlive').value = r.piglets_alive || 0;
      document.getElementById('reproductionPigletsDead').value = r.piglets_dead || 0;
      document.getElementById('reproductionResult').value = r.result || '';
      document.getElementById('reproductionNotes').value = r.notes || '';
    }
  },
  closeForm() { document.getElementById('reproductionModal').classList.remove('open'); },
  async save(e) {
    e.preventDefault();
    const id = document.getElementById('reproductionId').value;
    const data = {
      sow_id: parseInt(document.getElementById('reproductionSowId').value),
      boar_id: parseInt(document.getElementById('reproductionBoarId').value) || null,
      mating_date: document.getElementById('reproductionMatingDate').value,
      expected_farrowing_date: document.getElementById('reproductionExpectedDate').value || null,
      farrowing_date: document.getElementById('reproductionFarrowingDate').value || null,
      piglets_alive: parseInt(document.getElementById('reproductionPigletsAlive').value) || 0,
      piglets_dead: parseInt(document.getElementById('reproductionPigletsDead').value) || 0,
      result: document.getElementById('reproductionResult').value || null,
      notes: document.getElementById('reproductionNotes').value || null
    };
    if (id) {
      await API.put(`/api/reproduction/${id}`, data);
    } else {
      await API.post('/api/reproduction', data);
    }
    this.closeForm();
    App.navigate('reproduction');
  },
  async delete(id) {
    if (!confirm('¿Eliminar este registro de reproducción?')) return;
    await API.delete(`/api/reproduction/${id}`);
    App.navigate('reproduction');
  }
};