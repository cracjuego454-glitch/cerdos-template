const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function qAll(sql, params) {
  const stmt = db.prepare(sql);
  return params && params.length ? stmt.all(...params) : stmt.all();
}
function qGet(sql, params) {
  const stmt = db.prepare(sql);
  return params && params.length ? stmt.get(...params) : stmt.get();
}

// ========== FARMS API ==========
app.get('/api/farms', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM farms ORDER BY name').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/farms', (req, res) => {
  try {
    const { name, location, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO farms (name, location, notes) VALUES (?, ?, ?)').run(name, location || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe una granja con ese nombre' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/farms/:id', (req, res) => {
  try {
    const { name, location, notes } = req.body;
    db.prepare('UPDATE farms SET name=?, location=?, notes=? WHERE id=?')
      .run(name, location || null, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/farms/:id', (req, res) => {
  try { db.prepare('DELETE FROM farms WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PIGS API ==========
app.get('/api/pigs', (req, res) => {
  try {
    const { status, batch_id, farm_id } = req.query;
    let sql = 'SELECT p.*, b.name as batch_name FROM pigs p LEFT JOIN batches b ON p.batch_id = b.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND p.status = ?'; params.push(status); }
    if (batch_id) { sql += ' AND p.batch_id = ?'; params.push(batch_id); }
    if (farm_id) { sql += ' AND p.farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY p.identifier';
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pigs/:id', (req, res) => {
  try {
    const pig = db.prepare('SELECT * FROM pigs WHERE id = ?').get(req.params.id);
    if (!pig) return res.status(404).json({ error: 'Cerdo no encontrado' });
    res.json(pig);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pigs', (req, res) => {
  try {
    const { identifier, name, breed, sex, birth_date, purchase_date, purchase_cost, notes, batch_id, farm_id } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Identificador requerido' });
    db.prepare(
      "INSERT INTO pigs (identifier, name, breed, sex, birth_date, purchase_date, purchase_cost, notes, batch_id, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(identifier, name || null, breed || null, sex || 'macho', birth_date || null, purchase_date || null, purchase_cost || 0, notes || null, batch_id || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un cerdo con ese identificador' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/pigs/:id', (req, res) => {
  try {
    const { identifier, name, breed, sex, birth_date, purchase_date, purchase_cost, status, notes, batch_id, farm_id } = req.body;
    db.prepare(
      "UPDATE pigs SET identifier=?, name=?, breed=?, sex=?, birth_date=?, purchase_date=?, purchase_cost=?, status=?, notes=?, batch_id=?, farm_id=?, updated_at=datetime('now','localtime') WHERE id=?"
    ).run(identifier, name, breed, sex || 'macho', birth_date, purchase_date, purchase_cost, status || 'active', notes, batch_id || null, farm_id || 1, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pigs/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pigs WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== FEEDING API ==========
app.get('/api/feeding', (req, res) => {
  try {
    const { pig_id, from, to, farm_id, limit } = req.query;
    let sql = `SELECT f.*, p.identifier as pig_identifier, p.name as pig_name FROM feeding_records f JOIN pigs p ON f.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (pig_id) { sql += ' AND f.pig_id = ?'; params.push(pig_id); }
    if (farm_id) { sql += ' AND f.farm_id = ?'; params.push(farm_id); }
    if (from) { sql += ' AND f.date >= ?'; params.push(from); }
    if (to) { sql += ' AND f.date <= ?'; params.push(to); }
    sql += ' ORDER BY f.date DESC, f.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feeding', (req, res) => {
  try {
    const { pig_id, date, food_type, quantity_kg, cost_per_kg, notes, farm_id } = req.body;
    if (!pig_id || !date || !quantity_kg) return res.status(400).json({ error: 'pig_id, date y quantity_kg requeridos' });
    const totalCost = (cost_per_kg || 0) * quantity_kg;
    db.prepare(
      'INSERT INTO feeding_records (pig_id, date, food_type, quantity_kg, cost_per_kg, total_cost, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(pig_id, date, food_type || null, quantity_kg, cost_per_kg || 0, totalCost, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/feeding/:id', (req, res) => {
  try { db.prepare('DELETE FROM feeding_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== EXPENSES API ==========
app.get('/api/expenses', (req, res) => {
  try {
    const { category, from, to, farm_id, limit } = req.query;
    let sql = `SELECT e.*, p.identifier as pig_identifier, pr.name as partner_name FROM expenses e LEFT JOIN pigs p ON e.pig_id = p.id LEFT JOIN partners pr ON e.partner_id = pr.id WHERE 1=1`;
    const params = [];
    if (category) { sql += ' AND e.category = ?'; params.push(category); }
    if (from) { sql += ' AND e.date >= ?'; params.push(from); }
    if (to) { sql += ' AND e.date <= ?'; params.push(to); }
    if (farm_id) { sql += ' AND e.farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY e.date DESC, e.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, category, description, amount, pig_id, partner_id, notes, farm_id } = req.body;
    if (!date || !category || !amount) return res.status(400).json({ error: 'date, category y amount requeridos' });
    db.prepare('INSERT INTO expenses (date, category, description, amount, pig_id, partner_id, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(date, category, description || null, amount, pig_id || null, partner_id || null, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/expenses/:id', (req, res) => {
  try { db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== SALES API ==========
app.get('/api/sales', (req, res) => {
  try {
    const { from, to, farm_id, limit } = req.query;
    let sql = `SELECT s.*, p.identifier as pig_identifier, p.name as pig_name FROM sales s LEFT JOIN pigs p ON s.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (from) { sql += ' AND s.date >= ?'; params.push(from); }
    if (to) { sql += ' AND s.date <= ?'; params.push(to); }
    if (farm_id) { sql += ' AND s.farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY s.date DESC, s.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sales', (req, res) => {
  try {
    const { date, pig_id, buyer_name, quantity_kg, price_per_kg, total_amount, sale_type, notes, farm_id } = req.body;
    if (!date || !total_amount) return res.status(400).json({ error: 'date y total_amount requeridos' });
    db.prepare('INSERT INTO sales (date, pig_id, buyer_name, quantity_kg, price_per_kg, total_amount, sale_type, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(date, pig_id || null, buyer_name || null, quantity_kg || null, price_per_kg || null, total_amount, sale_type || 'pig', notes || null, farm_id || 1);
    if (pig_id) {
      db.prepare('UPDATE pigs SET status = ? WHERE id = ?').run('sold', pig_id);
    }
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/sales/:id', (req, res) => {
  try { db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== WEIGHT API ==========
app.get('/api/weight', (req, res) => {
  try {
    const { pig_id, from, to, farm_id, limit } = req.query;
    let sql = `SELECT w.*, p.identifier as pig_identifier, p.name as pig_name FROM weight_records w JOIN pigs p ON w.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (pig_id) { sql += ' AND w.pig_id = ?'; params.push(pig_id); }
    if (farm_id) { sql += ' AND w.farm_id = ?'; params.push(farm_id); }
    if (from) { sql += ' AND w.date >= ?'; params.push(from); }
    if (to) { sql += ' AND w.date <= ?'; params.push(to); }
    sql += ' ORDER BY w.date DESC, w.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/weight', (req, res) => {
  try {
    const { pig_id, date, weight_kg, notes, farm_id } = req.body;
    if (!pig_id || !date || !weight_kg) return res.status(400).json({ error: 'pig_id, date y weight_kg requeridos' });
    db.prepare('INSERT INTO weight_records (pig_id, date, weight_kg, notes, farm_id) VALUES (?, ?, ?, ?, ?)')
      .run(pig_id, date, weight_kg, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/weight/:id', (req, res) => {
  try { db.prepare('DELETE FROM weight_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== HEALTH API ==========
app.get('/api/health', (req, res) => {
  try {
    const { pig_id, record_type, from, to, farm_id, limit } = req.query;
    let sql = `SELECT h.*, p.identifier as pig_identifier, p.name as pig_name FROM health_records h JOIN pigs p ON h.pig_id = p.id WHERE 1=1`;
    const params = [];
    if (pig_id) { sql += ' AND h.pig_id = ?'; params.push(pig_id); }
    if (farm_id) { sql += ' AND h.farm_id = ?'; params.push(farm_id); }
    if (record_type) { sql += ' AND h.record_type = ?'; params.push(record_type); }
    if (from) { sql += ' AND h.date >= ?'; params.push(from); }
    if (to) { sql += ' AND h.date <= ?'; params.push(to); }
    sql += ' ORDER BY h.date DESC, h.id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/health', (req, res) => {
  try {
    const { pig_id, date, record_type, description, medicine, cost, next_due_date, notes, farm_id } = req.body;
    if (!pig_id || !date || !record_type) return res.status(400).json({ error: 'pig_id, date y record_type requeridos' });
    db.prepare('INSERT INTO health_records (pig_id, date, record_type, description, medicine, cost, next_due_date, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(pig_id, date, record_type, description || null, medicine || null, cost || 0, next_due_date || null, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/health/:id', (req, res) => {
  try { db.prepare('DELETE FROM health_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== REPORTS / STATS ==========
app.get('/api/reports/summary', (req, res) => {
  try {
    const { farm_id } = req.query;
    const hasFarm = farm_id && farm_id !== '';
    const f = hasFarm ? ' WHERE farm_id = ?' : '';
    const f2 = hasFarm ? ' AND farm_id = ?' : '';
    const fp = hasFarm ? ' AND p.farm_id = ?' : '';
    const pv = hasFarm ? [farm_id] : [];
    const activePigs = (hasFarm ? db.prepare(`SELECT COUNT(*) as count FROM pigs WHERE status = 'active'${f2}`).get(farm_id) : db.prepare("SELECT COUNT(*) as count FROM pigs WHERE status = 'active'").get());
    const totalPigs = (hasFarm ? db.prepare(`SELECT COUNT(*) as count FROM pigs${f}`).get(farm_id) : db.prepare('SELECT COUNT(*) as count FROM pigs').get());
    const totalFeed = (hasFarm ? db.prepare(`SELECT COALESCE(SUM(total_cost),0) as total FROM feeding_records${f}`).get(farm_id) : db.prepare('SELECT COALESCE(SUM(total_cost),0) as total FROM feeding_records').get());
    const totalExpenses = (hasFarm ? db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses${f}`).get(farm_id) : db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses').get());
    const totalSales = (hasFarm ? db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total FROM sales${f}`).get(farm_id) : db.prepare('SELECT COALESCE(SUM(total_amount),0) as total FROM sales').get());
    const totalFeedKg = (hasFarm ? db.prepare(`SELECT COALESCE(SUM(quantity_kg),0) as total FROM feeding_records${f}`).get(farm_id) : db.prepare('SELECT COALESCE(SUM(quantity_kg),0) as total FROM feeding_records').get());
    const recentWeight = (hasFarm ? db.prepare(`SELECT w.*, p.identifier, p.name FROM weight_records w JOIN pigs p ON w.pig_id = p.id WHERE w.id IN (SELECT MAX(id) FROM weight_records GROUP BY pig_id)${fp} ORDER BY w.date DESC`).all(farm_id) : db.prepare(`SELECT w.*, p.identifier, p.name FROM weight_records w JOIN pigs p ON w.pig_id = p.id WHERE w.id IN (SELECT MAX(id) FROM weight_records GROUP BY pig_id) ORDER BY w.date DESC`).all());

    const batchesCount = (hasFarm ? db.prepare(`SELECT COUNT(*) as count FROM batches${f}`).get(farm_id) : db.prepare('SELECT COUNT(*) as count FROM batches').get());
    const lowStockItems = (hasFarm ? db.prepare(`SELECT * FROM inventory_items WHERE current_qty <= min_qty${f2} ORDER BY name`).all(farm_id) : db.prepare('SELECT * FROM inventory_items WHERE current_qty <= min_qty ORDER BY name').all());

    res.json({
      activePigs: activePigs.count,
      totalPigs: totalPigs.count,
      batchesCount: batchesCount.count,
      lowStockItems,
      totalFeedCost: totalFeed.total,
      totalExpenses: totalExpenses.total,
      totalSales: totalSales.total,
      totalFeedKg: totalFeedKg.total,
      profit: totalSales.total - totalExpenses.total - totalFeed.total,
      upcomingHealth: (hasFarm ? db.prepare(`SELECT h.*, p.identifier as pig_identifier FROM health_records h JOIN pigs p ON h.pig_id = p.id WHERE h.next_due_date IS NOT NULL AND h.next_due_date >= date('now','-1 day')${fp} ORDER BY h.next_due_date ASC LIMIT 10`).all(farm_id) : db.prepare(`SELECT h.*, p.identifier as pig_identifier FROM health_records h JOIN pigs p ON h.pig_id = p.id WHERE h.next_due_date IS NOT NULL AND h.next_due_date >= date('now','-1 day') ORDER BY h.next_due_date ASC LIMIT 10`).all()),
      feedConversion: (hasFarm ? db.prepare(`SELECT * FROM (SELECT p.id, p.identifier, COALESCE((SELECT SUM(quantity_kg) FROM feeding_records WHERE pig_id = p.id), 0) as total_feed_kg, (SELECT COALESCE(MAX(weight_kg),0) FROM weight_records WHERE pig_id = p.id) as last_weight, (SELECT COALESCE(MIN(weight_kg),0) FROM weight_records WHERE pig_id = p.id) as first_weight FROM pigs p WHERE p.status = 'active'${fp}) WHERE total_feed_kg > 0 AND last_weight > 0`).all(farm_id) : db.prepare(`SELECT * FROM (SELECT p.id, p.identifier, COALESCE((SELECT SUM(quantity_kg) FROM feeding_records WHERE pig_id = p.id), 0) as total_feed_kg, (SELECT COALESCE(MAX(weight_kg),0) FROM weight_records WHERE pig_id = p.id) as last_weight, (SELECT COALESCE(MIN(weight_kg),0) FROM weight_records WHERE pig_id = p.id) as first_weight FROM pigs p WHERE p.status = 'active') WHERE total_feed_kg > 0 AND last_weight > 0`).all()),
      recentWeights: recentWeight,
      partners: (hasFarm ? db.prepare(`SELECT p.*, COALESCE((SELECT SUM(amount) FROM expenses WHERE partner_id = p.id), 0) as total_expenses_paid, COALESCE((SELECT SUM(total_cost) FROM feeding_records WHERE partner_id = p.id), 0) as total_feed_paid, COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE partner_id = p.id), 0) as total_pigs_paid, COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE partner_id = p.id AND type = 'return'), 0) as total_returned, (p.investment + COALESCE((SELECT SUM(amount) FROM expenses WHERE partner_id = p.id), 0) + COALESCE((SELECT SUM(total_cost) FROM feeding_records WHERE partner_id = p.id), 0) + COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE partner_id = p.id), 0)) as total_invested FROM partners p WHERE p.status = 'active'${fp} ORDER BY p.name`).all(farm_id) : db.prepare(`SELECT p.*, COALESCE((SELECT SUM(amount) FROM expenses WHERE partner_id = p.id), 0) as total_expenses_paid, COALESCE((SELECT SUM(total_cost) FROM feeding_records WHERE partner_id = p.id), 0) as total_feed_paid, COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE partner_id = p.id), 0) as total_pigs_paid, COALESCE((SELECT SUM(amount) FROM partner_transactions WHERE partner_id = p.id AND type = 'return'), 0) as total_returned, (p.investment + COALESCE((SELECT SUM(amount) FROM expenses WHERE partner_id = p.id), 0) + COALESCE((SELECT SUM(total_cost) FROM feeding_records WHERE partner_id = p.id), 0) + COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE partner_id = p.id), 0)) as total_invested FROM partners p WHERE p.status = 'active' ORDER BY p.name`).all())
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/pig/:id', (req, res) => {
  try {
    const pig = db.prepare('SELECT * FROM pigs WHERE id = ?').get(req.params.id);
    if (!pig) return res.status(404).json({ error: 'Cerdo no encontrado' });
    const feedRecords = db.prepare('SELECT * FROM feeding_records WHERE pig_id = ? ORDER BY date').all(req.params.id);
    const weightRecords = db.prepare('SELECT * FROM weight_records WHERE pig_id = ? ORDER BY date').all(req.params.id);
    const healthRecords = db.prepare('SELECT * FROM health_records WHERE pig_id = ? ORDER BY date DESC').all(req.params.id);
    const totalFeed = db.prepare('SELECT COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(quantity_kg),0) as kg FROM feeding_records WHERE pig_id = ?').get(req.params.id);
    const totalHealth = db.prepare('SELECT COALESCE(SUM(cost),0) as total FROM health_records WHERE pig_id = ?').get(req.params.id);
    const saleRecord = db.prepare('SELECT * FROM sales WHERE pig_id = ?').get(req.params.id);
    const totalExpensesOnPig = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE pig_id = ?').get(req.params.id);
    res.json({ pig, feedRecords, weightRecords, healthRecords, saleRecord, totalFeedCost: totalFeed.cost, totalFeedKg: totalFeed.kg, totalHealthCost: totalHealth.total, totalExpensesOnPig: totalExpensesOnPig.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PARTNERS API ==========
app.get('/api/partners', (req, res) => {
  try {
    const { farm_id } = req.query;
    let sql = `
      SELECT p.*, COALESCE(SUM(pt.amount),0) as total_returned
      FROM partners p LEFT JOIN partner_transactions pt ON p.id = pt.partner_id AND pt.type = 'return'
      WHERE 1=1`;
    const params = [];
    if (farm_id) { sql += ' AND p.farm_id = ?'; params.push(farm_id); }
    sql += ' GROUP BY p.id ORDER BY p.name';
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/partners/info', (req, res) => {
  try {
    const { farm_id } = req.query;
    const partners = farm_id 
      ? db.prepare("SELECT * FROM partners WHERE status = 'active' AND farm_id = ? ORDER BY name").all(farm_id)
      : db.prepare("SELECT * FROM partners WHERE status = 'active' ORDER BY name").all();
    const allPartners = farm_id
      ? db.prepare('SELECT * FROM partners WHERE farm_id = ? ORDER BY name').all(farm_id)
      : db.prepare('SELECT * FROM partners ORDER BY name').all();
    const totalInvestment = partners.reduce((s, p) => s + p.investment, 0);
    res.json({ partners, allPartners, totalInvestment });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/partners', (req, res) => {
  try {
    const { name, investment, investment_type, date, phone, notes, farm_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO partners (name, investment, investment_type, date, phone, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name, investment || 0, investment_type || 'capital', date || null, phone || null, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/partners/:id', (req, res) => {
  try {
    const { name, investment, investment_type, date, phone, status, notes } = req.body;
    if (status) {
      db.prepare("UPDATE partners SET status=?, updated_at=datetime('now','localtime') WHERE id=?")
        .run(status, req.params.id);
    } else {
      db.prepare("UPDATE partners SET name=?, investment=?, investment_type=?, date=?, phone=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?")
        .run(name, investment, investment_type, date, phone, notes, req.params.id);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/partners/:id', (req, res) => {
  try { db.prepare('DELETE FROM partners WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Partner transactions
app.get('/api/partners/:id/transactions', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM partner_transactions WHERE partner_id = ? ORDER BY date DESC').all(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/partners/:id/transactions', (req, res) => {
  try {
    const { date, type, amount, description, notes } = req.body;
    if (!date || !type || !amount) return res.status(400).json({ error: 'date, type y amount requeridos' });
    db.prepare('INSERT INTO partner_transactions (partner_id, date, type, amount, description, notes) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.id, date, type, amount, description || null, notes || null);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== BATCHES API ==========
app.get('/api/batches', (req, res) => {
  try {
    const { farm_id } = req.query;
    let sql = `
      SELECT b.*, (SELECT COUNT(*) FROM pigs WHERE batch_id = b.id) as pig_count
      FROM batches b WHERE 1=1`;
    const params = [];
    if (farm_id) { sql += ' AND b.farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY b.name';
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/batches', (req, res) => {
  try {
    const { name, start_date, notes, farm_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO batches (name, start_date, notes, farm_id) VALUES (?, ?, ?, ?)')
      .run(name, start_date || null, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un lote con ese nombre' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/batches/:id', (req, res) => {
  try {
    const { name, start_date, notes, farm_id } = req.body;
    db.prepare("UPDATE batches SET name=?, start_date=?, notes=?, farm_id=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(name, start_date || null, notes || null, farm_id || 1, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/batches/:id', (req, res) => {
  try {
    db.prepare('UPDATE pigs SET batch_id = NULL WHERE batch_id = ?').run(req.params.id);
    db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== INVENTORY API ==========
app.get('/api/inventory/categories', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM inventory_categories ORDER BY name').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/items', (req, res) => {
  try {
    const { category_id, low_stock, farm_id } = req.query;
    let sql = `SELECT i.*, c.name as category_name FROM inventory_items i LEFT JOIN inventory_categories c ON i.category_id = c.id WHERE 1=1`;
    const params = [];
    if (category_id) { sql += ' AND i.category_id = ?'; params.push(category_id); }
    if (low_stock) { sql += ' AND i.current_qty <= i.min_qty'; }
    if (farm_id) { sql += ' AND i.farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY i.name';
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/items', (req, res) => {
  try {
    const { name, category_id, current_qty, unit, min_qty, unit_cost, notes, farm_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO inventory_items (name, category_id, current_qty, unit, min_qty, unit_cost, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(name, category_id || null, current_qty || 0, unit || 'kg', min_qty || 0, unit_cost || 0, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/inventory/items/:id', (req, res) => {
  try {
    const { name, category_id, current_qty, unit, min_qty, unit_cost, notes, farm_id } = req.body;
    db.prepare("UPDATE inventory_items SET name=?, category_id=?, current_qty=?, unit=?, min_qty=?, unit_cost=?, notes=?, farm_id=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(name, category_id || null, current_qty || 0, unit || 'kg', min_qty || 0, unit_cost || 0, notes || null, farm_id || 1, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/inventory/items/:id', (req, res) => {
  try { db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory/items/:id/movements', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM inventory_movements WHERE item_id = ? ORDER BY date DESC, id DESC').all(req.params.id)); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory/movements', (req, res) => {
  try {
    const { item_id, date, type, quantity, description } = req.body;
    if (!item_id || !date || !type || !quantity) return res.status(400).json({ error: 'item_id, date, type y quantity requeridos' });
    db.prepare('INSERT INTO inventory_movements (item_id, date, type, quantity, description) VALUES (?, ?, ?, ?, ?)')
      .run(item_id, date, type, quantity, description || null);
    db.prepare('UPDATE inventory_items SET current_qty = current_qty + ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run(type === 'in' ? quantity : -quantity, item_id);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== DAILY LOGS API ==========
app.get('/api/daily_logs', (req, res) => {
  try {
    const { from, to, farm_id, limit } = req.query;
    let sql = 'SELECT * FROM daily_logs WHERE 1=1';
    const params = [];
    if (from) { sql += ' AND date >= ?'; params.push(from); }
    if (to) { sql += ' AND date <= ?'; params.push(to); }
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY date DESC, id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/daily_logs', (req, res) => {
  try {
    const { date, title, content, farm_id } = req.body;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });
    db.prepare('INSERT INTO daily_logs (date, title, content, farm_id) VALUES (?, ?, ?, ?)')
      .run(date, title || null, content || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/daily_logs/:id', (req, res) => {
  try {
    const { date, title, content, farm_id } = req.body;
    db.prepare('UPDATE daily_logs SET date=?, title=?, content=?, farm_id=? WHERE id=?')
      .run(date, title || null, content || null, farm_id || 1, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/daily_logs/:id', (req, res) => {
  try { db.prepare('DELETE FROM daily_logs WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== FEED ORDERS API ==========
app.get('/api/feed-orders', (req, res) => {
  try {
    const { status, from, to, farm_id, limit } = req.query;
    let sql = 'SELECT * FROM feed_orders WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND order_date >= ?'; params.push(from); }
    if (to) { sql += ' AND order_date <= ?'; params.push(to); }
    if (farm_id) { sql += ' AND farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY order_date DESC, id DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/feed-orders', (req, res) => {
  try {
    const { supplier, order_date, delivery_date, item_name, quantity_ordered, unit_cost, notes, farm_id } = req.body;
    if (!supplier || !order_date || !item_name || !quantity_ordered) return res.status(400).json({ error: 'supplier, order_date, item_name y quantity_ordered requeridos' });
    const totalCost = (unit_cost || 0) * quantity_ordered;
    db.prepare('INSERT INTO feed_orders (supplier, order_date, delivery_date, item_name, quantity_ordered, quantity_received, unit_cost, total_cost, status, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(supplier, order_date, delivery_date || null, item_name, quantity_ordered, 0, unit_cost || 0, totalCost, 'pending', notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/feed-orders/:id', (req, res) => {
  try {
    const { supplier, order_date, delivery_date, item_name, quantity_ordered, quantity_received, unit_cost, status, notes, farm_id } = req.body;
    const totalCost = (unit_cost || 0) * (quantity_received || quantity_ordered);
    const qty = quantity_received || 0;
    db.prepare("UPDATE feed_orders SET supplier=?, order_date=?, delivery_date=?, item_name=?, quantity_ordered=?, quantity_received=?, unit_cost=?, total_cost=?, status=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?")
      .run(supplier, order_date, delivery_date || null, item_name, quantity_ordered, qty, unit_cost || 0, totalCost, status || 'pending', notes || null, req.params.id);
    // If received, add to inventory
    if (status === 'received' && qty > 0) {
      const item = db.prepare("SELECT id FROM inventory_items WHERE name = ? AND category_id = (SELECT id FROM inventory_categories WHERE name = 'Alimento')").get(item_name);
      if (item) {
        db.prepare("UPDATE inventory_items SET current_qty = current_qty + ?, unit_cost = ?, updated_at = datetime('now','localtime') WHERE id = ?")
          .run(qty, unit_cost || 0, item.id);
        db.prepare("INSERT INTO inventory_movements (item_id, date, type, quantity, description) VALUES (?, date('now'), 'in', ?, ?)")
          .run(item.id, qty, 'Pedido de ' + supplier);
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/feed-orders/:id', (req, res) => {
  try { db.prepare('DELETE FROM feed_orders WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== DAILY TASKS API ==========
app.get('/api/task-templates', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM task_templates ORDER BY sort_order').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/task-templates', (req, res) => {
  try {
    const { name, category, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    db.prepare('INSERT INTO task_templates (name, category, sort_order) VALUES (?, ?, ?)').run(name, category || 'General', sort_order || 0);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/task-templates/:id', (req, res) => {
  try { db.prepare('DELETE FROM task_templates WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/daily-tasks', (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });
    // Ensure all templates have a log for this date
    db.prepare(`INSERT OR IGNORE INTO daily_task_logs (date, task_template_id, completed)
      SELECT ?, id, 0 FROM task_templates WHERE id NOT IN (SELECT task_template_id FROM daily_task_logs WHERE date = ?)`).run(date, date);
    const logs = db.prepare(`SELECT l.*, t.name, t.category, t.sort_order FROM daily_task_logs l JOIN task_templates t ON l.task_template_id = t.id WHERE l.date = ? ORDER BY t.sort_order`).all(date);
    res.json(logs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/daily-tasks/:id', (req, res) => {
  try {
    const { completed, notes } = req.body;
    db.prepare('UPDATE daily_task_logs SET completed = ?, notes = ? WHERE id = ?').run(completed ? 1 : 0, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PROJECTIONS ==========
app.get('/api/reports/sales-projection', (req, res) => {
  try {
    const targetWeight = parseFloat(req.query.target_weight) || 100;
    const farm_id = req.query.farm_id;
    const hasFarm = farm_id && farm_id !== '';
    const f = hasFarm ? ' AND p.farm_id = ?' : '';
    const pigs = hasFarm
      ? db.prepare(`SELECT p.id, p.identifier, p.sex, COALESCE((SELECT MAX(weight_kg) FROM weight_records WHERE pig_id = p.id), 0) as current_weight, (SELECT COUNT(*) FROM weight_records WHERE pig_id = p.id) as weight_count, (SELECT date FROM weight_records WHERE pig_id = p.id ORDER BY date DESC LIMIT 1) as last_weigh_date FROM pigs p WHERE p.status = 'active'${f}`).all(farm_id)
      : db.prepare(`SELECT p.id, p.identifier, p.sex, COALESCE((SELECT MAX(weight_kg) FROM weight_records WHERE pig_id = p.id), 0) as current_weight, (SELECT COUNT(*) FROM weight_records WHERE pig_id = p.id) as weight_count, (SELECT date FROM weight_records WHERE pig_id = p.id ORDER BY date DESC LIMIT 1) as last_weigh_date FROM pigs p WHERE p.status = 'active'`).all();
    const result = [];
    for (const pig of pigs) {
      if (pig.weight_count >= 2) {
        const records = db.prepare('SELECT date, weight_kg FROM weight_records WHERE pig_id = ? ORDER BY date ASC').all(pig.id);
        const first = records[0];
        const last = records[records.length - 1];
        const daysDiff = (new Date(last.date) - new Date(first.date)) / (1000 * 86400);
        const gainKg = last.weight_kg - first.weight_kg;
        const avgDailyGain = daysDiff > 0 && gainKg > 0 ? gainKg / daysDiff : 0;
        const remaining = targetWeight - last.weight_kg;
        const daysToTarget = avgDailyGain > 0 ? Math.round(remaining / avgDailyGain) : null;
        const projectedDate = daysToTarget ? new Date(Date.now() + daysToTarget * 86400000).toISOString().split('T')[0] : null;
        result.push({ ...pig, avgDailyGain: Math.round(avgDailyGain * 1000) / 1000, daysToTarget, projectedDate, remainingKg: Math.round(remaining * 10) / 10 });
      } else {
        result.push({ ...pig, avgDailyGain: 0, daysToTarget: null, projectedDate: null, remainingKg: 0 });
      }
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/feed-projection', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const farm_id = req.query.farm_id;
    const hasFarm = farm_id && farm_id !== '';
    const activePigs = hasFarm
      ? db.prepare("SELECT COUNT(*) as c FROM pigs WHERE status = 'active' AND farm_id = ?").get(farm_id).c
      : db.prepare("SELECT COUNT(*) as c FROM pigs WHERE status = 'active'").get().c;
    const feedByPig = hasFarm
      ? db.prepare(`SELECT f.pig_id, AVG(f.quantity_kg) as avg_daily, COUNT(*) as days_count FROM feeding_records f JOIN pigs p ON f.pig_id = p.id WHERE p.status = 'active' AND p.farm_id = ? GROUP BY f.pig_id`).all(farm_id)
      : db.prepare(`SELECT f.pig_id, AVG(f.quantity_kg) as avg_daily, COUNT(*) as days_count FROM feeding_records f JOIN pigs p ON f.pig_id = p.id WHERE p.status = 'active' GROUP BY f.pig_id`).all();
    const pigsWithFeed = feedByPig.length;
    const avgPerPig = pigsWithFeed > 0 ? feedByPig.reduce((s, f) => s + f.avg_daily, 0) / pigsWithFeed : 0;
    const totalProjected = avgPerPig * activePigs * days;
    const recentFeedCost = hasFarm
      ? (db.prepare("SELECT AVG(cost_per_kg) as avg_cost FROM feeding_records WHERE cost_per_kg > 0 AND date >= date('now','-30 days') AND farm_id = ?").get(farm_id).avg_cost || 0)
      : (db.prepare("SELECT AVG(cost_per_kg) as avg_cost FROM feeding_records WHERE cost_per_kg > 0 AND date >= date('now','-30 days')").get().avg_cost || 0);
    res.json({ activePigs, pigsWithFeed, avgPerPig: Math.round(avgPerPig * 100) / 100, totalProjected: Math.round(totalProjected * 100) / 100, avgCostPerKg: Math.round(recentFeedCost * 100) / 100, costProjected: Math.round(totalProjected * recentFeedCost * 100) / 100, days });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== FAMILY TREE ==========
app.get('/api/family-tree/:id', (req, res) => {
  try {
    const pig = db.prepare('SELECT * FROM pigs WHERE id = ?').get(req.params.id);
    if (!pig) return res.status(404).json({ error: 'Cerdo no encontrado' });
    // Find mother: this pig is in the piglets_alive of a reproduction record
    const asChild = db.prepare(`
      SELECT r.*, s.identifier as mother_identifier, b.identifier as father_identifier
      FROM reproduction_records r
      JOIN pigs s ON r.sow_id = s.id
      LEFT JOIN pigs b ON r.boar_id = b.id
      WHERE r.sow_id = ? OR r.sow_id = (
        SELECT id FROM pigs WHERE notes LIKE '%' || (SELECT identifier FROM pigs WHERE id = ?) || '%'
      )
      LIMIT 1
    `).all(pig.id, pig.id);
    // Actually, we don't track which specific piglets came from which litter in the DB.
    // Let me use a simpler approach: find reproduction records where this pig is the mother (sow) or father (boar)
    const asParent = db.prepare(`
      SELECT r.*, s.identifier as sow_identifier, b.identifier as boar_identifier
      FROM reproduction_records r
      JOIN pigs s ON r.sow_id = s.id
      LEFT JOIN pigs b ON r.boar_id = b.id
      WHERE r.sow_id = ? OR r.boar_id = ?
      ORDER BY r.mating_date DESC
    `).all(req.params.id, req.params.id);
    // Find parents: look for reproduction records where this pig's identifier matches notes pattern
    // For siblings: same reproduction record
    res.json({ pig, asParent });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== REPRODUCTION API ==========
app.get('/api/reproduction', (req, res) => {
  try {
    const { sow_id, farm_id } = req.query;
    let sql = `SELECT r.*, s.identifier as sow_identifier, s.name as sow_name, b.identifier as boar_identifier
      FROM reproduction_records r
      JOIN pigs s ON r.sow_id = s.id
      LEFT JOIN pigs b ON r.boar_id = b.id
      WHERE 1=1`;
    const params = [];
    if (sow_id) { sql += ' AND r.sow_id = ?'; params.push(sow_id); }
    if (farm_id) { sql += ' AND r.farm_id = ?'; params.push(farm_id); }
    sql += ' ORDER BY r.mating_date DESC, r.id DESC';
    res.json(qAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reproduction', (req, res) => {
  try {
    const { sow_id, boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes, farm_id } = req.body;
    if (!sow_id || !mating_date) return res.status(400).json({ error: 'sow_id y mating_date requeridos' });
    db.prepare(`INSERT INTO reproduction_records (sow_id, boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes, farm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(sow_id, boar_id || null, mating_date, expected_farrowing_date || null, farrowing_date || null, piglets_alive || 0, piglets_dead || 0, result || null, notes || null, farm_id || 1);
    const row = db.prepare('SELECT last_insert_rowid() as id').get();
    res.json({ id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reproduction/:id', (req, res) => {
  try {
    const { boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes } = req.body;
    db.prepare(`UPDATE reproduction_records SET boar_id=?, mating_date=?, expected_farrowing_date=?, farrowing_date=?, piglets_alive=?, piglets_dead=?, result=?, notes=? WHERE id=?`)
      .run(boar_id || null, mating_date, expected_farrowing_date || null, farrowing_date || null, piglets_alive || 0, piglets_dead || 0, result || null, notes || null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reproduction/:id', (req, res) => {
  try { db.prepare('DELETE FROM reproduction_records WHERE id = ?').run(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== DEATH API ==========
app.post('/api/pigs/:id/death', (req, res) => {
  try {
    const { death_date, death_cause, notes } = req.body;
    if (!death_date) return res.status(400).json({ error: 'death_date requerido' });
    db.prepare("UPDATE pigs SET status='dead', death_date=?, death_cause=?, notes=COALESCE(?,'') || CHAR(10) || COALESCE(notes,''), updated_at=datetime('now','localtime') WHERE id=?")
      .run(death_date, death_cause || null, notes ? 'Muerte: ' + notes : null, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== BATCH REPORTS ==========
app.get('/api/reports/batch/:id', (req, res) => {
  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Lote no encontrado' });
    const pigs = db.prepare('SELECT * FROM pigs WHERE batch_id = ? ORDER BY identifier').all(req.params.id);
    const totals = db.prepare(`
      SELECT
        COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE batch_id = ?),0) as total_purchase,
        COALESCE((SELECT SUM(f.total_cost) FROM feeding_records f JOIN pigs p2 ON f.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_feed,
        COALESCE((SELECT SUM(h.cost) FROM health_records h JOIN pigs p2 ON h.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_health,
        COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN pigs p2 ON e.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_expenses,
        COALESCE((SELECT SUM(s.total_amount) FROM sales s JOIN pigs p2 ON s.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_sales
    `).get(req.params.id, req.params.id, req.params.id, req.params.id);
    res.json({ batch, pigs, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reports/compare-batches', (req, res) => {
  try {
    const { batch_ids } = req.body;
    if (!batch_ids || !batch_ids.length) return res.status(400).json({ error: 'batch_ids requerido' });
    const result = [];
    for (const id of batch_ids) {
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
      if (!batch) continue;
      const pigCount = db.prepare('SELECT COUNT(*) as c FROM pigs WHERE batch_id = ?').get(id).c;
      const soldCount = db.prepare("SELECT COUNT(*) as c FROM pigs WHERE batch_id = ? AND status='sold'").get(id).c;
      const deadCount = db.prepare("SELECT COUNT(*) as c FROM pigs WHERE batch_id = ? AND status='dead'").get(id).c;
      const totals = db.prepare(`
        SELECT
          COALESCE((SELECT SUM(purchase_cost) FROM pigs WHERE batch_id = ?),0) as total_purchase,
          COALESCE((SELECT SUM(f.total_cost) FROM feeding_records f JOIN pigs p2 ON f.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_feed,
          COALESCE((SELECT SUM(h.cost) FROM health_records h JOIN pigs p2 ON h.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_health,
          COALESCE((SELECT SUM(e.amount) FROM expenses e JOIN pigs p2 ON e.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_expenses,
          COALESCE((SELECT SUM(s.total_amount) FROM sales s JOIN pigs p2 ON s.pig_id = p2.id WHERE p2.batch_id = ?),0) as total_sales
      `).get(id, id, id, id);
      result.push({ batch, pigCount, soldCount, deadCount, ...totals });
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== BACKUP / RESTORE ==========
app.get('/api/backup', (req, res) => {
  try {
    const backup = {
      version: 2,
      date: new Date().toISOString(),
      farms: db.prepare('SELECT * FROM farms').all(),
      pigs: db.prepare('SELECT * FROM pigs').all(),
      feeding: db.prepare('SELECT * FROM feeding_records').all(),
      expenses: db.prepare('SELECT * FROM expenses').all(),
      sales: db.prepare('SELECT * FROM sales').all(),
      weight: db.prepare('SELECT * FROM weight_records').all(),
      health: db.prepare('SELECT * FROM health_records').all(),
      partners: db.prepare('SELECT * FROM partners').all(),
      partner_transactions: db.prepare('SELECT * FROM partner_transactions').all(),
      batches: db.prepare('SELECT * FROM batches').all(),
      inventory_categories: db.prepare('SELECT * FROM inventory_categories').all(),
      inventory_items: db.prepare('SELECT * FROM inventory_items').all(),
      inventory_movements: db.prepare('SELECT * FROM inventory_movements').all(),
      daily_logs: db.prepare('SELECT * FROM daily_logs').all(),
      reproduction: db.prepare('SELECT * FROM reproduction_records').all(),
      feed_orders: db.prepare('SELECT * FROM feed_orders').all(),
      task_templates: db.prepare('SELECT * FROM task_templates').all(),
      daily_task_logs: db.prepare('SELECT * FROM daily_task_logs').all()
    };
    res.json(backup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/restore', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.pigs) return res.status(400).json({ error: 'Respaldos inválido' });
    db.exec('PRAGMA foreign_keys=OFF');
    ['daily_task_logs', 'task_templates', 'feed_orders', 'reproduction_records', 'inventory_movements', 'inventory_items', 'inventory_categories', 'daily_logs', 'batches', 'partner_transactions', 'partners', 'health_records', 'weight_records', 'sales', 'expenses', 'feeding_records', 'pigs', 'farms'].forEach(t => {
      db.prepare(`DELETE FROM ${t}`).run();
    });
    const insertPig = db.prepare('INSERT INTO pigs (id, identifier, name, breed, birth_date, purchase_date, purchase_cost, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.pigs.forEach(p => insertPig.run(p.id, p.identifier, p.name, p.breed, p.birth_date, p.purchase_date, p.purchase_cost, p.status, p.notes, p.created_at, p.updated_at));
    const insertFeed = db.prepare('INSERT INTO feeding_records (id, pig_id, date, food_type, quantity_kg, cost_per_kg, total_cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.feeding || []).forEach(r => insertFeed.run(r.id, r.pig_id, r.date, r.food_type, r.quantity_kg, r.cost_per_kg, r.total_cost, r.notes, r.created_at));
    const insertExpense = db.prepare('INSERT INTO expenses (id, date, category, description, amount, pig_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    (data.expenses || []).forEach(r => insertExpense.run(r.id, r.date, r.category, r.description, r.amount, r.pig_id, r.notes, r.created_at));
    const insertSale = db.prepare('INSERT INTO sales (id, date, pig_id, buyer_name, quantity_kg, price_per_kg, total_amount, sale_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.sales || []).forEach(r => insertSale.run(r.id, r.date, r.pig_id, r.buyer_name, r.quantity_kg, r.price_per_kg, r.total_amount, r.sale_type, r.notes, r.created_at));
    const insertWeight = db.prepare('INSERT INTO weight_records (id, pig_id, date, weight_kg, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    (data.weight || []).forEach(r => insertWeight.run(r.id, r.pig_id, r.date, r.weight_kg, r.notes, r.created_at));
    const insertHealth = db.prepare('INSERT INTO health_records (id, pig_id, date, record_type, description, medicine, cost, next_due_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.health || []).forEach(r => insertHealth.run(r.id, r.pig_id, r.date, r.record_type, r.description, r.medicine, r.cost, r.next_due_date, r.notes, r.created_at));
    const insertPartner = db.prepare('INSERT INTO partners (id, name, investment, investment_type, date, phone, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.partners || []).forEach(r => insertPartner.run(r.id, r.name, r.investment, r.investment_type, r.date, r.phone, r.notes, r.created_at, r.updated_at));
    const insertPTx = db.prepare('INSERT INTO partner_transactions (id, partner_id, date, type, amount, description, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    (data.partner_transactions || []).forEach(r => insertPTx.run(r.id, r.partner_id, r.date, r.type, r.amount, r.description, r.notes, r.created_at));
    const insertBatch = db.prepare('INSERT INTO batches (id, name, start_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    (data.batches || []).forEach(r => insertBatch.run(r.id, r.name, r.start_date, r.notes, r.created_at, r.updated_at));
    const insertInvCat = db.prepare('INSERT INTO inventory_categories (id, name) VALUES (?, ?)');
    (data.inventory_categories || []).forEach(r => insertInvCat.run(r.id, r.name));
    const insertInvItem = db.prepare('INSERT INTO inventory_items (id, name, category_id, current_qty, unit, min_qty, unit_cost, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.inventory_items || []).forEach(r => insertInvItem.run(r.id, r.name, r.category_id, r.current_qty, r.unit, r.min_qty, r.unit_cost, r.notes, r.created_at, r.updated_at));
    const insertInvMov = db.prepare('INSERT INTO inventory_movements (id, item_id, date, type, quantity, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    (data.inventory_movements || []).forEach(r => insertInvMov.run(r.id, r.item_id, r.date, r.type, r.quantity, r.description, r.created_at));
    const insertLog = db.prepare('INSERT INTO daily_logs (id, date, title, content, created_at) VALUES (?, ?, ?, ?, ?)');
    (data.daily_logs || []).forEach(r => insertLog.run(r.id, r.date, r.title, r.content, r.created_at));
    const insertRepro = db.prepare('INSERT INTO reproduction_records (id, sow_id, boar_id, mating_date, expected_farrowing_date, farrowing_date, piglets_alive, piglets_dead, result, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.reproduction || []).forEach(r => insertRepro.run(r.id, r.sow_id, r.boar_id, r.mating_date, r.expected_farrowing_date, r.farrowing_date, r.piglets_alive, r.piglets_dead, r.result, r.notes, r.created_at));
    const insertFO = db.prepare('INSERT INTO feed_orders (id, supplier, order_date, delivery_date, item_name, quantity_ordered, quantity_received, unit_cost, total_cost, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (data.feed_orders || []).forEach(r => insertFO.run(r.id, r.supplier, r.order_date, r.delivery_date, r.item_name, r.quantity_ordered, r.quantity_received, r.unit_cost, r.total_cost, r.status, r.notes, r.created_at, r.updated_at));
    const insertTT = db.prepare('INSERT INTO task_templates (id, name, category, sort_order) VALUES (?, ?, ?, ?)');
    (data.task_templates || []).forEach(r => insertTT.run(r.id, r.name, r.category, r.sort_order));
    const insertDT = db.prepare('INSERT INTO daily_task_logs (id, date, task_template_id, completed, notes) VALUES (?, ?, ?, ?, ?)');
    (data.daily_task_logs || []).forEach(r => insertDT.run(r.id, r.date, r.task_template_id, r.completed, r.notes));
    db.exec('PRAGMA foreign_keys=ON');
    // Ensure default farm exists
    try { db.prepare("INSERT OR IGNORE INTO farms (id, name, location) VALUES (1, 'Granja Principal', '')").run(); } catch (e) {}
    res.json({ ok: true, count: { pigs: data.pigs.length, feeding: (data.feeding || []).length, expenses: (data.expenses || []).length, sales: (data.sales || []).length, weight: (data.weight || []).length, health: (data.health || []).length, partners: (data.partners || []).length, batches: (data.batches || []).length, inventory_items: (data.inventory_items || []).length, daily_logs: (data.daily_logs || []).length, reproduction: (data.reproduction || []).length, feed_orders: (data.feed_orders || []).length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== START ==========
app.listen(PORT, () => {
  console.log(`🚀 Sistema Cerdos by LOMI corriendo en http://localhost:${PORT}`);
});
