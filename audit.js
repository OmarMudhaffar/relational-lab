// Checks that every exercise only uses SQL keywords/functions that a lesson (same day or earlier) has shown.
// Usage: node audit.js [day]
global.LAB = require('./seed.js');
require('fs').readdirSync(__dirname + '/days').filter(f => f.endsWith('.js')).sort().forEach(f => require('./days/' + f));
const only = process.argv[2] ? Number(process.argv[2]) : null;
const KW = new Set(('select from where and or not in is null like between group by having order asc desc limit offset distinct join inner left right full outer cross natural on using union all intersect except exists case when then else end create table primary key foreign references unique check default insert into values update set delete drop alter add column index view trigger begin commit rollback savepoint release transaction with recursive over partition rows range preceding following current unbounded conflict do nothing returning explain query plan cascade restrict filter window before after instead each autoincrement rename glob escape collate raise if as cast nulls first last').split(' '));
const FN = new Set('count sum avg min max total group_concat string_agg round abs length upper lower substr substring trim ltrim rtrim replace instr coalesce ifnull nullif date time datetime julianday strftime cast typeof random printf format iif row_number rank dense_rank ntile lag lead first_value last_value nth_value percent_rank cume_dist pragma_table_info pragma_foreign_key_list pragma_index_list pragma_index_info json_extract changes last_insert_rowid hex quote char sqrt pow power'.split(' '));
const STRICT = !process.env.LOOSE;
const strip = s => String(s || '').replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, ' ').replace(/"[^"]*"/g, ' ');
function feats(sql) {
  const s = strip(sql), out = new Set();
  (s.match(/[A-Za-z_][A-Za-z0-9_]*\s*\(/g) || []).forEach(m => { const f = m.replace(/\s*\($/, '').toLowerCase(); if (FN.has(f)) out.add(f + '()'); });
  (s.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).forEach(w => { const l = w.toLowerCase(); if (KW.has(l)) out.add(l); });
  if (/\|\|/.test(s)) out.add('||');
  if (/(^|[^<>!])<>|!=/.test(s)) out.add('<>');
  if (/%/.test(sql)) out.add('%');
  return out;
}
const days = LAB.days.slice().sort((a, b) => a.n - b.n);
const taught = new Set();
let gaps = 0;
days.forEach(d => {
  // what this day's lesson shows: runnable sql, predict sql, and SQL inside <code>/<pre> in the html
  d.lesson.forEach(b => {
    [b.sql, b.predict && b.predict.sql].forEach(x => x && feats(x).forEach(f => taught.add(f)));
    const html = (b.html || '') + ' ' + (b.predict ? b.predict.q + ' ' + b.predict.options.join(' ') : '');
    if (!STRICT) (html.match(/<(code|pre)[^>]*>[\s\S]*?<\/\1>/g) || []).forEach(c => feats(c.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).forEach(f => taught.add(f)));
  });
  if (only && d.n !== only) return;
  d.exercises.forEach(ex => {
    const used = feats(ex.solution + ' ' + (ex.plan ? '' : ''));
    const miss = [...used].filter(f => !taught.has(f));
    if (miss.length) { gaps++; console.log('day ' + d.n + ' ' + ex.id + ' (L' + ex.level + '): ' + miss.join(', ')); }
  });
});
console.log(gaps ? gaps + ' exercise(s) use something not yet taught' : 'Every exercise uses only taught features');
