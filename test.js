// Validates every day file: runs lesson SQL, predict SQL and every exercise solution
// against a fresh copy of the seed database. Usage: node test.js [dayNumber]
const fs = require('fs');
const path = require('path');
global.LAB = require('./seed.js');
const only = process.argv[2] ? Number(process.argv[2]) : null;
fs.readdirSync(path.join(__dirname, 'days')).filter(f => f.endsWith('.js')).sort().forEach(f => {
  require(path.join(__dirname, 'days', f));
});

require('sql.js/dist/sql-asm.js')().then(SQL => {
  const base = new SQL.Database();
  base.exec(LAB.SCHEMA_SQL);
  base.exec(LAB.buildSeedSQL());
  const bytes = base.export();
  const open = [];
  const fresh = () => { while (open.length > 2) open.shift().close(); const d = new SQL.Database(bytes); open.push(d); d.exec('PRAGMA foreign_keys = ON;'); return d; };
  let errors = 0, checked = 0;
  const ids = new Set();
  const fail = (where, msg) => { errors++; console.log('FAIL', where, '-', msg); };
  const days = LAB.days.slice().sort((a, b) => a.n - b.n);
  days.filter(d => !only || d.n === only).forEach(day => {
    const tag = 'day ' + day.n;
    ['n', 'title', 'tag', 'goals', 'lesson', 'exercises', 'quiz', 'teach'].forEach(k => { if (day[k] === undefined) fail(tag, 'missing field ' + k); });
    (day.lesson || []).forEach((b, i) => {
      const run = (sql, label) => {
        try { const db = fresh(); db.exec(sql); checked++; }
        catch (e) { fail(tag + ' lesson[' + i + '] ' + label, e.message); }
      };
      if (b.sql) run(b.sql, 'sql');
      if (b.predict) {
        if (b.predict.sql) run(b.predict.sql, 'predict');
        if (!(b.predict.answer >= 0 && b.predict.answer < b.predict.options.length)) fail(tag + ' lesson[' + i + ']', 'predict answer out of range');
      }
    });
    (day.exercises || []).forEach(ex => {
      const w = tag + ' ' + ex.id;
      if (ids.has(ex.id)) fail(w, 'duplicate id'); ids.add(ex.id);
      if (!ex.hints || ex.hints.length < 2) fail(w, 'needs at least 2 hints');
      if (!ex.explain || ex.explain.length < 80) fail(w, 'needs an explain field (shown with the model solution)');
      try {
        const db = fresh();
        if (ex.kind === 'script') {
          if (ex.setup) db.exec(ex.setup);
          db.exec(ex.solution);
          if (ex.check) {
            const r = db.exec(ex.check);
            if (!r.length || !r[0].values.length) fail(w, 'check query returned no rows');
          } else if (ex.plan) {
            const r = db.exec('EXPLAIN QUERY PLAN ' + ex.plan.query);
            const txt = r[0].values.map(v => v[v.length - 1]).join(' | ');
            if (!txt.includes(ex.plan.mustContain)) fail(w, 'plan "' + txt + '" lacks ' + ex.plan.mustContain);
            const before = fresh(); if (ex.setup) before.exec(ex.setup);
            const r0 = before.exec('EXPLAIN QUERY PLAN ' + ex.plan.query);
            const t0 = r0[0].values.map(v => v[v.length - 1]).join(' | ');
            if (t0.includes(ex.plan.mustContain)) fail(w, 'plan already satisfied before the student does anything: ' + t0);
          } else fail(w, 'script exercise needs check or plan');
        } else {
          if (ex.setup) db.exec(ex.setup);
          const r = db.exec(ex.solution);
          if (!r.length) fail(w, 'solution returned no result set');
          else if (!r[r.length - 1].values.length && !ex.allowEmpty) fail(w, 'solution returned 0 rows');
          else if (process.env.SHOW) console.log(w, JSON.stringify(r[r.length - 1].columns), r[r.length - 1].values.length + ' rows', JSON.stringify(r[r.length - 1].values.slice(0, 3)));
        }
        checked++;
      } catch (e) { fail(w, e.message); }
    });
    (day.quiz || []).forEach(q => {
      if (ids.has(q.id)) fail(tag + ' ' + q.id, 'duplicate id'); ids.add(q.id);
      if (!(q.answer >= 0 && q.answer < q.options.length)) fail(tag + ' ' + q.id, 'answer out of range');
      if (!q.why) fail(tag + ' ' + q.id, 'missing why');
    });
    console.log(tag.padEnd(7), (day.title || '').padEnd(42), 'lesson', (day.lesson || []).length, 'ex', (day.exercises || []).length, 'quiz', (day.quiz || []).length);
  });
  console.log(errors ? errors + ' problem(s)' : 'All good', '-', checked, 'statements executed');
  process.exit(errors ? 1 : 0);
});
