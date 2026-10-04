const API = {
  getFarmId() { return localStorage.getItem('farm_id') || ''; },
  setFarmId(id) { localStorage.setItem('farm_id', id); },
  async get(url) {
    const f = this.getFarmId();
    if (f && url.startsWith('/api/') && !url.includes('farm_id=')) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}farm_id=${f}`;
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, data) {
    const f = this.getFarmId();
    if (f && url.startsWith('/api/') && !data.farm_id) data.farm_id = parseInt(f);
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
  },
  async put(url, data) {
    const f = this.getFarmId();
    if (f && url.startsWith('/api/') && !data.farm_id) data.farm_id = parseInt(f);
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
  },
  async delete(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    return r.json();
  },

  // Pigs
  getPigs(status) {
    const f = this.getFarmId();
    let url = '/api/pigs';
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (f) p.set('farm_id', f);
    const q = p.toString();
    return this.get(url + (q ? '?' + q : ''));
  },
  getPig(id) { return this.get(`/api/pigs/${id}`); },
  savePig(data) { return data.id ? this.put(`/api/pigs/${data.id}`, data) : this.post('/api/pigs', data); },
  deletePig(id) { return this.delete(`/api/pigs/${id}`); },

  // Feeding
  getFeeding(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/feeding${q ? '?' + q : ''}`);
  },
  saveFeeding(data) { return this.post('/api/feeding', data); },
  deleteFeeding(id) { return this.delete(`/api/feeding/${id}`); },

  // Weight
  getWeights(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/weight${q ? '?' + q : ''}`);
  },
  saveWeight(data) { return this.post('/api/weight', { ...data, farm_id: this.getFarmId() || 1 }); },
  deleteWeight(id) { return this.delete(`/api/weight/${id}`); },

  // Health
  getHealth(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/health${q ? '?' + q : ''}`);
  },
  saveHealth(data) { return this.post('/api/health', data); },
  deleteHealth(id) { return this.delete(`/api/health/${id}`); },

  // Expenses
  getExpenses(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/expenses${q ? '?' + q : ''}`);
  },
  saveExpense(data) { return this.post('/api/expenses', data); },
  deleteExpense(id) { return this.delete(`/api/expenses/${id}`); },

  // Sales
  getSales(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/sales${q ? '?' + q : ''}`);
  },
  saveSale(data) { return this.post('/api/sales', data); },
  deleteSale(id) { return this.delete(`/api/sales/${id}`); },

  // Batches
  getBatches() {
    const f = this.getFarmId();
    return this.get(`/api/batches${f ? '?farm_id=' + f : ''}`);
  },
  saveBatch(data) { return data.id ? this.put(`/api/batches/${data.id}`, data) : this.post('/api/batches', data); },
  deleteBatch(id) { return this.delete(`/api/batches/${id}`); },

  // Inventory
  getInventoryCategories() { return this.get('/api/inventory/categories'); },
  getInventoryItems(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/inventory/items${q ? '?' + q : ''}`);
  },
  saveInventoryItem(data) { return data.id ? this.put(`/api/inventory/items/${data.id}`, data) : this.post('/api/inventory/items', data); },
  deleteInventoryItem(id) { return this.delete(`/api/inventory/items/${id}`); },
  getInventoryMovements(id) { return this.get(`/api/inventory/items/${id}/movements`); },
  saveInventoryMovement(data) { return this.post('/api/inventory/movements', data); },

  // Daily Logs
  getDailyLogs(params) {
    const f = this.getFarmId();
    if (f) { params = { ...params, farm_id: f }; }
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/daily_logs${q ? '?' + q : ''}`);
  },
  saveDailyLog(data) { return data.id ? this.put(`/api/daily_logs/${data.id}`, data) : this.post('/api/daily_logs', data); },
  deleteDailyLog(id) { return this.delete(`/api/daily_logs/${id}`); },

  // Reports
  getSummary() { return this.get('/api/reports/summary'); },
  getPigReport(id) { return this.get(`/api/reports/pig/${id}`); },

  // Death
  recordDeath(pigId, data) { return this.post(`/api/pigs/${pigId}/death`, data); }
};
