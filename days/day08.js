(function () {
  // Builds a check query that describes table structure: columns, primary key membership,
  // required (NOT NULL or part of the PK), foreign keys, unique constraints and defaults.
  function schemaCheck(tables, opts) {
    opts = opts || {};
    var parts = [];
    tables.forEach(function (t) {
      parts.push(`SELECT '${t}' AS tbl, 'col' AS kind, name AS a, (pk > 0) AS b, CASE WHEN pk > 0 THEN 1 ELSE "notnull" END AS c FROM pragma_table_info('${t}')`);
      parts.push(`SELECT '${t}', 'fk', "from", lower("table"), ${opts.onDelete ? 'on_delete' : 'NULL'} FROM pragma_foreign_key_list('${t}')`);
      parts.push(`SELECT '${t}', 'unique', ii.name, NULL, NULL FROM pragma_index_list('${t}') il JOIN pragma_index_info(il.name) ii WHERE il."unique" = 1 AND il.origin <> 'pk'`);
      if (opts.defaults) parts.push(`SELECT '${t}', 'default', name, dflt_value, NULL FROM pragma_table_info('${t}') WHERE dflt_value IS NOT NULL`);
    });
    return parts.join('\nUNION ALL\n') + '\nORDER BY 1, 2, 3, 4;';
  }

LAB.days.push({
  n: 8,
  week: 2,
  tag: 'DDL',
  title: 'Creating and Changing Data',
  hours: 2.5,
  goals: [
    'Create tables with the right data types and constraints',
    'Choose an ON DELETE action for each foreign key and explain the effect',
    'Insert, update and delete rows safely, including INSERT…SELECT and UPSERT',
    'Change an existing table with ALTER TABLE'
  ],
  lesson: [
    {
      h: 'The four families of SQL statements',
      html: `<p>Until now you only asked questions. Today you build tables and change data. SQL statements fall into four families. Exams often ask you to sort statements into them.</p>
<table class="mini"><thead><tr><th>Family</th><th>Stands for</th><th>Statements</th><th>Purpose</th></tr></thead><tbody>
<tr><td>DDL</td><td>Data Definition Language</td><td><code>CREATE</code>, <code>ALTER</code>, <code>DROP</code>, <code>TRUNCATE</code></td><td>Define structure</td></tr>
<tr><td>DML</td><td>Data Manipulation Language</td><td><code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code>, <code>MERGE</code> (and <code>SELECT</code>)</td><td>Change and read rows</td></tr>
<tr><td>DCL</td><td>Data Control Language</td><td><code>GRANT</code>, <code>REVOKE</code></td><td>Permissions</td></tr>
<tr><td>TCL</td><td>Transaction Control Language</td><td><code>COMMIT</code>, <code>ROLLBACK</code>, <code>SAVEPOINT</code></td><td>Group changes into transactions</td></tr>
</tbody></table>
<p>Some books put <code>SELECT</code> in its own family, DQL (Data Query Language).</p>`
    },
    {
      h: 'CREATE TABLE and data types',
      html: `<p>A table definition lists each column with a data type, then the constraints. Common portable types:</p>
<ul><li><code>INTEGER</code> / <code>BIGINT</code>: whole numbers</li>
<li><code>DECIMAL(10,2)</code> (also <code>NUMERIC</code>): exact numbers. Use it for money. <code>REAL</code> / <code>FLOAT</code> are approximate.</li>
<li><code>VARCHAR(100)</code>: text up to 100 characters. <code>CHAR(2)</code>: fixed length. <code>TEXT</code>: long text.</li>
<li><code>DATE</code>, <code>TIME</code>, <code>TIMESTAMP</code>: dates and times</li>
<li><code>BOOLEAN</code>: true or false</li></ul>
<p><strong>SQLite is different.</strong> It uses <em>type affinity</em>: the declared type is a preference, not a rule. It converts a value when it can and otherwise stores it as it is. Run the example and look at the <code>typeof</code> columns.</p>`,
      sql: `CREATE TABLE demo (n INTEGER, price DECIMAL(10,2), label VARCHAR(5));
INSERT INTO demo VALUES ('42', '19.99', 'short');
INSERT INTO demo VALUES ('hello', 7, 'this text is longer than five');
SELECT n, typeof(n), price, typeof(price), label FROM demo;`,
      note: 'PostgreSQL would reject both "hello" in an INTEGER column and the long text in VARCHAR(5). In SQLite you get strict checking with CREATE TABLE ... STRICT.'
    },
    {
      h: 'Constraints: rules the database enforces',
      html: `<p>A constraint is a rule that every row must follow. The database checks it on every INSERT and UPDATE and refuses the change if it fails. This is safer than checking in application code, because every program that touches the data gets the same rules.</p>
<ul><li><code>NOT NULL</code>: a value is required</li>
<li><code>UNIQUE</code>: no two rows have the same value</li>
<li><code>CHECK (condition)</code>: the condition must not be false</li>
<li><code>DEFAULT value</code>: used when the INSERT does not give a value</li>
<li><code>PRIMARY KEY</code> and <code>FOREIGN KEY</code>: see the next steps</li></ul>
<p>Run the example. Then remove the <code>--</code> in front of one of the last lines and run it again to see the error the database gives you.</p>`,
      sql: `CREATE TABLE rooms (
  room_code TEXT PRIMARY KEY,
  building  TEXT NOT NULL,
  seats     INTEGER NOT NULL CHECK (seats > 0),
  has_projector INTEGER NOT NULL DEFAULT 1 CHECK (has_projector IN (0, 1))
);
INSERT INTO rooms (room_code, building, seats) VALUES ('A101', 'Turing Hall', 40);
-- INSERT INTO rooms VALUES ('A102', 'Turing Hall', -5, 1);     -- fails CHECK
-- INSERT INTO rooms VALUES ('A101', 'Curie Building', 30, 0);  -- fails PRIMARY KEY
-- INSERT INTO rooms (room_code, seats) VALUES ('B1', 20);      -- fails NOT NULL
SELECT * FROM rooms;`,
      predict: {
        q: 'A table has <code>gpa REAL CHECK (gpa BETWEEN 0 AND 4)</code> and no NOT NULL. What happens to <code>INSERT ... VALUES (NULL)</code> for gpa?',
        options: ['It fails the CHECK', 'It is accepted', 'gpa is set to 0', 'It depends on the DEFAULT'],
        answer: 1,
        why: 'NULL BETWEEN 0 AND 4 is UNKNOWN, not FALSE. A CHECK only rejects rows where the condition is FALSE. If NULL must be refused, add NOT NULL.'
      }
    },
    {
      h: 'Primary keys, composite keys and generated ids',
      html: `<p>A primary key can be one column or several. A <strong>composite key</strong> is written as a table constraint: <code>PRIMARY KEY (student_id, section_id)</code> in <code>enrollments</code> means the pair must be unique. The same student can appear in many sections, but not twice in the same section.</p>
<p>Most tables use a <strong>surrogate key</strong>: a meaningless number the database generates. Each product spells it differently:</p>
<table class="mini"><thead><tr><th>Database</th><th>Auto-generated id</th></tr></thead><tbody>
<tr><td>SQLite</td><td><code>id INTEGER PRIMARY KEY</code> (add <code>AUTOINCREMENT</code> to never reuse ids)</td></tr>
<tr><td>PostgreSQL</td><td><code>id INT GENERATED ALWAYS AS IDENTITY</code> (older: <code>SERIAL</code>)</td></tr>
<tr><td>MySQL</td><td><code>id INT AUTO_INCREMENT PRIMARY KEY</code></td></tr>
<tr><td>SQL Server</td><td><code>id INT IDENTITY(1,1) PRIMARY KEY</code></td></tr>
<tr><td>Oracle</td><td><code>id NUMBER GENERATED AS IDENTITY</code></td></tr>
</tbody></table>`,
      sql: `CREATE TABLE notes (
  note_id INTEGER PRIMARY KEY,
  body    TEXT NOT NULL
);
INSERT INTO notes (body) VALUES ('first'), ('second'), ('third');
SELECT * FROM notes;`
    },
    {
      h: 'Foreign keys and ON DELETE',
      html: `<p>A foreign key says "this value must exist over there". You also decide what happens when the parent row is deleted:</p>
<ul><li><code>NO ACTION</code> / <code>RESTRICT</code> (default): the delete is refused while children exist</li>
<li><code>CASCADE</code>: the children are deleted too</li>
<li><code>SET NULL</code>: the children stay, their foreign key becomes NULL</li>
<li><code>SET DEFAULT</code>: the children get the column default</li></ul>
<p>Pick by meaning. A student's payments belong to the student, so CASCADE fits. A student's advisor can leave the university while the student stays, so SET NULL fits. A department with courses should not disappear by accident, so RESTRICT fits.</p>
<div class="callout warn">SQLite checks foreign keys only after <code>PRAGMA foreign_keys = ON;</code>. This lab turns it on for you. MySQL InnoDB, PostgreSQL, SQL Server and Oracle always check them.</div>`,
      sql: `PRAGMA foreign_keys = ON;
CREATE TABLE teams   (team_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE players (
  player_id INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  team_id   INTEGER REFERENCES teams(team_id) ON DELETE SET NULL
);
CREATE TABLE goals (
  goal_id   INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(player_id) ON DELETE CASCADE
);
INSERT INTO teams VALUES (1, 'Lions'), (2, 'Falcons');
INSERT INTO players VALUES (10, 'Ali', 1), (11, 'Sara', 1), (12, 'Lina', 2);
INSERT INTO goals VALUES (100, 10), (101, 10), (102, 12);
-- INSERT INTO players VALUES (13, 'Omar', 99);   -- fails: team 99 does not exist
DELETE FROM teams WHERE team_id = 1;   -- players 10 and 11 keep playing, team_id becomes NULL
DELETE FROM players WHERE player_id = 12;  -- goal 102 disappears with Lina
SELECT 'player' AS kind, player_id AS id, team_id AS ref FROM players
UNION ALL
SELECT 'goal', goal_id, player_id FROM goals;`,
      predict: {
        q: 'In the example, what would happen to goals 100 and 101 if you ran <code>DELETE FROM players WHERE player_id = 10</code>?',
        options: ['Nothing, they stay with player_id 10', 'Their player_id becomes NULL', 'They are deleted', 'The DELETE is refused'],
        answer: 2,
        why: 'goals.player_id is declared ON DELETE CASCADE, so deleting the player deletes their goals. (SET NULL would also be impossible here because the column is NOT NULL.)'
      }
    },
    {
      h: 'INSERT: one row, many rows, or a query',
      html: `<p>Always list the columns. The statement then keeps working when someone adds a column, and you can skip columns that have defaults.</p>
<p><code>INSERT INTO ... SELECT</code> copies the result of a query into a table. It is the standard way to fill a summary table or move data while you redesign a schema.</p>`,
      sql: `CREATE TABLE top_students (student_id INTEGER PRIMARY KEY, name TEXT, avg_score REAL);

INSERT INTO top_students (student_id, name, avg_score)
SELECT s.student_id, s.name, ROUND(AVG(e.score), 1)
FROM students s JOIN enrollments e ON e.student_id = s.student_id
GROUP BY s.student_id, s.name
HAVING AVG(e.score) >= 85;

SELECT * FROM top_students ORDER BY avg_score DESC;`
    },
    {
      h: 'UPDATE without fear',
      html: `<p>An UPDATE without WHERE changes <strong>every row</strong>. Professionals follow a routine:</p>
<ol class="steps"><li>Write the WHERE clause first, as a SELECT, and check which rows it returns.</li><li>Turn the SELECT into an UPDATE with the same WHERE.</li><li>Run it inside a transaction so you can ROLLBACK if the row count looks wrong (Day 11).</li></ol>
<p>The new value can use the old one: <code>SET salary = salary * 1.05</code>. All right-hand sides read the row as it was <em>before</em> the update.</p>`,
      sql: `-- Step 1: preview
SELECT instructor_id, name, salary FROM instructors WHERE dept_id = 6;
-- Step 2: change
UPDATE instructors SET salary = salary + 3000 WHERE dept_id = 6;
-- Check
SELECT instructor_id, name, salary FROM instructors WHERE dept_id = 6;`,
      predict: {
        q: 'Table t has one row with a = 1, b = 2. After <code>UPDATE t SET a = b, b = a;</code> what are a and b in standard SQL (and SQLite)?',
        options: ['a = 2, b = 2', 'a = 2, b = 1', 'a = 1, b = 1', 'An error'],
        answer: 1,
        why: 'Every expression on the right reads the old row, so the values swap. (MySQL is the famous exception: it applies assignments left to right and gives a = 2, b = 2.)'
      }
    },
    {
      h: 'DELETE, TRUNCATE and DROP',
      html: `<table class="mini"><thead><tr><th>Statement</th><th>Removes</th><th>Table still exists?</th><th>Can filter?</th><th>Notes</th></tr></thead><tbody>
<tr><td><code>DELETE FROM t WHERE ...</code></td><td>Matching rows</td><td>Yes</td><td>Yes</td><td>Row by row, fires triggers, can be rolled back</td></tr>
<tr><td><code>TRUNCATE TABLE t</code></td><td>All rows</td><td>Yes</td><td>No</td><td>Fast, resets identity counters, usually no row triggers. SQLite has no TRUNCATE: <code>DELETE FROM t</code> is optimized instead.</td></tr>
<tr><td><code>DROP TABLE t</code></td><td>Rows and structure</td><td>No</td><td>No</td><td>Indexes, constraints and grants on it are gone too</td></tr>
</tbody></table>
<p>Foreign keys still apply: you cannot delete a department while courses point to it, unless the foreign key says CASCADE or SET NULL. Delete children first, then parents.</p>`,
      sql: `SELECT COUNT(*) AS payments_before FROM payments;
DELETE FROM payments WHERE method = 'cash';
SELECT COUNT(*) AS payments_after FROM payments;`
    },
    {
      h: 'UPSERT and RETURNING',
      html: `<p>An <strong>UPSERT</strong> inserts a row, or updates it if the key already exists, in one statement. Without it you need "SELECT, then decide", which breaks when two users do it at the same time.</p>
<p>In the <code>DO UPDATE</code> part, <code>excluded</code> means "the row you tried to insert". <code>RETURNING</code> gives back the rows you changed, which saves a second query (for example, to learn a generated id).</p>`,
      sql: `CREATE TABLE stock (sku TEXT PRIMARY KEY, qty INTEGER NOT NULL);
INSERT INTO stock VALUES ('pen', 10), ('book', 3);

INSERT INTO stock (sku, qty) VALUES ('pen', 5), ('lamp', 2)
ON CONFLICT (sku) DO UPDATE SET qty = stock.qty + excluded.qty
RETURNING sku, qty;`,
      note: 'PostgreSQL uses the same syntax. MySQL: INSERT ... ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty). SQL Server and Oracle: MERGE.'
    },
    {
      h: 'ALTER TABLE: changing a live table',
      html: `<p>Real schemas change. <code>ALTER TABLE</code> adds, renames or removes columns and constraints without recreating the table.</p>
<ul><li><code>ALTER TABLE t ADD COLUMN c TYPE</code>: existing rows get NULL (or the DEFAULT)</li>
<li><code>ALTER TABLE t RENAME COLUMN a TO b</code></li>
<li><code>ALTER TABLE t RENAME TO new_name</code></li>
<li><code>ALTER TABLE t DROP COLUMN c</code></li></ul>
<p>SQLite cannot add or drop constraints with ALTER. There you create a new table, copy the rows with INSERT…SELECT, drop the old table and rename the new one. That is also the safe pattern for big changes in any database.</p>`,
      sql: `ALTER TABLE departments ADD COLUMN phone TEXT DEFAULT 'unknown';
ALTER TABLE departments RENAME COLUMN building TO main_building;
SELECT dept_id, name, main_building, phone FROM departments;`
    }
  ],
  pitfalls: [
    'Running UPDATE or DELETE without WHERE. Write the WHERE first and test it as a SELECT.',
    'Using <code>FLOAT</code> or <code>REAL</code> for money. 0.1 + 0.2 is not exactly 0.3. Use <code>DECIMAL(12,2)</code> or store cents as integers.',
    'Forgetting that CHECK accepts NULL. Add NOT NULL when a value is required.',
    'Deleting a parent row before its children and being surprised by a foreign key error. Delete children first, or declare ON DELETE CASCADE where it makes sense.',
    'INSERT without a column list. It breaks as soon as the table gets a new column.',
    'Assuming SQLite enforces types and foreign keys like PostgreSQL. It needs STRICT tables and <code>PRAGMA foreign_keys = ON</code>.'
  ],
  dialect: `<ul><li><strong>Generated ids:</strong> SQLite <code>INTEGER PRIMARY KEY</code>, PostgreSQL <code>GENERATED ALWAYS AS IDENTITY</code> or <code>SERIAL</code>, MySQL <code>AUTO_INCREMENT</code>, SQL Server <code>IDENTITY(1,1)</code>, Oracle <code>GENERATED AS IDENTITY</code>.</li>
<li><strong>Upsert:</strong> SQLite and PostgreSQL <code>ON CONFLICT (...) DO UPDATE</code>; MySQL <code>ON DUPLICATE KEY UPDATE</code>; SQL Server and Oracle <code>MERGE INTO ... USING ... WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT</code>.</li>
<li><strong>RETURNING:</strong> SQLite and PostgreSQL <code>RETURNING</code>; SQL Server <code>OUTPUT inserted.*</code>; Oracle <code>RETURNING ... INTO</code> in PL/SQL; MySQL has none (use <code>LAST_INSERT_ID()</code>).</li>
<li><strong>Booleans:</strong> PostgreSQL has a real <code>BOOLEAN</code>. MySQL maps it to <code>TINYINT(1)</code>. SQL Server uses <code>BIT</code>. SQLite stores 0 and 1.</li>
<li><strong>Strings:</strong> Oracle uses <code>VARCHAR2</code>, and treats an empty string as NULL.</li></ul>`,
  exercises: [
    {
      id: 'd8-1', level: 1, kind: 'script',
      prompt: 'The university opens a new department. Insert it into <code>departments</code>: id <code>9</code>, name <code>Data Science</code>, building <code>Turing Hall</code>, budget <code>300000</code>.',
      solution: `INSERT INTO departments (dept_id, name, building, budget) VALUES (9, 'Data Science', 'Turing Hall', 300000);`,
      check: `SELECT dept_id, name, building, budget FROM departments ORDER BY dept_id;`,
      hints: ['INSERT INTO table (columns) VALUES (values);', 'Text values go in single quotes; numbers do not.', "INSERT INTO departments (dept_id, name, building, budget) VALUES (9, 'Data Science', ...);"]
    },
    {
      id: 'd8-2', level: 1, kind: 'script',
      prompt: 'Give every instructor in the <strong>History</strong> department a raise of <code>4000</code>. Find the department by its name, not by typing its id.',
      solution: `UPDATE instructors SET salary = salary + 4000
WHERE dept_id = (SELECT dept_id FROM departments WHERE name = 'History');`,
      check: `SELECT instructor_id, salary FROM instructors ORDER BY instructor_id;`,
      hints: ['First write a SELECT that returns only History instructors.', 'The new value can use the old one: SET salary = salary + 4000', "WHERE dept_id = (SELECT dept_id FROM departments WHERE name = 'History')"]
    },
    {
      id: 'd8-3', level: 1, kind: 'script',
      prompt: 'A bank audit found that cash payments recorded before <code>2025-07-01</code> were entered twice by mistake. Delete every payment with method <code>cash</code> and <code>paid_on</code> before <code>2025-07-01</code>. Leave all other payments.',
      solution: `DELETE FROM payments WHERE method = 'cash' AND paid_on < '2025-07-01';`,
      check: `SELECT payment_id FROM payments ORDER BY payment_id;`,
      hints: ['Preview the rows with SELECT * FROM payments WHERE ... first.', "Two conditions joined by AND. Dates in YYYY-MM-DD compare correctly as text.", "DELETE FROM payments WHERE method = 'cash' AND paid_on < '2025-07-01';"]
    },
    {
      id: 'd8-4', level: 2, kind: 'script',
      prompt: `Create a table <code>clubs</code> with these columns:
<ul><li><code>club_id</code>: integer primary key</li>
<li><code>name</code>: text, required, and no two clubs may share a name</li>
<li><code>founded_year</code>: integer, optional, must be 1950 or later when given</li>
<li><code>dept_id</code>: optional integer that references <code>departments(dept_id)</code></li></ul>`,
      solution: `CREATE TABLE clubs (
  club_id      INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  founded_year INTEGER CHECK (founded_year >= 1950),
  dept_id      INTEGER REFERENCES departments(dept_id)
);`,
      check: schemaCheck(['clubs']),
      hints: ['One line per column: name TYPE constraints.', 'Required means NOT NULL. "No two share" means UNIQUE.', 'A foreign key on one column: dept_id INTEGER REFERENCES departments(dept_id)', 'The CHECK is not graded automatically, but write it: CHECK (founded_year >= 1950)']
    },
    {
      id: 'd8-5', level: 2, kind: 'script',
      setup: `CREATE TABLE clubs (club_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);`,
      prompt: `A <code>clubs</code> table already exists. Students can join many clubs and clubs have many students. Create the table <code>club_members</code> with:
<ul><li><code>club_id</code>: references <code>clubs(club_id)</code></li>
<li><code>student_id</code>: references <code>students(student_id)</code></li>
<li><code>role</code>: text, required, default value <code>'member'</code></li>
<li><code>joined_on</code>: text, optional</li></ul>
A student can be in the same club only once, so the primary key is the pair (<code>club_id</code>, <code>student_id</code>).`,
      solution: `CREATE TABLE club_members (
  club_id    INTEGER REFERENCES clubs(club_id),
  student_id INTEGER REFERENCES students(student_id),
  role       TEXT NOT NULL DEFAULT 'member',
  joined_on  TEXT,
  PRIMARY KEY (club_id, student_id)
);`,
      check: schemaCheck(['club_members'], { defaults: true }),
      hints: ['A composite primary key is a separate line at the end: PRIMARY KEY (a, b)', "DEFAULT 'member' uses single quotes.", 'Each id column gets its own REFERENCES clause.']
    },
    {
      id: 'd8-6', level: 2, kind: 'script',
      setup: `CREATE TABLE honor_roll (
  student_id INTEGER PRIMARY KEY REFERENCES students(student_id),
  avg_score  REAL NOT NULL
);`,
      prompt: 'The table <code>honor_roll(student_id, avg_score)</code> exists and is empty. With one <code>INSERT ... SELECT</code>, fill it with every student whose average <code>score</code> in <code>enrollments</code> is <strong>80 or more</strong> (ignore courses still in progress, which have NULL scores). Store the average rounded to 1 decimal place.',
      solution: `INSERT INTO honor_roll (student_id, avg_score)
SELECT student_id, ROUND(AVG(score), 1)
FROM enrollments
GROUP BY student_id
HAVING AVG(score) >= 80;`,
      check: `SELECT student_id, avg_score FROM honor_roll ORDER BY student_id;`,
      hints: ['Write the SELECT on its own first and check its rows.', 'AVG already ignores NULL values.', 'Filter groups with HAVING AVG(score) >= 80, then put INSERT INTO honor_roll (student_id, avg_score) in front.']
    },
    {
      id: 'd8-7', level: 2, kind: 'script',
      prompt: 'Add an optional text column <code>phone</code> to <code>students</code>. Then set the phone of student <code>1001</code> to <code>+964 770 100 1001</code> and of student <code>1002</code> to <code>+20 100 100 1002</code>.',
      solution: `ALTER TABLE students ADD COLUMN phone TEXT;
UPDATE students SET phone = '+964 770 100 1001' WHERE student_id = 1001;
UPDATE students SET phone = '+20 100 100 1002' WHERE student_id = 1002;`,
      check: `SELECT student_id, phone FROM students WHERE phone IS NOT NULL ORDER BY student_id;`,
      hints: ['ALTER TABLE students ADD COLUMN phone TEXT;', 'One UPDATE per student, each with its own WHERE.', 'Phone numbers are text, so use single quotes.']
    },
    {
      id: 'd8-8', level: 3, kind: 'script',
      setup: `CREATE TABLE course_stats (
  course_id     TEXT PRIMARY KEY REFERENCES courses(course_id),
  section_count INTEGER NOT NULL
);
INSERT INTO course_stats VALUES ('CS101', 99), ('MA101', 99), ('PH101', 99);`,
      prompt: 'The table <code>course_stats(course_id, section_count)</code> has three out-of-date rows. Write <strong>one</strong> statement that stores the correct number of sections for every course that has at least one section: insert rows that are missing and update rows that already exist.',
      solution: `INSERT INTO course_stats (course_id, section_count)
SELECT course_id, COUNT(*) FROM sections GROUP BY course_id
ON CONFLICT (course_id) DO UPDATE SET section_count = excluded.section_count;`,
      check: `SELECT course_id, section_count FROM course_stats ORDER BY course_id;`,
      hints: ['First write the SELECT that counts sections per course.', 'Put INSERT INTO course_stats (course_id, section_count) in front of it.', 'Add ON CONFLICT (course_id) DO UPDATE SET section_count = excluded.section_count', 'If SQLite says "near DO: syntax error", the SELECT needs a GROUP BY or a WHERE true before ON CONFLICT.']
    },
    {
      id: 'd8-9', level: 3, kind: 'script',
      prompt: 'The <strong>Philosophy</strong> department (id 8) is closing. Remove the department and everything that depends on it: its courses, the sections of those courses, and the enrollments in those sections. Foreign keys are switched on, so the order of your DELETE statements matters.',
      solution: `DELETE FROM enrollments WHERE section_id IN (
  SELECT section_id FROM sections WHERE course_id IN (SELECT course_id FROM courses WHERE dept_id = 8));
DELETE FROM sections WHERE course_id IN (SELECT course_id FROM courses WHERE dept_id = 8);
DELETE FROM prereqs WHERE course_id IN (SELECT course_id FROM courses WHERE dept_id = 8)
                       OR prereq_id IN (SELECT course_id FROM courses WHERE dept_id = 8);
DELETE FROM courses WHERE dept_id = 8;
DELETE FROM departments WHERE dept_id = 8;`,
      check: `SELECT (SELECT COUNT(*) FROM departments) AS departments,
       (SELECT COUNT(*) FROM courses) AS courses,
       (SELECT COUNT(*) FROM sections) AS sections,
       (SELECT COUNT(*) FROM enrollments) AS enrollments,
       (SELECT COUNT(*) FROM courses WHERE dept_id = 8) AS philosophy_courses_left;`,
      hints: ['Draw the chain: departments ← courses ← sections ← enrollments.', 'Delete from the bottom of the chain upwards: children before parents.', 'Use nested IN subqueries to find the sections of the Philosophy courses.', 'Check prereqs too: does any prerequisite row mention a Philosophy course?']
    },
    {
      id: 'd8-10', level: 3, kind: 'script',
      prompt: `Create a table <code>theses</code> for final-year theses:
<ul><li><code>thesis_id</code>: integer primary key</li>
<li><code>student_id</code>: required, references <code>students(student_id)</code>; a student writes at most one thesis; if the student is deleted, the thesis is deleted too</li>
<li><code>supervisor_id</code>: optional, references <code>instructors(instructor_id)</code>; if the instructor is deleted, the thesis stays without a supervisor</li>
<li><code>title</code>: text, required</li></ul>`,
      solution: `CREATE TABLE theses (
  thesis_id     INTEGER PRIMARY KEY,
  student_id    INTEGER NOT NULL UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  supervisor_id INTEGER REFERENCES instructors(instructor_id) ON DELETE SET NULL,
  title         TEXT NOT NULL
);`,
      check: schemaCheck(['theses'], { onDelete: true }),
      hints: ['"At most one thesis per student" means student_id is UNIQUE.', '"Deleted too" is ON DELETE CASCADE.', '"Stays without a supervisor" is ON DELETE SET NULL.']
    }
  ],
  quiz: [
    { id: 'd8-q1', q: 'Which statement belongs to DDL?', options: ['UPDATE', 'GRANT', 'ALTER TABLE', 'COMMIT'], answer: 2, why: 'DDL defines structure: CREATE, ALTER, DROP, TRUNCATE. UPDATE is DML, GRANT is DCL, COMMIT is TCL.' },
    { id: 'd8-q2', q: 'You need to empty a large log table quickly but keep its structure. Which is the best fit?', options: ['DROP TABLE logs', 'TRUNCATE TABLE logs', 'DELETE FROM logs WHERE 1 = 0', 'ALTER TABLE logs DROP COLUMN *'], answer: 1, why: 'TRUNCATE removes all rows fast and keeps the table. DROP removes the table itself. DELETE ... WHERE 1 = 0 deletes nothing.' },
    { id: 'd8-q3', q: 'enrollments has PRIMARY KEY (student_id, section_id). Which insert is rejected?', options: ['The same student in a second section', 'A second student in the same section', 'The same student in the same section again', 'A student with a NULL grade'], answer: 2, why: 'A composite key requires the combination to be unique. Each column alone may repeat.' },
    { id: 'd8-q4', q: 'students.advisor_id references instructors with ON DELETE SET NULL. An instructor who advises 3 students is deleted. What happens?', options: ['The delete is refused', 'The 3 students are deleted', 'The 3 students remain with advisor_id = NULL', 'advisor_id is set to 0'], answer: 2, why: 'SET NULL keeps the child rows and clears the reference.' },
    { id: 'd8-q5', q: 'A column is declared <code>email VARCHAR(100) UNIQUE</code> (no NOT NULL). In PostgreSQL, how many rows can have a NULL email?', options: ['None', 'Exactly one', 'Any number', 'Only if a DEFAULT exists'], answer: 2, why: 'NULL is not equal to NULL, so UNIQUE does not see duplicates. SQL Server is the exception: it allows only one NULL in a unique constraint.' },
    { id: 'd8-q6', q: 'Why is <code>INSERT ... ON CONFLICT DO UPDATE</code> better than "SELECT to check, then INSERT or UPDATE"?', options: ['It is shorter, nothing more', 'It is one atomic statement, so two users cannot both decide to INSERT', 'It skips constraint checks', 'It works without a unique key'], answer: 1, why: 'Between your SELECT and your INSERT another session can insert the same key. The upsert decides and writes in one step. It needs a unique key or primary key to detect the conflict.' },
    { id: 'd8-q7', q: 'Which type should you use for prices in an accounting system?', options: ['FLOAT', 'REAL', 'DECIMAL(12,2)', 'VARCHAR(20)'], answer: 2, why: 'DECIMAL is exact. FLOAT and REAL are binary approximations, so sums of money drift by fractions of a cent.' }
  ],
  teach: 'Explain the difference between ON DELETE CASCADE, ON DELETE SET NULL and the default (RESTRICT / NO ACTION). For each one, give an example from a university database where it is the right choice.',
  rubric: 'CASCADE deletes child rows with the parent (e.g. payments or theses of a deleted student); SET NULL keeps children but clears the FK (e.g. advisor leaves, student stays; requires the column to be nullable); RESTRICT/NO ACTION refuses the parent delete while children exist (e.g. department with courses); choice depends on whether the child can exist without the parent; mentions referential integrity.'
});
})();
