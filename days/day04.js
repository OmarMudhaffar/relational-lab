LAB.days.push({
  n: 4,
  week: 1,
  tag: 'JOIN',
  title: 'Joining Tables',
  hours: 3,
  goals: [
    'Explain a join as "every combination, then keep the matches"',
    'Write INNER joins across three or four tables using aliases',
    'Use LEFT JOIN to keep unmatched rows and to find missing data',
    'Join a table to itself and combine joins with GROUP BY'
  ],
  lesson: [
    {
      h: 'Why joins exist: a filtered Cartesian product',
      html: `<p>A good design stores each fact once. The student row stores <code>dept_id = 7</code>, not the text "Electrical Engineering". The name of the department lives in <code>departments</code>. This avoids copies that can disagree. The price is that a question like "show each student with the name of their department" needs data from <strong>two</strong> tables. A <strong>join</strong> puts them back together.</p>
<p>Think of a join in two steps:</p>
<ol class="steps"><li>Pair <strong>every</strong> row of table A with <strong>every</strong> row of table B. This is the <em>Cartesian product</em> (<code>CROSS JOIN</code>). 40 students × 8 departments = 320 pairs.</li><li>Keep only the pairs where the <code>ON</code> condition is TRUE, for example <code>s.dept_id = d.dept_id</code>.</li></ol>
<p>The engine does not really build all 320 pairs (it is much smarter), but the <strong>result</strong> is always the same as these two steps. If you forget the ON condition, you get the full product, which is almost always a bug.</p>`,
      sql: `SELECT COUNT(*) AS pairs
FROM students
CROSS JOIN departments;`,
      predict: {
        sql: 'SELECT COUNT(*) FROM courses CROSS JOIN departments;',
        q: 'There are 23 courses and 8 departments. How many rows does a CROSS JOIN return?',
        options: ['23', '31', '184', '8'],
        answer: 2,
        why: 'Each course is paired with each department: 23 × 8 = 184.'
      }
    },
    {
      h: 'INNER JOIN ... ON',
      html: `<p>An <code>INNER JOIN</code> (or just <code>JOIN</code>) keeps only rows that have a match on both sides. Give each table a short <strong>alias</strong> (<code>s</code>, <code>d</code>) and prefix columns with it. A prefix is required when both tables have a column with the same name, like <code>dept_id</code> or <code>name</code> here.</p>
<figure class="diagram"><svg viewBox="0 0 600 230" role="img" aria-label="Three students joined to three departments. Ahmed matches Electrical Engineering, Noor matches Biology. Adam has no department and Philosophy has no students.">
<g font-size="13" fill="var(--ink)">
<text x="20" y="22" font-weight="700">students</text>
<text x="400" y="22" font-weight="700">departments</text>
<rect x="20" y="34" width="180" height="26" fill="var(--bg2)" stroke="var(--line)"/>
<text x="30" y="52" fill="var(--muted)">name</text><text x="140" y="52" fill="var(--muted)">dept_id</text>
<rect x="20" y="60" width="180" height="30" fill="var(--surface)" stroke="var(--line)"/>
<text x="30" y="80">Ahmed</text><text x="150" y="80">7</text>
<rect x="20" y="90" width="180" height="30" fill="var(--surface)" stroke="var(--line)"/>
<text x="30" y="110">Noor</text><text x="150" y="110">4</text>
<rect x="20" y="120" width="180" height="30" fill="var(--surface)" stroke="var(--bad)" stroke-dasharray="4 3"/>
<text x="30" y="140">Adam</text><text x="150" y="140" fill="var(--muted)">NULL</text>
<rect x="400" y="34" width="180" height="26" fill="var(--bg2)" stroke="var(--line)"/>
<text x="410" y="52" fill="var(--muted)">dept_id</text><text x="480" y="52" fill="var(--muted)">name</text>
<rect x="400" y="60" width="180" height="30" fill="var(--surface)" stroke="var(--line)"/>
<text x="415" y="80">4</text><text x="480" y="80">Biology</text>
<rect x="400" y="90" width="180" height="30" fill="var(--surface)" stroke="var(--line)"/>
<text x="415" y="110">7</text><text x="480" y="110">Elec. Eng.</text>
<rect x="400" y="120" width="180" height="30" fill="var(--surface)" stroke="var(--bad)" stroke-dasharray="4 3"/>
<text x="415" y="140">8</text><text x="480" y="140">Philosophy</text>
<line x1="200" y1="75" x2="400" y2="105" stroke="var(--ok)" stroke-width="2.5"/>
<line x1="200" y1="105" x2="400" y2="75" stroke="var(--ok)" stroke-width="2.5"/>
<text x="20" y="178" fill="var(--ok)" font-weight="700">INNER JOIN</text><text x="120" y="178">2 rows: Ahmed–Elec. Eng., Noor–Biology</text>
<text x="20" y="200" fill="var(--accent)" font-weight="700">LEFT JOIN</text><text x="120" y="200">3 rows: the 2 matches + Adam with NULL department</text>
<text x="20" y="222" fill="var(--accent)" font-weight="700">FULL JOIN</text><text x="120" y="222">4 rows: + Philosophy with NULL student</text>
</g></svg></figure>
<p>Green lines are matches. Dashed rows have no partner. INNER JOIN drops them. Outer joins keep them and fill the missing side with NULL.</p>`,
      sql: `SELECT s.name AS student, d.name AS department
FROM students AS s
JOIN departments AS d ON s.dept_id = d.dept_id
ORDER BY d.name, s.name;`,
      note: 'Only 37 rows come back, not 40. Students with dept_id NULL have no match, so INNER JOIN drops them.'
    },
    {
      h: 'Following a path through many tables',
      html: `<p>Real questions often cross several tables. "Which courses did each student take?" follows the foreign keys:</p>
<p><code>students</code> → <code>enrollments</code> (student_id) → <code>sections</code> (section_id) → <code>courses</code> (course_id)</p>
<p>Write one <code>JOIN ... ON</code> per step. Each new table joins to a table that is already in the query.</p>`,
      sql: `SELECT s.name, c.course_id, c.title, x.semester, x.year, e.grade
FROM students s
JOIN enrollments e ON e.student_id = s.student_id
JOIN sections x    ON x.section_id = e.section_id
JOIN courses c     ON c.course_id  = x.course_id
WHERE c.course_id = 'CS220'
ORDER BY s.name;`,
      note: 'Add one more step to see who taught it: JOIN instructors i ON i.instructor_id = x.instructor_id, and select i.name.'
    },
    {
      h: 'LEFT JOIN keeps every row on the left',
      html: '<p><code>A LEFT JOIN B</code> returns every row of A. When a row of A has no match in B, the B columns are filled with NULL. Use it when the left rows must not disappear, for example "every department, with its students if any".</p>',
      sql: `SELECT d.name AS department, s.name AS student
FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id
ORDER BY d.name, s.name;`,
      note: 'Philosophy appears once with student = NULL. An INNER JOIN would hide it.'
    },
    {
      h: 'Finding what is missing (anti-join)',
      html: `<p>A LEFT JOIN followed by <code>WHERE right_side.key IS NULL</code> keeps only the left rows that had <strong>no</strong> match. This pattern is called an <strong>anti-join</strong>. It answers questions like "which courses were never offered?" or "which students have not enrolled in anything?".</p>
<p>Test a column that can never be NULL in a real match, such as the right table's primary key.</p>`,
      sql: `SELECT c.course_id, c.title
FROM courses c
LEFT JOIN sections x ON x.course_id = c.course_id
WHERE x.section_id IS NULL;`,
      predict: {
        q: 'You want students with no enrollments. Which condition completes this query? <code>FROM students s LEFT JOIN enrollments e ON e.student_id = s.student_id WHERE ...</code>',
        options: [
          'e.grade IS NULL',
          'e.student_id IS NULL',
          's.student_id IS NULL',
          'e.student_id <> s.student_id'
        ],
        answer: 1,
        why: 'e.student_id is part of the primary key of enrollments. So it is NULL only when no enrollment matched. e.grade is also NULL for courses that are still running, so it gives wrong rows.'
      }
    },
    {
      h: 'The ON vs WHERE trap with LEFT JOIN',
      html: `<p>With INNER JOIN, a condition can go in ON or in WHERE: the result is the same. With LEFT JOIN, it is <strong>not</strong> the same.</p>
<ul><li>A condition in <code>ON</code> decides which right rows <em>match</em>. Left rows are still kept.</li>
<li>A condition in <code>WHERE</code> runs <em>after</em> the join. It removes rows, including the NULL-filled ones. Your LEFT JOIN silently becomes an INNER JOIN.</li></ul>
<pre class="code">-- Every department, with its 4th-year students (if any): condition in ON
SELECT d.name, s.name FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id AND s.year = 4;

-- Departments that HAVE 4th-year students only: condition in WHERE
SELECT d.name, s.name FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id
WHERE s.year = 4;</pre>`,
      predict: {
        sql: `SELECT d.name, s.name
FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id
WHERE s.year = 4;`,
        q: 'Philosophy has no students. Is Philosophy in the result?',
        options: [
          'Yes, with a NULL student',
          'No',
          'Yes, once for each 4th-year student',
          'The query fails'
        ],
        answer: 1,
        why: 'For Philosophy, s.year is NULL. So s.year = 4 is UNKNOWN, and WHERE removes the row. Put the condition in ON to keep it.'
      }
    },
    {
      h: 'RIGHT JOIN and FULL OUTER JOIN',
      html: `<p><code>A RIGHT JOIN B</code> is the same as <code>B LEFT JOIN A</code>. Most people only write LEFT joins and put the "keep everything" table first.</p>
<p><code>FULL OUTER JOIN</code> keeps unmatched rows from <strong>both</strong> sides. SQLite supports both since version 3.39. MySQL has no FULL JOIN: you emulate it with a LEFT JOIN UNION a RIGHT JOIN.</p>`,
      sql: `SELECT s.name AS student, d.name AS department
FROM students s
FULL OUTER JOIN departments d ON s.dept_id = d.dept_id
WHERE s.student_id IS NULL OR d.dept_id IS NULL;`,
      note: 'Shows only the unmatched rows from both sides: students with no major, and departments with no students.'
    },
    {
      h: 'Self joins',
      html: `<p>A table can be joined to <strong>itself</strong>. You must give it two different aliases, as if it were two tables. <code>instructors.mentor_id</code> points to another instructor. To show each instructor next to the name of their mentor, join instructors (as <code>i</code>) to instructors (as <code>m</code>).</p>
<p>Use LEFT JOIN so that instructors without a mentor are still listed.</p>`,
      sql: `SELECT i.name AS instructor, m.name AS mentor
FROM instructors i
LEFT JOIN instructors m ON m.instructor_id = i.mentor_id
ORDER BY mentor, instructor;`
    },
    {
      h: 'Join, then group',
      html: '<p>Joins and GROUP BY work well together: first build the wide rows, then summarise them. To count students per department <strong>including zero</strong>, combine LEFT JOIN with <code>COUNT(s.student_id)</code>. <code>COUNT(*)</code> would count the NULL-filled row and give Philosophy 1 instead of 0.</p>',
      sql: `SELECT d.name, COUNT(s.student_id) AS students
FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id
GROUP BY d.dept_id, d.name
ORDER BY students DESC, d.name;`
    },
    {
      h: 'USING and NATURAL JOIN',
      html: `<p>When the join columns have the same name on both sides, <code>JOIN enrollments USING (student_id)</code> is a short form of the ON condition.</p>
<p><code>NATURAL JOIN</code> goes further: it joins on <strong>every</strong> column with the same name. That is dangerous. <code>students</code> and <code>departments</code> share <code>dept_id</code> <strong>and</strong> <code>name</code>, so a natural join also requires the student name to equal the department name.</p>`,
      predict: {
        sql: 'SELECT COUNT(*) FROM students NATURAL JOIN departments;',
        q: 'How many rows does this return?',
        options: ['37', '40', '320', '0'],
        answer: 3,
        why: 'NATURAL JOIN matches on every column with the same name: dept_id AND name. No student is called "Physics", so nothing matches. Avoid NATURAL JOIN: a new column can change your results without any warning.'
      }
    }
  ],
  pitfalls: [
    'Forgetting the ON condition, which gives a Cartesian product with far too many rows.',
    'Putting a condition on the right table in WHERE after a LEFT JOIN. It turns the LEFT JOIN into an INNER JOIN.',
    'Using <code>COUNT(*)</code> after a LEFT JOIN when you want zero for unmatched rows. Count a column from the right table.',
    'Not prefixing columns that exist in both tables (<code>name</code>, <code>dept_id</code>). The query is ambiguous and fails.',
    'Using NATURAL JOIN. It joins on every shared column name, including ones you did not think of.',
    'Joining two independent one-to-many tables at once (for example enrollments and payments of a student). Rows multiply and SUMs become too large.'
  ],
  dialect: `<ul><li><strong>RIGHT / FULL JOIN:</strong> PostgreSQL, SQL Server and Oracle support both. SQLite supports both since 3.39. MySQL supports RIGHT but not FULL: write <code>LEFT JOIN ... UNION ... RIGHT JOIN</code>.</li>
<li><strong>Old comma syntax:</strong> <code>FROM a, b WHERE a.id = b.id</code> is an inner join in every database. Oracle code also uses <code>a.id = b.id(+)</code> for outer joins. Prefer explicit JOIN ... ON.</li>
<li><strong>Table aliases with AS:</strong> <code>FROM students AS s</code> works everywhere except Oracle, which only accepts <code>FROM students s</code>.</li>
<li><strong>USING:</strong> supported by PostgreSQL, MySQL, Oracle and SQLite. SQL Server does not support USING or NATURAL JOIN.</li></ul>`,
  exercises: [
    {
      id: 'd4-1',
      level: 1,
      prompt: '<p>Show every course with the name of its department.</p><ul class="spec"><li><b>Columns:</b> <code>course_id</code>, <code>title</code>, <code>department</code></li><li><b>Note:</b> <code>department</code> is the department name.</li></ul>',
      solution: 'SELECT c.course_id, c.title, d.name AS department FROM courses c JOIN departments d ON d.dept_id = c.dept_id;',
      hints: [
        'courses.dept_id points to departments.dept_id.',
        'JOIN departments d ON d.dept_id = c.dept_id'
      ]
    },
    {
      id: 'd4-2',
      level: 1,
      prompt: `<p>Show each section with the name of its instructor. Skip sections that have no instructor.</p><ul class="spec"><li><b>Columns:</b> <code>section_id</code>, <code>course_id</code>, <code>instructor</code></li><li><b>Note:</b> <code>instructor</code> is the instructor's name.</li></ul>`,
      solution: 'SELECT x.section_id, x.course_id, i.name AS instructor FROM sections x JOIN instructors i ON i.instructor_id = x.instructor_id;',
      hints: [
        'An INNER JOIN drops sections without an instructor by itself.',
        'JOIN instructors i ON i.instructor_id = x.instructor_id'
      ]
    },
    {
      id: 'd4-3',
      level: 1,
      prompt: '<p>Find the students who never enrolled in any section.</p><ul class="spec"><li><b>Columns:</b> <code>student_id</code>, <code>name</code></li></ul>',
      solution: 'SELECT s.student_id, s.name FROM students s LEFT JOIN enrollments e ON e.student_id = s.student_id WHERE e.student_id IS NULL;',
      hints: [
        'You need students with no matching row in enrollments.',
        'Use LEFT JOIN. Then keep the rows where the right side is empty.',
        'WHERE e.student_id IS NULL'
      ]
    },
    {
      id: 'd4-4',
      level: 2,
      prompt: '<p>Make a transcript (a list of courses and grades) for student <code>1010</code>, Lina Khalil.</p><ul class="spec"><li><b>Columns:</b> <code>course_id</code>, <code>title</code>, <code>semester</code>, <code>year</code>, <code>grade</code></li><li><b>Order:</b> by <code>year</code>, then by <code>semester</code> (A to Z), then by <code>course_id</code></li></ul>',
      solution: 'SELECT c.course_id, c.title, x.semester, x.year, e.grade FROM enrollments e JOIN sections x ON x.section_id = e.section_id JOIN courses c ON c.course_id = x.course_id WHERE e.student_id = 1010 ORDER BY x.year, x.semester, c.course_id;',
      ordered: true,
      hints: [
        'Path: enrollments → sections → courses.',
        'Filter with WHERE e.student_id = 1010.',
        'ORDER BY x.year, x.semester, c.course_id'
      ]
    },
    {
      id: 'd4-5',
      level: 2,
      prompt: '<p>Show every department and how many instructors it has. Departments with no instructors must show 0.</p><ul class="spec"><li><b>Columns:</b> <code>department</code>, <code>instructors</code></li><li><b>Note:</b> <code>department</code> is the department name.</li></ul>',
      solution: 'SELECT d.name AS department, COUNT(i.instructor_id) AS instructors FROM departments d LEFT JOIN instructors i ON i.dept_id = d.dept_id GROUP BY d.dept_id, d.name;',
      hints: [
        'Departments with 0 instructors must stay. Which join keeps them?',
        'Group by the department.',
        'Use COUNT(i.instructor_id), not COUNT(*). Then empty departments get 0.'
      ]
    },
    {
      id: 'd4-6',
      level: 2,
      prompt: '<p>Show each instructor with the name of their mentor.</p><ul class="spec"><li><b>Columns:</b> <code>instructor</code>, <code>mentor</code></li><li><b>Note:</b> instructors with no mentor must also appear. Their <code>mentor</code> is NULL.</li></ul>',
      solution: 'SELECT i.name AS instructor, m.name AS mentor FROM instructors i LEFT JOIN instructors m ON m.instructor_id = i.mentor_id;',
      hints: [
        'Join instructors to itself. Use two aliases.',
        'Which join keeps instructors who have no mentor?',
        'ON m.instructor_id = i.mentor_id'
      ]
    },
    {
      id: 'd4-7',
      level: 2,
      prompt: '<p>For each course that has prerequisites, show the course title and the title of each prerequisite. A prerequisite is a course you must take first.</p><ul class="spec"><li><b>Columns:</b> <code>course</code>, <code>requires</code></li></ul>',
      solution: 'SELECT c.title AS course, p.title AS requires FROM prereqs r JOIN courses c ON c.course_id = r.course_id JOIN courses p ON p.course_id = r.prereq_id;',
      hints: [
        'prereqs stores only codes. You need courses twice: once for the course, once for the prerequisite.',
        'Use two aliases for courses, for example c and p.',
        'JOIN courses p ON p.course_id = r.prereq_id'
      ]
    },
    {
      id: 'd4-8',
      level: 3,
      prompt: `<p>For each instructor, count the enrollments in all of their sections. Show only instructors with 10 or more enrollments.</p><ul class="spec"><li><b>Columns:</b> <code>instructor</code>, <code>enrollments</code></li><li><b>Order:</b> most <code>enrollments</code> first, then by <code>instructor</code>, A to Z</li><li><b>Note:</b> <code>instructor</code> is the instructor's name.</li></ul>`,
      solution: 'SELECT i.name AS instructor, COUNT(*) AS enrollments FROM instructors i JOIN sections x ON x.instructor_id = i.instructor_id JOIN enrollments e ON e.section_id = x.section_id GROUP BY i.instructor_id, i.name HAVING COUNT(*) >= 10 ORDER BY enrollments DESC, instructor;',
      ordered: true,
      hints: [
        'Path: instructors → sections → enrollments.',
        'Group by the instructor. Then filter the groups.',
        'HAVING COUNT(*) >= 10 ORDER BY enrollments DESC, instructor'
      ]
    },
    {
      id: 'd4-9',
      level: 3,
      prompt: '<p>For every department, count its students in year 4. Departments with none must show 0.</p><ul class="spec"><li><b>Columns:</b> <code>department</code>, <code>seniors</code></li><li><b>Order:</b> most <code>seniors</code> first, then by <code>department</code>, A to Z</li><li><b>Note:</b> <code>department</code> is the department name.</li></ul>',
      solution: 'SELECT d.name AS department, COUNT(s.student_id) AS seniors FROM departments d LEFT JOIN students s ON s.dept_id = d.dept_id AND s.year = 4 GROUP BY d.dept_id, d.name ORDER BY seniors DESC, department;',
      ordered: true,
      hints: [
        'Every department must appear. So start from departments and use LEFT JOIN.',
        'If you put year = 4 in WHERE, departments with 0 seniors disappear.',
        'Put s.year = 4 inside ON, and count s.student_id.'
      ]
    },
    {
      id: 'd4-10',
      level: 3,
      prompt: `<p>Find the students who took at least one section taught by their own advisor.</p><ul class="spec"><li><b>Columns:</b> <code>student</code>, <code>advisor</code></li><li><b>Note:</b> <code>student</code> is the student's name. <code>advisor</code> is the advisor's name. Show each student only once.</li></ul>`,
      solution: 'SELECT DISTINCT s.name AS student, i.name AS advisor FROM students s JOIN enrollments e ON e.student_id = s.student_id JOIN sections x ON x.section_id = e.section_id JOIN instructors i ON i.instructor_id = s.advisor_id WHERE x.instructor_id = s.advisor_id;',
      hints: [
        `Path: students → enrollments → sections. Compare the section's instructor with the student's advisor.`,
        `Join instructors on s.advisor_id to get the advisor's name.`,
        'A student can share several sections with the advisor. Use DISTINCT.'
      ]
    }
  ],
  quiz: [
    {
      id: 'd4-q1',
      q: 'Table A has 5 rows and table B has 4 rows. How many rows does <code>A CROSS JOIN B</code> return?',
      options: ['9', '20', '5', '4'],
      answer: 1,
      why: 'A CROSS JOIN pairs every row of A with every row of B: 5 × 4 = 20.'
    },
    {
      id: 'd4-q2',
      q: 'Which join keeps every row of the first table, even rows with no match?',
      options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'NATURAL JOIN'],
      answer: 1,
      why: 'LEFT JOIN keeps all rows of the left table. When there is no match, the right side is NULL.'
    },
    {
      id: 'd4-q3',
      q: 'You write <code>departments d LEFT JOIN students s ON ...</code>. Then you add <code>WHERE s.year = 2</code>. What happens to departments with no students?',
      options: ['They stay, with NULLs', 'They are removed', 'They appear twice', 'The query fails'],
      answer: 1,
      why: 'For them, s.year is NULL. So the WHERE test is UNKNOWN, and the rows are removed. The LEFT JOIN now works like an INNER JOIN.'
    },
    {
      id: 'd4-q4',
      q: 'Why do you need two aliases in a self join?',
      options: [
        'To make it faster',
        'To talk about two different rows of the same table',
        'Because SQL does not allow joining a table to itself without them',
        'Both B and C'
      ],
      answer: 3,
      why: 'The two aliases let you talk about two different rows, like an instructor and a mentor. Without aliases, the table name is unclear and the query fails.'
    },
    {
      id: 'd4-q5',
      q: 'You count students per department with LEFT JOIN. Which expression gives 0 for a department with no students?',
      options: ['COUNT(*)', 'COUNT(s.student_id)', 'COUNT(d.dept_id)', 'SUM(1)'],
      answer: 1,
      why: 'An empty department has one row where s.student_id is NULL. COUNT(*) and COUNT(d.dept_id) count that row as 1. COUNT(s.student_id) skips the NULL and gives 0.'
    },
    {
      id: 'd4-q6',
      q: 'Why is NATURAL JOIN risky?',
      options: [
        'It is slow',
        'It joins on every column with the same name, even ones you did not want',
        'It works only in Oracle',
        'It removes NULLs'
      ],
      answer: 1,
      why: 'Columns like name or id can become join conditions without you noticing. A new column added later can change the result, with no error.'
    },
    {
      id: 'd4-q7',
      q: '<code>A RIGHT JOIN B</code> gives the same rows as…',
      options: ['A LEFT JOIN B', 'B LEFT JOIN A', 'A INNER JOIN B', 'A FULL JOIN B'],
      answer: 1,
      why: 'A RIGHT JOIN B keeps every row of B. That is the same as B LEFT JOIN A. Only the column order is different.'
    }
  ],
  teach: 'Explain the difference between INNER JOIN and LEFT JOIN, and show how to use a LEFT JOIN to find courses that were never offered.',
  rubric: 'INNER JOIN keeps only rows with a match on both sides; LEFT JOIN keeps all rows of the left table and fills right columns with NULL when there is no match; a join is a Cartesian product filtered by the ON condition; anti-join pattern: courses LEFT JOIN sections ON course_id ... WHERE sections.section_id IS NULL; test a right-side column that is never NULL in a real match (the key); bonus: conditions on the right table in WHERE turn a LEFT JOIN into an INNER JOIN.'
});
