(function () {
  // Capstone scenario: a small clinic. Each step's setup contains the solutions of the steps before it.
  var C1 = `CREATE TABLE doctors (
  doctor_id INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  specialty TEXT NOT NULL
);
CREATE TABLE patients (
  patient_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT UNIQUE,
  birth_date TEXT
);`;
  var C2 = `CREATE TABLE appointments (
  appt_id    INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id),
  doctor_id  INTEGER NOT NULL REFERENCES doctors(doctor_id),
  starts_at  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','done','cancelled')),
  UNIQUE (doctor_id, starts_at)
);`;
  var C3 = `CREATE TABLE prescriptions (
  appt_id INTEGER NOT NULL REFERENCES appointments(appt_id),
  drug    TEXT NOT NULL,
  dose    TEXT NOT NULL,
  PRIMARY KEY (appt_id, drug)
);`;
  var DATA = `INSERT INTO doctors VALUES
 (1,'Dr. Salma Hadi','Cardiology'),(2,'Dr. Peter Lang','Pediatrics'),
 (3,'Dr. Rana Aziz','Dermatology'),(4,'Dr. Ken Ito','General Practice');
INSERT INTO patients VALUES
 (1,'Yara Nasser','0770-111','1990-04-12'),(2,'Ben Carter','0770-222','2015-09-30'),
 (3,'Huda Saleh','0770-333','1978-01-05'),(4,'Tom Weiss',NULL,'1985-07-19'),
 (5,'Lina Faris','0770-555','2018-11-02'),(6,'Sami Odeh','0770-666','1969-03-23');
INSERT INTO appointments VALUES
 (1,1,1,'2026-09-02 09:00','booked'),(2,2,2,'2026-09-02 10:00','booked'),
 (3,3,1,'2026-09-10 11:30','booked'),(4,5,2,'2026-09-15 09:00','cancelled'),
 (5,3,3,'2026-09-21 14:00','booked'),(6,6,1,'2026-09-28 08:30','booked'),
 (7,1,3,'2026-10-07 16:00','booked'),(8,4,1,'2026-10-08 09:00','booked'),
 (9,5,2,'2026-10-09 10:30','booked'),(10,3,2,'2026-10-12 15:00','booked'),
 (11,6,3,'2026-10-20 11:00','booked');
INSERT INTO prescriptions VALUES
 (1,'Aspirin','100 mg daily'),(1,'Atorvastatin','20 mg nightly'),
 (2,'Amoxicillin','250 mg 3x daily'),(3,'Aspirin','100 mg daily'),
 (5,'Hydrocortisone cream','apply 2x daily'),(6,'Aspirin','75 mg daily'),
 (6,'Bisoprolol','5 mg daily');`;
  var FULL = C1 + '\n' + C2 + '\n' + C3 + '\n' + DATA;

  LAB.days.push({
    n: 14,
    week: 2,
    tag: 'CAPSTONE',
    title: 'Capstone Project and Final Exam',
    hours: 4,
    goals: [
      'Turn written requirements into a working, constrained schema step by step',
      'Write the DML and queries an application would need on that schema',
      'Pass a mixed final exam covering both weeks',
      'Know what exists beyond relational databases and how to keep learning'
    ],
    lesson: [
      {
        h: 'From requirements to schema: the method',
        html: `<p>Every design task in an exam or a job follows the same steps. Do them in this order and write each one down.</p>
<ol class="steps"><li><strong>Requirements</strong>: read the story and underline nouns (things) and verbs (actions between things).</li><li><strong>Entities</strong>: nouns that have their own data become tables (doctor, patient).</li><li><strong>Relationships</strong>: verbs become relationships. Decide cardinality: 1:1, 1:N or M:N.</li><li><strong>Keys</strong>: choose a primary key for each table; turn every 1:N into a foreign key on the N side; turn every M:N into a junction table.</li><li><strong>Normalize</strong>: check every non-key column depends on the key, the whole key, and nothing but the key (3NF).</li><li><strong>Constraints</strong>: NOT NULL, UNIQUE, CHECK, DEFAULT, FK actions. Put business rules into the schema when you can.</li><li><strong>Indexes</strong>: FK columns used in joins, and columns in frequent, selective filters.</li><li><strong>Test queries</strong>: write the 5 questions the application must answer and make sure the schema answers them easily.</li></ol>`
      },
      {
        h: 'The capstone story: a small clinic',
        html: `<p>Read the requirements. The exercises below build this system one step at a time.</p>
<div class="callout"><em>"The clinic has <strong>doctors</strong>, each with one specialty. <strong>Patients</strong> register with a name, an optional phone number (unique if given) and a birth date. A patient <strong>books appointments</strong> with a doctor at a date and time. A doctor cannot have two appointments at the same time. An appointment is booked, done or cancelled. During an appointment the doctor may <strong>prescribe</strong> several drugs, each with a dose; the same drug is not prescribed twice in one appointment."</em></div>
<p>Applying the method:</p>
<ul><li>Entities: <code>doctors</code>, <code>patients</code>, <code>appointments</code>, <code>prescriptions</code>.</li><li>patient 1:N appointment, doctor 1:N appointment. So appointment holds two FKs. (Appointment is really the junction of the M:N "patient sees doctor", with its own attributes.)</li><li>appointment 1:N prescription. Key of prescription: (appt_id, drug), which also enforces "not the same drug twice".</li><li>"Cannot have two appointments at the same time" becomes <code>UNIQUE (doctor_id, starts_at)</code>.</li><li>"booked, done or cancelled" becomes a CHECK, with DEFAULT 'booked'.</li></ul>`
      },
      {
        h: 'How applications talk to databases',
        html: `<p>Your app (Python, Java, JavaScript, C#) connects through a <strong>driver</strong> and sends SQL text with parameters. Many teams use an <strong>ORM</strong> (Object-Relational Mapper) that maps classes to tables and writes SQL for you: SQLAlchemy and Django ORM (Python), Hibernate (Java), Entity Framework (C#), Prisma and Sequelize (JavaScript).</p>
<pre class="code"># SQLAlchemy (Python)
appts = (session.query(Appointment)
         .filter(Appointment.doctor_id == 1, Appointment.status == "booked")
         .order_by(Appointment.starts_at).all())</pre>
<p>ORMs save time, but you still need SQL: to read the SQL they generate, to fix slow pages, and to write reports. The famous ORM trap is the <strong>N+1 problem</strong>: load 100 appointments (1 query), then for each one load its patient (100 more queries). The fix is one query with a JOIN (in ORMs: "eager loading", e.g. <code>joinedload</code> or <code>Include</code>).</p>
<p>Other tools you will meet: <strong>connection pools</strong> (reuse open connections), <strong>migrations</strong> (versioned scripts that change the schema: Flyway, Liquibase, Alembic, EF migrations).</p>`,
        predict: {
          q: 'A page shows 50 orders, each with its customer name. The log shows 51 SQL queries. What is the problem, and how do you fix it?',
          options: ['A deadlock; add retries', 'The N+1 problem; load orders and customers with one JOIN (eager loading)', 'Missing ORDER BY; add sorting', 'SQL injection; use parameters'],
          answer: 1,
          why: 'One query for the list, plus one query for each row, is the N+1 problem. One JOIN (or eager loading in the ORM) gets everything at once.'
        }
      },
      {
        h: 'Beyond relational: NoSQL families',
        html: `<table class="mini"><thead><tr><th>Family</th><th>Examples</th><th>Data looks like</th><th>Good for</th></tr></thead><tbody>
<tr><td>Document</td><td>MongoDB, Couchbase, Firestore</td><td>JSON documents, nested, flexible fields</td><td>Content, catalogs, data read as one whole object</td></tr>
<tr><td>Key-value</td><td>Redis, DynamoDB, etcd</td><td>key → value</td><td>Caches, sessions, counters, very fast lookups</td></tr>
<tr><td>Wide-column</td><td>Cassandra, HBase, Bigtable</td><td>rows with many dynamic columns, partitioned by key</td><td>Huge write volumes, time series, IoT</td></tr>
<tr><td>Graph</td><td>Neo4j, Amazon Neptune</td><td>nodes and edges</td><td>Social networks, recommendations, fraud paths</td></tr>
</tbody></table>
<p><strong>CAP theorem in three sentences.</strong> A distributed database can be <em>Consistent</em> (every read sees the latest write), <em>Available</em> (every request gets an answer) and <em>Partition-tolerant</em> (works when the network splits). Network splits will happen, so P is not optional. During a split, the system must choose: refuse some requests to stay consistent (CP) or answer with possibly old data (AP).</p>
<p><strong>When to choose what.</strong> Start with a relational database (PostgreSQL is an excellent default): it handles most applications, gives you ACID, joins and constraints. Add a specialized store when you have a specific need: Redis for caching, a search engine for full text, a graph database for deep relationship queries. PostgreSQL even stores JSON (<code>jsonb</code>) well.</p>`
      },
      {
        h: 'Final exam strategy',
        html: `<p>For any SQL question:</p>
<ol class="steps"><li>Find the tables: which nouns does the question mention?</li><li>Draw the join path between them using the foreign keys.</li><li>Decide the grain: one output row per what? (per student, per course, per department)</li><li>Write FROM/JOIN first, then WHERE, then GROUP BY/HAVING, then SELECT, then ORDER BY.</li><li>Check NULLs and missing rows: "including those with none" means LEFT JOIN and COUNT(column).</li><li>Check duplicates: does a join multiply rows? Do you need DISTINCT?</li></ol>
<p>For theory questions: define the term, give a small example, state the consequence. That structure earns full marks.</p>`
      },
      {
        h: 'Keep going: the next 30 days',
        html: `<table class="mini"><thead><tr><th>Days</th><th>Focus</th></tr></thead><tbody>
<tr><td>1–7</td><td>Install PostgreSQL locally. Rebuild this university schema in it. Solve 5 problems a day on pgexercises.com.</td></tr>
<tr><td>8–14</td><td>Read the PostgreSQL tutorial and the chapters on indexes and EXPLAIN. Use EXPLAIN ANALYZE on every query you write.</td></tr>
<tr><td>15–21</td><td>Read use-the-index-luke.com (free, about indexing for developers). Build a small app (Python or Node) on your database with parameterized queries.</td></tr>
<tr><td>22–30</td><td>Watch CMU 15-445 "Intro to Database Systems" lectures (free on YouTube) on storage, B+ trees, concurrency control and recovery.</td></tr>
</tbody></table>
<p><strong>Resources</strong> (type these into your browser):</p>
<ul><li>postgresql.org/docs (the official documentation; the tutorial chapter is short and excellent)</li><li>use-the-index-luke.com (indexing and performance)</li><li>sqlbolt.com (quick interactive SQL practice)</li><li>pgexercises.com (realistic PostgreSQL exercises)</li><li>CMU 15-445/645 Database Systems, Andy Pavlo (lectures on YouTube, course site at 15445.courses.cs.cmu.edu)</li><li>Book: <em>Database System Concepts</em> by Silberschatz, Korth and Sudarshan (the classic university textbook, same examples as many courses)</li></ul>
<p>Come back to the <strong>Review</strong> tab of this lab every few days. Spaced review is what keeps today's knowledge alive next month.</p>`
      },
      {
        h: 'Warm-up: one query, every clause',
        html: `<p>Before the exam, read this query and say aloud what each clause does, in the order the database runs it.</p>`,
        sql: `SELECT d.name AS department,
       COUNT(DISTINCT e.student_id) AS students_taught,
       ROUND(AVG(e.score), 1) AS avg_score
FROM departments d
JOIN courses c      ON c.dept_id = d.dept_id
JOIN sections s     ON s.course_id = c.course_id
JOIN enrollments e  ON e.section_id = s.section_id
WHERE e.score IS NOT NULL
GROUP BY d.dept_id, d.name
HAVING COUNT(*) >= 10
ORDER BY avg_score DESC;`,
        predict: {
          q: 'Why does this query use COUNT(DISTINCT e.student_id) and not COUNT(*)?',
          options: ['COUNT(*) does not work with JOIN', 'A student can take several courses of the same department, and should be counted once', 'DISTINCT makes the query faster', 'COUNT(*) counts NULL scores'],
          answer: 1,
          why: 'After the join, each enrollment is one row. A student with three Computer Science courses gives three rows. DISTINCT counts that student once.'
        }
      }
    ],
    pitfalls: [
      'Starting with tables before reading the requirements carefully. Underline nouns and verbs first.',
      'Turning an M:N relationship into a single FK column. M:N always needs a junction table.',
      'Leaving business rules only in application code. "No double-booking" belongs in a UNIQUE constraint.',
      'Choosing NoSQL "because it scales" for a small app with relational data. You lose joins, constraints and transactions for nothing.',
      'Trusting the ORM blindly. Turn on SQL logging in development and read what it sends.',
      'Stopping practice after the exam. Without review, most of this is forgotten within a month.'
    ],
    dialect: `<ul><li><strong>Auto-increment keys:</strong> SQLite <code>INTEGER PRIMARY KEY</code>; PostgreSQL <code>GENERATED ALWAYS AS IDENTITY</code> (or <code>SERIAL</code>); MySQL <code>AUTO_INCREMENT</code>; SQL Server <code>IDENTITY(1,1)</code>; Oracle 12c+ <code>GENERATED AS IDENTITY</code>.</li><li><strong>Date and time:</strong> SQLite stores text like <code>'2026-10-07 16:00'</code>; real servers have <code>DATE</code>, <code>TIMESTAMP</code> (PostgreSQL <code>timestamptz</code> stores time zones correctly), MySQL <code>DATETIME</code>, SQL Server <code>datetime2</code>.</li><li><strong>Enumerations:</strong> CHECK (status IN (...)) works everywhere; PostgreSQL also has <code>CREATE TYPE ... AS ENUM</code>, MySQL has <code>ENUM(...)</code> columns.</li><li><strong>Preventing overlapping time ranges</strong> (not just equal start times): PostgreSQL has exclusion constraints, e.g. <code>EXCLUDE USING gist (doctor_id WITH =, slot WITH &amp;&amp;)</code>.</li></ul>`,
    exercises: [
      {
        id: 'd14-1', level: 1, kind: 'script',
        prompt: '<p><strong>Capstone step 1.</strong> Create the first two tables of a small clinic.</p><ul class="spec"><li><b>Create:</b> <code>doctors(doctor_id, name, specialty)</code> and <code>patients(patient_id, name, phone, birth_date)</code></li><li><b>Keys:</b> <code>doctor_id</code> and <code>patient_id</code> are integer primary keys.</li><li><b>Rules:</b> <code>name</code> and <code>specialty</code> are required. <code>phone</code> is optional, but two patients cannot have the same phone. <code>birth_date</code> is optional (TEXT).</li></ul>',
        solution: C1,
        check: `SELECT m.name AS tbl, p.name AS col, p.pk, CASE WHEN p.pk > 0 THEN NULL ELSE p."notnull" END AS required,
  (SELECT COUNT(*) FROM pragma_index_list(m.name) il JOIN pragma_index_info(il.name) ii WHERE il."unique" = 1 AND ii.name = p.name AND il.origin <> 'pk') AS unique_idx
FROM sqlite_master m, pragma_table_info(m.name) p
WHERE m.type = 'table' AND m.name IN ('doctors', 'patients')
ORDER BY tbl, col;`,
        hints: ['Write two CREATE TABLE statements.', 'Required means NOT NULL. Optional but unique means UNIQUE without NOT NULL.', 'doctor_id INTEGER PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL ...'],
      explain: `<p><b>The idea:</b> Each table gets a primary key. Rules from the description become constraints: required means <code>NOT NULL</code>, and "no two the same" means <code>UNIQUE</code>.</p><p><b>How it works:</b> <code>doctor_id INTEGER PRIMARY KEY</code> identifies each doctor. <code>name</code> and <code>specialty</code> get <code>NOT NULL</code> because they are required. In <code>patients</code>, <code>phone TEXT UNIQUE</code> blocks two patients with one phone, but still allows NULL. <code>birth_date</code> has no constraint because it is optional.</p><p><b>Common mistake:</b> Writing <code>phone TEXT NOT NULL UNIQUE</code>. The description says the phone is optional, so NOT NULL is wrong here.</p>`
      },
      {
        id: 'd14-2', level: 2, kind: 'script',
        prompt: '<p><strong>Capstone step 2.</strong> The doctors and patients tables exist. Now create the appointments table.</p><ul class="spec"><li><b>Create:</b> <code>appointments(appt_id, patient_id, doctor_id, starts_at, status)</code></li><li><b>Keys:</b> <code>appt_id</code> is an integer primary key. <code>patient_id</code> and <code>doctor_id</code> are required foreign keys to their tables.</li><li><b>Rules:</b> <code>starts_at</code> is required TEXT. <code>status</code> is required, with default <code>\'booked\'</code>. It allows only <code>\'booked\'</code>, <code>\'done\'</code> or <code>\'cancelled\'</code>.</li><li><b>Note:</b> a doctor cannot have two appointments with the same <code>starts_at</code>.</li></ul>',
        setup: C1,
        solution: C2,
        check: `SELECT 'col' AS what, p.name AS a, CASE WHEN p.pk > 0 THEN 'pk' ELSE p."notnull" END AS b, CASE WHEN p.name = 'status' THEN replace(p.dflt_value, '"', '''') END AS c
FROM pragma_table_info('appointments') p
UNION ALL
SELECT 'fk', f."from", f."table", coalesce(f."to", f."from") FROM pragma_foreign_key_list('appointments') f
UNION ALL
SELECT 'uniq', group_concat(name, ','), NULL, NULL FROM (
  SELECT ii.name FROM pragma_index_list('appointments') il JOIN pragma_index_info(il.name) ii
  WHERE il."unique" = 1 AND il.origin <> 'pk' ORDER BY ii.name)
UNION ALL
SELECT 'check', (SELECT instr(sql, 'cancelled') > 0 AND instr(sql, 'done') > 0 FROM sqlite_master WHERE name = 'appointments'), NULL, NULL
ORDER BY what, a;`,
        hints: ['A foreign key: doctor_id INTEGER NOT NULL REFERENCES doctors(doctor_id).', "status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','done','cancelled'))", 'No double booking: add UNIQUE (doctor_id, starts_at) at the end of the column list.'],
      explain: `<p><b>The idea:</b> Appointments link a patient to a doctor. This is a 1:N relationship from each side, so the foreign keys go in <code>appointments</code>.</p><p><b>How it works:</b> <code>patient_id INTEGER NOT NULL REFERENCES patients(patient_id)</code> is a required foreign key. <code>doctor_id</code> works the same way. <code>status ... DEFAULT 'booked' CHECK (status IN ('booked','done','cancelled'))</code> fills a value when none is given and allows only three words. <code>UNIQUE (doctor_id, starts_at)</code> stops one doctor from having two appointments at the same time.</p><p><b>Common mistake:</b> Forgetting <code>NOT NULL</code> on the foreign keys. A foreign key alone still allows NULL, so you could save an appointment with no patient.</p>`
      },
      {
        id: 'd14-3', level: 2, kind: 'script',
        prompt: '<p><strong>Capstone step 3.</strong> Create the prescriptions table.</p><ul class="spec"><li><b>Create:</b> <code>prescriptions(appt_id, drug, dose)</code></li><li><b>Keys:</b> <code>appt_id</code> is a required foreign key to <code>appointments</code>. Each prescription belongs to one appointment.</li><li><b>Rules:</b> <code>drug</code> and <code>dose</code> are required.</li><li><b>Note:</b> the same drug cannot appear twice in one appointment. Make this rule the primary key of the table.</li></ul>',
        setup: C1 + '\n' + C2,
        solution: C3,
        check: `SELECT 'col' AS what, p.name AS a, p.pk > 0 AS b, p."notnull" OR p.pk > 0 AS c FROM pragma_table_info('prescriptions') p
UNION ALL
SELECT 'fk', f."from", f."table", coalesce(f."to", f."from") FROM pragma_foreign_key_list('prescriptions') f
ORDER BY what, a;`,
        hints: ['A primary key on two columns is written at the end: PRIMARY KEY (appt_id, drug).', 'appt_id INTEGER NOT NULL REFERENCES appointments(appt_id)'],
      explain: `<p><b>The idea:</b> A prescription belongs to one appointment, and one drug appears only once per appointment. So the pair <code>(appt_id, drug)</code> is the primary key: a composite key.</p><p><b>How it works:</b> <code>appt_id ... REFERENCES appointments(appt_id)</code> links each prescription to its appointment. <code>drug</code> and <code>dose</code> are <code>NOT NULL</code>. <code>PRIMARY KEY (appt_id, drug)</code> at the end makes the pair unique. The same drug can still appear in other appointments.</p><p><b>Common mistake:</b> Writing <code>drug TEXT PRIMARY KEY</code>. Then each drug could appear only once in the whole clinic, not once per appointment.</p>`
      },
      {
        id: 'd14-4', level: 2, kind: 'script',
        prompt: '<p><strong>Capstone step 4.</strong> The clinic tables and sample data are loaded. Today is 2026-10-01. Do three changes in one transaction.</p><ul class="spec"><li><b>Steps:</b> (1) Every <code>booked</code> appointment that started before <code>\'2026-10-01\'</code> becomes <code>done</code>. (2) Cancel appointment 9. (3) Book a new appointment: id 12, patient 2, doctor 4, at <code>\'2026-10-14 09:30\'</code>.</li><li><b>Note:</b> do not give a status to the new appointment. Let the default fill it.</li></ul>',
        setup: FULL,
        solution: `BEGIN;
UPDATE appointments SET status = 'done' WHERE status = 'booked' AND starts_at < '2026-10-01';
UPDATE appointments SET status = 'cancelled' WHERE appt_id = 9;
INSERT INTO appointments (appt_id, patient_id, doctor_id, starts_at) VALUES (12, 2, 4, '2026-10-14 09:30');
COMMIT;`,
        check: `SELECT appt_id, patient_id, doctor_id, starts_at, status FROM appointments ORDER BY appt_id;`,
        hints: ['Dates in YYYY-MM-DD HH:MM text compare correctly with <.', 'Only booked appointments become done. Appointment 4 is cancelled and must stay cancelled.', 'Leave status out of the INSERT column list, so the DEFAULT is used.'],
      explain: `<p><b>The idea:</b> Three changes that belong together go in one transaction. If any step fails, none of them is saved.</p><p><b>How it works:</b> <code>BEGIN</code> starts. The first UPDATE changes old booked appointments to done: <code>WHERE status = 'booked' AND starts_at &lt; '2026-10-01'</code>. The second UPDATE cancels appointment 9. The INSERT lists only four columns, so <code>status</code> gets its default, <code>'booked'</code>. <code>COMMIT</code> saves all three.</p><p><b>Common mistake:</b> Forgetting <code>status = 'booked'</code> in the first WHERE. Then cancelled appointments in the past become done too, which is wrong.</p>`
      },
      {
        id: 'd14-5', level: 3, kind: 'script',
        prompt: '<p><strong>Capstone step 5.</strong> The patient history page runs this query. It scans the whole table:</p><pre class="code">SELECT starts_at, status FROM appointments WHERE patient_id = 3 ORDER BY starts_at;</pre><ul class="spec"><li><b>Create:</b> one index so the plan becomes <code>SEARCH appointments USING ...</code>.</li></ul>',
        setup: FULL,
        solution: `CREATE INDEX idx_appt_patient ON appointments(patient_id, starts_at);`,
        plan: { query: `SELECT starts_at, status FROM appointments WHERE patient_id = 3 ORDER BY starts_at`, mustContain: 'SEARCH appointments USING' },
        hints: ['patient_id is a foreign key with no index yet.', 'Add starts_at as the second column. Then the index also gives the ORDER BY for free.'],
      explain: `<p><b>The idea:</b> The query filters on <code>patient_id</code> and sorts by <code>starts_at</code>. One index on both columns, in this order, helps with the filter and the sort.</p><p><b>How it works:</b> <code>CREATE INDEX idx_appt_patient ON appointments(patient_id, starts_at)</code> sorts rows by patient, then by time. The database finds patient 3 in the index. Its rows are already in time order, so no extra sort step is needed. The plan changes from <code>SCAN</code> to <code>SEARCH appointments USING INDEX</code>.</p><p><b>Common mistake:</b> Putting <code>starts_at</code> first: <code>(starts_at, patient_id)</code>. The WHERE uses <code>patient_id</code>, so by the leftmost-prefix rule this index cannot be used for the search.</p>`
      },
      {
        id: 'd14-6', level: 1,
        prompt: '<p><strong>Clinic query.</strong> The tables and data are loaded. List the <code>booked</code> appointments on or after <code>\'2026-10-01\'</code>.</p><ul class="spec"><li><b>Columns:</b> <code>starts_at</code>, <code>patient</code> (the patient name), <code>doctor</code> (the doctor name)</li><li><b>Order:</b> <code>starts_at</code> from early to late</li></ul>',
        setup: FULL,
        solution: `SELECT a.starts_at, p.name AS patient, d.name AS doctor
FROM appointments a JOIN patients p ON p.patient_id = a.patient_id JOIN doctors d ON d.doctor_id = a.doctor_id
WHERE a.status = 'booked' AND a.starts_at >= '2026-10-01' ORDER BY a.starts_at;`,
        ordered: true,
        hints: ['Join appointments to patients and to doctors.', "WHERE a.status = 'booked' AND a.starts_at >= '2026-10-01'", 'ORDER BY a.starts_at'],
      explain: `<p><b>The idea:</b> The appointment table holds only ids. Join it to <code>patients</code> and <code>doctors</code> to get the names, then filter and sort.</p><p><b>How it works:</b> <code>appointments a JOIN patients p ON p.patient_id = a.patient_id</code> adds the patient name. The second JOIN adds the doctor name. <code>WHERE a.status = 'booked' AND a.starts_at &gt;= '2026-10-01'</code> keeps future booked visits. <code>ORDER BY a.starts_at</code> lists them from early to late. Aliases <code>patient</code> and <code>doctor</code> name the columns.</p><p><b>Common mistake:</b> Forgetting <code>a.status = 'booked'</code>. Then cancelled and done appointments appear in the list too.</p>`
      },
      {
        id: 'd14-7', level: 2,
        prompt: '<p><strong>Clinic query.</strong> For every doctor, count the appointments that are not cancelled.</p><ul class="spec"><li><b>Columns:</b> <code>doctor</code> (the name), <code>active_appts</code> (the number of appointments that are not cancelled)</li><li><b>Note:</b> a doctor with no such appointments must show 0.</li></ul>',
        setup: FULL,
        solution: `SELECT d.name AS doctor, COUNT(a.appt_id) AS active_appts
FROM doctors d LEFT JOIN appointments a ON a.doctor_id = d.doctor_id AND a.status <> 'cancelled'
GROUP BY d.doctor_id, d.name;`,
        hints: ['LEFT JOIN keeps doctors with no appointments.', 'Put the status filter in the ON clause. In WHERE it would remove the doctors with no rows.', 'Use COUNT(a.appt_id), not COUNT(*).'],
      explain: `<p><b>The idea:</b> To keep doctors with 0 appointments, use a LEFT JOIN. Put the "not cancelled" filter in the ON clause, not in WHERE.</p><p><b>How it works:</b> <code>doctors d LEFT JOIN appointments a ON a.doctor_id = d.doctor_id AND a.status &lt;&gt; 'cancelled'</code> attaches only active appointments. A doctor with none still gets one row with NULLs. <code>COUNT(a.appt_id)</code> counts only real appointments, so that doctor shows 0. <code>GROUP BY d.doctor_id, d.name</code> makes one row per doctor.</p><p><b>Common mistake:</b> Writing <code>WHERE a.status &lt;&gt; 'cancelled'</code>. For a doctor with no appointments, status is NULL, and the WHERE removes that row. The LEFT JOIN becomes an inner join, and the 0 disappears.</p>`
      },
      {
        id: 'd14-8', level: 3,
        prompt: '<p><strong>Clinic query.</strong> Find patients who see <strong>more than one different doctor</strong>. Count only appointments that are not cancelled.</p><ul class="spec"><li><b>Columns:</b> <code>patient</code> (the name), <code>n_doctors</code> (the number of different doctors)</li></ul>',
        setup: FULL,
        solution: `SELECT p.name AS patient, COUNT(DISTINCT a.doctor_id) AS n_doctors
FROM patients p JOIN appointments a ON a.patient_id = p.patient_id
WHERE a.status <> 'cancelled'
GROUP BY p.patient_id, p.name HAVING COUNT(DISTINCT a.doctor_id) > 1;`,
        hints: ['Group by patient.', 'COUNT(DISTINCT doctor_id) counts different doctors.', 'Keep only the groups you want with HAVING ... > 1.'],
      explain: `<p><b>The idea:</b> Count the <em>different</em> doctors per patient with <code>COUNT(DISTINCT ...)</code>. Then keep patients with more than one, using HAVING.</p><p><b>How it works:</b> The JOIN links each patient to their appointments. <code>WHERE a.status &lt;&gt; 'cancelled'</code> ignores cancelled visits. <code>GROUP BY p.patient_id, p.name</code> makes one group per patient. <code>COUNT(DISTINCT a.doctor_id)</code> counts each doctor once, even with many visits. <code>HAVING ... &gt; 1</code> keeps patients who see 2 or more doctors.</p><p><b>Common mistake:</b> Writing <code>COUNT(a.doctor_id)</code> without DISTINCT. A patient with two visits to the same doctor would count as 2 and appear by mistake.</p>`
      },
      {
        id: 'd14-9', level: 2,
        prompt: '<p><strong>Final exam (university).</strong> Show each department that has at least 2 instructors.</p><ul class="spec"><li><b>Columns:</b> <code>department</code> (the name), <code>n_instructors</code>, <code>avg_salary</code> (rounded to a whole number)</li><li><b>Order:</b> <code>avg_salary</code> from high to low, then <code>department</code> A–Z</li></ul>',
        solution: `SELECT d.name AS department, COUNT(*) AS n_instructors, ROUND(AVG(i.salary)) AS avg_salary
FROM departments d JOIN instructors i ON i.dept_id = d.dept_id
GROUP BY d.dept_id, d.name HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC, department;`,
        ordered: true,
        hints: ['Join departments and instructors.', 'GROUP BY the department, HAVING COUNT(*) >= 2.', 'ROUND(AVG(i.salary)), then ORDER BY avg_salary DESC, department.'],
      explain: `<p><b>The idea:</b> Join departments to instructors, make one group per department, and keep groups with 2 or more people.</p><p><b>How it works:</b> <code>JOIN instructors i ON i.dept_id = d.dept_id</code> pairs each instructor with their department. <code>GROUP BY d.dept_id, d.name</code> makes one group per department. <code>COUNT(*)</code> counts instructors and <code>ROUND(AVG(i.salary))</code> gives the average, rounded. <code>HAVING COUNT(*) &gt;= 2</code> drops small departments. <code>ORDER BY avg_salary DESC, department</code> sorts the result.</p><p><b>Common mistake:</b> Using <code>WHERE COUNT(*) &gt;= 2</code>. WHERE cannot use aggregates. The filter on groups must go in HAVING.</p>`
      },
      {
        id: 'd14-10', level: 2,
        prompt: '<p><strong>Final exam.</strong> Find the students who have <strong>never</strong> enrolled in any section.</p><ul class="spec"><li><b>Columns:</b> <code>student_id</code>, <code>name</code></li></ul>',
        solution: `SELECT s.student_id, s.name FROM students s WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.student_id);`,
        hints: ['For "never" questions use NOT EXISTS, NOT IN, or LEFT JOIN ... IS NULL.', 'SELECT ... FROM students s WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.student_id)'],
      explain: `<p><b>The idea:</b> "Never enrolled" means there is no matching row in <code>enrollments</code>. <code>NOT EXISTS</code> tests exactly this, row by row.</p><p><b>How it works:</b> For each student <code>s</code>, the subquery looks for an enrollment with the same <code>student_id</code>. <code>SELECT 1</code> is enough, because only the existence of a row matters. If the subquery finds nothing, <code>NOT EXISTS</code> is true, and the student is kept.</p><p><b>Common mistake:</b> Using <code>NOT IN (SELECT student_id FROM enrollments)</code> on a column that can be NULL. One NULL in the list makes NOT IN return no rows. NOT EXISTS has no such problem. A LEFT JOIN with <code>IS NULL</code> also works.</p>`
      },
      {
        id: 'd14-11', level: 2,
        prompt: '<p><strong>Final exam.</strong> List every course that has prerequisites, with the title of each required course. Show one row for each pair.</p><ul class="spec"><li><b>Columns:</b> <code>course</code> (the course title), <code>prerequisite</code> (the title of the required course)</li></ul>',
        solution: `SELECT c.title AS course, pc.title AS prerequisite FROM prereqs p JOIN courses c ON c.course_id = p.course_id JOIN courses pc ON pc.course_id = p.prereq_id;`,
        hints: ['You need courses twice: once for the course, once for the prerequisite. Use two aliases.', 'prereqs links them: p.course_id and p.prereq_id.'],
      explain: `<p><b>The idea:</b> <code>prereqs</code> holds two course ids per row. To show two titles, join <code>courses</code> twice, with a different alias each time: a self join.</p><p><b>How it works:</b> <code>JOIN courses c ON c.course_id = p.course_id</code> finds the title of the course. <code>JOIN courses pc ON pc.course_id = p.prereq_id</code> finds the title of the required course. The SELECT names them <code>course</code> and <code>prerequisite</code>. Each row of <code>prereqs</code> becomes one row of the result.</p><p><b>Common mistake:</b> Joining <code>courses</code> only once. Then you cannot show two different titles in the same row.</p>`
      },
      {
        id: 'd14-12', level: 3,
        prompt: '<p><strong>Final exam.</strong> For each course, find the student with the highest score. Look at all sections of the course.</p><ul class="spec"><li><b>Columns:</b> <code>course_id</code>, <code>name</code>, <code>score</code></li><li><b>Note:</b> if two students share the top score, show both.</li><li><b>Note:</b> ignore NULL scores.</li></ul>',
        solution: `WITH ranked AS (
  SELECT s.course_id, st.name, e.score,
         RANK() OVER (PARTITION BY s.course_id ORDER BY e.score DESC) AS rnk
  FROM enrollments e JOIN sections s ON s.section_id = e.section_id JOIN students st ON st.student_id = e.student_id
  WHERE e.score IS NOT NULL
)
SELECT course_id, name, score FROM ranked WHERE rnk = 1;`,
        hints: ['You need the course of each enrollment: join enrollments to sections.', 'RANK() OVER (PARTITION BY course_id ORDER BY score DESC) gives 1 to the top score of each course. Ties share the same rank.', 'You cannot use a window function in WHERE. Compute it in a CTE or subquery first, then keep rnk = 1.'],
      explain: `<p><b>The idea:</b> "The best per group, including ties" is a job for <code>RANK()</code> with <code>PARTITION BY</code>. Then keep the rows with rank 1.</p><p><b>How it works:</b> The CTE <code>ranked</code> joins enrollments to sections (for <code>course_id</code>) and to students (for the name). <code>RANK() OVER (PARTITION BY s.course_id ORDER BY e.score DESC)</code> numbers the scores inside each course, the highest first. Students who tie get the same rank. The outer query keeps <code>rnk = 1</code>, so all top students are shown.</p><p><b>Common mistake:</b> Using <code>ROW_NUMBER()</code>. It gives different numbers to a tie, so only one of the top students appears. Filtering <code>WHERE rnk = 1</code> inside the CTE is also not allowed, because window functions run after WHERE.</p>`
      },
      {
        id: 'd14-13', level: 3,
        prompt: '<p><strong>Final exam.</strong> For every payment, show a running total for that student.</p><ul class="spec"><li><b>Columns:</b> <code>student_id</code>, <code>paid_on</code>, <code>amount</code>, <code>running_total</code></li><li><b>Note:</b> <code>running_total</code> is the sum of this student\'s payments up to this one, including it, in date order.</li></ul>',
        solution: `SELECT student_id, paid_on, amount, SUM(amount) OVER (PARTITION BY student_id ORDER BY paid_on) AS running_total FROM payments;`,
        hints: ['A running total is a window SUM with ORDER BY inside OVER.', 'Start again for each student with PARTITION BY student_id.'],
      explain: `<p><b>The idea:</b> A running total is <code>SUM() OVER</code> with an ORDER BY. Each row adds its amount to the rows before it, and every row stays in the result.</p><p><b>How it works:</b> <code>PARTITION BY student_id</code> starts a new total for each student. <code>ORDER BY paid_on</code> adds the payments in date order. For each row, the window sums this payment and all earlier payments of the same student. Unlike GROUP BY, no rows are merged.</p><p><b>Common mistake:</b> Writing <code>SUM(amount) OVER (PARTITION BY student_id)</code> without ORDER BY. Then every row shows the student's full total, not a running total.</p>`
      },
      {
        id: 'd14-14', level: 3,
        prompt: '<p><strong>Final exam.</strong> Find the students whose average score is higher than the average of <strong>all</strong> graded enrollments.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>avg_score</code> (rounded to 1 decimal)</li><li><b>Order:</b> <code>avg_score</code> from high to low, then <code>name</code> A–Z</li></ul>',
        solution: `SELECT s.name, ROUND(AVG(e.score), 1) AS avg_score
FROM students s JOIN enrollments e ON e.student_id = s.student_id
WHERE e.score IS NOT NULL
GROUP BY s.student_id, s.name
HAVING AVG(e.score) > (SELECT AVG(score) FROM enrollments)
ORDER BY avg_score DESC, s.name;`,
        ordered: true,
        hints: ['Find each student\'s average with GROUP BY.', 'Compare it to one value from a subquery: (SELECT AVG(score) FROM enrollments). AVG skips NULLs.', 'A condition on an aggregate goes in HAVING. Compare the average before rounding.'],
      explain: `<p><b>The idea:</b> Compare each student's average with one number: the average of all graded enrollments. A scalar subquery in HAVING gives that number.</p><p><b>How it works:</b> The JOIN and <code>WHERE e.score IS NOT NULL</code> keep graded enrollments. <code>GROUP BY s.student_id, s.name</code> makes one group per student. <code>(SELECT AVG(score) FROM enrollments)</code> returns one number for the whole table. AVG ignores NULL scores, so it uses graded enrollments only. <code>HAVING AVG(e.score) &gt; (...)</code> keeps students above it.</p><p><b>Common mistake:</b> Comparing the rounded value: <code>HAVING ROUND(AVG(e.score), 1) &gt; ...</code>. Rounding can push a student over or under the line. Compare the exact average and round only in the SELECT.</p>`
      }
    ],
    quiz: [
      { id: 'd14-q1', q: 'Students take many courses, and courses have many students. How do you model this?', options: ['A course_id column in students', 'A student_id column in courses', 'A junction table with student_id and course_id', 'One table with all columns'], answer: 2, why: 'Many-to-many (M:N) always needs a junction table. Its key combines both foreign keys.' },
      { id: 'd14-q2', q: 'Table R(A, B, C) has key A and the dependency B → C. Which normal form does it break?', options: ['1NF', '2NF', '3NF', 'None'], answer: 2, why: 'C depends on B, and B is not a key. That is a transitive dependency: A → B → C. The key has one column, so 2NF is fine, but 3NF breaks.' },
      { id: 'd14-q3', q: 'SELECT dept_id, COUNT(*) FROM students WHERE COUNT(*) > 5 GROUP BY dept_id; What is wrong?', options: ['Nothing', 'You cannot use an aggregate in WHERE; use HAVING', 'GROUP BY must come before WHERE', 'COUNT(*) needs a column name'], answer: 1, why: 'WHERE filters rows before grouping, so group counts do not exist yet. Filter groups with HAVING.' },
      { id: 'd14-q4', q: 'Which ACID property makes sure a committed transfer survives a power failure?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 3, why: 'Durability. Databases usually do this with a write-ahead log that is saved to disk at commit.' },
      { id: 'd14-q5', q: 'There is an index on (last_name, first_name). Which query gets the most help from it?', options: ["WHERE first_name = 'Ali'", "WHERE last_name = 'Haddad' AND first_name = 'Layla'", "WHERE upper(last_name) = 'HADDAD'", "WHERE first_name LIKE '%a'"], answer: 1, why: 'It uses both columns, starting from the left. The others skip the first column or put a function on it.' },
      { id: 'd14-q6', q: 'You LEFT JOIN departments to instructors, then add WHERE i.salary > 80000. What happens to departments with no instructors?', options: ['They appear with NULLs', 'They disappear, because NULL > 80000 is not true', 'They appear twice', 'The query fails'], answer: 1, why: 'WHERE removes rows where salary is NULL. This turns the LEFT JOIN into an inner join. Put such conditions in ON.' },
      { id: 'd14-q7', q: 'T1 reads a row. T2 changes it and commits. T1 reads it again and sees a different value. Which is the lowest level that stops this?', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'], answer: 2, why: 'This is a non-repeatable read. REPEATABLE READ is the first level that stops it.' },
      { id: 'd14-q8', q: 'In an ER diagram, what is a weak entity?', options: ['It has few attributes', 'Its own attributes cannot identify it; it depends on an owner entity', 'It has no relationships', 'It is optional in every relationship'], answer: 1, why: 'The key of a weak entity includes the key of its owner. Example: an apartment number inside a building.' },
      { id: 'd14-q9', q: 'Which sentence about COUNT is true?', options: ['COUNT(*) skips NULL rows', 'COUNT(col) counts rows where col is not NULL', 'COUNT(DISTINCT col) counts NULL as a value', 'COUNT(col) and COUNT(*) always give the same result'], answer: 1, why: 'COUNT(*) counts all rows. COUNT(col) skips NULLs. COUNT(DISTINCT col) also skips NULLs.' },
      { id: 'd14-q10', q: 'A new company builds an online shop with customers, orders and payments. Money must always be correct. What is the best default choice?', options: ['A key-value store', 'A graph database', 'A relational database such as PostgreSQL', 'Plain JSON files'], answer: 2, why: 'Related data, joins, constraints and ACID transactions are what relational databases do best.' }
    ],
    teach: 'You are given the requirement: "A doctor cannot have two appointments at the same time, and a patient cannot receive the same drug twice in one appointment." Explain how you enforce both rules in the schema, and why the database is a better place for them than the application code.',
    rubric: 'UNIQUE (doctor_id, starts_at) on appointments; primary key or UNIQUE (appt_id, drug) on prescriptions; the database enforces rules for every application and every user, even concurrent ones (two app servers booking at the same moment would both pass an application check: race condition); constraints are declarative and cannot be forgotten; optional: exclusion constraints for overlapping time ranges in PostgreSQL.'
  });
})();
