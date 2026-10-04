const App = {
  currentPage: 'dashboard',
  farms: [],
  pages: { dashboard: Dashboard, pigs: Pigs, feeding: Feeding, weight: Weight, health: Health, expenses: Expenses, sales: Sales, partners: Partners, reports: Reports, batches: Batches, inventory: Inventory, logbook: Logbook, reproduction: Reproduction, deaths: Deaths, feedorders: FeedOrders, dailytasks: DailyTasks, familytree: FamilyTree },

  async loadFarms() {
    try {
      this.farms = await API.get('/api/farms');
      const sel = document.getElementById('farmSelector');
      if (!sel) return;
      const current = API.getFarmId();
      sel.innerHTML = '<option value="">🌍 Todas las granjas</option>' +
        this.farms.map(f => `<option value="${f.id}" ${current == f.id ? 'selected' : ''}>${f.name}</option>`).join('') +
        '<option value="new">➕ Nueva granja...</option>';
      document.getElementById('deleteFarmBtn').style.display = current ? 'block' : 'none';
    } catch (e) { console.error('Error loading farms:', e); }
  },

  async switchFarm(id) {
    if (id === 'new') {
      const name = prompt('Nombre de la nueva granja:');
      if (!name) { this.loadFarms(); return; }
      const loc = prompt('Ubicación (opcional):') || '';
      const r = await API.post('/api/farms', { name, location: loc });
      API.setFarmId(r.id);
    } else if (id) {
      API.setFarmId(id);
    } else {
      API.setFarmId('');
    }
    this.loadFarms();
    this.navigate(this.currentPage);
  },

  async deleteFarm() {
    const id = API.getFarmId();
    if (!id) return;
    const farm = this.farms.find(f => f.id == id);
    if (!farm) return;
    if (!confirm(`¿Eliminar "${farm.name}"? Se borrarán TODOS los datos de esta granja.`)) return;
    if (!confirm(`⚠️ Confirmación final: ¿estás SEGURO? No hay vuelta atrás.`)) return;
    await API.delete(`/api/farms/${id}`);
    API.setFarmId('');
    this.loadFarms();
    this.navigate(this.currentPage);
  },

  toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('darkMode', isDark ? '' : 'dark');
    document.getElementById('darkModeToggle').textContent = isDark ? '🌙 Modo oscuro' : '☀️ Modo claro';
  },

  enterApp() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('darkModeToggle').textContent = '☀️ Modo claro';
    }
    document.getElementById('welcome-screen').classList.add('fade-out');
    setTimeout(() => {
      document.getElementById('welcome-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      this.loadFarms();
      this.navigate('dashboard');
    }, 500);
  },

  async navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('#sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    const content = document.getElementById('page-content');
    const pageModule = this.pages[page];
    if (!pageModule) { content.innerHTML = '<div class="card"><h2>404</h2><p>Página no encontrada</p></div>'; return; }
    content.innerHTML = '<div style="text-align:center;padding:40px;color:#999">Cargando...</div>';
    try {
      content.innerHTML = await pageModule.render();
      if (pageModule.afterRender) pageModule.afterRender();
    } catch (e) {
      content.innerHTML = `<div class="card"><div class="alert alert-danger">Error: ${e.message}</div></div>`;
    }
  },

  init() {
    document.querySelectorAll('#sidebar nav a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(a.dataset.page);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
