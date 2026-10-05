LAB.days.push({
  n: 12,
  week: 2,
  tag: 'INDEX',
  title: 'Indexes and Query Performance',
  hours: 3,
  goals: [
    'Explain why a full table scan is slow and how an index avoids it',
    'Describe a B+ tree and why it stays only 3 or 4 levels deep',
    'Read SQLite EXPLAIN QUERY PLAN output (SCAN, SEARCH, COVERING INDEX)',
    'Design composite, covering, expression and partial indexes, and use the leftmost-prefix rule',
    'Rewrite non-sargable filters so they can use an index'
  ],
  lesson: [
    {
      h: 'Where rows really live: pages',
      html: `<p>A table is stored on disk as a file of fixed-size <strong>pages</strong> (also called blocks): 4 KB in SQLite by default, 8 KB in PostgreSQL, 16 KB in MySQL InnoDB. Each page holds many rows. The disk and the operating system always read whole pages, never single rows.</p>
<p>So the cost of a query is mostly <strong>how many pages it must read</strong>. If the table has 1,000,000 rows in 20,000 pages and you ask for one student by email, a database without help must read all 20,000 pages and test every row. This is a <strong>full table scan</strong>.</p>
<p>An <strong>index</strong> is a separate, sorted structure that maps a column value to the location of its rows. Like the index at the back of a book: you find the word, then go straight to the page.</p>`
    },
    {
      h: 'The B+ tree',
      html: `<p>Almost every relational database uses the <strong>B+ tree</strong> as its default index. Its properties:</p>
<ul><li>All keys are kept in <strong>sorted order</strong>.</li><li>Inner nodes only hold separator keys and pointers to children.</li><li>All values (row pointers) are in the <strong>leaf nodes</strong>, which are all at the same depth.</li><li>Leaves are linked left to right, so a range like <code>salary BETWEEN 70000 AND 90000</code> finds the first leaf and then walks along.</li></ul>
<figure class="diagram"><svg viewBox="0 0 560 190" width="560" height="190" role="img" aria-label="A B+ tree with a root, two inner nodes and five linked leaves">
<defs><marker id="ar12" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>
<rect x="235" y="10" width="90" height="30" rx="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/><text x="280" y="30" text-anchor="middle" font-size="13" fill="var(--ink)">80000</text>
<rect x="95" y="75" width="120" height="30" rx="4" fill="var(--surface)" stroke="var(--ink)"/><text x="155" y="95" text-anchor="middle" font-size="13" fill="var(--ink)">68000 | 74000</text>
<rect x="345" y="75" width="120" height="30" rx="4" fill="var(--surface)" stroke="var(--ink)"/><text x="405" y="95" text-anchor="middle" font-size="13" fill="var(--ink)">88000 | 95000</text>
<line x1="260" y1="40" x2="170" y2="75" stroke="var(--muted)"/><line x1="300" y1="40" x2="390" y2="75" stroke="var(--muted)"/>
<g font-size="11" fill="var(--ink)">
<rect x="10" y="140" width="96" height="30" rx="3" fill="var(--bg2)" stroke="var(--line)"/><text x="58" y="159" text-anchor="middle">60000 64000</text>
<rect x="120" y="140" width="96" height="30" rx="3" fill="var(--bg2)" stroke="var(--line)"/><text x="168" y="159" text-anchor="middle">68000 70000 72000</text>
<rect x="230" y="140" width="96" height="30" rx="3" fill="var(--bg2)" stroke="var(--line)"/><text x="278" y="159" text-anchor="middle">74000 76000 79000</text>
<rect x="340" y="140" width="96" height="30" rx="3" fill="var(--bg2)" stroke="var(--line)"/><text x="388" y="159" text-anchor="middle">81000 83000 87000</text>
<rect x="450" y="140" width="100" height="30" rx="3" fill="var(--bg2)" stroke="var(--line)"/><text x="500" y="159" text-anchor="middle">88000 91000 98000</text></g>
<line x1="120" y1="105" x2="58" y2="140" stroke="var(--muted)"/><line x1="155" y1="105" x2="168" y2="140" stroke="var(--muted)"/><line x1="190" y1="105" x2="278" y2="140" stroke="var(--muted)"/>
<line x1="390" y1="105" x2="388" y2="140" stroke="var(--muted)"/><line x1="440" y1="105" x2="500" y2="140" stroke="var(--muted)"/>
<path d="M106,155 L118,155" stroke="var(--muted)" marker-end="url(#ar12)"/><path d="M216,155 L228,155" stroke="var(--muted)" marker-end="url(#ar12)"/><path d="M326,155 L338,155" stroke="var(--muted)" marker-end="url(#ar12)"/><path d="M436,155 L448,155" stroke="var(--muted)" marker-end="url(#ar12)"/>
<text x="555" y="125" text-anchor="end" font-size="11" fill="var(--muted)">leaves: sorted, linked</text>
</svg><figcaption>A small B+ tree on instructors.salary (simplified: real leaves also store row ids, and a real tree has a few children per separator key).</figcaption></figure>`
    },
    {
      h: 'Why B+ trees are shallow',
      html: `<p>A node is one page. With 8 KB pages and small keys, one inner node can point to several hundred children. This number is the <strong>fan-out</strong>. With fan-out 500:</p>
<table class="mini"><thead><tr><th>Levels</th><th>Rows that can be indexed</th></tr></thead><tbody>
<tr><td>2</td><td>500 × 500 = 250,000</td></tr><tr><td>3</td><td>125,000,000</td></tr><tr><td>4</td><td>62,500,000,000</td></tr></tbody></table>
<p>The height grows like <strong>log<sub>fan-out</sub>(N)</strong>. So finding one row among 100 million needs about 3–4 page reads instead of hundreds of thousands. The top levels are also almost always in memory, so in practice it is often a single disk read.</p>
<div class="callout"><strong>Other index types.</strong> A <em>hash index</em> computes a hash of the key and jumps to a bucket. It is great for <code>=</code> but useless for ranges (<code>&lt;</code>, <code>BETWEEN</code>) and for ORDER BY, because hashing destroys the order. PostgreSQL also has GIN (full text, arrays, JSON), GiST (geometry) and BRIN (huge time-ordered tables).</div>`
    },
    {
      h: 'Reading EXPLAIN QUERY PLAN',
      html: `<p>Put <code>EXPLAIN QUERY PLAN</code> before any query and SQLite tells you how it will run it, without running it. Look at the <code>detail</code> column:</p>
<ul><li><code>SCAN students</code>: full table scan, every row is read.</li><li><code>SEARCH students USING INDEX idx_x (city=?)</code>: the index is used to jump to matching rows.</li><li><code>SEARCH ... USING COVERING INDEX</code>: the index alone holds every column the query needs; the table is not touched at all.</li><li><code>USING INTEGER PRIMARY KEY</code>: lookup by the row id, the fastest possible access.</li></ul>
<p>Run this example. The first plan is a SCAN. Then we create an index and the same query becomes a SEARCH.</p>`,
      sql: `EXPLAIN QUERY PLAN SELECT name FROM students WHERE city = 'Cairo';
CREATE INDEX idx_students_city ON students(city);
EXPLAIN QUERY PLAN SELECT name FROM students WHERE city = 'Cairo';`,
      note: 'Only the last result is shown in full. Run the first line alone to see the SCAN plan.'
    },
    {
      h: 'Composite indexes and the leftmost-prefix rule',
      html: `<p>An index can contain several columns: <code>CREATE INDEX idx ON payments(student_id, paid_on)</code>. Entries are sorted by <code>student_id</code> first, and by <code>paid_on</code> inside each student. Think of a phone book sorted by (last name, first name).</p>
<p>The <strong>leftmost-prefix rule</strong>: the index can be used for searches on</p>
<ul><li><code>student_id</code> alone ✓</li><li><code>student_id</code> and <code>paid_on</code> ✓</li><li><code>paid_on</code> alone ✗ (like searching a phone book by first name only)</li></ul>
<p>Column order matters: put columns tested with <code>=</code> first and the range column (<code>&lt;</code>, <code>&gt;</code>, BETWEEN) last.</p>`,
      sql: `CREATE INDEX idx_pay_student_date ON payments(student_id, paid_on);
EXPLAIN QUERY PLAN
SELECT student_id, paid_on FROM payments
WHERE student_id = 1005 AND paid_on >= '2026-01-01';`,
      predict: {
        q: 'The only index is payments(student_id, paid_on). Which WHERE clause can use it to SEARCH?',
        options: ["WHERE paid_on = '2026-03-01'", "WHERE method = 'cash'", 'WHERE student_id = 1010', "WHERE paid_on > '2026-01-01' OR method = 'bank'"],
        answer: 2,
        why: 'student_id is the first (leftmost) column of the index. paid_on alone is not the first column, and method is not in the index.'
      }
    },
    {
      h: 'Covering indexes',
      html: `<p>A normal index lookup is two steps: find the entry in the index, then fetch the full row from the table. If the index already contains <strong>every column the query uses</strong> (in SELECT, WHERE, ORDER BY), the second step disappears. That index is <strong>covering</strong> for that query.</p>
<p>In the previous example the query only used <code>student_id</code> and <code>paid_on</code>, so the plan said <code>USING COVERING INDEX</code>. If you add <code>amount</code> to the SELECT list, the plan goes back to <code>USING INDEX</code> because the table must be read too.</p>
<p>SQL Server and PostgreSQL let you add non-key columns just for covering: <code>CREATE INDEX ... ON payments(student_id) INCLUDE (amount)</code>.</p>`
    },
    {
      h: 'Selectivity: when an index does not help',
      html: `<p><strong>Selectivity</strong> is the fraction of rows a condition returns. An index pays off when the condition is <em>selective</em> (returns few rows): <code>email = ...</code> returns 1 row out of 40.</p>
<p>A condition like <code>year = 2</code> may return 25% of the table, and <code>method = 'card'</code> may return half of it. Jumping through the index for each of those rows can be slower than one straight scan. The <strong>query optimizer</strong> estimates this using statistics (number of distinct values, histograms; run <code>ANALYZE</code> to refresh them) and may decide to ignore your index. That is correct behavior, not a bug.</p>
<p>Rule of thumb: an index on a column with very few distinct values (gender, a boolean, a status with 3 values) rarely helps by itself.</p>`,
      sql: `SELECT COUNT(*) AS total_rows,
       COUNT(DISTINCT email) AS distinct_email,
       COUNT(DISTINCT year) AS distinct_year,
       COUNT(DISTINCT city) AS distinct_city
FROM students;`
    },
    {
      h: 'Sargable predicates',
      html: `<p>A condition is <strong>sargable</strong> (Search ARGument ABLE) when the database can use an index for it. The rule: <strong>leave the indexed column alone</strong> on one side of the comparison.</p>
<table class="mini"><thead><tr><th>Not sargable (scan)</th><th>Sargable rewrite (can SEARCH)</th></tr></thead><tbody>
<tr><td><code>WHERE substr(hire_date,1,4) = '2017'</code></td><td><code>WHERE hire_date &gt;= '2017-01-01' AND hire_date &lt; '2018-01-01'</code></td></tr>
<tr><td><code>WHERE salary * 12 &gt; 1000000</code></td><td><code>WHERE salary &gt; 1000000 / 12.0</code></td></tr>
<tr><td><code>WHERE year + 1 = 3</code></td><td><code>WHERE year = 2</code></td></tr>
<tr><td><code>WHERE name LIKE '%Haddad'</code></td><td>No simple rewrite: a leading wildcard cannot use a B+ tree. Use full-text search.</td></tr>
</tbody></table>
<p>If you must filter on an expression, many databases let you index the expression itself: <code>CREATE INDEX idx ON students(lower(city))</code>. The query must use exactly the same expression.</p>`,
      predict: {
        q: 'There is an index on instructors(hire_date). Which filter can use it?',
        options: ["WHERE substr(hire_date, 1, 4) = '2020'", "WHERE hire_date LIKE '%2020%'", "WHERE hire_date BETWEEN '2020-01-01' AND '2020-12-31'", "WHERE date(hire_date, '+1 year') > '2021-01-01'"],
        answer: 2,
        why: 'Only BETWEEN keeps hire_date alone. The other three put a function on the column or start with a % wildcard.'
      }
    },
    {
      h: 'The cost of indexes',
      html: `<p>Indexes are not free:</p>
<ul><li>Every <code>INSERT</code> and <code>DELETE</code> must also update every index on the table; an <code>UPDATE</code> of an indexed column must too. A table with 10 indexes makes writes much slower.</li><li>Indexes use disk space and memory (cache).</li><li>Unused indexes still pay these costs.</li></ul>
<p><strong>Good default choices:</strong> primary keys (created automatically), foreign key columns that you join on (<code>enrollments.section_id</code>, <code>sections.course_id</code>), and columns that appear in frequent, selective WHERE clauses. Then measure with EXPLAIN, not with guesses.</p>
<p><strong>Partial index</strong> (PostgreSQL, SQLite): index only some rows, e.g. <code>CREATE INDEX idx ON enrollments(section_id) WHERE grade IS NULL</code> keeps a small index of in-progress enrollments.</p>`
    },
    {
      h: 'Clustered vs non-clustered',
      html: `<p>In a <strong>clustered index</strong> the table rows themselves are stored inside the B+ tree leaves, in key order. A table can have only one, because rows can be physically sorted only one way.</p>
<ul><li><strong>MySQL InnoDB</strong>: the primary key is always the clustered index. Secondary indexes store the primary key value, so a lookup through a secondary index then searches the PK tree.</li><li><strong>SQL Server</strong>: you choose the clustered index (by default the PK). Others are non-clustered.</li><li><strong>SQLite</strong>: ordinary tables are clustered on the rowid (your <code>INTEGER PRIMARY KEY</code>).</li><li><strong>PostgreSQL</strong>: tables are heaps (unordered); all indexes are secondary.</li></ul>
<p>A <strong>non-clustered</strong> (secondary) index is a separate tree whose leaves point to the rows.</p>`,
      predict: {
        q: 'In MySQL InnoDB, why should a primary key usually be short (a number, not a long text)?',
        options: ['Text keys are not allowed', 'Every secondary index stores the primary key, so a long key makes all indexes bigger', 'Long keys make COUNT(*) wrong', 'InnoDB cannot sort text'],
        answer: 1,
        why: 'In InnoDB, every other index stores the primary key value to find the row. A long key is copied into every index.'
      }
    }
  ],
  pitfalls: [
    'Creating an index on every column "just in case". Each one slows down every write and uses memory.',
    'Wrapping an indexed column in a function (<code>lower(email)</code>, <code>substr(date,...)</code>, <code>year(date)</code>) and then wondering why the index is not used.',
    'Putting the range column first in a composite index. <code>(paid_on, student_id)</code> is poor for <code>student_id = ? AND paid_on &gt; ?</code>; use <code>(student_id, paid_on)</code>.',
    'Forgetting to index foreign key columns used in joins. Joins on unindexed columns scan the child table for every parent row.',
    'Judging speed on a tiny table. With 40 rows every plan is fast; read the plan to see what will happen with 40 million.',
    'Expecting <code>LIKE \'%text%\'</code> to use a B+ tree index. A leading wildcard always scans.'
  ],
  dialect: `<ul><li><strong>See the plan:</strong> SQLite <code>EXPLAIN QUERY PLAN</code>; PostgreSQL <code>EXPLAIN</code> and <code>EXPLAIN ANALYZE</code> (runs it and shows real times); MySQL <code>EXPLAIN</code> / <code>EXPLAIN ANALYZE</code>; SQL Server "Display Estimated Execution Plan" or <code>SET SHOWPLAN_ALL ON</code>; Oracle <code>EXPLAIN PLAN FOR ...</code> then <code>DBMS_XPLAN.DISPLAY</code>.</li><li><strong>Plan words:</strong> PostgreSQL shows <em>Seq Scan</em>, <em>Index Scan</em>, <em>Index Only Scan</em> (= covering), <em>Bitmap Heap Scan</em>. MySQL shows <code>type: ALL</code> for a full scan and <code>type: ref/range</code> for index use.</li><li><strong>LIKE and indexes:</strong> SQLite's LIKE is case-insensitive, so <code>LIKE 'Sara%'</code> uses an index only with special settings; a range <code>name &gt;= 'Sara' AND name &lt; 'Sarb'</code> always can. PostgreSQL needs a <code>text_pattern_ops</code> index for LIKE prefixes in non-C collations.</li><li><strong>Statistics:</strong> <code>ANALYZE</code> in SQLite and PostgreSQL, <code>ANALYZE TABLE</code> in MySQL, <code>UPDATE STATISTICS</code> in SQL Server.</li></ul>`,
  exercises: [
    {
      id: 'd12-1', level: 1, kind: 'script',
      prompt: '<p>This query is slow on a big table. It reads (scans) every row of <code>students</code>:</p><pre class="code">SELECT name, email FROM students WHERE city = \'Cairo\';</pre><ul class="spec"><li><b>Create:</b> an index that makes the plan a <code>SEARCH</code> on students.</li></ul>',
      solution: `CREATE INDEX idx_students_city ON students(city);`,
      plan: { query: `SELECT name, email FROM students WHERE city = 'Cairo'`, mustContain: 'SEARCH students USING' },
      hints: ['Index the column that is in the WHERE clause.', 'CREATE INDEX some_name ON table(column);', 'CREATE INDEX idx_students_city ON students(city);']
    },
    {
      id: 'd12-2', level: 1, kind: 'script',
      prompt: '<p>Many queries look for the students of one section. They filter <code>enrollments</code> by <code>section_id</code>:</p><pre class="code">SELECT student_id, grade FROM enrollments WHERE section_id = 12;</pre><ul class="spec"><li><b>Create:</b> an index named <code>idx_enr_section</code> that this query uses.</li><li><b>Note:</b> the primary key is <code>(student_id, section_id)</code>. It starts with <code>student_id</code>, so it does not help here (leftmost-prefix rule).</li></ul>',
      solution: `CREATE INDEX idx_enr_section ON enrollments(section_id);`,
      plan: { query: `SELECT student_id, grade FROM enrollments WHERE section_id = 12`, mustContain: 'idx_enr_section' },
      hints: ['The primary key index starts with student_id. It cannot search by section_id alone.', 'CREATE INDEX idx_enr_section ON enrollments(...);']
    },
    {
      id: 'd12-3', level: 1, kind: 'script',
      prompt: '<p>Make this range query use an index:</p><pre class="code">SELECT name FROM instructors WHERE salary BETWEEN 80000 AND 95000;</pre><ul class="spec"><li><b>Create:</b> an index so the plan shows <code>SEARCH instructors USING ...</code>.</li></ul>',
      solution: `CREATE INDEX idx_instr_salary ON instructors(salary);`,
      plan: { query: `SELECT name FROM instructors WHERE salary BETWEEN 80000 AND 95000`, mustContain: 'SEARCH instructors USING' },
      hints: ['B+ tree indexes keep keys in order, so they can find ranges.', 'Index the salary column.']
    },
    {
      id: 'd12-4', level: 2,
      prompt: '<p>There is an index on <code>instructors(hire_date)</code>. This query cannot use it, because it puts a function on the column:</p><pre class="code">SELECT name, hire_date FROM instructors WHERE substr(hire_date, 1, 4) = \'2017\';</pre><p>Rewrite it. It must return the same rows. Use a condition on <code>hire_date</code> with no function on it (a sargable condition).</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>hire_date</code></li></ul>',
      solution: `SELECT name, hire_date FROM instructors WHERE hire_date >= '2017-01-01' AND hire_date < '2018-01-01';`,
      hints: ['Do not put any function on hire_date.', 'Dates in YYYY-MM-DD text sort correctly as text, so a range works.', "hire_date >= '2017-01-01' AND hire_date < '2018-01-01'"]
    },
    {
      id: 'd12-5', level: 2,
      prompt: '<p>Rewrite this query so <code>salary</code> stands alone on one side of the comparison. It must return the same rows:</p><pre class="code">SELECT name, salary FROM instructors WHERE salary * 12 &gt; 1000000;</pre><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>salary</code></li></ul>',
      solution: `SELECT name, salary FROM instructors WHERE salary > 1000000 / 12.0;`,
      hints: ['Move the 12 to the other side: divide both sides by 12.', 'Write 12.0, so SQLite does not do whole-number division.', 'WHERE salary > 1000000 / 12.0']
    },
    {
      id: 'd12-6', level: 2, kind: 'script',
      prompt: '<p>Someone created the index <code>idx_pay_date_student ON payments(paid_on, student_id)</code>. But this query still scans the whole table:</p><pre class="code">SELECT * FROM payments WHERE student_id = 1010 AND method = \'card\';</pre><ul class="spec"><li><b>Create:</b> a better index named <code>idx_pay_student_method</code> that the plan uses.</li></ul>',
      setup: `CREATE INDEX idx_pay_date_student ON payments(paid_on, student_id);`,
      solution: `CREATE INDEX idx_pay_student_method ON payments(student_id, method);`,
      plan: { query: `SELECT * FROM payments WHERE student_id = 1010 AND method = 'card'`, mustContain: 'idx_pay_student_method' },
      hints: ['The old index starts with paid_on. The query does not filter on paid_on (leftmost-prefix rule).', 'Both filtered columns use =, so both can go into the index.', 'CREATE INDEX idx_pay_student_method ON payments(student_id, method);']
    },
    {
      id: 'd12-7', level: 3, kind: 'script',
      prompt: '<p>Create one index that makes this query <strong>covering</strong>. Covering means the database reads only the index, not the table:</p><pre class="code">SELECT student_id, paid_on FROM payments\nWHERE student_id = 1005 AND paid_on &gt;= \'2026-01-01\';</pre><ul class="spec"><li><b>Create:</b> an index so the plan says <code>USING COVERING INDEX</code>.</li></ul>',
      solution: `CREATE INDEX idx_pay_student_date ON payments(student_id, paid_on);`,
      plan: { query: `SELECT student_id, paid_on FROM payments WHERE student_id = 1005 AND paid_on >= '2026-01-01'`, mustContain: 'USING COVERING INDEX' },
      hints: ['The index must hold every column the query uses: student_id and paid_on.', 'Put the column with = first, and the range column last.', 'CREATE INDEX ... ON payments(student_id, paid_on);']
    },
    {
      id: 'd12-8', level: 3, kind: 'script',
      prompt: '<p>The app searches cities without caring about capital letters:</p><pre class="code">SELECT name FROM students WHERE lower(city) = \'cairo\';</pre><p>A normal index on <code>city</code> does not help, because the query puts <code>lower()</code> on the column.</p><ul class="spec"><li><b>Create:</b> an <strong>expression index</strong> (an index on <code>lower(city)</code>) so the plan shows <code>SEARCH students USING ...</code>.</li></ul>',
      solution: `CREATE INDEX idx_students_lower_city ON students(lower(city));`,
      plan: { query: `SELECT name FROM students WHERE lower(city) = 'cairo'`, mustContain: 'SEARCH students USING' },
      hints: ['You can index an expression, not only a column.', 'The expression in the index must be exactly the same as in the query.', 'CREATE INDEX idx_students_lower_city ON students(lower(city));']
    },
    {
      id: 'd12-9', level: 3, kind: 'script',
      prompt: '<p>Teachers often list the students who have no grade yet (grade is NULL) in one section:</p><pre class="code">SELECT student_id FROM enrollments WHERE grade IS NULL AND section_id = 30;</pre><ul class="spec"><li><b>Create:</b> a <strong>partial index</strong> named <code>idx_in_progress</code> on <code>section_id</code>. It must only include rows where <code>grade IS NULL</code>. The plan must use it.</li><li><b>Note:</b> a partial index stores only the rows that match its own WHERE.</li></ul>',
      solution: `CREATE INDEX idx_in_progress ON enrollments(section_id) WHERE grade IS NULL;`,
      plan: { query: `SELECT student_id FROM enrollments WHERE grade IS NULL AND section_id = 30`, mustContain: 'idx_in_progress' },
      hints: ['A partial index has its own WHERE at the end of CREATE INDEX.', 'CREATE INDEX idx_in_progress ON enrollments(section_id) WHERE ...;']
    },
    {
      id: 'd12-10', level: 2,
      prompt: '<p>Before you choose indexes, measure how many different values a column has (its selectivity). Return one row about the <code>payments</code> table.</p><ul class="spec"><li><b>Columns:</b> <code>total_rows</code>, <code>distinct_students</code> (different <code>student_id</code> values), <code>distinct_methods</code> (different methods), <code>method_selectivity</code></li><li><b>Note:</b> <code>method_selectivity</code> = 1.0 divided by the number of different methods, rounded to 3 decimals.</li></ul>',
      solution: `SELECT COUNT(*) AS total_rows, COUNT(DISTINCT student_id) AS distinct_students, COUNT(DISTINCT method) AS distinct_methods, ROUND(1.0 / COUNT(DISTINCT method), 3) AS method_selectivity FROM payments;`,
      hints: ['COUNT(DISTINCT column) counts the different values.', 'Use 1.0, so the division keeps decimals.', 'ROUND(1.0 / COUNT(DISTINCT method), 3)']
    }
  ],
  quiz: [
    { id: 'd12-q1', q: 'A B+ tree index has fan-out 400 (400 keys per node). It indexes 60 million rows. About how many levels does it have?', options: ['1', '3', '20', '400'], answer: 1, why: '400 × 400 = 160,000 and 400 × 400 × 400 = 64 million. So 3 levels are enough.' },
    { id: 'd12-q2', q: 'Why are the leaves of a B+ tree linked to each other?', options: ['To make range scans and sorted reads fast', 'To make inserts faster', 'To save disk space', 'To support hash lookups'], answer: 0, why: 'The engine finds the first key of the range. Then it walks along the linked leaves. It does not go back up the tree.' },
    { id: 'd12-q3', q: 'There is an index on (dept_id, year). Which query CANNOT use it to search?', options: ['WHERE dept_id = 1', 'WHERE dept_id = 1 AND year = 2', 'WHERE year = 2', 'WHERE dept_id = 1 AND year > 2'], answer: 2, why: 'The index starts with dept_id. A filter on year alone does not use the first column (leftmost-prefix rule).' },
    { id: 'd12-q4', q: 'For which query is a hash index a bad choice?', options: ["WHERE email = 'x@uni.edu'", 'WHERE student_id = 1001', "WHERE paid_on BETWEEN '2026-01-01' AND '2026-03-31'", 'WHERE course_id = \'CS220\''], answer: 2, why: 'A hash index does not keep values in order. So it cannot find a range of values.' },
    { id: 'd12-q5', q: 'The plan says "SEARCH payments USING COVERING INDEX idx". What does that mean?', options: ['The table and the index were both read', 'Only the index was read; the table was not touched', 'The index covers all rows of the table', 'The query used a full scan'], answer: 1, why: 'A covering index holds every column the query needs. So the database does not need to read the table.' },
    { id: 'd12-q6', q: 'There is an index on students(birth_date). Which filter can use it (is sargable)?', options: ["WHERE strftime('%Y', birth_date) = '2004'", "WHERE birth_date >= '2004-01-01' AND birth_date < '2005-01-01'", "WHERE birth_date LIKE '%2004%'", "WHERE date(birth_date) = '2004-05-01'"], answer: 1, why: 'Only the range keeps birth_date alone, with no function on it.' },
    { id: 'd12-q7', q: 'A table gets 5,000 inserts per second. People rarely read it. What is the main risk of adding 8 indexes?', options: ['Queries become wrong', 'Every insert must update 8 extra trees, so writes get slower', 'The primary key stops working', 'The table becomes read-only'], answer: 1, why: 'Indexes make reads faster. But every write must update every index.' },
    { id: 'd12-q8', q: 'In MySQL InnoDB, what is the clustered index?', options: ['A random index', 'Always the primary key', 'Any unique index you choose', 'It is not supported'], answer: 1, why: 'InnoDB stores the rows inside the primary key B+ tree. Other indexes find rows through the primary key value.' }
  ],
  teach: 'Explain to a classmate why the query WHERE substr(hire_date,1,4) = \'2017\' does not use an index on hire_date, and how to rewrite it. Mention what a B+ tree has to do with it.',
  rubric: 'A B+ tree stores the column values sorted; the database can only navigate it when it compares the raw column to a value; wrapping the column in a function (substr) produces values the tree does not store, so the engine must compute it for every row (full scan); rewrite as a range hire_date >= \'2017-01-01\' AND hire_date < \'2018-01-01\'; optional: an expression index on substr(hire_date,1,4) is an alternative.'
});
