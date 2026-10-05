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
    });
    return parts.join('\nUNION ALL\n') + '\nORDER BY 1, 2, 3, 4;';
  }

  function box(x, y, name, key) {
    return `<rect x="${x}" y="${y}" width="160" height="56" rx="4" fill="var(--surface)" stroke="var(--line)" stroke-width="1.5"/>
<text x="${x + 12}" y="${y + 23}" font-size="14" font-weight="700" fill="var(--ink)">${name}</text>
<text x="${x + 12}" y="${y + 43}" font-size="11" fill="var(--muted)">${key}</text>`;
  }
  function edge(d) {
    return `<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.4" marker-start="url(#d9-one)" marker-end="url(#d9-many)"/>`;
  }
  function label(x, y, t, anchor) {
    return `<text x="${x}" y="${y}" font-size="11" fill="var(--accent)" text-anchor="${anchor || 'middle'}">${t}</text>`;
  }

  var ERD = `<figure class="diagram"><svg viewBox="0 0 830 440" role="img" aria-label="Crow's foot diagram of the university database">
<defs>
<marker id="d9-one" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M4,1 V11 M8,1 V11" fill="none" stroke="var(--ink)" stroke-width="1.5"/></marker>
<marker id="d9-many" viewBox="0 0 12 12" refX="12" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,6 L12,0 M0,6 L12,6 M0,6 L12,12" fill="none" stroke="var(--ink)" stroke-width="1.5"/></marker>
</defs>
${edge('M220,68 H170')}${label(195, 60, 'pays')}
${edge('M430,68 H380')}${label(405, 60, 'major')}
${edge('M590,68 H640')}${label(615, 60, 'works in')}
${edge('M720,40 V16 H300 V40')}${label(510, 11, 'advises')}
${edge('M800,56 H820 V84 H800')}${label(812, 108, 'mentors')}
${edge('M510,96 V200')}${label(518, 152, 'offers', 'start')}
${edge('M720,96 V200')}${label(728, 152, 'teaches', 'start')}
${edge('M590,228 H640')}${label(615, 220, 'has')}
${edge('M720,256 V330')}${label(728, 297, 'contains', 'start')}
${edge('M300,96 V420 H720 V386')}${label(510, 414, 'enrolls')}
${edge('M480,256 V330')}${label(472, 297, 'course_id', 'end')}
${edge('M540,256 V330')}${label(548, 297, 'prereq_id', 'start')}
${box(10, 40, 'payments', 'PK payment_id')}
${box(220, 40, 'students', 'PK student_id')}
${box(430, 40, 'departments', 'PK dept_id')}
${box(640, 40, 'instructors', 'PK instructor_id')}
${box(430, 200, 'courses', 'PK course_id')}
${box(640, 200, 'sections', 'PK section_id')}
${box(430, 330, 'prereqs', 'PK (course, prereq)')}
${box(640, 330, 'enrollments', 'PK (student, section)')}
</svg></figure>
<p>Read each line from the double bar (one) to the crow's foot (many). The double bar means "exactly one" and the three-pronged foot means "many". Full crow's-foot notation also draws a circle for "zero": <code>o&lt;</code> is zero-or-many, <code>|&lt;</code> is one-or-many.</p>`;

LAB.days.push({
  n: 9,
  week: 2,
  tag: 'ER',
  title: 'Entity-Relationship Modeling',
  hours: 2.5,
  goals: [
    'Read and draw ER diagrams in Chen and crow\'s-foot notation',
    'Classify attributes, relationships, cardinality and participation',
    'Map any ER diagram to tables with the 7-step algorithm',
    'Model weak entities, multivalued attributes and specialization'
  ],
  lesson: [
    {
      h: 'Design before you build',
      html: `<p>Changing a table full of data is expensive. Changing a drawing is free. So database design moves through three levels, and the ER model is the first one:</p>
<ol class="steps"><li><strong>Conceptual</strong>: what things exist and how they relate (the ER diagram). No SQL yet.</li><li><strong>Logical</strong>: tables, columns, keys, foreign keys (today's mapping step).</li><li><strong>Physical</strong>: data types, indexes, storage for one specific DBMS (Day 12).</li></ol>
<p>The ER model was introduced by Peter Chen in 1976. It has only three building blocks: <strong>entities</strong>, <strong>attributes</strong> and <strong>relationships</strong>. A good trick for finding them in a text description: nouns become entities or attributes, verbs become relationships.</p>`
    },
    {
      h: 'Entities and the five kinds of attributes',
      html: `<p>An <strong>entity type</strong> is a kind of thing we store facts about (Student). An <strong>entity</strong> is one of them (Ahmed). Attributes describe entities, and exams expect you to name their kind:</p>
<table class="mini"><thead><tr><th>Kind</th><th>Meaning</th><th>Example</th><th>Chen symbol</th></tr></thead><tbody>
<tr><td>Simple</td><td>Cannot be split</td><td>year</td><td>oval</td></tr>
<tr><td>Composite</td><td>Made of parts</td><td>address = street + city + zip</td><td>oval with sub-ovals</td></tr>
<tr><td>Multivalued</td><td>Can hold several values</td><td>phone numbers</td><td>double oval</td></tr>
<tr><td>Derived</td><td>Computed from other data</td><td>age (from birth_date)</td><td>dashed oval</td></tr>
<tr><td>Key</td><td>Identifies the entity</td><td>student_id</td><td>underlined</td></tr>
</tbody></table>
<p>Derived attributes are usually <strong>not stored</strong>. You compute them when you query, so they can never go out of date:</p>`,
      sql: `SELECT name, birth_date,
       CAST((julianday('2026-10-05') - julianday(birth_date)) / 365.25 AS INTEGER) AS age
FROM students
ORDER BY birth_date
LIMIT 5;`
    },
    {
      h: 'Relationships and their degree',
      html: `<p>A <strong>relationship</strong> connects entities: a student <em>enrolls in</em> a section. Its <strong>degree</strong> is the number of entity types taking part:</p>
<ul><li><strong>Binary</strong> (degree 2): student — section. Most relationships are binary.</li>
<li><strong>Recursive</strong> or unary (degree 1): an entity type related to itself. Instructor <em>mentors</em> instructor; course <em>requires</em> course. Each side gets a <strong>role name</strong> (mentor, mentee).</li>
<li><strong>Ternary</strong> (degree 3): instructor teaches course in a room. Use it only when the fact really needs all three at once.</li></ul>
<p>A relationship can also have its own attributes. <code>grade</code> belongs neither to the student nor to the section; it belongs to the relationship between them.</p>`,
      sql: `-- The recursive "mentors" relationship, read with a self join
SELECT mentee.name AS instructor, mentor.name AS mentor
FROM instructors AS mentee
JOIN instructors AS mentor ON mentor.instructor_id = mentee.mentor_id;`
    },
    {
      h: 'Cardinality: 1:1, 1:N, M:N',
      html: `<p>The <strong>cardinality ratio</strong> says how many entities on one side can be linked to one entity on the other side. Always read it in both directions:</p>
<table class="mini"><thead><tr><th>Ratio</th><th>Read as</th><th>In our data</th></tr></thead><tbody>
<tr><td>1:1</td><td>one A has at most one B, and one B has at most one A</td><td>a department and its head (if we stored one)</td></tr>
<tr><td>1:N</td><td>one A has many B, one B has at most one A</td><td>department — instructors</td></tr>
<tr><td>M:N</td><td>one A has many B, one B has many A</td><td>students — sections (through enrollments)</td></tr>
</tbody></table>
<p>To decide, ask two questions: "Can one department have many instructors?" (yes) and "Can one instructor belong to many departments?" (in our design, no). Yes + no = 1:N.</p>`,
      predict: {
        q: "In this database, what is the cardinality between <strong>students</strong> and <strong>sections</strong>?",
        options: [
        "1:1",
        "1:N (one student, many sections)",
        "N:1 (many students, one section)",
        "M:N"
      ],
        answer: 3,
        why: "A student takes many sections. A section has many students. Tables cannot store M:N directly. So the junction table enrollments has one row per (student, section) pair."
      }
    },
    {
      h: 'Participation: must every entity take part?',
      html: `<p>Cardinality gives the <em>maximum</em>. <strong>Participation</strong> gives the <em>minimum</em>:</p>
<ul><li><strong>Total</strong> participation (Chen: double line; crow's foot: bar): every entity must take part. Every course must belong to a department, so <code>courses.dept_id</code> is <code>NOT NULL</code>.</li>
<li><strong>Partial</strong> participation (Chen: single line; crow's foot: circle): taking part is optional. An instructor may have no department, so <code>instructors.dept_id</code> allows NULL.</li></ul>
<p>Some books write both numbers together as (min, max): a course is in (1,1) department, a department offers (0,N) courses.</p>`,
      sql: `-- Partial participation in the data: instructors without a department,
-- and departments that employ nobody
SELECT 'instructor without department' AS finding, name FROM instructors WHERE dept_id IS NULL
UNION ALL
SELECT 'department without instructors', d.name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM instructors i WHERE i.dept_id = d.dept_id);`
    },
    {
      h: 'Weak entities',
      html: `<p>A <strong>weak entity</strong> cannot be identified by its own attributes. It depends on an <strong>owner</strong> entity through an <strong>identifying relationship</strong>. Its own part of the key is called the <strong>partial key</strong> (or discriminator).</p>
<p>Classic example: an order line. "Line 2" means nothing alone; "line 2 of order 5001" identifies it. Its key is (order_id, line_no). In Chen notation a weak entity has a double rectangle, its identifying relationship a double diamond, and its partial key a dashed underline.</p>
<p>A weak entity always has total participation in its identifying relationship, and it is usually deleted with its owner (ON DELETE CASCADE).</p>`,
      sql: `PRAGMA foreign_keys = ON;
CREATE TABLE orders (order_id INTEGER PRIMARY KEY, placed_on TEXT NOT NULL);
CREATE TABLE order_lines (
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  line_no  INTEGER NOT NULL,           -- partial key
  item     TEXT NOT NULL,
  qty      INTEGER NOT NULL,
  PRIMARY KEY (order_id, line_no)      -- owner key + partial key
);
INSERT INTO orders VALUES (5001, '2026-10-01'), (5002, '2026-10-02');
INSERT INTO order_lines VALUES (5001, 1, 'pen', 3), (5001, 2, 'book', 1), (5002, 1, 'pen', 10);
SELECT * FROM order_lines;`,
      predict: {
        q: "Which sentence about a weak entity is true?",
        options: [
        "It has no attributes",
        "Its primary key includes the key of its owner entity",
        "It always has a 1:1 relationship with its owner",
        "It must be stored in the same table as its owner"
      ],
        answer: 1,
        why: "A weak entity is identified by owner key + partial key. Its link to the owner is usually 1:N: one order has many order lines."
      }
    },
    {
      h: 'Two notations for the same model',
      html: `<p>Your exam may use <strong>Chen</strong> notation: rectangles for entities, ovals for attributes, diamonds for relationships, and 1/N/M written on the lines. Industry tools (and most of the internet) use <strong>crow's foot</strong> notation: each entity is a box that lists its columns, and the symbols at the ends of the lines show cardinality and participation.</p>
<p>Here is the university database you have been querying, in crow's foot notation:</p>
${ERD}`
    },
    {
      h: 'Mapping an ER diagram to tables: the 7 steps',
      html: `<p>This algorithm turns any ER diagram into a relational schema. Learn the steps in order. Exams ask for them by number.</p>
<ol class="steps">
<li><strong>Strong entity</strong> → its own table. Simple attributes become columns. A composite attribute becomes its parts (street, city, zip). Derived attributes are usually left out.</li>
<li><strong>Weak entity</strong> → its own table. Primary key = owner's key + partial key. The owner's key is also a foreign key, normally ON DELETE CASCADE.</li>
<li><strong>1:1 relationship</strong> → put a foreign key in one of the two tables (prefer the side with total participation) and make it UNIQUE.</li>
<li><strong>1:N relationship</strong> → put a foreign key on the <strong>N side</strong>. Many instructors, one department: <code>instructors.dept_id</code>.</li>
<li><strong>M:N relationship</strong> → a new <strong>junction table</strong> with both foreign keys. Its primary key is the pair. Relationship attributes (grade) live here.</li>
<li><strong>Multivalued attribute</strong> → a new table (owner key, value) with the pair as primary key.</li>
<li><strong>N-ary relationship</strong> (degree 3 or more) → a new table with a foreign key to every participant.</li></ol>`,
      sql: `-- The database keeps your relationships in its catalog.
-- pragma_foreign_key_list('t') lists the foreign keys of table t:
-- "from" is the column, "table" is the table it points to.
SELECT "from" AS column_name, "table" AS points_to, "to" AS target_column
FROM pragma_foreign_key_list('students');`,
      note: 'Change students to enrollments or sections to see their relationships. Each row is one line in the ER diagram.',
      predict: {
        q: "One department has many courses. Each course belongs to one department. Where does the foreign key go?",
        options: [
        "departments.course_id",
        "courses.dept_id",
        "A junction table department_courses",
        "Either side, it does not matter"
      ],
        answer: 1,
        why: "For 1:N, the foreign key goes on the N side. A course_id column in departments could hold only one course per department."
      }
    },
    {
      h: 'M:N in practice: the junction table',
      html: `<p><code>prereqs</code> is a junction table for a <em>recursive</em> M:N relationship: a course can require many courses and can be required by many courses. Both columns point to the same table, so you join <code>courses</code> twice, with two aliases.</p>`,
      sql: `SELECT c.course_id, c.title AS course, p.title AS requires
FROM prereqs r
JOIN courses c ON c.course_id = r.course_id
JOIN courses p ON p.course_id = r.prereq_id
ORDER BY c.course_id, p.title;`
    },
    {
      h: 'Specialization and generalization',
      html: `<p>Sometimes entity types share attributes. A <strong>superclass</strong> Person has name and email; the <strong>subclasses</strong> Student and Instructor add their own attributes. Going top-down is <em>specialization</em>; going bottom-up is <em>generalization</em>. Two constraints describe it:</p>
<ul><li><strong>Disjoint</strong> (a person is at most one subclass) or <strong>overlapping</strong> (a teaching assistant is both)</li>
<li><strong>Total</strong> (every person must be in a subclass) or <strong>partial</strong></li></ul>
<p>Three ways to store it:</p>
<table class="mini"><thead><tr><th>Option</th><th>Tables</th><th>Good when</th><th>Cost</th></tr></thead><tbody>
<tr><td>Single table</td><td>people(+ type column, + all subclass columns)</td><td>few subclass columns</td><td>many NULLs, weak constraints</td></tr>
<tr><td>Table per type</td><td>people + students + instructors, subclass PK = FK to people</td><td>clean design, overlapping allowed</td><td>joins to read a full row</td></tr>
<tr><td>Table per concrete class</td><td>students and instructors, each with all columns</td><td>subclasses queried separately</td><td>shared columns duplicated, hard to query "all people"</td></tr>
</tbody></table>`,
      sql: `CREATE TABLE people (person_id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE);
CREATE TABLE ta_students (person_id INTEGER PRIMARY KEY REFERENCES people(person_id), year INTEGER);
CREATE TABLE ta_staff    (person_id INTEGER PRIMARY KEY REFERENCES people(person_id), salary INTEGER);
INSERT INTO people VALUES (1, 'Rania', 'rania@uni.edu'), (2, 'Leo', 'leo@uni.edu');
INSERT INTO ta_students VALUES (1, 4);
INSERT INTO ta_staff VALUES (1, 12000), (2, 60000);   -- Rania is both: overlapping
SELECT p.name, s.year, f.salary
FROM people p
LEFT JOIN ta_students s ON s.person_id = p.person_id
LEFT JOIN ta_staff f ON f.person_id = p.person_id;`
    }
  ],
  pitfalls: [
    'Putting the foreign key on the "one" side of a 1:N relationship. It always goes on the N side.',
    'Trying to store M:N with a comma-separated list or with course1, course2, course3 columns. Use a junction table.',
    'Storing derived attributes such as age or a total. They go stale when the source data changes.',
    'Forgetting relationship attributes. grade belongs on enrollments, not on students or sections.',
    'Giving a weak entity its own global id and forgetting the owner key. Its identity is owner key + partial key.',
    'Confusing cardinality (maximum: 1 or N) with participation (minimum: 0 or 1).'
  ],
  dialect: `<ul><li>ER diagrams are independent of the DBMS. The mapping result is plain DDL that works almost everywhere.</li>
<li><strong>Tools:</strong> MySQL Workbench, pgAdmin ERD tool, dbdiagram.io, draw.io and Lucidchart all draw crow's-foot diagrams. Many can generate CREATE TABLE statements from the diagram, or reverse-engineer a diagram from an existing database.</li>
<li><strong>Reading the schema from SQL:</strong> SQLite <code>pragma_foreign_key_list('t')</code>; PostgreSQL, MySQL and SQL Server <code>information_schema.referential_constraints</code> and <code>key_column_usage</code>; Oracle <code>user_constraints</code>.</li>
<li><strong>Inheritance:</strong> PostgreSQL has a non-standard <code>CREATE TABLE child (...) INHERITS (parent)</code>. Most teams still prefer table-per-type with foreign keys.</li></ul>`,
  exercises: [
    {
      id: 'd9-1', level: 1,
      prompt: "<p>The database stores its foreign keys in a catalog. Read the foreign keys of <code>enrollments</code> with <code>pragma_foreign_key_list('enrollments')</code>.</p><ul class=\"spec\"><li><b>Columns:</b> <code>from_column</code> (the catalog column <code>\"from\"</code>), <code>to_table</code> (the catalog column <code>\"table\"</code>)</li></ul>",
      solution: `SELECT "from" AS from_column, "table" AS to_table FROM pragma_foreign_key_list('enrollments');`,
      hints: [
        "Use the pragma function like a table: SELECT ... FROM pragma_foreign_key_list('enrollments')",
        "from and table are SQL keywords. So put them in double quotes: \"from\", \"table\"."
      ],
      explain: "<p><b>The idea:</b> The database stores its own design in a catalog, and you can query it like a table. <code>pragma_foreign_key_list</code> returns the foreign keys of one table.</p><p><b>How it works:</b> <code>pragma_foreign_key_list('enrollments')</code> returns one row per foreign key. The column <code>\"from\"</code> is the local column. The column <code>\"table\"</code> is the table it points to. They are in double quotes because from and table are SQL keywords.</p><p><b>Common mistake:</b> Writing <code>SELECT from, table</code> without quotes. The database reads them as keywords and gives a syntax error.</p>"
    },
    {
      id: 'd9-2', level: 1,
      prompt: "<p>Some departments have no instructors. Find them.</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code></li></ul>",
      solution: `SELECT name FROM departments d WHERE NOT EXISTS (SELECT 1 FROM instructors i WHERE i.dept_id = d.dept_id);`,
      hints: [
        "You need the departments with no matching instructor row.",
        "NOT EXISTS (SELECT 1 FROM instructors i WHERE i.dept_id = d.dept_id)",
        "A LEFT JOIN with WHERE i.instructor_id IS NULL also works."
      ],
      explain: "<p><b>The idea:</b> In the ER diagram, a department's link to instructors is optional. \"No instructors\" means no matching row exists, which is <code>NOT EXISTS</code>.</p><p><b>How it works:</b> For each department, the inner query looks for an instructor with the same <code>dept_id</code>. If none is found, NOT EXISTS is TRUE and the department is kept.</p><p><b>Common mistake:</b> Using an INNER JOIN. It keeps only departments that do have instructors.</p>"
    },
    {
      id: 'd9-3', level: 2,
      prompt: "<p>The \"mentors\" relationship links instructors to other instructors. Show each instructor who has a mentor, with the mentor's name.</p><ul class=\"spec\"><li><b>Columns:</b> <code>instructor</code>, <code>mentor</code></li></ul>",
      solution: `SELECT i.name AS instructor, m.name AS mentor FROM instructors i JOIN instructors m ON m.instructor_id = i.mentor_id;`,
      hints: [
        "Use the instructors table twice, with two aliases.",
        "Join the instructor's mentor_id to the mentor's instructor_id.",
        "An inner JOIN drops the instructors without a mentor. That is what you want."
      ],
      explain: "<p><b>The idea:</b> \"Mentors\" is a recursive relationship: it links the instructors table to itself. So you join the table to itself.</p><p><b>How it works:</b> Alias <code>i</code> is the instructor and alias <code>m</code> is the mentor. <code>m.instructor_id = i.mentor_id</code> follows the foreign key to the mentor's row. Instructors without a mentor have no match, so the INNER JOIN leaves them out.</p><p><b>Common mistake:</b> Using one alias for both roles. The database cannot tell the instructor from the mentor.</p>"
    },
    {
      id: 'd9-4', level: 2,
      prompt: "<p>The <code>prereqs</code> table stores which course needs which other course (an M:N relationship). Show every pair with the course titles.</p><ul class=\"spec\"><li><b>Columns:</b> <code>course</code> (title of the course), <code>requires</code> (title of the course it needs)</li></ul>",
      solution: `SELECT c.title AS course, p.title AS requires
FROM prereqs r
JOIN courses c ON c.course_id = r.course_id
JOIN courses p ON p.course_id = r.prereq_id;`,
      hints: [
        "Start FROM prereqs. It holds the pairs.",
        "Join courses twice: once for course_id, once for prereq_id.",
        "Give the two copies aliases, for example c and p. Select c.title and p.title."
      ],
      explain: "<p><b>The idea:</b> prereqs is a junction table for an M:N relationship of courses with themselves. To read it, you join courses twice: once for each role.</p><p><b>How it works:</b> Alias <code>c</code> joins on <code>r.course_id</code> and gives the course title. Alias <code>p</code> joins on <code>r.prereq_id</code> and gives the title of the course it needs. Each prereqs row becomes one readable pair.</p><p><b>Common mistake:</b> Joining courses only once. Then both columns show the same title.</p>"
    },
    {
      id: 'd9-5', level: 2,
      prompt: "<p>How many students does each instructor advise?</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code>, <code>advisees</code> (the number of students they advise)</li><li><b>Order:</b> by <code>advisees</code>, most first. Then by <code>name</code>.</li><li><b>Note:</b> Show every instructor. An instructor who advises nobody shows 0.</li></ul>",
      solution: `SELECT i.name, COUNT(s.student_id) AS advisees
FROM instructors i LEFT JOIN students s ON s.advisor_id = i.instructor_id
GROUP BY i.instructor_id, i.name
ORDER BY advisees DESC, i.name;`,
      ordered: true,
      hints: [
        "\"Every instructor, 0 if none\" means LEFT JOIN from instructors.",
        "COUNT(s.student_id) counts only matched students. COUNT(*) would give 1 to instructors with no students.",
        "ORDER BY advisees DESC, name"
      ],
      explain: "<p><b>The idea:</b> \"Advises\" is a 1:N relationship with optional participation: some instructors advise nobody. To keep them, use a LEFT JOIN.</p><p><b>How it works:</b> <code>instructors LEFT JOIN students</code> keeps every instructor. <code>GROUP BY</code> makes one row per instructor. <code>COUNT(s.student_id)</code> counts only real students, so instructors with nobody show 0. <code>ORDER BY advisees DESC, i.name</code> puts the busiest first and breaks ties by name.</p><p><b>Common mistake:</b> Using <code>COUNT(*)</code>. It counts the empty NULL row, so instructors with no advisees show 1.</p>"
    },
    {
      id: 'd9-6', level: 3,
      prompt: "<p>Count the foreign keys of every table. This is the number of lines that leave each box in the ER diagram.</p><ul class=\"spec\"><li><b>Columns:</b> <code>table_name</code>, <code>fk_count</code> (the number of foreign-key columns, 0 if none)</li><li><b>Note:</b> Use the rows of <code>sqlite_master</code> where <code>type = 'table'</code>.</li><li><b>Note:</b> A pragma function can take a column of the outer table: <code>pragma_foreign_key_list(m.name)</code>.</li></ul>",
      solution: `SELECT m.name AS table_name, COUNT(f."from") AS fk_count
FROM sqlite_master m
LEFT JOIN pragma_foreign_key_list(m.name) f
WHERE m.type = 'table'
GROUP BY m.name;`,
      hints: [
        "FROM sqlite_master m. Keep only type = 'table'.",
        "LEFT JOIN pragma_foreign_key_list(m.name) f. You need no ON clause: the argument links them.",
        "GROUP BY m.name and COUNT(f.\"from\"), so tables without foreign keys show 0."
      ],
      explain: "<p><b>The idea:</b> Use the catalog to count foreign keys for every table. A LEFT JOIN keeps tables that have none.</p><p><b>How it works:</b> <code>sqlite_master</code> lists the tables, and <code>WHERE m.type = 'table'</code> keeps only real tables. <code>pragma_foreign_key_list(m.name)</code> runs once for each table name. The LEFT JOIN keeps a table even with no foreign keys. <code>COUNT(f.\"from\")</code> counts only real foreign keys, so those tables show 0.</p><p><b>Common mistake:</b> Using a plain JOIN. Tables with no foreign keys, like departments, disappear from the result.</p>"
    },
    {
      id: 'd9-7', level: 2, kind: 'script',
      prompt: "<p>Turn this library description into tables. Create exactly these three tables.</p><ul class=\"spec\"><li><b>Create:</b> <code>members</code>: <code>member_id</code> integer primary key, <code>name</code> required text, <code>email</code> required text, unique</li><li><b>Create:</b> <code>books</code>: <code>isbn</code> text primary key, <code>title</code> required text, <code>published_year</code> optional integer</li><li><b>Create:</b> <code>loans</code>: one row per loan (a member can borrow the same book many times). Columns: <code>loan_id</code> integer primary key, <code>member_id</code> required, foreign key to members, <code>isbn</code> required, foreign key to books, <code>loaned_on</code> required text, <code>returned_on</code> optional text</li></ul>",
      solution: `CREATE TABLE members (
  member_id INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE
);
CREATE TABLE books (
  isbn           TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  published_year INTEGER
);
CREATE TABLE loans (
  loan_id     INTEGER PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES members(member_id),
  isbn        TEXT NOT NULL REFERENCES books(isbn),
  loaned_on   TEXT NOT NULL,
  returned_on TEXT
);`,
      check: schemaCheck(['members', 'books', 'loans']),
      hints: [
        "Create the parent tables (members, books) before the child table (loans).",
        "Required = NOT NULL. The foreign keys in loans are required too.",
        "member_id INTEGER NOT NULL REFERENCES members(member_id)"
      ],
      explain: "<p><b>The idea:</b> Each entity becomes a table. A member borrows many books, and a book can be borrowed many times. Each loan is its own event, so loans gets its own id.</p><p><b>How it works:</b> <code>members</code> and <code>books</code> are strong entities with their own keys. <code>UNIQUE</code> on email stops two members from sharing one email. <code>loans</code> has two foreign keys, one to each side. Its key is <code>loan_id</code>, not the pair. So the same member can borrow the same book again later. <code>returned_on</code> stays NULL until the book comes back.</p><p><b>Common mistake:</b> Using <code>PRIMARY KEY (member_id, isbn)</code> for loans. Then a member could never borrow the same book twice.</p>"
    },
    {
      id: 'd9-8', level: 3, kind: 'script',
      setup: `CREATE TABLE books (isbn TEXT PRIMARY KEY, title TEXT NOT NULL);
INSERT INTO books VALUES ('978-0131873254', 'Database Systems'), ('978-1449373320', 'Designing Data-Intensive Applications');`,
      prompt: "<p>A <code>books(isbn, title)</code> table exists. A book can have many authors, and an author can write many books. Create two tables, then add the data.</p><ul class=\"spec\"><li><b>Create:</b> <code>authors</code>: <code>author_id</code> integer primary key, <code>name</code> required text</li><li><b>Create:</b> <code>book_authors</code>: <code>isbn</code> (foreign key to books), <code>author_id</code> (foreign key to authors), <code>author_order</code> required integer (1 = first author). The primary key is the pair (isbn, author_id).</li><li><b>Then:</b> insert the authors <code>1 Hector Garcia-Molina</code>, <code>2 Jeffrey Ullman</code>, <code>3 Jennifer Widom</code>, <code>4 Martin Kleppmann</code>.</li><li><b>Then:</b> link them: authors 1, 2 and 3 (in that order) wrote <code>978-0131873254</code>. Author 4 wrote <code>978-1449373320</code>.</li></ul>",
      solution: `CREATE TABLE authors (author_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE book_authors (
  isbn         TEXT REFERENCES books(isbn),
  author_id    INTEGER REFERENCES authors(author_id),
  author_order INTEGER NOT NULL,
  PRIMARY KEY (isbn, author_id)
);
INSERT INTO authors VALUES (1, 'Hector Garcia-Molina'), (2, 'Jeffrey Ullman'), (3, 'Jennifer Widom'), (4, 'Martin Kleppmann');
INSERT INTO book_authors VALUES
  ('978-0131873254', 1, 1), ('978-0131873254', 2, 2), ('978-0131873254', 3, 3),
  ('978-1449373320', 4, 1);`,
      check: schemaCheck(['authors', 'book_authors']).replace(/\nORDER BY[^]*$/, '') + `
UNION ALL
SELECT 'data', 'link', b.title, a.name, ba.author_order
FROM book_authors ba JOIN books b ON b.isbn = ba.isbn JOIN authors a ON a.author_id = ba.author_id
ORDER BY 1, 2, 3, 4;`,
      hints: [
        "M:N → a junction table with both foreign keys.",
        "The key on two columns goes on its own line: PRIMARY KEY (isbn, author_id)",
        "Insert into authors before book_authors. Otherwise the foreign keys fail."
      ],
      explain: "<p><b>The idea:</b> Books and authors are M:N, so they need a junction table. Extra facts about the pair, like the author order, live in the junction table.</p><p><b>How it works:</b> <code>authors</code> is a simple entity table. <code>book_authors</code> has a foreign key to each side. Its key is the pair <code>(isbn, author_id)</code>. <code>author_order</code> belongs to the pair: the same author can be first on one book and third on another. The INSERTs add the authors first, then the links, because links must point to existing rows.</p><p><b>Common mistake:</b> Putting <code>author_order</code> in the authors table. An author would then have one order for every book.</p>"
    },
    {
      id: 'd9-9', level: 3, kind: 'script',
      prompt: "<p>A student can have several phone numbers. This is a <strong>multivalued attribute</strong>. Store it in its own table (mapping step 6).</p><ul class=\"spec\"><li><b>Create:</b> <code>student_phones</code> with <code>student_id</code> (foreign key to students) and <code>phone</code> (text). The pair is the primary key.</li><li><b>Note:</b> If a student is deleted, delete their phone numbers too.</li><li><b>Then:</b> store two numbers for student <code>1001</code> (<code>+964 770 111 2222</code>, <code>+964 750 333 4444</code>) and one for student <code>1002</code> (<code>+20 100 555 6666</code>).</li></ul>",
      solution: `CREATE TABLE student_phones (
  student_id INTEGER REFERENCES students(student_id) ON DELETE CASCADE,
  phone      TEXT,
  PRIMARY KEY (student_id, phone)
);
INSERT INTO student_phones VALUES
  (1001, '+964 770 111 2222'), (1001, '+964 750 333 4444'), (1002, '+20 100 555 6666');`,
      check: schemaCheck(['student_phones'], { onDelete: true }).replace(/\nORDER BY[^]*$/, '') + `
UNION ALL
SELECT 'data', 'row', student_id, phone, NULL FROM student_phones
ORDER BY 1, 2, 3, 4;`,
      hints: [
        "Multivalued attribute → a table (owner key, value).",
        "PRIMARY KEY (student_id, phone) stops the same number being stored twice.",
        "REFERENCES students(student_id) ON DELETE CASCADE"
      ],
      explain: "<p><b>The idea:</b> A column cannot hold a list. A multivalued attribute (several phones) gets its own table, with one row per value.</p><p><b>How it works:</b> <code>student_phones</code> stores one phone per row. Its key is the pair <code>(student_id, phone)</code>, so one student can have many different numbers. <code>ON DELETE CASCADE</code> removes the phones when the student is deleted. The INSERT adds three rows: two for 1001 and one for 1002.</p><p><b>Common mistake:</b> Making <code>student_id</code> alone the key. Then each student could store only one phone.</p>"
    },
    {
      id: 'd9-10', level: 3, kind: 'script',
      prompt: "<p>Model a clinic. A <strong>visit</strong> is a weak entity: it belongs to a patient. Visits are numbered 1, 2, 3 … for each patient separately.</p><ul class=\"spec\"><li><b>Create:</b> <code>patients</code>: <code>patient_id</code> integer primary key, <code>name</code> required text</li><li><b>Create:</b> <code>visits</code>: <code>patient_id</code> (foreign key to patients), <code>visit_no</code> integer (the partial key), <code>visit_date</code> required text, <code>reason</code> optional text</li><li><b>Note:</b> When a patient is deleted, delete their visits too. Choose the primary key that a weak entity needs.</li></ul>",
      solution: `CREATE TABLE patients (patient_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE visits (
  patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE,
  visit_no   INTEGER,
  visit_date TEXT NOT NULL,
  reason     TEXT,
  PRIMARY KEY (patient_id, visit_no)
);`,
      check: schemaCheck(['patients', 'visits'], { onDelete: true }),
      hints: [
        "A weak entity's key = owner key + partial key.",
        "PRIMARY KEY (patient_id, visit_no)",
        "\"Delete their visits too\" means ON DELETE CASCADE."
      ],
      explain: "<p><b>The idea:</b> A weak entity has no full key of its own. Its key is the owner's key plus its own partial key.</p><p><b>How it works:</b> <code>patients</code> is the owner, with its own key. In <code>visits</code>, <code>visit_no</code> repeats for each patient (1, 2, 3 …). So the key is <code>(patient_id, visit_no)</code>. <code>ON DELETE CASCADE</code> removes the visits with their patient, because a visit cannot exist alone.</p><p><b>Common mistake:</b> Making <code>visit_no</code> alone the primary key. Two patients could not both have visit number 1.</p>"
    }
  ],
  quiz: [
    { id: 'd9-q1', q: "In Chen notation, what does a double oval show?", options: [
        "A key attribute",
        "A derived attribute",
        "A multivalued attribute",
        "A weak entity"
      ], answer: 2, why: "Double oval = multivalued. Dashed oval = derived. Underlined = key. Double rectangle = weak entity." },
    { id: 'd9-q2', q: "Students and courses have an M:N relationship with the attribute grade. How many tables does the mapping make?", options: [
        "2",
        "3",
        "4",
        "1"
      ], answer: 1, why: "students, courses, and one junction table (student_id, course_id, grade). The pair is its primary key." },
    { id: 'd9-q3', q: "An employee manages at most one department. Every department has exactly one manager. Where should the foreign key go?", options: [
        "employees.managed_dept_id",
        "departments.manager_id (NOT NULL, UNIQUE)",
        "A junction table",
        "Both tables"
      ], answer: 1, why: "For 1:1, put the foreign key on the side where every row takes part. Every department has a manager, so departments.manager_id can be NOT NULL. UNIQUE keeps it 1:1. On the employee side, most rows would be NULL." },
    { id: 'd9-q4', q: "A weak entity DEPENDENT (name, birth_date) belongs to EMPLOYEE (emp_id). What is the primary key of the DEPENDENT table?", options: [
        "name",
        "emp_id",
        "(emp_id, name)",
        "A new dependent_id only"
      ], answer: 2, why: "Owner key + partial key. name is the partial key: it is unique only among the dependents of one employee." },
    { id: 'd9-q5', q: "\"Every section must have an instructor, but an instructor may teach no sections.\" What is the participation of SECTION in TEACHES?", options: [
        "Partial",
        "Total",
        "Recursive",
        "Derived"
      ], answer: 1, why: "Every section takes part, so it is total. In Chen notation that is a double line. In SQL it is a NOT NULL foreign key. The instructor side is partial." },
    { id: 'd9-q6', q: "Person has two subclasses: Student and Employee. A teaching assistant is both. What kind of specialization is this?", options: [
        "Disjoint",
        "Overlapping",
        "Weak",
        "Ternary"
      ], answer: 1, why: "Overlapping means one entity can be in more than one subclass. One table per type handles this well." },
    { id: 'd9-q7', q: "Which attribute should usually NOT be stored as a column?", options: [
        "birth_date",
        "age",
        "email",
        "student_id"
      ], answer: 1, why: "age comes from birth_date and today's date. A stored age is wrong one year later." },
    { id: 'd9-q8', q: "What is the degree of the relationship \"course requires course\"?", options: [
        "0",
        "1 (unary / recursive)",
        "2",
        "M:N"
      ], answer: 1, why: "Degree counts entity types. Only COURSE takes part, in two roles. Its cardinality is M:N, which is a different thing." }
  ],
  teach: 'You are given an ER diagram with a 1:N relationship, an M:N relationship with an attribute, and a multivalued attribute. Explain how each one becomes tables, and why the foreign key of a 1:N relationship goes on the N side.',
  rubric: '1:N → FK column on the N-side table referencing the 1-side PK (an FK column holds one value, so it can only point to one parent; putting it on the 1 side would need many values); M:N → junction table with both FKs, composite PK of the pair, relationship attribute stored there; multivalued → separate table (owner key, value) with composite PK; mentions NOT NULL for total participation; concrete example.'
});
})();
