LAB.days.push({
  n: 1,
  week: 1,
  tag: 'SELECT',
  title: 'Tables, Keys and Your First Queries',
  hours: 2.5,
  goals: [
    'Describe a table in relational terms: relation, tuple, attribute, domain',
    'Explain what primary keys and foreign keys guarantee',
    'Write SELECT queries with column lists, aliases, expressions, DISTINCT, ORDER BY and LIMIT'
  ],
  lesson: [
    {
      h: 'Why databases exist',
      html: `<p>Before databases, programs saved data in their own files. Every program had its own format, two programs could overwrite each other, and a crash halfway through a save left the file broken. A <strong>database management system (DBMS)</strong> solves this once for everyone. It stores the data, answers questions about it, lets many users work at the same time, and keeps the data correct after crashes.</p>
<p>A <strong>relational</strong> DBMS (PostgreSQL, MySQL, SQL Server, Oracle, SQLite) stores everything in tables and lets you ask questions in one language: <strong>SQL</strong>. The lab you are using runs a real SQLite engine inside your browser, so every query you write here is actually executed.</p>`
    },
    {
      h: 'The vocabulary: relation, tuple, attribute',
      html: `<p>Your teacher may use the formal words. They map one-to-one to the everyday words:</p>
<table class="mini"><thead><tr><th>Formal (theory)</th><th>Everyday (SQL)</th><th>In our data</th></tr></thead><tbody>
<tr><td>Relation</td><td>Table</td><td><code>students</code></td></tr>
<tr><td>Tuple</td><td>Row</td><td>One student, e.g. Ahmed Al-Sayed</td></tr>
<tr><td>Attribute</td><td>Column</td><td><code>email</code></td></tr>
<tr><td>Domain</td><td>Data type + allowed values</td><td><code>year</code> is an integer from 1 to 4</td></tr>
<tr><td>Degree / Cardinality</td><td>Number of columns / rows</td><td>students has degree 9, cardinality 40</td></tr>
</tbody></table>
<p>Two rules from theory matter in practice. Rows have <strong>no built-in order</strong>: a table is a set, so if you need an order you must ask for it. And every row must be <strong>identifiable</strong>, which is the job of keys.</p>`
    },
    {
      h: 'Keys hold the design together',
      html: `<p>A <strong>primary key (PK)</strong> is a column (or group of columns) whose value is unique and never NULL. It names exactly one row. <code>students.student_id</code> is a primary key.</p>
<p>A <strong>foreign key (FK)</strong> is a column whose values must match a primary key in another table. <code>students.dept_id</code> references <code>departments.dept_id</code>, so the database refuses a student whose department does not exist. This rule is called <strong>referential integrity</strong>.</p>
<div class="callout"><strong>Other key words you will see in exams.</strong> A <em>superkey</em> is any set of columns that is unique. A <em>candidate key</em> is a minimal superkey (remove any column and it stops being unique). The primary key is the candidate key the designer picked. <code>email</code> is also a candidate key in <code>students</code>, which is why it is declared <code>UNIQUE</code>.</div>
<p>Press <strong>Schema</strong> in the top bar at any time to see every table, its columns and its keys. In Practice, every exercise also lists the tables it uses: click a name to see its columns.</p>`
    },
    {
      h: 'SELECT and FROM',
      html: `<p>The smallest useful query names the columns you want and the table they come from. <code>*</code> means every column. In real applications, list the columns you need: it is clearer and it does not break when someone adds a column later.</p>`,
      sql: `SELECT name, email, year
FROM students;`,
      note: 'Press Run (or Ctrl/Cmd + Enter). Then edit the column list and run it again.'
    },
    {
      h: 'Expressions and aliases',
      html: `<p>A column in the SELECT list can be any expression: arithmetic, text concatenation (<code>||</code> in standard SQL and SQLite), or a function call. Use <code>AS</code> to give the result column a readable name. An alias with spaces needs double quotes.</p>`,
      sql: `SELECT name,
       salary,
       salary / 12 AS monthly_salary,
       ROUND(salary * 1.05) AS "salary after 5% raise"
FROM instructors;`
    },
    {
      h: 'Removing duplicates with DISTINCT',
      html: `<p>A query result can contain duplicate rows even though a table should not. <code>DISTINCT</code> keeps one copy of each different row. It applies to the whole row, not to the first column only.</p>`,
      predict: {
        sql: `SELECT DISTINCT city FROM students;`,
        q: 'Some students have no city (NULL). How does DISTINCT treat several NULL cities?',
        options: ['It removes all NULL rows', 'It keeps one NULL row', 'It keeps every NULL row because NULL is never equal to NULL', 'It raises an error'],
        answer: 1,
        why: 'DISTINCT and GROUP BY treat all NULLs as one group, so exactly one NULL row remains. This is one of the few places where NULLs are treated as "the same".'
      }
    },
    {
      h: 'ORDER BY and LIMIT',
      html: `<p>Because tables have no order, the only way to get a guaranteed order is <code>ORDER BY</code>. You can sort by several columns, each <code>ASC</code> (default) or <code>DESC</code>. The second column only breaks ties in the first.</p>
<p><code>LIMIT n</code> keeps the first n rows after sorting. <code>LIMIT n OFFSET m</code> skips m rows first, which is how page 2, page 3 and so on are built.</p>`,
      sql: `SELECT name, dept_id, salary
FROM instructors
ORDER BY dept_id ASC, salary DESC
LIMIT 5;`,
      note: 'Dialects: SQL Server writes SELECT TOP 5 ..., Oracle and the SQL standard write FETCH FIRST 5 ROWS ONLY.'
    },
    {
      h: 'How the database reads your query',
      html: `<p>You write SELECT first, but the database evaluates the clauses in a different order. Learn this order now. It explains many errors you will meet later.</p>
<ol class="steps"><li><code>FROM</code>: pick the table(s)</li><li><code>WHERE</code>: filter rows</li><li><code>GROUP BY</code>: form groups</li><li><code>HAVING</code>: filter groups</li><li><code>SELECT</code>: compute the output columns</li><li><code>DISTINCT</code>: remove duplicates</li><li><code>ORDER BY</code>: sort</li><li><code>LIMIT</code>: cut</li></ol>
<p>So an alias made in SELECT is not yet known in WHERE (step 2 runs before step 5), but it can be used in ORDER BY (step 7).</p>`,
      predict: {
        q: 'Which query fails in PostgreSQL and SQL Server?',
        options: ['SELECT salary/12 AS m FROM instructors ORDER BY m', 'SELECT salary/12 AS m FROM instructors WHERE m > 7000', 'SELECT name FROM instructors ORDER BY salary', 'SELECT DISTINCT dept_id FROM instructors'],
        answer: 1,
        why: 'WHERE runs before SELECT, so the alias m does not exist yet. SQLite is lenient and accepts it, but most databases reject it. Repeat the expression instead: WHERE salary/12 > 7000.'
      }
    }
  ],
  pitfalls: [
    'Expecting rows to come back in insertion order. Without ORDER BY the order is not guaranteed and can change between runs.',
    'Writing text values with double quotes. In standard SQL, <code>\'Cairo\'</code> is a string and <code>"Cairo"</code> is a column name.',
    'Thinking DISTINCT applies to one column. <code>SELECT DISTINCT a, b</code> removes rows where both a and b repeat.',
    'Using SELECT * in application code. It hides which columns you rely on.'
  ],
  dialect: `<ul><li><strong>Limit rows:</strong> SQLite, PostgreSQL, MySQL use <code>LIMIT 5</code>. SQL Server uses <code>SELECT TOP 5</code>. Oracle 12c+ and the standard use <code>FETCH FIRST 5 ROWS ONLY</code>.</li><li><strong>Concatenation:</strong> <code>||</code> in SQLite, PostgreSQL, Oracle. MySQL uses <code>CONCAT(a, b)</code>. SQL Server uses <code>+</code> or <code>CONCAT</code>.</li><li><strong>Integer division:</strong> SQLite, PostgreSQL and SQL Server truncate <code>7/2</code> to 3. MySQL returns 3.5. Write <code>7/2.0</code> when you want a decimal.</li></ul>`,
  exercises: [
    {
      id: 'd1-1', level: 1,
      prompt: 'List the <code>name</code> and <code>budget</code> of every department.',
      solution: `SELECT name, budget FROM departments;`,
      hints: ['You only need one table: departments.', 'SELECT column1, column2 FROM table;']
    },
    {
      id: 'd1-2', level: 1,
      prompt: 'List every course <code>title</code> with its <code>credits</code>, sorted by credits from highest to lowest, then by title alphabetically.',
      solution: `SELECT title, credits FROM courses ORDER BY credits DESC, title ASC;`,
      ordered: true,
      hints: ['Sort by two columns. The second one only breaks ties.', 'ORDER BY credits DESC, title']
    },
    {
      id: 'd1-3', level: 1,
      prompt: 'Which cities do our students come from? Return each city once (include the NULL city if it appears).',
      solution: `SELECT DISTINCT city FROM students;`,
      hints: ['One keyword removes duplicate rows.', 'SELECT DISTINCT city FROM ...']
    },
    {
      id: 'd1-4', level: 2,
      prompt: 'Show each instructor\'s <code>name</code> and their salary per month as <code>monthly</code>, rounded to 2 decimal places. Put the best-paid instructor first.',
      solution: `SELECT name, ROUND(salary / 12.0, 2) AS monthly FROM instructors ORDER BY salary DESC;`,
      ordered: true,
      hints: ['salary / 12 does integer division in SQLite. Divide by 12.0 instead.', 'ROUND(value, 2) rounds to two decimals.', 'Sort by salary (or by monthly) descending.']
    },
    {
      id: 'd1-5', level: 2,
      prompt: 'Return the three most recently hired instructors: <code>name</code> and <code>hire_date</code>, newest first.',
      solution: `SELECT name, hire_date FROM instructors ORDER BY hire_date DESC LIMIT 3;`,
      ordered: true,
      hints: ['Dates are stored as text in YYYY-MM-DD format, so they sort correctly as text.', 'ORDER BY ... DESC, then LIMIT 3.']
    },
    {
      id: 'd1-6', level: 3,
      prompt: 'Build a "contact line" for each student in the form <code>Ahmed Al-Sayed &lt;ahmed.alsayed@uni.edu&gt;</code>, in a single column called <code>contact</code>. Show page 2 of the list when it is sorted by student name and each page holds 10 rows (rows 11 to 20).',
      solution: `SELECT name || ' <' || email || '>' AS contact FROM students ORDER BY name LIMIT 10 OFFSET 10;`,
      ordered: true,
      hints: ['Concatenate with ||. Literal text goes in single quotes.', 'Page 2 means skip 10 rows, then take 10.', 'ORDER BY name LIMIT 10 OFFSET 10']
    }
  ],
  quiz: [
    { id: 'd1-q1', q: 'In relational terms, a row of a table is called a…', options: ['Relation', 'Tuple', 'Attribute', 'Domain'], answer: 1, why: 'A relation is the table, an attribute is a column, a domain is the set of allowed values. A row is a tuple.' },
    { id: 'd1-q2', q: 'What does a foreign key guarantee?', options: ['The column values are unique', 'The column is never NULL', 'Every non-NULL value matches a key value in the referenced table', 'The table is sorted by that column'], answer: 2, why: 'That is referential integrity. A foreign key can repeat and can be NULL unless you add NOT NULL.' },
    { id: 'd1-q3', q: 'You run the same SELECT without ORDER BY twice and get rows in a different order. Is that a bug?', options: ['Yes, the database is broken', 'No, row order is not defined without ORDER BY', 'Only if the table has a primary key', 'Only in SQLite'], answer: 1, why: 'Tables are sets. The engine may return rows in any order it finds convenient unless you ask for one.' },
    { id: 'd1-q4', q: 'A candidate key is…', options: ['Any column that has no NULLs', 'A minimal set of columns that uniquely identifies a row', 'A foreign key that might become a primary key', 'The primary key of a child table'], answer: 1, why: 'Minimal means you cannot remove a column and keep uniqueness. The primary key is one chosen candidate key.' },
    { id: 'd1-q5', q: 'In which clause can you use an alias defined in the SELECT list (portable across databases)?', options: ['WHERE', 'GROUP BY', 'ORDER BY', 'FROM'], answer: 2, why: 'ORDER BY is evaluated after SELECT. WHERE, GROUP BY and FROM run before it.' }
  ],
  teach: 'Explain to a first-year student the difference between a primary key and a foreign key, using the students and departments tables as your example.',
  rubric: 'PK uniquely identifies each row and cannot be NULL; FK refers to a PK in another (or the same) table; FK enforces referential integrity (no student in a non-existent department); FK values may repeat and may be NULL; concrete example with students.dept_id -> departments.dept_id.'
});
