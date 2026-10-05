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
      html: '<p>The smallest useful query names the columns you want and the table they come from. <code>*</code> means every column. In real applications, list the columns you need: it is clearer and it does not break when someone adds a column later.</p>',
      sql: `SELECT name, email, year
FROM students;`,
      note: 'Press Run (or Ctrl/Cmd + Enter). Then edit the column list and run it again.'
    },
    {
      h: 'Expressions and aliases',
      html: '<p>A column in the SELECT list can be any expression: arithmetic, or a function call like <code>ROUND()</code>. Use <code>AS</code> to give the result column a readable name. An alias with spaces needs double quotes.</p>',
      sql: `SELECT name,
       salary,
       salary / 12 AS monthly_salary,
       ROUND(salary * 1.05) AS "salary after 5% raise"
FROM instructors;`
    },
    {
      h: 'Joining text together with ||',
      html: `<p>Two vertical bars <code>||</code> glue pieces of text into one. Use it to build labels, full sentences or contact lines. Fixed text, such as a space or a bracket, goes in single quotes.</p>
<pre class="code">name || ' (' || email || ')'</pre>
<p>Read it as: the name, then a space and an opening bracket, then the email, then a closing bracket.</p>`,
      sql: `SELECT name || ' (' || email || ')' AS contact,
       'Year ' || year AS study_year
FROM students
ORDER BY name;`,
      note: 'Change the text inside the quotes and run it again. MySQL uses CONCAT(a, b) instead of ||.',
      predict: {
        sql: `SELECT 'Room ' || 'A' || '101' AS label;`,
        q: 'What does this query return?',
        options: ['Room A101', 'Room || A || 101', 'RoomA101', 'An error: you cannot join text'],
        answer: 0,
        why: '|| joins the three pieces in order. The first piece is "Room " with a space at the end. So the result is "Room A101".'
      }
    },
    {
      h: 'Removing duplicates with DISTINCT',
      html: '<p>A query result can contain duplicate rows even though a table should not. <code>DISTINCT</code> keeps one copy of each different row. It applies to the whole row, not to the first column only.</p>',
      predict: {
        sql: 'SELECT DISTINCT city FROM students;',
        q: 'Some students have no city (NULL). What does DISTINCT do with many NULL cities?',
        options: [
          'It removes all the NULL rows',
          'It keeps one NULL row',
          'It keeps every NULL row, because NULL never equals NULL',
          'It gives an error'
        ],
        answer: 1,
        why: 'DISTINCT puts all the NULLs together. So exactly one NULL row stays. This is one of the few places where SQL treats NULLs as "the same".'
      }
    },
    {
      h: 'ORDER BY and LIMIT',
      html: `<p>Because tables have no order, the only way to get a guaranteed order is <code>ORDER BY</code>. You can sort by several columns, each <code>ASC</code> (default) or <code>DESC</code>. The second column only breaks ties in the first.</p>
<p><code>LIMIT n</code> keeps only the first n rows after sorting.</p>`,
      sql: `SELECT name, dept_id, salary
FROM instructors
ORDER BY dept_id ASC, salary DESC
LIMIT 5;`,
      note: 'Dialects: SQL Server writes SELECT TOP 5 ..., Oracle and the SQL standard write FETCH FIRST 5 ROWS ONLY.'
    },
    {
      h: 'Pages of results with OFFSET',
      html: `<p>Websites show long lists in pages: 10 students on page 1, the next 10 on page 2, and so on. <code>OFFSET m</code> skips the first m rows, then <code>LIMIT n</code> takes the next n.</p>
<table class="mini"><thead><tr><th>Page (10 per page)</th><th>Rows</th><th>SQL</th></tr></thead><tbody>
<tr><td>Page 1</td><td>1 to 10</td><td><code>LIMIT 10 OFFSET 0</code></td></tr>
<tr><td>Page 2</td><td>11 to 20</td><td><code>LIMIT 10 OFFSET 10</code></td></tr>
<tr><td>Page 3</td><td>21 to 30</td><td><code>LIMIT 10 OFFSET 20</code></td></tr>
</tbody></table>
<p>Always sort with <code>ORDER BY</code> first. Without it, page 2 could contain different rows each time.</p>`,
      sql: `-- page 2 of the instructor list, 5 per page
SELECT name, salary
FROM instructors
ORDER BY name
LIMIT 5 OFFSET 5;`,
      note: 'Change OFFSET 5 to OFFSET 10 to see page 3.',
      predict: {
        q: 'A list shows 10 students on each page. Which SQL shows page 3?',
        options: ['LIMIT 10 OFFSET 3', 'LIMIT 10 OFFSET 30', 'LIMIT 10 OFFSET 20', 'LIMIT 30 OFFSET 10'],
        answer: 2,
        why: 'Pages 1 and 2 have 20 rows. So you skip 20 rows (OFFSET 20) and take 10 (LIMIT 10). The rule: OFFSET = (page − 1) × rows per page.'
      }
    },
    {
      h: 'How the database reads your query',
      html: `<p>You write SELECT first, but the database evaluates the clauses in a different order. Learn this order now. It explains many errors you will meet later.</p>
<ol class="steps"><li><code>FROM</code>: pick the table(s)</li><li><code>WHERE</code>: filter rows</li><li><code>GROUP BY</code>: form groups</li><li><code>HAVING</code>: filter groups</li><li><code>SELECT</code>: compute the output columns</li><li><code>DISTINCT</code>: remove duplicates</li><li><code>ORDER BY</code>: sort</li><li><code>LIMIT</code>: cut</li></ol>
<p>So an alias made in SELECT is not yet known in WHERE (step 2 runs before step 5), but it can be used in ORDER BY (step 7).</p>`,
      predict: {
        q: 'Which query gives an error in PostgreSQL and SQL Server?',
        options: [
          'SELECT salary/12 AS m FROM instructors ORDER BY m',
          'SELECT salary/12 AS m FROM instructors WHERE m > 7000',
          'SELECT name FROM instructors ORDER BY salary',
          'SELECT DISTINCT dept_id FROM instructors'
        ],
        answer: 1,
        why: 'WHERE runs before SELECT. So the alias m does not exist yet in WHERE. SQLite accepts it, but most databases do not. Write the full expression instead: WHERE salary/12 > 7000.'
      }
    }
  ],
  pitfalls: [
    'Expecting rows to come back in insertion order. Without ORDER BY the order is not guaranteed and can change between runs.',
    `Writing text values with double quotes. In standard SQL, <code>'Cairo'</code> is a string and <code>"Cairo"</code> is a column name.`,
    'Thinking DISTINCT applies to one column. <code>SELECT DISTINCT a, b</code> removes rows where both a and b repeat.',
    'Using SELECT * in application code. It hides which columns you rely on.'
  ],
  dialect: '<ul><li><strong>Limit rows:</strong> SQLite, PostgreSQL, MySQL use <code>LIMIT 5</code>. SQL Server uses <code>SELECT TOP 5</code>. Oracle 12c+ and the standard use <code>FETCH FIRST 5 ROWS ONLY</code>.</li><li><strong>Concatenation:</strong> <code>||</code> in SQLite, PostgreSQL, Oracle. MySQL uses <code>CONCAT(a, b)</code>. SQL Server uses <code>+</code> or <code>CONCAT</code>.</li><li><strong>Integer division:</strong> SQLite, PostgreSQL and SQL Server truncate <code>7/2</code> to 3. MySQL returns 3.5. Write <code>7/2.0</code> when you want a decimal.</li></ul>',
  exercises: [
    {
      id: 'd1-1',
      level: 1,
      prompt: '<p>Show the name and budget of every department.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>budget</code></li></ul>',
      solution: 'SELECT name, budget FROM departments;',
      hints: [
        'You need only one table: departments.',
        'The pattern is: SELECT column1, column2 FROM table;'
      ]
    },
    {
      id: 'd1-2',
      level: 1,
      prompt: '<p>Show every course with its number of credits.</p><ul class="spec"><li><b>Columns:</b> <code>title</code>, <code>credits</code></li><li><b>Order:</b> most <code>credits</code> first, then by <code>title</code>, A to Z</li></ul>',
      solution: 'SELECT title, credits FROM courses ORDER BY credits DESC, title ASC;',
      ordered: true,
      hints: [
        'Sort by two columns. The second column is used only when the first one is equal.',
        'ORDER BY credits DESC, title'
      ]
    },
    {
      id: 'd1-3',
      level: 1,
      prompt: '<p>Which cities do our students come from? Show each city only once.</p><ul class="spec"><li><b>Columns:</b> <code>city</code></li><li><b>Note:</b> some students have no city (NULL). Keep that NULL row too.</li></ul>',
      solution: 'SELECT DISTINCT city FROM students;',
      hints: ['One keyword removes repeated rows.', 'SELECT DISTINCT city FROM ...']
    },
    {
      id: 'd1-4',
      level: 2,
      prompt: '<p>Show the monthly salary of each instructor.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>monthly</code></li><li><b>Order:</b> highest salary first</li><li><b>Note:</b> <code>monthly</code> is the salary divided by 12. Round it to 2 decimal places.</li></ul>',
      solution: 'SELECT name, ROUND(salary / 12.0, 2) AS monthly FROM instructors ORDER BY salary DESC;',
      ordered: true,
      hints: [
        'In SQLite, salary / 12 drops the decimals. Divide by 12.0 instead.',
        'ROUND(value, 2) keeps two decimals.',
        'Sort by salary (or by monthly) with DESC.'
      ]
    },
    {
      id: 'd1-5',
      level: 2,
      prompt: '<p>Find the three instructors who joined the university most recently.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>hire_date</code></li><li><b>Order:</b> newest <code>hire_date</code> first</li><li><b>Note:</b> show only 3 rows.</li></ul>',
      solution: 'SELECT name, hire_date FROM instructors ORDER BY hire_date DESC LIMIT 3;',
      ordered: true,
      hints: [
        'Dates are text like 2024-08-26. They sort correctly as text.',
        'ORDER BY ... DESC, then LIMIT 3.'
      ]
    },
    {
      id: 'd1-6',
      level: 2,
      prompt: '<p>Make a "contact line" for each student, like this: <code>Ahmed Al-Sayed &lt;ahmed.alsayed@uni.edu&gt;</code></p><ul class="spec"><li><b>Columns:</b> <code>contact</code></li><li><b>Order:</b> by student <code>name</code>, A to Z</li><li><b>Note:</b> one column only. The form is: name, one space, then the email inside &lt; and &gt;.</li></ul>',
      solution: `SELECT name || ' <' || email || '>' AS contact FROM students ORDER BY name;`,
      ordered: true,
      hints: [
        'Read the lesson part "Joining text together with ||".',
        `The fixed pieces are ' <' (a space and <) and '>'. Put them in single quotes.`,
        `name || ' <' || email || '>' AS contact, then ORDER BY name`
      ]
    },
    {
      id: 'd1-7',
      level: 3,
      prompt: '<p>The website shows 10 students on each page, sorted by name. Show <strong>page 2</strong>. That is rows 11 to 20.</p><ul class="spec"><li><b>Columns:</b> <code>student_id</code>, <code>name</code></li><li><b>Order:</b> by <code>name</code>, A to Z</li></ul>',
      solution: 'SELECT student_id, name FROM students ORDER BY name LIMIT 10 OFFSET 10;',
      ordered: true,
      hints: [
        'Read the lesson part "Pages of results with OFFSET".',
        'Page 2 means: skip the first 10 rows, then take 10.',
        'ORDER BY name LIMIT 10 OFFSET 10'
      ]
    }
  ],
  quiz: [
    {
      id: 'd1-q1',
      q: 'In relational theory, what is a row of a table called?',
      options: ['Relation', 'Tuple', 'Attribute', 'Domain'],
      answer: 1,
      why: 'A relation is a table. An attribute is a column. A domain is the set of allowed values. A row is a tuple.'
    },
    {
      id: 'd1-q2',
      q: 'What does a foreign key promise?',
      options: [
        'The values in the column are all different',
        'The column is never NULL',
        'Every value (that is not NULL) exists as a key in the other table',
        'The table is sorted by that column'
      ],
      answer: 2,
      why: 'This rule is called referential integrity. A foreign key value can repeat. It can also be NULL, unless you add NOT NULL.'
    },
    {
      id: 'd1-q3',
      q: 'You run the same SELECT twice, without ORDER BY. The rows come back in a different order. Is this a bug?',
      options: [
        'Yes, the database is broken',
        'No, without ORDER BY the order is not fixed',
        'Only if the table has a primary key',
        'Only in SQLite'
      ],
      answer: 1,
      why: 'A table is a set of rows with no order. The database can return the rows in any order, unless you use ORDER BY.'
    },
    {
      id: 'd1-q4',
      q: 'What is a candidate key?',
      options: [
        'Any column with no NULLs',
        'The smallest set of columns that is unique for every row',
        'A foreign key that may become a primary key',
        'The primary key of a child table'
      ],
      answer: 1,
      why: '"Smallest" means: if you remove any column, it is no longer unique. The primary key is the candidate key that you choose.'
    },
    {
      id: 'd1-q5',
      q: 'You give a column a new name in SELECT with AS. In which clause can you use that name in every database?',
      options: ['WHERE', 'GROUP BY', 'ORDER BY', 'FROM'],
      answer: 2,
      why: 'ORDER BY runs after SELECT, so it knows the new name. WHERE, GROUP BY and FROM run before SELECT.'
    }
  ],
  teach: 'Explain to a first-year student the difference between a primary key and a foreign key, using the students and departments tables as your example.',
  rubric: 'PK uniquely identifies each row and cannot be NULL; FK refers to a PK in another (or the same) table; FK enforces referential integrity (no student in a non-existent department); FK values may repeat and may be NULL; concrete example with students.dept_id -> departments.dept_id.'
});
