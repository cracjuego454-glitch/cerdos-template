const Reports = {
  pigs: [],
  batches: [],
  async render() {
    this.pigs = await API.getPigs();
    this.batches = await API.getBatches();
    return `
      <div class="toolbar"><h2>📋 Reportes</h2><button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / PDF</button></div>
      <div class="grid-2">
        <div class="card">
          <h2>📊 Resumen por Cerdo</h2>
          <div class="form-group">
            <label>Cerdo</label>
            <select id="reportPigId" onchange="Reports.loadPigReport()">
              <option value="">Seleccionar...</option>
              ${this.pigs.map(p => `<option value="${p.id}">${p.identifier}${p.name ? ' - ' + p.name : ''}</option>`).join('')}
            </select>
          </div>
          <div id="pigReport"></div>
        </div>
        <div class="card">
          <h2>🏷️ Reporte por Lote</h2>
          <div class="form-group">
            <label>Lote</label>
            <select id="reportBatchId" onchange="Reports.loadBatchReport()">
              <option value="">Seleccionar...</option>
              ${this.batches.map(b => `<option value="${b.id}">${b.name} (${b.pig_count} cerdos)</option>`).join('')}
            </select>
          </div>
          <div id="batchReport"></div>
        </div>
      </div>
      <div class="card">
        <h2>📈 Comparar Lotes</h2>
        <div class="form-row">
          <div class="form-group">
            <label>Lotes a comparar</label>
            <select id="compareBatch1" style="margin-bottom:8px">
              <option value="">Seleccionar...</option>
              ${this.batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
            <select id="compareBatch2" style="margin-bottom:8px">
              <option value="">Seleccionar...</option>
              ${this.batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
            <select id="compareBatch3">
              <option value="">Seleccionar...</option>
              ${this.batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="align-self:flex-end">
            <button class="btn btn-primary" onclick="Reports.compareBatches()">Comparar</button>
          </div>
        </div>
        <div id="compareResult"></div>
      </div>
      <div class="card">
        <h2>📈 Análisis de Alimentación</h2>
        <div class="chart-container"><canvas id="chartFeedingReport"></canvas></div>
        <div id="feedingAnalysis"></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h2>📈 Proyección de Ventas</h2>
          <p><small>Estima cuándo cada cerdo alcanzará peso de venta</small></p>
          <div class="form-group">
            <label>Peso objetivo (kg)</label>
            <div style="display:flex;gap:8px">
              <input type="number" id="projectTargetWeight" value="100" style="flex:1">
              <button class="btn btn-primary" onclick="Reports.loadSalesProjection()">Calcular</button>
            </div>
          </div>
          <div id="salesProjection"></div>
        </div>
        <div class="card">
          <h2>🥣 Consumo Proyectado</h2>
          <p><small>Proyección de alimento necesario</small></p>
          <div class="form-group">
            <label>Días a proyectar</label>
            <div style="display:flex;gap:8px">
              <select id="projectDays">
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="30" selected>30 días</option>
              </select>
              <button class="btn btn-primary" onclick="Reports.loadFeedProjection()">Calcular</button>
            </div>
          </div>
          <div id="feedProjection"></div>
        </div>
      </div>
    `;
  },
  afterRender() {},
  async loadPigReport() {
    const id = parseInt(document.getElementById('reportPigId').value);
    if (!id) { document.getElementById('pigReport').innerHTML = ''; return; }
    const r = await API.getPigReport(id);
    const container = document.getElementById('pigReport');
    const totalInvestment = r.pig.purchase_cost + r.totalFeedCost + r.totalHealthCost + r.totalExpensesOnPig;
    const firstW = r.weightRecords.length > 1 ? r.weightRecords[0].weight_kg : 0;
    const lastW = r.weightRecords.length > 0 ? r.weightRecords[r.weightRecords.length-1].weight_kg : 0;
    const gained = lastW - firstW;
    const conversion = r.totalFeedKg > 0 && gained > 0 ? (r.totalFeedKg / gained).toFixed(2) : '-';
    const saleIncome = r.saleRecord ? r.saleRecord.total_amount : 0;
    const profit = saleIncome - totalInvestment;
    container.innerHTML = `
      <hr style="margin:12px 0">
      <h3>${r.pig.identifier} ${r.pig.name ? '- ' + r.pig.name : ''} <span class="badge badge-${r.pig.status}">${r.pig.status}</span></h3>
      <table>
        <tr><td>Costo de compra</td><td><strong>$${r.pig.purchase_cost.toFixed(2)}</strong></td></tr>
        <tr><td>Total alimento</td><td><strong>$${r.totalFeedCost.toFixed(2)}</strong> (${r.totalFeedKg.toFixed(1)} kg)</td></tr>
        <tr><td>Total salud</td><td><strong>$${r.totalHealthCost.toFixed(2)}</strong></td></tr>
        <tr><td>Otros gastos</td><td><strong>$${r.totalExpensesOnPig.toFixed(2)}</strong></td></tr>
        <tr><td>Peso inicial → final</td><td>${firstW.toFixed(1)} → ${lastW.toFixed(1)} kg (${gained > 0 ? '+' : ''}${gained.toFixed(1)} kg)</td></tr>
        <tr><td>Conversión alimenticia</td><td><strong>${conversion}</strong> kg de comida / kg ganado</td></tr>
        <tr style="font-weight:700"><td>Inversión total</td><td><strong>$${totalInvestment.toFixed(2)}</strong></td></tr>
      </table>
      ${r.saleRecord ? `
      <h3 style="margin-top:12px">💰 Venta</h3>
      <table>
        <tr><td>Fecha de venta</td><td>${r.saleRecord.date}</td></tr>
        <tr><td>Comprador</td><td>${r.saleRecord.buyer_name || '-'}</td></tr>
        <tr><td>Monto de venta</td><td><strong>$${saleIncome.toFixed(2)}</strong></td></tr>
        <tr style="font-weight:700;background:${profit >= 0 ? '#e8f5e9' : '#fbe9e7'}"><td>${profit >= 0 ? '✅ Ganancia' : '❌ Pérdida'}</td><td style="color:${profit >= 0 ? '#2e7d32' : '#c62828'}"><strong>$${profit.toFixed(2)}</strong></td></tr>
      </table>` : '<div class="alert alert-info" style="margin-top:12px">🐖 Este cerdo aún está activo — no se ha vendido aún</div>'}
      ${r.weightRecords.length > 0 ? `
        <h3 style="margin-top:12px">⚖️ Evolución de Peso</h3>
        <table>
          <tr><th>Fecha</th><th>Peso</th><th>Ganancia</th></tr>
          ${r.weightRecords.map((w, i) => `
            <tr>
              <td>${w.date}</td>
              <td>${w.weight_kg} kg</td>
              <td>${i > 0 ? '+' + (w.weight_kg - r.weightRecords[i-1].weight_kg).toFixed(1) + ' kg' : '-'}</td>
            </tr>
          `).join('')}
        </table>
      ` : ''}
      ${r.healthRecords.length > 0 ? `
        <h3 style="margin-top:12px">💊 Salud</h3>
        <table>
          <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th></tr>
          ${r.healthRecords.map(h => `<tr><td>${h.date}</td><td>${h.record_type}</td><td>${h.description || '-'}</td></tr>`).join('')}
        </table>
      ` : ''}
    `;

    // Feeding chart
    if (document.getElementById('chartFeedingReport')) {
      if (window._feedChart) window._feedChart.destroy();
      const feedByDate = {};
      r.feedRecords.forEach(f => { feedByDate[f.date] = (feedByDate[f.date] || 0) + f.quantity_kg; });
      const dates = Object.keys(feedByDate).sort();
      const data = dates.map(d => feedByDate[d]);
      window._feedChart = new Chart(document.getElementById('chartFeedingReport'), {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'kg/día', data, borderColor: '#4fc3f7', fill: true, tension: 0.3 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }
  },
  async loadBatchReport() {
    const id = parseInt(document.getElementById('reportBatchId').value);
    if (!id) { document.getElementById('batchReport').innerHTML = ''; return; }
    const r = await API.get(`/api/reports/batch/${id}`);
    const c = document.getElementById('batchReport');
    const investment = r.totals.total_purchase + r.totals.total_feed + r.totals.total_health + r.totals.total_expenses;
    const profit = r.totals.total_sales - investment;
    const alive = r.pigs.filter(p => p.status === 'active').length;
    const sold = r.pigs.filter(p => p.status === 'sold').length;
    const dead = r.pigs.filter(p => p.status === 'dead').length;
    c.innerHTML = `
      <hr style="margin:12px 0">
      <h3>🏷️ ${r.batch.name}</h3>
      <table>
        <tr><td>Total cerdos</td><td><strong>${r.pigs.length}</strong></td></tr>
        <tr><td>Activos / Vendidos / Muertos</td><td>${alive} / ${sold} / ${dead}</td></tr>
        <tr><td>Costo de compra</td><td><strong>$${r.totals.total_purchase.toFixed(2)}</strong></td></tr>
        <tr><td>Total alimento</td><td><strong>$${r.totals.total_feed.toFixed(2)}</strong></td></tr>
        <tr><td>Total salud</td><td><strong>$${r.totals.total_health.toFixed(2)}</strong></td></tr>
        <tr><td>Otros gastos</td><td><strong>$${r.totals.total_expenses.toFixed(2)}</strong></td></tr>
        <tr style="font-weight:700"><td>Inversión total</td><td><strong>$${investment.toFixed(2)}</strong></td></tr>
        <tr><td>Total ventas</td><td><strong>$${r.totals.total_sales.toFixed(2)}</strong></td></tr>
        <tr style="font-weight:700;background:${profit >= 0 ? '#e8f5e9' : '#fbe9e7'}"><td>${profit >= 0 ? '✅ Ganancia' : '❌ Pérdida'}</td><td style="color:${profit >= 0 ? '#2e7d32' : '#c62828'}"><strong>$${profit.toFixed(2)}</strong></td></tr>
      </table>
      <h3 style="margin-top:12px">Cerdos del Lote</h3>
      <table>
        <tr><th>ID</th><th>Estado</th><th>Compra</th><th>Venta</th></tr>
        ${r.pigs.map(p => `
          <tr><td>${p.identifier}</td><td><span class="badge badge-${p.status}">${p.status}</span></td>
          <td>$${(p.purchase_cost || 0).toFixed(2)}</td>
          <td>${p.status === 'sold' ? '💲 Vendido' : '-'}</td></tr>
        `).join('')}
      </table>
    `;
  },
  async loadSalesProjection() {
    const target = parseInt(document.getElementById('projectTargetWeight').value) || 100;
    const data = await API.get(`/api/reports/sales-projection?target_weight=${target}`);
    const c = document.getElementById('salesProjection');
    const readyPigs = data.filter(p => p.daysToTarget !== null && p.daysToTarget <= 0);
    const nearPigs = data.filter(p => p.daysToTarget !== null && p.daysToTarget > 0 && p.daysToTarget <= 30);
    const rest = data.filter(p => p.daysToTarget === null || p.daysToTarget > 30);
    c.innerHTML = `
      ${readyPigs.length ? `<div class="alert alert-success"><strong>⚠️ ${readyPigs.length} cerdo(s) listo(s) para vender!</strong></div>` : ''}
      ${data.length ? `
      <table>
        <tr><th>ID</th><th>Peso actual</th><th>Ganancia/día</th><th>Falta</th><th>Proyección</th></tr>
        ${data.map(p => `
          <tr style="background:${p.daysToTarget !== null && p.daysToTarget <= 0 ? '#e8f5e9' : p.daysToTarget !== null && p.daysToTarget <= 30 ? '#fff8e1' : ''}">
            <td>${p.identifier}</td>
            <td>${p.current_weight} kg</td>
            <td>${p.avgDailyGain > 0 ? p.avgDailyGain + ' kg' : '🐣 sin datos'}</td>
            <td>${p.daysToTarget !== null ? p.remainingKg + ' kg (' + p.daysToTarget + ' días)' : '-'}</td>
            <td>${p.projectedDate || '-'}</td>
          </tr>
        `).join('')}
      </table>` : '<p>No hay cerdos activos con datos de peso</p>'}
      <p style="color:#999;margin-top:8px;font-size:0.85rem">✅ Fondo verde = listo para vender · 🟡 Amarillo = próximo mes</p>
    `;
  },
  async loadFeedProjection() {
    const days = parseInt(document.getElementById('projectDays').value);
    const data = await API.get(`/api/reports/feed-projection?days=${days}`);
    const c = document.getElementById('feedProjection');
    c.innerHTML = `
      <table>
        <tr><td>Cerdos activos</td><td><strong>${data.activePigs}</strong></td></tr>
        <tr><td>Cerdos con registro de comida</td><td><strong>${data.pigsWithFeed}</strong></td></tr>
        <tr><td>Consumo promedio / cerdo / día</td><td><strong>${data.avgPerPig} kg</strong></td></tr>
        <tr style="font-weight:700"><td>Total proyectado (${data.days} días)</td><td><strong>${data.totalProjected} kg</strong></td></tr>
        <tr><td>Costo promedio x kg</td><td><strong>$${data.avgCostPerKg.toFixed(2)}</strong></td></tr>
        <tr style="font-weight:700"><td>Costo total proyectado</td><td><strong>$${data.costProjected.toFixed(2)}</td></tr>
      </table>
    `;
  },
  async compareBatches() {
    const ids = [1,2,3].map(i => parseInt(document.getElementById(`compareBatch${i}`).value)).filter(Boolean);
    if (ids.length < 2) { document.getElementById('compareResult').innerHTML = '<div class="alert alert-warning">Selecciona al menos 2 lotes para comparar</div>'; return; }
    const data = await API.post('/api/reports/compare-batches', { batch_ids: ids });
    const c = document.getElementById('compareResult');
    c.innerHTML = `
      <hr style="margin:12px 0">
      <h3>📊 Comparación de Lotes</h3>
      <table>
        <tr><th>Indicador</th>${data.map(d => `<th>${d.batch.name}</th>`).join('')}</tr>
        <tr><td>Cerdos</td>${data.map(d => `<td>${d.pigCount}</td>`).join('')}</tr>
        <tr><td>Vendidos</td>${data.map(d => `<td>${d.soldCount}</td>`).join('')}</tr>
        <tr><td>Muertos</td>${data.map(d => `<td style="color:#c62828">${d.deadCount}</td>`).join('')}</tr>
        <tr><td>Compra</td>${data.map(d => `<td>$${d.total_purchase.toFixed(2)}</td>`).join('')}</tr>
        <tr><td>Alimento</td>${data.map(d => `<td>$${d.total_feed.toFixed(2)}</td>`).join('')}</tr>
        <tr><td>Salud</td>${data.map(d => `<td>$${d.total_health.toFixed(2)}</td>`).join('')}</tr>
        <tr><td>Gastos</td>${data.map(d => `<td>$${d.total_expenses.toFixed(2)}</td>`).join('')}</tr>
        <tr style="font-weight:700"><td>Inversión</td>${data.map(d => `<td>$${(d.total_purchase + d.total_feed + d.total_health + d.total_expenses).toFixed(2)}</td>`).join('')}</tr>
        <tr style="font-weight:700"><td>Ventas</td>${data.map(d => `<td>$${d.total_sales.toFixed(2)}</td>`).join('')}</tr>
        ${(() => {
          const profits = data.map(d => d.total_sales - d.total_purchase - d.total_feed - d.total_health - d.total_expenses);
          const maxProfit = Math.max(...profits);
          const bestIdx = profits.indexOf(maxProfit);
          return `<tr style="font-weight:700"><td>🥇 Ganancia</td>${profits.map((p, i) =>
            `<td style="color:${p >= 0 ? '#2e7d32' : '#c62828'};background:${i === bestIdx && maxProfit > 0 ? '#fff8e1' : 'transparent'}">${p >= 0 ? '+' : ''}$${p.toFixed(2)}${i === bestIdx && maxProfit > 0 ? ' 🏆' : ''}</td>`
          ).join('')}</tr>`;
        })()}
        <tr><td>Costo x cerdo</td>${data.map(d => `<td>$${d.pigCount > 0 ? ((d.total_purchase + d.total_feed + d.total_health + d.total_expenses) / d.pigCount).toFixed(2) : 0}</td>`).join('')}</tr>
      </table>
    `;
  }
};
