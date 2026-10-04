const DailyTasks = {
  tasks: [],
  selectedDate: new Date().toISOString().split('T')[0],
  async render() {
    this.tasks = await API.get(`/api/daily-tasks?date=${this.selectedDate}`);
    const templates = await API.get('/api/task-templates');
    const cats = [...new Set(templates.map(t => t.category))];
    const completed = this.tasks.filter(t => t.completed).length;
    const total = this.tasks.length;
    return `
      <div class="toolbar"><h2>✅ Tareas Diarias</h2></div>
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label>Fecha</label>
            <input type="date" id="taskDate" value="${this.selectedDate}" onchange="DailyTasks.changeDate(this.value)">
          </div>
          <div class="form-group" style="align-self:flex-end">
            <span style="font-size:1.2rem">${completed}/${total} completadas</span>
          </div>
        </div>
        <div style="height:8px;background:#e0e0e0;border-radius:4px;margin:8px 0">
          <div style="height:8px;width:${total > 0 ? (completed/total*100) : 0}%;background:#4caf50;border-radius:4px;transition:width .3s"></div>
        </div>
        ${cats.map(cat => `
          <h3 style="margin-top:12px">${cat}</h3>
          ${this.tasks.filter(t => t.category === cat).map(t => `
            <div class="task-item ${t.completed ? 'task-done' : ''}" onclick="DailyTasks.toggle(${t.id}, ${t.completed ? 0 : 1})">
              <span class="task-check">${t.completed ? '✅' : '⬜'}</span>
              <span class="task-name">${t.name}</span>
              <span class="task-notes" onclick="event.stopPropagation();DailyTasks.addNote(${t.id})">${t.notes ? '📝' : '➕ nota'}</span>
            </div>
          `).join('')}
        `).join('')}
      </div>
      <div class="card">
        <h3>⚙️ Personalizar Tareas</h3>
        <form onsubmit="DailyTasks.addTemplate(event)" style="display:flex;gap:8px;flex-wrap:wrap">
          <input type="text" id="newTaskName" placeholder="Nueva tarea..." required style="flex:1;min-width:150px">
          <select id="newTaskCategory">
            ${cats.map(c => `<option value="${c}">${c}</option>`).join('')}
            <option value="General">General</option>
          </select>
          <button class="btn btn-primary" type="submit">➕ Agregar</button>
        </form>
        <div style="margin-top:8px">
          ${templates.map(t => `
            <span style="display:inline-block;background:#e3f2fd;padding:2px 8px;border-radius:12px;margin:2px;font-size:0.85rem">
              ${t.name} <span style="cursor:pointer;color:#c62828" onclick="DailyTasks.deleteTemplate(${t.id})">✕</span>
            </span>
          `).join('')}
        </div>
      </div>
    `;
  },
  afterRender() {},
  async changeDate(date) {
    this.selectedDate = date;
    App.navigate('dailytasks');
  },
  async toggle(id, val) {
    await API.put(`/api/daily-tasks/${id}`, { completed: val });
    App.navigate('dailytasks');
  },
  async addNote(id) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    const note = prompt('Nota:', t.notes || '');
    if (note === null) return;
    await API.put(`/api/daily-tasks/${id}`, { completed: t.completed, notes: note || null });
    App.navigate('dailytasks');
  },
  async addTemplate(e) {
    e.preventDefault();
    const name = document.getElementById('newTaskName').value.trim();
    const cat = document.getElementById('newTaskCategory').value;
    if (!name) return;
    await API.post('/api/task-templates', { name, category: cat });
    document.getElementById('newTaskName').value = '';
    App.navigate('dailytasks');
  },
  async deleteTemplate(id) {
    if (!confirm('¿Eliminar esta tarea de la lista?')) return;
    await API.delete(`/api/task-templates/${id}`);
    App.navigate('dailytasks');
  }
};