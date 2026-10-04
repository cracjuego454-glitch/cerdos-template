const Dashboard = {
  async render() {
    const s = await API.getSummary();
    return `
      <h2 style="margin-bottom:20px">📊 Dashboard</h2>
      <div class="grid-4">
        <div class="card stat-card"><div class="stat-icon">🐖</div><div class="stat-value">${s.activePigs}</div><div class="stat-label">Cerdos Activos</div></div>
        <div class="card stat-card"><div class="stat-icon">🌾</div><div class="stat-value">${s.totalFeedKg.toFixed(1)} kg</div><div class="stat-label">Alimento Total</div></div>
        <div class="card stat-card"><div class="stat-icon">💵</div><div class="stat-value">$${s.totalSales.toFixed(2)}</div><div class="stat-label">Ingresos</div></div>
        <div class="card stat-card"><div class="stat-icon">📊</div><div class="stat-value" style="color:${s.profit >= 0 ? '#2e7d32' : '#c62828'}">$${s.profit.toFixed(2)}</div><div class="stat-label">Ganancia Neta</div></div>
      </div>
      <div class="grid-3">
        <div class="card">
          <h2>💰 Gastos vs Ingresos</h2>
          <div class="chart-container"><canvas id="chartFinancial"></canvas></div>
        </div>
        <div class="card">
          <h2>🌾 Costo de Alimento</h2>
          <div class="chart-container"><canvas id="chartFeed"></canvas></div>
        </div>
        <div class="card">
          <h2>⚖️ Últimos Pesos</h2>
          <div id="recentWeights">${s.recentWeights.length ? `<table><tr><th>Cerdo</th><th>Peso</th><th>Fecha</th></tr>${s.recentWeights.slice(0,10).map(w => `<tr><td>${w.identifier}</td><td>${w.weight_kg} kg</td><td>${w.date}</td></tr>`).join('')}</table>` : '<div class="empty"><p>Aún no hay registros de peso</p></div>'}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h2>⏰ Próximos eventos de salud</h2>
          ${s.upcomingHealth && s.upcomingHealth.length ? `<table><tr><th>Cerdo</th><th>Evento</th><th>Próximo</th></tr>${s.upcomingHealth.map(h => `<tr><td>${h.pig_identifier}</td><td>${h.record_type}</td><td>${h.next_due_date}</td></tr>`).join('')}</table>` : '<div class="empty"><p>No hay eventos próximos</p></div>'}
        </div>
        <div class="card">
          <h2>📈 Conversión alimenticia</h2>
          ${s.feedConversion && s.feedConversion.length ? `<table><tr><th>Cerdo</th><th>Kg comido</th><th>Kg ganado</th><th>Conversión</th></tr>${s.feedConversion.map(f => {
            const gained = f.last_weight - f.first_weight;
            const conv = gained > 0 ? (f.total_feed_kg / gained).toFixed(2) : '-';
            return `<tr><td>${f.identifier}</td><td>${f.total_feed_kg.toFixed(1)}</td><td>${gained.toFixed(1)}</td><td><strong>${conv}</strong></td></tr>`;
          }).join('')}</table><p style="font-size:0.8rem;color:#888;margin-top:6px">Menor número = más eficiente</p>` : '<div class="empty"><p>Faltan datos de peso y comida</p></div>'}
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px">
          <h2 style="margin:0">📋 Resumen Financiero</h2>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" onclick="Dashboard.backup()">💾 Respaldo</button>
            <button class="btn btn-warning" onclick="Dashboard.restore()">📂 Restaurar</button>
          </div>
        </div>
        <table>
          <tr><td>Total invertido en alimento</td><td><strong>$${s.totalFeedCost.toFixed(2)}</strong></td></tr>
          <tr><td>Total otros gastos</td><td><strong>$${s.totalExpenses.toFixed(2)}</strong></td></tr>
          <tr><td>Total ingresos por ventas</td><td><strong>$${s.totalSales.toFixed(2)}</strong></td></tr>
          <tr style="font-weight:700;background:#f0faf0"><td>Ganancia / Pérdida Neta</td><td style="color:${s.profit >= 0 ? '#2e7d32' : '#c62828'}">$${s.profit.toFixed(2)}</td></tr>
        </table>
      </div>
      ${s.partners && s.partners.length > 0 ? `
      <div class="card">
        <h2>🤝 Reparto de Ganancias entre Socios</h2>
        <p style="font-size:0.85rem;color:#666;margin-bottom:12px">Calculado sobre el total real invertido (aporte inicial + gastos pagados por cada socio)</p>
        <table>
          <tr><th>Socio</th><th>Aporte inicial</th><th>Gastos pagados</th><th>Inversión total</th><th>%</th><th>Ganancia que le corresponde</th></tr>
          ${(() => {
            const totalInv = s.partners.reduce((a, p) => a + p.total_invested, 0);
            const profit = s.profit;
            return s.partners.map(p => {
              const extra = p.total_expenses_paid + p.total_feed_paid + p.total_pigs_paid;
              const pct = totalInv > 0 ? (p.total_invested / totalInv * 100) : 0;
              const share = profit * (pct / 100);
              return `<tr>
                <td><strong>${p.name}</strong></td>
                <td>$${p.investment.toFixed(2)}</td>
                <td>$${extra.toFixed(2)}</td>
                <td><strong>$${p.total_invested.toFixed(2)}</strong></td>
                <td>${pct.toFixed(1)}%</td>
                <td style="color:${share >= 0 ? '#2e7d32' : '#c62828'};font-weight:700">$${share.toFixed(2)}</td>
              </tr>`;
            }).join('');
          })()}
        </table>
      </div>` : ''}
    `;
  },
  async afterRender() {
    const s = await API.getSummary();
    new Chart(document.getElementById('chartFinancial'), {
      type: 'doughnut',
      data: { labels: ['Gastos (Comida)', 'Otros Gastos', 'Ingresos'], datasets: [{ data: [s.totalFeedCost, s.totalExpenses, s.totalSales], backgroundColor: ['#ffa726', '#ef5350', '#66bb6a'] }] }
    });
    new Chart(document.getElementById('chartFeed'), {
      type: 'bar',
      data: { labels: ['Costo Total', 'Cantidad Total'], datasets: [{ label: 'Alimento', data: [s.totalFeedCost, s.totalFeedKg], backgroundColor: ['#4fc3f7', '#ab47bc'] }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  },
  async backup() {
    const data = await API.get('/api/backup');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `respaldo-cerdos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    alert('✅ Respaldo descargado. Guárdalo en un lugar seguro.');
  },
  restore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm('⚠️ Esto borrará TODOS los datos actuales y los reemplazará con el respaldo. ¿Continuar?')) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await API.post('/api/restore', data);
      alert(`✅ Restaurado: ${result.count.pigs} cerdos, ${result.count.feeding} comidas, ${result.count.expenses} gastos, ${result.count.sales} ventas, ${result.count.weight} pesos, ${result.count.health} salud`);
      App.navigate('dashboard');
    };
    input.click();
  }
};
