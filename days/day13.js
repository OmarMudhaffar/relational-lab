LAB.days.push({
  n: 13,
  week: 2,
  tag: 'VIEWS',
  title: 'Views, Triggers, Security and Relational Algebra',
  hours: 3,
  goals: [
    'Create views and explain three reasons to use them',
    'Write BEFORE and AFTER triggers using NEW and OLD, including an audit log',
    'Explain SQL injection and fix it with parameterized queries; know GRANT and REVOKE',
    'Translate between relational algebra (σ, π, ρ, ∪, −, ×, ⋈) and SQL in both directions'
  ],
  lesson: [
    {
      h: 'Views: saved queries with a name',
      html: `<p>A <strong>view</strong> is a named SELECT. It stores no data (in most databases); every time you query the view, the database runs its SELECT. You use it like a table.</p>
<p>Three reasons to create views:</p>
<ul><li><strong>Simplicity</strong>: hide a 4-table join behind one name such as <code>transcript</code>.</li><li><strong>Security</strong>: give a user access to a view that shows names and emails but not salaries or birth dates.</li><li><strong>A stable interface</strong>: if you later split or rename tables, update the view and the applications keep working.</li></ul>`,
      sql: `CREATE VIEW transcript AS
SELECT s.student_id, s.name AS student, c.course_id, c.title,
       sec.semester, sec.year, e.grade, e.score
FROM enrollments e
JOIN students s   ON s.student_id = e.student_id
JOIN sections sec ON sec.section_id = e.section_id
JOIN courses c    ON c.course_id = sec.course_id;

SELECT student, title, grade FROM transcript
WHERE grade = 'A' ORDER BY student;`
    },
    {
      h: 'Updatable and materialized views',
      html: `<p><strong>Updatable views.</strong> In PostgreSQL, MySQL and SQL Server you can INSERT, UPDATE or DELETE through a simple view: one base table, no GROUP BY, no DISTINCT, no aggregates. The change goes to the base table. <code>WITH CHECK OPTION</code> refuses changes that would make the row disappear from the view. SQLite views are read-only unless you write an <code>INSTEAD OF</code> trigger.</p>
<p><strong>Materialized views</strong> store the result physically, like a cached table. Reading them is fast, but the data becomes stale until you refresh it.</p>
<pre class="code">-- PostgreSQL
CREATE MATERIALIZED VIEW dept_stats AS
  SELECT dept_id, COUNT(*) AS n, AVG(salary) AS avg_salary
  FROM instructors GROUP BY dept_id;
REFRESH MATERIALIZED VIEW dept_stats;</pre>
<p>Oracle also has materialized views; SQL Server has <em>indexed views</em>. MySQL and SQLite have none (you build a summary table and refresh it yourself).</p>`,
      predict: {
        q: 'You create a normal (non-materialized) view, then INSERT new rows into its base table. What does the next SELECT on the view show?',
        options: ['The old rows only, until you refresh the view', 'The new rows too, because the view re-runs its query', 'An error: the view is invalid', 'Only the new rows'],
        answer: 1,
        why: 'A normal view stores only the query text. Each read runs the query again on the current data. Only a materialized view can be stale.'
      }
    },
    {
      h: 'Triggers: code that runs on a change',
      html: `<p>A <strong>trigger</strong> runs automatically when a row is inserted, updated or deleted. You choose:</p>
<ul><li><strong>When</strong>: <code>BEFORE</code> the change (to check or reject it) or <code>AFTER</code> it (to record or propagate it). <code>INSTEAD OF</code> is for views.</li><li><strong>Which event</strong>: <code>INSERT</code>, <code>UPDATE</code>, <code>UPDATE OF column</code>, <code>DELETE</code>.</li><li><strong>NEW</strong> is the row after the change (INSERT, UPDATE). <strong>OLD</strong> is the row before (UPDATE, DELETE).</li></ul>
<p>A classic use is an <strong>audit log</strong>: every grade change is recorded with the old and new value.</p>`,
      sql: `CREATE TABLE grade_log (
  student_id INTEGER, section_id INTEGER,
  old_grade TEXT, new_grade TEXT,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_grade_audit
AFTER UPDATE OF grade ON enrollments
WHEN OLD.grade IS NOT NEW.grade
BEGIN
  INSERT INTO grade_log (student_id, section_id, old_grade, new_grade)
  VALUES (OLD.student_id, OLD.section_id, OLD.grade, NEW.grade);
END;

UPDATE enrollments SET grade = 'B' WHERE student_id = 1003 AND section_id = 8;
SELECT student_id, section_id, old_grade, new_grade FROM grade_log;`
    },
    {
      h: 'Rejecting bad data in a BEFORE trigger',
      html: `<p>CHECK constraints can only look at the row itself. A trigger can look at other tables too. In SQLite, <code>SELECT RAISE(ABORT, 'message')</code> inside a trigger cancels the statement with an error.</p>
<pre class="code">CREATE TRIGGER trg_section_capacity
BEFORE INSERT ON enrollments
WHEN (SELECT COUNT(*) FROM enrollments WHERE section_id = NEW.section_id)
     &gt;= (SELECT capacity FROM sections WHERE section_id = NEW.section_id)
BEGIN
  SELECT RAISE(ABORT, 'Section is full');
END;</pre>
<div class="callout warn"><strong>Use triggers carefully.</strong> They are invisible: someone reading the INSERT does not see that extra work happens. Too many triggers make bugs hard to find and slow down writes. Prefer constraints (NOT NULL, CHECK, FK) when they can express the rule.</div>`,
      predict: {
        q: 'In an AFTER DELETE trigger, which row variable can you use?',
        options: ['NEW only', 'OLD only', 'Both NEW and OLD', 'Neither'],
        answer: 1,
        why: 'After a delete there is no new row. OLD holds the deleted row\'s values.'
      }
    },
    {
      h: 'Stored procedures and functions',
      html: `<p>Server databases let you store programs inside the database, written in a procedural language: PL/pgSQL (PostgreSQL), T-SQL (SQL Server), PL/SQL (Oracle), and MySQL's own syntax. SQLite has none; the application does this work.</p>
<pre class="code">-- PostgreSQL: a function that enrolls a student safely
CREATE FUNCTION enroll(p_student INT, p_section INT) RETURNS void AS $$
DECLARE
  taken INT; cap INT;
BEGIN
  SELECT COUNT(*) INTO taken FROM enrollments WHERE section_id = p_section;
  SELECT capacity INTO cap FROM sections WHERE section_id = p_section;
  IF taken &gt;= cap THEN
    RAISE EXCEPTION 'Section % is full', p_section;
  END IF;
  INSERT INTO enrollments(student_id, section_id) VALUES (p_student, p_section);
END;
$$ LANGUAGE plpgsql;

SELECT enroll(1001, 12);</pre>
<p><strong>Pros:</strong> fewer round trips between app and database, logic close to the data, one place for rules. <strong>Cons:</strong> harder to test, version and debug; ties you to one database product.</p>`
    },
    {
      h: 'Users, roles, GRANT and REVOKE',
      html: `<p>Server databases have users and <strong>roles</strong> (named groups of permissions). You give permissions with <code>GRANT</code> and remove them with <code>REVOKE</code>. Follow the <strong>principle of least privilege</strong>: each user gets only what they need.</p>
<pre class="code">CREATE ROLE registrar;
GRANT SELECT, INSERT, UPDATE ON enrollments TO registrar;
GRANT SELECT ON student_directory TO registrar;   -- a view, not the table
GRANT registrar TO alice;

REVOKE UPDATE ON enrollments FROM registrar;
GRANT SELECT ON courses TO bob WITH GRANT OPTION; -- bob may grant it to others</pre>
<p>Combining views and GRANT gives column- and row-level security: the registrar sees the view with names and emails, but has no permission on the <code>students</code> table where birth dates live. SQLite is a file, so it has no users; security is the file permission of the operating system.</p>`
    },
    {
      h: 'SQL injection',
      html: `<p>SQL injection happens when an application builds SQL by gluing user input into a string. The input then becomes part of the SQL code.</p>
<pre class="code"># Python, VULNERABLE
email = request.form["email"]
pw    = request.form["password"]
sql = "SELECT * FROM users WHERE email = '" + email + "' AND pw = '" + pw + "'"</pre>
<p>If an attacker types <code>' OR '1'='1' --</code> as the email, the query becomes:</p>
<pre class="code">SELECT * FROM users WHERE email = '' OR '1'='1' --' AND pw = '...'</pre>
<p><code>'1'='1'</code> is always true and <code>--</code> turns the password check into a comment. The attacker logs in as the first user, often the administrator. Other inputs can read every table or drop them.</p>
<p><strong>The fix: parameterized queries</strong> (prepared statements). The SQL text and the values travel separately, so a value can never become code.</p>
<pre class="code"># Python (sqlite3 / psycopg)
cur.execute("SELECT * FROM users WHERE email = ? AND pw_hash = ?", (email, pw_hash))

// Node.js (pg)
await client.query("SELECT * FROM users WHERE email = $1", [email]);</pre>
<p>Also: store password <em>hashes</em> (bcrypt, argon2), never plain passwords; give the app's database user minimal privileges; never show raw database errors to users.</p>`,
      predict: {
        q: 'Which is the correct defense against SQL injection?',
        options: ['Remove all single quotes from user input', 'Use parameterized queries / prepared statements', 'Hide the error messages', 'Use a longer password'],
        answer: 1,
        why: 'Escaping by hand is fragile and easy to get wrong. Parameters send values separately from the SQL text, so input can never change the query structure.'
      }
    },
    {
      h: 'Relational algebra: the operators',
      html: `<p>Relational algebra is the math behind SQL. Exams love it. Each operator takes relations and returns a relation (a <strong>set</strong>: no duplicates).</p>
<table class="mini"><thead><tr><th>Symbol</th><th>Name</th><th>Meaning</th><th>SQL</th></tr></thead><tbody>
<tr><td>σ<sub>cond</sub>(R)</td><td>Selection</td><td>keep rows where cond is true</td><td><code>WHERE</code></td></tr>
<tr><td>π<sub>cols</sub>(R)</td><td>Projection</td><td>keep only these columns (removes duplicates)</td><td><code>SELECT DISTINCT cols</code></td></tr>
<tr><td>ρ<sub>S</sub>(R)</td><td>Rename</td><td>give R (or its columns) a new name</td><td><code>AS</code></td></tr>
<tr><td>R ∪ S</td><td>Union</td><td>rows in R or S</td><td><code>UNION</code></td></tr>
<tr><td>R − S</td><td>Difference</td><td>rows in R but not in S</td><td><code>EXCEPT</code> (Oracle: <code>MINUS</code>)</td></tr>
<tr><td>R ∩ S</td><td>Intersection</td><td>rows in both</td><td><code>INTERSECT</code></td></tr>
<tr><td>R × S</td><td>Cartesian product</td><td>every row of R with every row of S</td><td><code>CROSS JOIN</code></td></tr>
<tr><td>R ⋈<sub>cond</sub> S</td><td>Join</td><td>σ<sub>cond</sub>(R × S)</td><td><code>JOIN ... ON</code></td></tr>
<tr><td>R ⋈ S</td><td>Natural join</td><td>join on all columns with the same name</td><td><code>NATURAL JOIN</code></td></tr>
</tbody></table>
<p>σ, π, ρ, ∪, − and × are the six <strong>basic</strong> operators. Join and intersection can be built from them: R ∩ S = R − (R − S).</p>
<div class="callout"><strong>Important difference.</strong> Relational algebra uses sets, SQL uses bags (multisets). π removes duplicates; SQL's SELECT does not unless you write DISTINCT.</div>`
    },
    {
      h: 'Translating between algebra and SQL',
      html: `<p>Read an algebra expression from the inside out. The innermost operation is applied first.</p>
<p><strong>1.</strong> Names of fourth-year students:</p>
<pre class="code">π name ( σ year = 4 ( students ) )

SELECT DISTINCT name FROM students WHERE year = 4;</pre>
<p><strong>2.</strong> Titles of courses taught by instructor 101:</p>
<pre class="code">π title ( σ instructor_id = 101 ( sections ) ⋈ courses )

SELECT DISTINCT c.title
FROM sections s JOIN courses c ON c.course_id = s.course_id
WHERE s.instructor_id = 101;</pre>
<p><strong>3.</strong> IDs of students who have never made a payment:</p>
<pre class="code">π student_id ( students ) − π student_id ( payments )

SELECT student_id FROM students
EXCEPT
SELECT student_id FROM payments;</pre>
<p>Going from SQL to algebra is the reverse: FROM/JOIN becomes × or ⋈, WHERE becomes σ, SELECT becomes π (applied last).</p>`,
      sql: `SELECT student_id FROM students
EXCEPT
SELECT student_id FROM payments;`,
      predict: {
        q: 'Which SQL is equivalent to σ salary > 90000 ( π name, salary ( instructors ) )?',
        options: ['SELECT name FROM instructors WHERE salary > 90000', 'SELECT DISTINCT name, salary FROM instructors WHERE salary > 90000', 'SELECT * FROM instructors WHERE salary > 90000', 'SELECT DISTINCT salary FROM instructors WHERE name > 90000'],
        answer: 1,
        why: 'The projection keeps name and salary (with set semantics, so DISTINCT), and the selection then filters on salary. The output has both columns.'
      }
    }
  ],
  pitfalls: [
    'Forgetting DISTINCT when translating π to SQL. Relational algebra never has duplicate rows.',
    'Building SQL strings with user input (string concatenation or f-strings). Always use parameters.',
    'Using a trigger for a rule that a CHECK or FOREIGN KEY constraint can express. Constraints are clearer and faster.',
    'Writing a trigger that updates the same table and fires itself again (recursive triggers). Restrict it with <code>UPDATE OF column</code> and a WHEN condition.',
    'Expecting a normal view to make queries faster. It is only a saved query; the base query runs every time.',
    'Using NEW in a DELETE trigger or OLD in an INSERT trigger. They do not exist there.'
  ],
  dialect: `<ul><li><strong>Trigger syntax:</strong> SQLite and MySQL put the body inline (<code>BEGIN ... END</code>, MySQL needs <code>FOR EACH ROW</code>). PostgreSQL triggers call a separate function: <code>CREATE TRIGGER t AFTER UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION log_grade();</code>. SQL Server triggers are per statement and use the <code>inserted</code> and <code>deleted</code> pseudo-tables instead of NEW/OLD.</li><li><strong>Raising errors:</strong> SQLite <code>RAISE(ABORT, 'msg')</code>, PostgreSQL <code>RAISE EXCEPTION</code>, MySQL <code>SIGNAL SQLSTATE '45000'</code>, SQL Server <code>THROW</code>, Oracle <code>RAISE_APPLICATION_ERROR</code>.</li><li><strong>Set difference:</strong> <code>EXCEPT</code> in SQLite, PostgreSQL, SQL Server, MySQL 8.0.31+; <code>MINUS</code> in Oracle.</li><li><strong>Views:</strong> <code>CREATE OR REPLACE VIEW</code> in PostgreSQL, MySQL, Oracle; SQLite needs <code>DROP VIEW</code> then <code>CREATE VIEW</code>; SQL Server uses <code>CREATE OR ALTER VIEW</code>.</li></ul>`,
  exercises: [
    {
      id: 'd13-1', level: 1, kind: 'script',
      prompt: 'Create a view named <code>student_directory</code> with columns <code>student_id</code>, <code>name</code>, <code>email</code> and <code>dept_name</code> (the department name). Students without a department must still appear, with <code>dept_name</code> NULL.',
      solution: `CREATE VIEW student_directory AS
SELECT s.student_id, s.name, s.email, d.name AS dept_name
FROM students s LEFT JOIN departments d ON d.dept_id = s.dept_id;`,
      check: `SELECT student_id, name, email, dept_name FROM student_directory ORDER BY student_id;`,
      hints: ['CREATE VIEW name AS SELECT ...', 'Keeping students without a department needs a LEFT JOIN.', 'Rename departments.name with AS dept_name.']
    },
    {
      id: 'd13-2', level: 1, kind: 'script',
      prompt: 'Create a view <code>course_offerings</code> with columns <code>course_id</code>, <code>title</code> and <code>n_sections</code> (how many sections the course has). Courses with no sections must show 0.',
      solution: `CREATE VIEW course_offerings AS
SELECT c.course_id, c.title, COUNT(s.section_id) AS n_sections
FROM courses c LEFT JOIN sections s ON s.course_id = c.course_id
GROUP BY c.course_id, c.title;`,
      check: `SELECT course_id, title, n_sections FROM course_offerings ORDER BY course_id;`,
      hints: ['LEFT JOIN courses to sections so courses with no sections stay.', 'COUNT(s.section_id) counts only matched rows, so it gives 0 for no match. COUNT(*) would give 1.', 'GROUP BY c.course_id, c.title']
    },
    {
      id: 'd13-3', level: 2,
      prompt: 'A view <code>transcript</code> (student, course_id, title, semester, year, grade, score) has been created for you. Using <strong>only the view</strong>, return each <code>student</code> with their average score as <code>avg_score</code> (rounded to 1 decimal), only for students with at least 3 graded courses. Sort by <code>avg_score</code> descending, then <code>student</code>.',
      setup: `CREATE VIEW transcript AS
SELECT s.student_id, s.name AS student, c.course_id, c.title, sec.semester, sec.year, e.grade, e.score
FROM enrollments e JOIN students s ON s.student_id = e.student_id
JOIN sections sec ON sec.section_id = e.section_id
JOIN courses c ON c.course_id = sec.course_id;`,
      solution: `SELECT student, ROUND(AVG(score), 1) AS avg_score FROM transcript WHERE score IS NOT NULL GROUP BY student_id, student HAVING COUNT(score) >= 3 ORDER BY avg_score DESC, student;`,
      ordered: true,
      hints: ['Use the view just like a table: FROM transcript.', '"Graded" means score is not NULL. COUNT(score) ignores NULLs.', 'GROUP BY the student, HAVING COUNT(score) >= 3, then ORDER BY.']
    },
    {
      id: 'd13-4', level: 2, kind: 'script',
      prompt: 'A table <code>grade_log(student_id, section_id, old_grade, new_grade)</code> exists. Create an <code>AFTER UPDATE OF grade ON enrollments</code> trigger named <code>trg_grade_audit</code> that inserts one log row (using OLD and NEW) whenever a grade changes. Then, in the same script, run these two updates so the trigger fires:<pre class="code">UPDATE enrollments SET grade = \'B\' WHERE student_id = 1001 AND section_id = 18;\nUPDATE enrollments SET grade = \'C\' WHERE student_id = 1003 AND section_id = 8;</pre>',
      setup: `CREATE TABLE grade_log (student_id INTEGER, section_id INTEGER, old_grade TEXT, new_grade TEXT);`,
      solution: `CREATE TRIGGER trg_grade_audit
AFTER UPDATE OF grade ON enrollments
BEGIN
  INSERT INTO grade_log (student_id, section_id, old_grade, new_grade)
  VALUES (OLD.student_id, OLD.section_id, OLD.grade, NEW.grade);
END;
UPDATE enrollments SET grade = 'B' WHERE student_id = 1001 AND section_id = 18;
UPDATE enrollments SET grade = 'C' WHERE student_id = 1003 AND section_id = 8;`,
      check: `SELECT student_id, section_id, old_grade, new_grade FROM grade_log ORDER BY student_id, section_id;`,
      hints: ['CREATE TRIGGER name AFTER UPDATE OF grade ON enrollments BEGIN ... END;', 'Inside the body: INSERT INTO grade_log (...) VALUES (OLD.student_id, OLD.section_id, OLD.grade, NEW.grade);', 'Remember the semicolon after the INSERT and after END. Then run the two UPDATEs.']
    },
    {
      id: 'd13-5', level: 2, kind: 'script',
      prompt: 'Create a trigger named <code>trg_positive_payment</code> that runs <strong>BEFORE INSERT</strong> on <code>payments</code> and aborts with the message <code>Amount must be positive</code> when <code>NEW.amount &lt;= 0</code>. After it, insert one valid payment: <code>(payment_id 500, student_id 1001, amount 300, paid_on \'2026-09-15\', method \'card\')</code>.',
      solution: `CREATE TRIGGER trg_positive_payment
BEFORE INSERT ON payments
WHEN NEW.amount <= 0
BEGIN
  SELECT RAISE(ABORT, 'Amount must be positive');
END;
INSERT INTO payments VALUES (500, 1001, 300, '2026-09-15', 'card');`,
      check: `SELECT name, tbl_name,
  instr(upper(sql), 'BEFORE') > 0 AS is_before,
  instr(upper(sql), 'RAISE') > 0 AS raises,
  (SELECT COUNT(*) FROM payments WHERE payment_id = 500 AND amount = 300) AS valid_row
FROM sqlite_master WHERE type = 'trigger' ORDER BY name;`,
      hints: ['Use a WHEN clause to fire only for bad rows.', "The body is SELECT RAISE(ABORT, 'Amount must be positive');", 'Finish with the INSERT of the valid payment (it must pass the trigger).']
    },
    {
      id: 'd13-6', level: 3, kind: 'script',
      prompt: 'Keep letter grades in sync with scores. Create a trigger <code>trg_score_to_grade</code> that runs <strong>AFTER UPDATE OF score ON enrollments</strong> and sets that row\'s <code>grade</code> from the new score: 90+ A, 80+ B, 70+ C, 60+ D, else F (NULL score gives NULL grade). Then run:<pre class="code">UPDATE enrollments SET score = 91 WHERE student_id = 1002 AND section_id = 21;\nUPDATE enrollments SET score = 58 WHERE student_id = 1002 AND section_id = 33;</pre>',
      solution: `CREATE TRIGGER trg_score_to_grade
AFTER UPDATE OF score ON enrollments
BEGIN
  UPDATE enrollments
  SET grade = CASE
    WHEN NEW.score IS NULL THEN NULL
    WHEN NEW.score >= 90 THEN 'A'
    WHEN NEW.score >= 80 THEN 'B'
    WHEN NEW.score >= 70 THEN 'C'
    WHEN NEW.score >= 60 THEN 'D'
    ELSE 'F' END
  WHERE student_id = NEW.student_id AND section_id = NEW.section_id;
END;
UPDATE enrollments SET score = 91 WHERE student_id = 1002 AND section_id = 21;
UPDATE enrollments SET score = 58 WHERE student_id = 1002 AND section_id = 33;`,
      check: `SELECT student_id, section_id, grade, score FROM enrollments WHERE student_id = 1002 ORDER BY section_id;`,
      hints: ['The trigger body is an UPDATE on the same row: WHERE student_id = NEW.student_id AND section_id = NEW.section_id.', 'Compute the letter with CASE WHEN NEW.score >= 90 THEN \'A\' ... END.', 'Because the trigger fires only on UPDATE OF score, setting grade inside it does not fire it again.']
    },
    {
      id: 'd13-7', level: 1,
      prompt: 'Translate to SQL: <code>π<sub>name, email</sub> ( σ<sub>year = 4</sub> ( students ) )</code>. Remember that algebra uses sets.',
      solution: `SELECT DISTINCT name, email FROM students WHERE year = 4;`,
      hints: ['σ is WHERE, π is the SELECT list.', 'π removes duplicates: SELECT DISTINCT.']
    },
    {
      id: 'd13-8', level: 2,
      prompt: 'Translate to SQL: <code>π<sub>name</sub> ( students ⋈<sub>students.student_id = enrollments.student_id</sub> σ<sub>grade = \'A\'</sub> ( enrollments ) )</code> — the names of students who received at least one A.',
      solution: `SELECT DISTINCT s.name FROM students s JOIN enrollments e ON s.student_id = e.student_id WHERE e.grade = 'A';`,
      hints: ['⋈ with a condition is JOIN ... ON.', 'The σ on enrollments becomes a WHERE condition.', 'A student with two A grades must appear once: DISTINCT.']
    },
    {
      id: 'd13-9', level: 2,
      prompt: 'Translate to SQL: <code>π<sub>course_id</sub> ( courses ) − π<sub>course_id</sub> ( sections )</code> — courses that were never offered.',
      solution: `SELECT course_id FROM courses EXCEPT SELECT course_id FROM sections;`,
      hints: ['− is set difference.', 'In SQL it is EXCEPT (MINUS in Oracle).']
    },
    {
      id: 'd13-10', level: 3,
      prompt: 'Translate to SQL: <code>π<sub>i.name, m.name</sub> ( σ<sub>i.mentor_id = m.instructor_id</sub> ( ρ<sub>i</sub>(instructors) × ρ<sub>m</sub>(instructors) ) )</code>. Name the output columns <code>mentee</code> and <code>mentor</code>.',
      solution: `SELECT DISTINCT i.name AS mentee, m.name AS mentor FROM instructors i, instructors m WHERE i.mentor_id = m.instructor_id;`,
      hints: ['ρ gives the same table two different names: aliases i and m.', '× followed by σ is a join: either FROM i, m WHERE ... or JOIN ... ON.', 'SELECT DISTINCT i.name AS mentee, m.name AS mentor ...']
    }
  ],
  quiz: [
    { id: 'd13-q1', q: 'Which is NOT a typical reason to create a view?', options: ['Hide a complex join behind a simple name', 'Restrict which columns a user can see', 'Keep old queries working after a table change', 'Make every query faster by storing the data'], answer: 3, why: 'A normal view stores no data, so it does not make queries faster. That is what materialized views do.' },
    { id: 'd13-q2', q: 'You want to stop an INSERT if the section is already full. Which trigger timing fits?', options: ['AFTER INSERT', 'BEFORE INSERT', 'AFTER DELETE', 'INSTEAD OF DELETE'], answer: 1, why: 'A BEFORE trigger runs before the row is written and can reject it with an error.' },
    { id: 'd13-q3', q: "An attacker types  ' OR '1'='1' --  into a login form. What makes this attack possible?", options: ['A weak password policy', 'The app concatenates user input into the SQL string', 'Missing indexes', 'Using SQLite'], answer: 1, why: 'Injection works only when input becomes part of the SQL text. Parameterized queries prevent it.' },
    { id: 'd13-q4', q: 'Which relational algebra operator corresponds to the WHERE clause?', options: ['π (projection)', 'σ (selection)', 'ρ (rename)', '× (product)'], answer: 1, why: 'Selection filters rows. Projection chooses columns, which corresponds to the SELECT list.' },
    { id: 'd13-q5', q: 'R has 5 rows and S has 4 rows. How many rows does R × S have?', options: ['9', '20', '5', '4'], answer: 1, why: 'The Cartesian product pairs every row of R with every row of S: 5 × 4 = 20.' },
    { id: 'd13-q6', q: 'Which set of operators is the basic (complete) set of relational algebra?', options: ['σ, π, ⋈, ∩', 'σ, π, ρ, ∪, −, ×', 'σ, π, ∪, ∩', '⋈, ×, ∪, −'], answer: 1, why: 'Join and intersection can be derived: R ⋈ S = σ(R × S), R ∩ S = R − (R − S).' },
    { id: 'd13-q7', q: 'GRANT SELECT ON courses TO bob WITH GRANT OPTION means…', options: ['Bob can read and also change courses', 'Bob can read courses and give that read permission to others', 'Bob owns the courses table', 'Bob can create new tables'], answer: 1, why: 'WITH GRANT OPTION lets the receiver pass on the same privilege.' },
    { id: 'd13-q8', q: 'π dept_id (students) in SQL is best written as…', options: ['SELECT dept_id FROM students', 'SELECT DISTINCT dept_id FROM students', 'SELECT * FROM students GROUP BY name', 'SELECT COUNT(dept_id) FROM students'], answer: 1, why: 'Projection returns a set, so duplicates must be removed with DISTINCT.' }
  ],
  teach: 'Explain SQL injection to a junior developer: show a vulnerable login query, the attack input, what the final SQL looks like, and the correct fix.',
  rubric: 'Vulnerable code concatenates user input into SQL text; attack input like \' OR \'1\'=\'1\' -- changes the WHERE condition and comments out the rest; result: login without password or data leak; fix: parameterized queries / prepared statements where values are sent separately; extra defenses: least-privilege DB user, hashed passwords, no raw error messages; escaping by hand is not enough.'
});
