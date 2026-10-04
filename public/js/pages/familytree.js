const FamilyTree = {
  pigs: [],
  async render() {
    this.pigs = await API.getPigs();
    return `
      <div class="toolbar"><h2>🌳 Árbol Genealógico</h2></div>
      <div class="card">
        <div class="form-group">
          <label>Selecciona un cerdo</label>
          <select id="treePigId" onchange="FamilyTree.load()">
            <option value="">Seleccionar...</option>
            ${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''} (${p.sex || '-'})</option>`).join('')}
          </select>
        </div>
        <div id="treeResult"></div>
      </div>
    `;
  },
  afterRender() {},
  async load() {
    const id = parseInt(document.getElementById('treePigId').value);
    if (!id) { document.getElementById('treeResult').innerHTML = ''; return; }
    const data = await API.get(`/api/family-tree/${id}`);
    const c = document.getElementById('treeResult');
    let html = `<hr style="margin:12px 0">`;
    // Current pig
    html += `<div style="text-align:center;padding:16px;background:#e3f2fd;border-radius:12px;margin:8px 0">
      <h3>🐖 ${data.pig.identifier}</h3>
      <p>${data.pig.name || ''} ${data.pig.sex === 'hembra' ? '♀ Hembra' : '♂ Macho'} · ${data.pig.status}</p>
    </div>`;
    // As parent (descendants)
    if (data.asParent && data.asParent.length > 0) {
      html += `<h3 style="margin-top:16px">🧬 Como reproductor:</h3>`;
      for (const r of data.asParent) {
        const isMother = r.sow_id === data.pig.id;
        html += `<div style="background:#f5f5f5;padding:10px;border-radius:8px;margin:4px 0">
          <strong>${isMother ? '🤱 Madre' : '👨 Padre'}</strong> · Monta: ${r.mating_date}
          ${r.farrowing_date ? `· Parto: ${r.farrowing_date} · ${r.piglets_alive || 0} lechones` : '· Sin parto registrado'}
          ${r.result ? `· ${r.result}` : ''}
          ${isMother ? '' : `<br><small>Con: ${r.sow_identifier}</small>`}
          ${!isMother ? '' : `<br><small>Con: ${r.boar_identifier || 'desconocido'}</small>`}
        </div>`;
      }
    } else {
      html += `<div class="alert alert-info" style="margin-top:12px">Este cerdo no tiene registros de reproducción como padre o madre</div>`;
    }
    // Info about how to trace
    html += `<div style="margin-top:16px;padding:10px;background:#fff8e1;border-radius:8px;font-size:0.85rem">
      💡 Para conectar padres con hijos, cuando crees lechones desde un parto, los cerdos quedan vinculados a la monta.
    </div>`;
    c.innerHTML = html;
  }
};