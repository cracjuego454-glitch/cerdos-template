const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(path.join(dbDir, 'cerdos.db'));

db.exec(`PRAGMA journal_mode=WAL`);
db.exec(`PRAGMA foreign_keys=ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS pigs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE NOT NULL,
    name TEXT,
    breed TEXT,
    birth_date TEXT,
    purchase_date TEXT,
    purchase_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS feeding_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    food_type TEXT,
    quantity_kg REAL NOT NULL,
    cost_per_kg REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    pig_id INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    pig_id INTEGER,
    buyer_name TEXT,
    quantity_kg REAL,
    price_per_kg REAL,
    total_amount REAL NOT NULL,
    sale_type TEXT DEFAULT 'pig',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS weight_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pig_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    record_type TEXT NOT NULL,
    description TEXT,
    medicine TEXT,
    cost REAL DEFAULT 0,
    next_due_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (pig_id) REFERENCES pigs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    investment REAL DEFAULT 0,
    investment_type TEXT DEFAULT 'capital',
    date TEXT,
    phone TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS partner_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    start_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS inventory_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    current_qty REAL DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    min_qty REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (category_id) REFERENCES inventory_categories(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Add partner_id to expenses (if not exists)
try { db.exec('ALTER TABLE expenses ADD COLUMN partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL'); } catch (e) {}
try { db.exec('ALTER TABLE feeding_records ADD COLUMN partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL'); } catch (e) {}
try { db.exec('ALTER TABLE pigs ADD COLUMN partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL'); } catch (e) {}
try { db.exec("ALTER TABLE partners ADD COLUMN status TEXT DEFAULT 'active'"); } catch (e) {}
try { db.exec('ALTER TABLE pigs ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL'); } catch (e) {}
try { db.exec('ALTER TABLE sales ADD COLUMN batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL'); } catch (e) {}
try { db.exec("ALTER TABLE pigs ADD COLUMN sex TEXT DEFAULT 'macho'"); } catch (e) {}
try { db.exec("ALTER TABLE pigs ADD COLUMN death_date TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE pigs ADD COLUMN death_cause TEXT"); } catch (e) {}

// Reproduction records
db.exec(`
  CREATE TABLE IF NOT EXISTS reproduction_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sow_id INTEGER NOT NULL,
    boar_id INTEGER,
    mating_date TEXT NOT NULL,
    expected_farrowing_date TEXT,
    farrowing_date TEXT,
    piglets_alive INTEGER DEFAULT 0,
    piglets_dead INTEGER DEFAULT 0,
    result TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (sow_id) REFERENCES pigs(id) ON DELETE CASCADE,
    FOREIGN KEY (boar_id) REFERENCES pigs(id) ON DELETE SET NULL
  );
`);

// Feed orders
db.exec(`
  CREATE TABLE IF NOT EXISTS feed_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier TEXT NOT NULL,
    order_date TEXT NOT NULL,
    delivery_date TEXT,
    item_name TEXT NOT NULL,
    quantity_ordered REAL NOT NULL,
    quantity_received REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// Task templates
db.exec(`
  CREATE TABLE IF NOT EXISTS task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
`);

// Daily task logs
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    task_template_id INTEGER NOT NULL,
    completed INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE
  );
`);

// Insert default task templates
const defaultTasks = [
  ['Alimentar cerdos', 'Alimentación', 1],
  ['Revisar agua', 'Alimentación', 2],
  ['Revisar corrales', 'Limpieza', 3],
  ['Limpiar comederos', 'Limpieza', 4],
  ['Revisar salud general', 'Salud', 5],
  ['Aplicar medicamentos', 'Salud', 6],
  ['Registrar pesos', 'Registro', 7],
];
defaultTasks.forEach(([name, cat, order]) => {
  try { db.prepare('INSERT OR IGNORE INTO task_templates (name, category, sort_order) VALUES (?, ?, ?)').run(name, cat, order); } catch (e) {}
});

// Farms table
db.exec(`
  CREATE TABLE IF NOT EXISTS farms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);
try { db.prepare("INSERT OR IGNORE INTO farms (id, name, location) VALUES (1, 'Granja Principal', '')").run(); } catch (e) {}

// Add farm_id to all tables
const farmCols = [
  'pigs', 'batches', 'expenses', 'sales', 'feeding_records', 'health_records',
  'weight_records', 'inventory_items', 'daily_logs', 'partners', 'reproduction_records',
  'inventory_categories'
];
farmCols.forEach(t => {
  try { db.exec(`ALTER TABLE ${t} ADD COLUMN farm_id INTEGER DEFAULT 1 REFERENCES farms(id) ON DELETE CASCADE`); } catch (e) {}
});
try { db.exec('ALTER TABLE feed_orders ADD COLUMN farm_id INTEGER DEFAULT 1 REFERENCES farms(id) ON DELETE CASCADE'); } catch (e) {}
// inventory_movements don't need farm_id (they follow the item)

// Insert default inventory categories
const cats = ['Alimento', 'Medicina', 'Equipo', 'Otros'];
cats.forEach(name => {
  try { db.prepare('INSERT OR IGNORE INTO inventory_categories (name) VALUES (?)').run(name); } catch (e) {}
});

// Create indexes
const indexSqls = [
  'CREATE INDEX IF NOT EXISTS idx_feeding_pig ON feeding_records(pig_id)',
  'CREATE INDEX IF NOT EXISTS idx_feeding_date ON feeding_records(date)',
  'CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)',
  'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)',
  'CREATE INDEX IF NOT EXISTS idx_weight_pig ON weight_records(pig_id)',
  'CREATE INDEX IF NOT EXISTS idx_health_pig ON health_records(pig_id)',
  'CREATE INDEX IF NOT EXISTS idx_partner_tx ON partner_transactions(partner_id)',
  'CREATE INDEX IF NOT EXISTS idx_reproduction_sow ON reproduction_records(sow_id)',
  'CREATE INDEX IF NOT EXISTS idx_reproduction_date ON reproduction_records(mating_date)',
  'CREATE INDEX IF NOT EXISTS idx_feed_orders_date ON feed_orders(order_date)',
  'CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_task_logs(date)',
];
indexSqls.forEach(sql => db.exec(sql));

module.exports = db;
