(function () {
  // Builds a check query that describes table structure: columns, primary key membership,
  // required (NOT NULL or part of the PK), foreign keys and unique constraints. No ORDER BY,
  // so callers can append more UNION ALL rows before ordering.
  function schemaRows(tables) {
    var parts = [];
    tables.forEach(function (t) {
      parts.push(`SELECT '${t}' AS tbl, 'col' AS kind, name AS a, (pk > 0) AS b, CASE WHEN pk > 0 THEN 1 ELSE "notnull" END AS c FROM pragma_table_info('${t}')`);
      parts.push(`SELECT '${t}', 'fk', "from", lower("table"), NULL FROM pragma_foreign_key_list('${t}')`);
      parts.push(`SELECT '${t}', 'unique', ii.name, NULL, NULL FROM pragma_index_list('${t}') il JOIN pragma_index_info(il.name) ii WHERE il."unique" = 1 AND il.origin <> 'pk'`);
    });
    return parts.join('\nUNION ALL\n');
  }

  var FLAT = `CREATE TABLE orders_flat (
  order_id      INTEGER,
  order_date    TEXT,
  customer_id   INTEGER,
  customer_name TEXT,
  customer_city TEXT,
  product_id    TEXT,
  product_name  TEXT,
  unit_price    REAL,
  qty           INTEGER,
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO orders_flat VALUES
  (1, '2026-09-01', 10, 'Huda Saleh',   'Baghdad', 'P1', 'Notebook',   2.5, 4),
  (1, '2026-09-01', 10, 'Huda Saleh',   'Baghdad', 'P2', 'Pen',        1.0, 10),
  (2, '2026-09-02', 11, 'Karim Nasser', 'Amman',   'P1', 'Notebook',   2.5, 1),
  (2, '2026-09-02', 11, 'Karim Nasser', 'Amman',   'P3', 'Backpack',  30.0, 1),
  (3, '2026-09-03', 10, 'Huda Saleh',   'Baghdad', 'P4', 'Calculator',18.0, 1),
  (4, '2026-09-05', 12, 'Emma Silva',   'Berlin',  'P2', 'Pen',        1.0, 25),
  (4, '2026-09-05', 12, 'Emma Silva',   'Berlin',  'P5', 'Ruler',      0.8, 5),
  (4, '2026-09-05', 12, 'Emma Silva',   'Berlin',  'P1', 'Notebook',   2.5, 3),
  (5, '2026-09-07', 13, 'Ravi Patel',   'Dubai',   'P3', 'Backpack',  30.0, 2),
  (6, '2026-09-08', 11, 'Karim Nasser', 'Amman',   'P5', 'Ruler',      0.8, 2),
  (6, '2026-09-08', 11, 'Karim Nasser', 'Amman',   'P4', 'Calculator',18.0, 1);`;

  // Same table after careless edits: one city and one price were changed in only one row.
  var FLAT_DIRTY = FLAT + `
UPDATE orders_flat SET customer_city = 'Irbid' WHERE order_id = 6 AND product_id = 'P5';
UPDATE orders_flat SET unit_price = 0.9 WHERE order_id = 6 AND product_id = 'P5';
UPDATE orders_flat SET unit_price = 27.0 WHERE order_id = 5 AND product_id = 'P3';`;

  var TUTORING = `CREATE TABLE tutoring (
  student TEXT,
  course  TEXT,
  tutor   TEXT,
  PRIMARY KEY (student, course)
);
INSERT INTO tutoring VALUES
  ('Ali',  'Databases', 'Dr. Haddad'),
  ('Ali',  'Calculus',  'Dr. Kim'),
  ('Sara', 'Databases', 'Dr. Rossi'),
  ('Sara', 'Calculus',  'Dr. Kim'),
  ('Noor', 'Databases', 'Dr. Haddad'),
  ('Noor', 'Physics',   'Dr. Farouk'),
  ('Adam', 'Calculus',  'Dr. Petrova');`;

LAB.days.push({
  n: 10,
  week: 2,
  tag: 'NORMAL',
  title: 'Normalization',
  hours: 3,
  goals: [
    'Recognize update, insertion and deletion anomalies in a badly designed table',
    'Compute attribute closures and find every candidate key of a relation',
    'Decide whether a relation is in 1NF, 2NF, 3NF or BCNF, and decompose it',
    'Check that a decomposition is lossless and dependency-preserving'
  ],
  lesson: [
    {
      h: 'The problem: one big table',
      html: `<p>Imagine a shop that keeps everything in one spreadsheet-like table, one row per product per order. Run the example and look at how often "Karim Nasser, Amman" and "Notebook, 2.5" are repeated. Repetition is not only wasted space. It causes three <strong>anomalies</strong>:</p>
<ul><li><strong>Update anomaly</strong>: Karim moves to Irbid. You must change 4 rows. Miss one and the database contradicts itself.</li>
<li><strong>Insertion anomaly</strong>: you cannot add a new product until somebody orders it, because order_id is part of the key.</li>
<li><strong>Deletion anomaly</strong>: delete order 5 and you also lose the only record that customer Ravi Patel exists.</li></ul>
<p><strong>Normalization</strong> is a step-by-step method to split such a table into smaller ones so that every fact is stored exactly once.</p>`,
      sql: FLAT + `
SELECT * FROM orders_flat ORDER BY order_id, product_id;`
    },
    {
      h: 'Functional dependencies',
      html: `<p>A <strong>functional dependency</strong> (FD) <code>X → Y</code> means: two rows that agree on X must agree on Y. "X determines Y." In the shop table:</p>
<ul><li><code>customer_id → customer_name, customer_city</code></li>
<li><code>product_id → product_name, unit_price</code></li>
<li><code>order_id → order_date, customer_id</code></li>
<li><code>order_id, product_id → qty</code></li></ul>
<p>FDs come from the <em>meaning</em> of the data (business rules), not from the rows you happen to have. But data can <em>disprove</em> an FD. This query pattern finds every X value that breaks <code>X → Y</code>. It is the same pattern you will use in the exercises.</p>`,
      sql: `-- Does course_id → instructor_id hold in sections? (Is a course always taught by the same person?)
SELECT course_id, COUNT(DISTINCT instructor_id) AS different_instructors
FROM sections
GROUP BY course_id
HAVING COUNT(DISTINCT instructor_id) > 1;`,
      note: 'Any row returned is a counterexample, so the FD does not hold. Good news for the design: instructor_id belongs in sections, not in courses.'
    },
    {
      h: 'Armstrong\'s axioms',
      html: `<p>From some FDs you can derive others. Three rules (Armstrong's axioms) are enough to derive everything:</p>
<table class="mini"><thead><tr><th>Rule</th><th>If</th><th>Then</th></tr></thead><tbody>
<tr><td>Reflexivity</td><td>Y ⊆ X</td><td>X → Y (trivial FD)</td></tr>
<tr><td>Augmentation</td><td>X → Y</td><td>XZ → YZ</td></tr>
<tr><td>Transitivity</td><td>X → Y and Y → Z</td><td>X → Z</td></tr>
</tbody></table>
<p>Useful rules that follow from them: <strong>union</strong> (X → Y and X → Z give X → YZ), <strong>decomposition</strong> (X → YZ gives X → Y and X → Z) and <strong>pseudotransitivity</strong> (X → Y and WY → Z give WX → Z).</p>`
    },
    {
      h: 'Attribute closure X⁺, step by step',
      html: `<p>The <strong>closure</strong> X⁺ is the set of all attributes that X determines. It is the most important tool in this topic: it tests keys, tests FDs and checks normal forms. The algorithm:</p>
<ol class="steps"><li>Start with result = X.</li><li>Look for an FD A → B where all of A is already in result. Add B to result.</li><li>Repeat step 2 until nothing changes.</li></ol>
<p><strong>Worked example.</strong> R(A, B, C, D, E) with F = { A → B, B → C, CD → E }. Compute {A, D}⁺:</p>
<table class="mini"><thead><tr><th>Step</th><th>FD used</th><th>result</th></tr></thead><tbody>
<tr><td>start</td><td>—</td><td>{A, D}</td></tr>
<tr><td>1</td><td>A → B</td><td>{A, B, D}</td></tr>
<tr><td>2</td><td>B → C</td><td>{A, B, C, D}</td></tr>
<tr><td>3</td><td>CD → E</td><td>{A, B, C, D, E}</td></tr>
</tbody></table>
<p>{A, D}⁺ contains every attribute of R, so {A, D} is a <strong>superkey</strong>. And {A}⁺ = {A, B, C}, {D}⁺ = {D}: neither alone is enough, so {A, D} is minimal, which makes it a <strong>candidate key</strong>.</p>
<p>To test whether an FD X → Y follows from F, compute X⁺ and check that Y is inside it.</p>`
    },
    {
      h: 'Finding all candidate keys quickly',
      html: `<p>Sort the attributes into three groups using the FDs:</p>
<ul><li><strong>Never on a right side</strong>: must be in <em>every</em> key (nothing else can determine them).</li>
<li><strong>Only on right sides</strong>: never in any key (something else determines them).</li>
<li><strong>On both sides</strong>: maybe.</li></ul>
<p>Start with the "must" group. If its closure is all of R, it is the only candidate key. Otherwise add "maybe" attributes one at a time, then two at a time, and keep only the minimal sets whose closure is R.</p>
<p>Example: R(A, B, C, D) with F = { AB → C, C → D, D → A }. B is never on a right side, so B is in every key. {B}⁺ = {B}. Try adding one: {A,B}⁺ = ABCD ✓, {B,C}⁺ = BCDA ✓, {B,D}⁺ = BDA, then AB → C gives ABCD ✓. Candidate keys: AB, BC, BD.</p>`,
      predict: {
        q: 'R(A, B, C, D, E) with F = { A → C, B → D, AB → E }. What is the only candidate key?',
        options: ['{A}', '{A, B}', '{A, B, E}', '{C, D, E}'],
        answer: 1,
        why: 'A and B never appear on a right side, so both are in every key. {A,B}⁺ = {A,B,C,D,E} = all of R, so AB is the only candidate key. Adding E would make a superkey that is not minimal.'
      }
    },
    {
      h: 'First normal form (1NF)',
      html: `<p>A table is in <strong>1NF</strong> when every cell holds one <strong>atomic</strong> value: no lists, no repeating groups (phone1, phone2, phone3) and no nested tables. Every relational table you create with SQL already has the "no nested tables" part; the lists are what you must avoid.</p>
<p>Why it matters: with a list in a cell you cannot index it, join on it or count it properly, and searching needs fragile tricks like <code>LIKE '%SQL%'</code> (which also matches "NoSQL"). The fix is the same as for a multivalued attribute: a separate table with one row per value.</p>`,
      sql: `CREATE TABLE skills_bad (student_id INTEGER PRIMARY KEY, skills TEXT);
INSERT INTO skills_bad VALUES (1001, 'SQL,Python'), (1002, 'NoSQL'), (1003, 'Excel,SQL');

-- Who knows SQL? The fragile way finds a wrong answer:
SELECT student_id, skills FROM skills_bad WHERE skills LIKE '%SQL%';`,
      note: 'Student 1002 knows NoSQL, not SQL, but is returned. In a 1NF table (student_id, skill) the query is simply WHERE skill = \'SQL\'.'
    },
    {
      h: 'Second normal form (2NF)',
      html: `<p>A table is in <strong>2NF</strong> when it is in 1NF and no non-key attribute depends on <strong>only part</strong> of a candidate key. Such a dependency is called a <strong>partial dependency</strong>.</p>
<p>In <code>orders_flat</code> the key is (order_id, product_id). But <code>product_name</code> depends only on product_id, and <code>order_date</code> depends only on order_id. Both are partial dependencies, so the table is not in 2NF.</p>
<p>Fix: move each partial dependency into its own table, keyed by the part it depends on: <code>products(product_id, name, unit_price)</code>, <code>orders(order_id, order_date, customer_id, ...)</code>, and keep <code>order_items(order_id, product_id, qty)</code>.</p>
<div class="callout">A table whose primary key is a single column is automatically in 2NF: there is no "part" of the key to depend on.</div>`
    },
    {
      h: 'Third normal form (3NF)',
      html: `<p>A table is in <strong>3NF</strong> when it is in 2NF and no non-key attribute depends on another non-key attribute. That chain, key → A → B, is a <strong>transitive dependency</strong>.</p>
<p>After the 2NF step, <code>orders(order_id, order_date, customer_id, customer_name, customer_city)</code> still has one: order_id → customer_id → customer_city. Move the customer facts out: <code>customers(customer_id, name, city)</code>, and keep only <code>customer_id</code> in orders.</p>
<p>The formal definition (use this one in exams): for every non-trivial FD X → A, either <strong>X is a superkey</strong>, or <strong>A is a prime attribute</strong> (A is part of some candidate key).</p>
<p>A short way to remember 1NF to 3NF: every non-key attribute depends on "the key (1NF), the whole key (2NF), and nothing but the key (3NF)".</p>`,
      predict: {
        q: 'students(student_id, name, dept_id, dept_building). Key: student_id. Which normal form does it break first?',
        options: ['1NF', '2NF', '3NF', 'None, it is in BCNF'],
        answer: 2,
        why: 'The key is a single column, so 2NF holds. But student_id → dept_id → dept_building is transitive: dept_building depends on a non-key attribute. That breaks 3NF. Our real schema avoids it by keeping building in departments.'
      }
    },
    {
      h: 'Boyce–Codd normal form (BCNF)',
      html: `<p><strong>BCNF</strong> is stricter: for every non-trivial FD X → A, <strong>X must be a superkey</strong>. No exception for prime attributes. In words: every determinant is a key.</p>
<p>The classic case that is in 3NF but not BCNF: <code>tutoring(student, course, tutor)</code>. Each tutor teaches one course, and a student has one tutor per course.</p>
<ul><li>FDs: {student, course} → tutor, and tutor → course</li>
<li>Candidate keys: {student, course} and {student, tutor}</li>
<li>tutor → course: tutor is not a superkey ✗ for BCNF. But course is prime (part of a key), so 3NF is satisfied ✓.</li></ul>
<p>Decompose on the violating FD: <code>tutor_course(tutor, course)</code> and <code>student_tutor(student, tutor)</code>. The result is BCNF and lossless, but the FD {student, course} → tutor can no longer be checked inside one table. BCNF can cost dependency preservation; 3NF never does.</p>`,
      sql: TUTORING + `
-- tutor → course holds: every tutor teaches exactly one course
SELECT tutor, COUNT(DISTINCT course) AS courses FROM tutoring GROUP BY tutor;`,
      predict: {
        q: 'R(A, B, C) with F = { AB → C, C → B }. Candidate keys: AB and AC. What is the highest normal form?',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        answer: 2,
        why: 'C → B: C is not a superkey, so it is not BCNF. But B is prime (it is in key AB), so the 3NF condition holds. Same shape as the tutoring example.'
      }
    },
    {
      h: 'Good decompositions: lossless and dependency-preserving',
      html: `<p>Splitting a table is only correct if you can get the original back with a join. A decomposition of R into R1 and R2 is <strong>lossless</strong> when the shared columns are a key of R1 or of R2 (R1 ∩ R2 → R1 or R1 ∩ R2 → R2).</p>
<p>A <strong>lossy</strong> split does not lose rows. It <em>adds</em> fake ones, called spurious tuples. The example splits students on <code>city</code>, which is not a key of either part, and joins them back.</p>
<div class="callout"><strong>When to stop.</strong> In practice, design to 3NF (or BCNF when it costs nothing). 4NF and 5NF exist but rarely matter in daily work. Teams sometimes <strong>denormalize</strong> on purpose, storing a copy (a total, a name) to speed up a hot query, especially in reporting databases and star schemas. The price: something must keep the copies in sync. Normalize first; denormalize only with a measured reason.</div>`,
      sql: `WITH a AS (SELECT DISTINCT name, city FROM students WHERE city IS NOT NULL),
     b AS (SELECT DISTINCT city, dept_id FROM students WHERE city IS NOT NULL)
SELECT (SELECT COUNT(*) FROM students WHERE city IS NOT NULL) AS original_rows,
       (SELECT COUNT(*) FROM a JOIN b ON a.city = b.city)    AS rows_after_join;`,
      note: 'The extra rows claim that students belong to departments they never joined. A decomposition is also dependency-preserving when every FD can still be checked inside a single table.'
    }
  ],
  pitfalls: [
    'Deciding FDs from a few sample rows. Data can disprove an FD, but only the business rules can prove one.',
    'Forgetting that a closure must be repeated until nothing changes. One pass over the FDs is often not enough.',
    'Calling a superkey a candidate key. A candidate key must be minimal: test every proper subset.',
    'Saying "a table with a single-column key can violate 2NF". It cannot; 2NF is only about composite keys.',
    'Thinking a lossy decomposition loses rows. It creates extra (spurious) rows when you join back.',
    'Mixing up 3NF and BCNF. 3NF allows X → A when A is prime; BCNF does not.'
  ],
  dialect: `<ul><li>Normalization is pure theory: the rules are the same in every relational DBMS.</li>
<li>The FD-check query (<code>GROUP BY x HAVING COUNT(DISTINCT y) &gt; 1</code>) works in all of them.</li>
<li>Splitting a comma list into rows: SQLite needs a recursive CTE; PostgreSQL has <code>unnest(string_to_array(skills, ','))</code>; SQL Server has <code>STRING_SPLIT</code>; MySQL 8 can use <code>JSON_TABLE</code>.</li>
<li>Denormalized copies are often maintained with <strong>materialized views</strong> (PostgreSQL, Oracle) or <strong>indexed views</strong> (SQL Server). SQLite and MySQL have neither, so triggers are used instead.</li></ul>`,
  exercises: [
    {
      id: 'd10-1', level: 1,
      setup: FLAT_DIRTY,
      prompt: 'The table <code>orders_flat</code> was edited carelessly. Find the update anomaly: return <code>customer_id</code> and <code>cities</code> (the number of different <code>customer_city</code> values) for every customer that appears with more than one city.',
      solution: `SELECT customer_id, COUNT(DISTINCT customer_city) AS cities
FROM orders_flat
GROUP BY customer_id
HAVING COUNT(DISTINCT customer_city) > 1;`,
      hints: ['One group per customer: GROUP BY customer_id', 'COUNT(DISTINCT customer_city) counts the different cities.', 'Keep only the broken groups with HAVING ... > 1']
    },
    {
      id: 'd10-2', level: 1,
      prompt: 'Does the FD <code>city → dept_id</code> hold in <code>students</code>? Return every non-NULL <code>city</code> whose students are in more than one department, with <code>departments</code> = the number of different non-NULL dept_id values.',
      solution: `SELECT city, COUNT(DISTINCT dept_id) AS departments
FROM students
WHERE city IS NOT NULL
GROUP BY city
HAVING COUNT(DISTINCT dept_id) > 1;`,
      hints: ['Same pattern as the lesson: GROUP BY the left side, count distinct values of the right side.', 'Remove NULL cities with WHERE before grouping.', 'COUNT(DISTINCT dept_id) already ignores NULL dept_id values.']
    },
    {
      id: 'd10-3', level: 2,
      setup: FLAT_DIRTY,
      prompt: 'In <code>orders_flat</code>, <code>product_id → unit_price</code> should hold. Return <code>product_id</code>, <code>prices</code> (number of different unit_price values) and <code>lowest</code> and <code>highest</code> (the smallest and largest unit_price) for every product that breaks the FD.',
      solution: `SELECT product_id, COUNT(DISTINCT unit_price) AS prices, MIN(unit_price) AS lowest, MAX(unit_price) AS highest
FROM orders_flat
GROUP BY product_id
HAVING COUNT(DISTINCT unit_price) > 1;`,
      hints: ['GROUP BY product_id', 'Add MIN(unit_price) and MAX(unit_price) next to the COUNT(DISTINCT ...).', 'Filter with HAVING COUNT(DISTINCT unit_price) > 1']
    },
    {
      id: 'd10-4', level: 2,
      prompt: 'Is (student_id, course_id) a key of <code>enrollments</code> joined with <code>sections</code>? Find counterexamples: return <code>student_id</code>, <code>course_id</code> and <code>times</code> for every student who enrolled in the same course more than once (in different sections).',
      solution: `SELECT e.student_id, s.course_id, COUNT(*) AS times
FROM enrollments e JOIN sections s ON s.section_id = e.section_id
GROUP BY e.student_id, s.course_id
HAVING COUNT(*) > 1;`,
      hints: ['course_id lives in sections, so join enrollments to sections.', 'GROUP BY both columns of the candidate key.', 'A group with more than one row is a counterexample.']
    },
    {
      id: 'd10-5', level: 2, kind: 'script',
      setup: FLAT,
      prompt: 'Start the 3NF decomposition of <code>orders_flat</code>. Create <code>customers(customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT)</code> and fill it from <code>orders_flat</code> with one row per customer, using <code>INSERT ... SELECT DISTINCT</code>.',
      solution: `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
INSERT INTO customers (customer_id, name, city)
SELECT DISTINCT customer_id, customer_name, customer_city FROM orders_flat;`,
      check: `SELECT customer_id, name, city FROM customers ORDER BY customer_id;`,
      hints: ['First CREATE TABLE, then INSERT ... SELECT.', 'SELECT DISTINCT customer_id, customer_name, customer_city FROM orders_flat', 'The column names differ: name in customers comes from customer_name in orders_flat.']
    },
    {
      id: 'd10-6', level: 3, kind: 'script',
      setup: FLAT,
      prompt: `Finish the decomposition of <code>orders_flat</code> into 3NF. Create and fill exactly these four tables:
<ul><li><code>customers(customer_id PK, name, city)</code></li>
<li><code>products(product_id PK, name, unit_price)</code></li>
<li><code>orders(order_id PK, order_date, customer_id FK → customers)</code></li>
<li><code>order_items(order_id FK → orders, product_id FK → products, qty)</code> with primary key (order_id, product_id)</li></ul>
The grader joins your four tables back together and compares the result with <code>orders_flat</code>, so the decomposition must be lossless and store each customer, product and order only once.`,
      solution: `CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT);
CREATE TABLE products  (product_id TEXT PRIMARY KEY, name TEXT NOT NULL, unit_price REAL NOT NULL);
CREATE TABLE orders    (order_id INTEGER PRIMARY KEY, order_date TEXT NOT NULL,
                        customer_id INTEGER NOT NULL REFERENCES customers(customer_id));
CREATE TABLE order_items (
  order_id   INTEGER REFERENCES orders(order_id),
  product_id TEXT REFERENCES products(product_id),
  qty        INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);
INSERT INTO customers   SELECT DISTINCT customer_id, customer_name, customer_city FROM orders_flat;
INSERT INTO products    SELECT DISTINCT product_id, product_name, unit_price FROM orders_flat;
INSERT INTO orders      SELECT DISTINCT order_id, order_date, customer_id FROM orders_flat;
INSERT INTO order_items SELECT order_id, product_id, qty FROM orders_flat;`,
      check: `SELECT o.order_id, o.order_date, c.customer_id, c.name, c.city, p.product_id, p.name, p.unit_price, i.qty,
       (SELECT COUNT(*) FROM customers) AS n_customers,
       (SELECT COUNT(*) FROM products) AS n_products,
       (SELECT COUNT(*) FROM orders) AS n_orders,
       (SELECT COUNT(*) FROM pragma_foreign_key_list('orders')) AS fk_orders,
       (SELECT COUNT(*) FROM pragma_foreign_key_list('order_items')) AS fk_items
FROM order_items i
JOIN orders o    ON o.order_id = i.order_id
JOIN customers c ON c.customer_id = o.customer_id
JOIN products p  ON p.product_id = i.product_id
ORDER BY o.order_id, p.product_id;`,
      hints: ['List the FDs: customer_id → name, city; product_id → name, price; order_id → date, customer_id; (order_id, product_id) → qty.', 'One table per determinant. Create parents (customers, products) before children (orders, order_items).', 'Fill each table with INSERT ... SELECT DISTINCT from orders_flat, parents first.', 'order_items does not need DISTINCT: (order_id, product_id) is already unique in orders_flat.']
    },
    {
      id: 'd10-7', level: 3, kind: 'script',
      setup: `CREATE TABLE skills_raw (student_id INTEGER PRIMARY KEY, skills TEXT);
INSERT INTO skills_raw VALUES (1001, 'SQL,Python,Excel'), (1002, 'Python'), (1003, 'Excel,SQL');`,
      prompt: 'The table <code>skills_raw(student_id, skills)</code> breaks 1NF: <code>skills</code> holds comma-separated lists. Create <code>student_skills(student_id, skill)</code> with the pair as primary key and <code>student_id</code> referencing <code>students</code>, then fill it with one row per student per skill (6 rows). Typing the INSERT by hand is fine; splitting the strings with a recursive CTE is the bonus challenge.',
      solution: `CREATE TABLE student_skills (
  student_id INTEGER REFERENCES students(student_id),
  skill      TEXT,
  PRIMARY KEY (student_id, skill)
);
WITH RECURSIVE split(student_id, skill, rest) AS (
  SELECT student_id, '', skills || ',' FROM skills_raw
  UNION ALL
  SELECT student_id, substr(rest, 1, instr(rest, ',') - 1), substr(rest, instr(rest, ',') + 1)
  FROM split WHERE rest <> ''
)
INSERT INTO student_skills (student_id, skill)
SELECT student_id, skill FROM split WHERE skill <> '';`,
      check: schemaRows(['student_skills']) + `
UNION ALL
SELECT 'data', 'row', student_id, skill, NULL FROM student_skills
ORDER BY 1, 2, 3, 4;`,
      hints: ['The new table has one value per cell: (student_id, skill).', 'PRIMARY KEY (student_id, skill) and student_id REFERENCES students(student_id)', "Manual way: INSERT INTO student_skills VALUES (1001, 'SQL'), (1001, 'Python'), ...", 'CTE way: repeatedly take the text before the first comma with substr and instr, and keep the rest for the next step.']
    },
    {
      id: 'd10-8', level: 3, kind: 'script',
      setup: TUTORING,
      prompt: `<code>tutoring(student, course, tutor)</code> is in 3NF but not in BCNF because <code>tutor → course</code> and tutor is not a key. Decompose it into BCNF:
<ul><li><code>tutor_course(tutor TEXT PRIMARY KEY, course TEXT NOT NULL)</code></li>
<li><code>student_tutor(student TEXT, tutor TEXT REFERENCES tutor_course(tutor))</code> with primary key (student, tutor)</li></ul>
Fill both from <code>tutoring</code>.`,
      solution: `CREATE TABLE tutor_course (tutor TEXT PRIMARY KEY, course TEXT NOT NULL);
CREATE TABLE student_tutor (
  student TEXT,
  tutor   TEXT REFERENCES tutor_course(tutor),
  PRIMARY KEY (student, tutor)
);
INSERT INTO tutor_course SELECT DISTINCT tutor, course FROM tutoring;
INSERT INTO student_tutor SELECT student, tutor FROM tutoring;`,
      check: schemaRows(['tutor_course', 'student_tutor']) + `
UNION ALL
SELECT 'data', 'rejoin', st.student, tc.course, st.tutor
FROM student_tutor st JOIN tutor_course tc ON tc.tutor = st.tutor
ORDER BY 1, 2, 3, 4;`,
      hints: ['Decompose on the violating FD: one table for tutor → course, one for the rest.', 'The shared column (tutor) is the key of tutor_course, so the split is lossless.', 'INSERT INTO tutor_course SELECT DISTINCT tutor, course FROM tutoring;']
    },
    {
      id: 'd10-9', level: 3,
      prompt: 'Measure a lossy decomposition. Project <code>students</code> into A = DISTINCT (<code>name</code>, <code>dept_id</code>) and B = DISTINCT (<code>dept_id</code>, <code>city</code>), keeping only rows where both dept_id and city are not NULL. Join A and B on dept_id. Return one row with <code>original_rows</code> (students with non-NULL dept_id and city), <code>joined_rows</code> and <code>spurious_rows</code> (the difference).',
      solution: `WITH base AS (SELECT * FROM students WHERE dept_id IS NOT NULL AND city IS NOT NULL),
     a AS (SELECT DISTINCT name, dept_id FROM base),
     b AS (SELECT DISTINCT dept_id, city FROM base),
     j AS (SELECT a.name, a.dept_id, b.city FROM a JOIN b ON a.dept_id = b.dept_id)
SELECT (SELECT COUNT(*) FROM base) AS original_rows,
       (SELECT COUNT(*) FROM j) AS joined_rows,
       (SELECT COUNT(*) FROM j) - (SELECT COUNT(*) FROM base) AS spurious_rows;`,
      hints: ['Use WITH to name each step: base, a, b, and the join j.', 'a and b are SELECT DISTINCT projections of base.', 'Scalar subqueries let you return three counts in one row: SELECT (SELECT COUNT(*) FROM base) AS original_rows, ...']
    }
  ],
  quiz: [
    { id: 'd10-q1', q: 'R(A, B, C, D) with F = { A → B, B → C, C → D }. What is {B}⁺?', options: ['{B}', '{B, C}', '{B, C, D}', '{A, B, C, D}'], answer: 2, why: 'Start {B}. B → C adds C. C → D adds D. A → B cannot fire because A is not in the set.' },
    { id: 'd10-q2', q: 'R(A, B, C, D, E) with F = { AB → C, C → D, D → E }. Which is a candidate key?', options: ['{A}', '{A, B}', '{C}', '{A, B, C}'], answer: 1, why: 'A and B are never on a right side, so they are in every key. {A,B}⁺ = ABCDE. {A,B,C} is a superkey but not minimal.' },
    { id: 'd10-q3', q: 'R(A, B, C) with F = { A → B, B → A, A → C }. What are the candidate keys?', options: ['Only {A}', 'Only {B}', '{A} and {B}', '{A, B}'], answer: 2, why: '{A}⁺ = ABC and {B}⁺ = BAC. Both single attributes determine everything, so both are candidate keys.' },
    { id: 'd10-q4', q: 'enroll(student_id, course_id, grade, course_title) with key (student_id, course_id). Which normal form is violated?', options: ['1NF', '2NF', '3NF but not 2NF', 'None'], answer: 1, why: 'course_id → course_title depends on part of the key: a partial dependency, so 2NF fails.' },
    { id: 'd10-q5', q: 'employee(emp_id, dept_id, dept_name), key emp_id, with dept_id → dept_name. The table is…', options: ['Not in 1NF', 'In 2NF but not 3NF', 'In 3NF but not BCNF', 'In BCNF'], answer: 1, why: 'Single-column key, so 2NF holds. emp_id → dept_id → dept_name is transitive, so 3NF fails.' },
    { id: 'd10-q6', q: 'Which statement about BCNF and 3NF is true?', options: ['Every 3NF relation is in BCNF', 'Every BCNF relation is in 3NF', 'They are the same', 'BCNF allows partial dependencies'], answer: 1, why: 'BCNF is stricter. 3NF has an extra escape clause (A is prime) that BCNF removes.' },
    { id: 'd10-q7', q: 'R(A, B, C) is split into R1(A, B) and R2(B, C). When is this lossless?', options: ['Always', 'When B → A or B → C holds', 'When A → C holds', 'Never'], answer: 1, why: 'Lossless if the common attributes (B) are a key of at least one part: B → AB (i.e. B → A) or B → BC (i.e. B → C).' },
    { id: 'd10-q8', q: 'You cannot record a new course until at least one student enrolls in it. This is…', options: ['An update anomaly', 'An insertion anomaly', 'A deletion anomaly', 'A spurious tuple'], answer: 1, why: 'The design forces you to have unrelated data (an enrollment) before you can insert a fact (the course). That is an insertion anomaly.' }
  ],
  teach: 'Explain the difference between 2NF, 3NF and BCNF using one small example table for each violation. For each, say which dependency causes the problem and how you would split the table.',
  rubric: '2NF: no partial dependency of a non-key attribute on part of a composite key (example: course_title depends on course_id in enroll(student_id, course_id, ...)); 3NF: no transitive dependency key → non-key → non-key, formal rule X superkey or A prime (example: student → dept → building); BCNF: every determinant is a superkey, no prime exception (example: tutor → course); split on the violating FD into (X, A) and the rest; mentions lossless join (shared column is a key of one part).'
});
})();
