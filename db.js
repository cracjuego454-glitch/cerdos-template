// Adaptador de base de datos con la misma API que `node:sqlite`
// (prepare/run/get/all/exec) pero sobre dos backends, para que el mismo codigo
// funcione en un PC viejo y en un servidor remoto:
//
//   Fichero local  ->  node:sqlite   (viene con Node, sin dependencias)
//   Remoto Turso   ->  @libsql/client (solo si se usa Turso)
//
// En un servidor propio solo hace falta Node 22 o superior: el backend local
// no instala nada. @libsql/client trae un binario nativo y solo se necesita
// para conectar con Turso.
//
// La unica diferencia con el uso directo de node:sqlite es que las llamadas son
// asincronas y hay que usar `await`. El `exec()` admite varios statements y
// convierte `undefined` en `null`, porque SQLite rechaza `undefined` como
// parametro.

const path = require('path');
const fs = require('fs');

const REMOTE_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '';
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '';
const isRemote = /^libsql:|^https?:/.test(REMOTE_URL);

// En produccion, quedarse en fichero local significaria perder todos los datos
// en cada reinicio, y sin ningun error visible. Es mejor fallar al arrancar.
// Se puede desactivar con ALLOW_LOCAL_DB=1, que es justo lo que hara falta en
// un servidor propio montado sobre un PC.
if (process.env.NODE_ENV === 'production' && !isRemote && process.env.ALLOW_LOCAL_DB !== '1') {
  console.error(
    '\n  Faltan las credenciales de la base de datos remota.\n' +
    '  Define TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en el servicio, o pon\n' +
    '  ALLOW_LOCAL_DB=1 si de verdad quieres un fichero SQLite local.\n' +
    '  Sin esto los datos se perderian en cada reinicio.\n'
  );
  throw new Error('TURSO_DATABASE_URL no configurada');
}

// SQLite rechaza `undefined` como parametro, asi que se convierte a NULL para
// que un campo opcional ausente se guarde como NULL.
function normArgs(args) {
  return args.map(a => (a === undefined ? null : a));
}

// En modo remoto un `execute` con varios statements no es fiable, asi que se
// dividen respetando literales y comentarios. El backend local los acepta
// todos de una vez, asi que no los necesita.
function splitStatements(sql) {
  const out = [];
  let buf = '';
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (quote) {
      buf += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) buf += ch, i++;
        else quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; buf += ch; continue; }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      buf += '\n';
      continue;
    }
    if (ch === ';') { if (buf.trim()) out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function openLocal() {
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
  fs.mkdirSync(dir, { recursive: true });
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(dir, 'cerdos.db'));
  return {
    name: 'fichero local (node:sqlite)',
    exec: async (sql) => { db.exec(sql); },
    run: async (sql, args) => db.prepare(sql).run(...normArgs(args)),
    get: async (sql, args) => db.prepare(sql).get(...normArgs(args)),
    all: async (sql, args) => db.prepare(sql).all(...normArgs(args)),
  };
}

function openRemote() {
  let createClient;
  try {
    ({ createClient } = require('@libsql/client'));
  } catch (e) {
    throw new Error(
      'Se ha configurado TURSO_DATABASE_URL pero falta la dependencia ' +
      '@libsql/client. Instala con `npm install @libsql/client`, o quita la ' +
      'variable para usar el fichero local (poniendo ALLOW_LOCAL_DB=1).'
    );
  }
  const client = createClient({ url: REMOTE_URL, authToken: REMOTE_TOKEN });
  const rows = r => (r.rows.length ? r.rows[0] : undefined);
  return {
    name: 'Turso (libsql remoto)',
    exec: async (sql) => { for (const s of splitStatements(sql)) await client.execute(s); },
    run: async (sql, args) => {
      const r = await client.execute({ sql, args: normArgs(args) });
      return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid };
    },
    get: async (sql, args) => rows(await client.execute({ sql, args: normArgs(args) })),
    all: async (sql, args) => (await client.execute({ sql, args: normArgs(args) })).rows,
  };
}

const backend = isRemote ? openRemote() : openLocal();

async function exec(sql) {
  return backend.exec(sql);
}

function prepare(sql) {
  return {
    run: (...args) => backend.run(sql, args),
    get: (...args) => backend.get(sql, args),
    all: (...args) => backend.all(sql, args),
  };
}

module.exports = { prepare, exec, isRemote, backend: backend.name };