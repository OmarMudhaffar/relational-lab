LAB.days.push({
  n: 5,
  week: 1,
  tag: 'SUBQUERY',
  title: 'Subqueries and Set Operations',
  hours: 2.5,
  goals: [
    'Use a subquery as a single value, as a list, and as a table',
    'Choose between IN, EXISTS and JOIN, and avoid the NOT IN + NULL trap',
    'Write correlated subqueries that run once per outer row',
    'Combine results with UNION, UNION ALL, INTERSECT and EXCEPT',
    'Solve "for all" questions with relational division'
  ],
  lesson: [
    {
      h: 'A query inside a query',
      html: `<p>A <strong>subquery</strong> is a SELECT written inside another statement, in parentheses. The inner query runs and its result is used by the outer query. You already know how to answer "What is the average salary?" and "Who earns more than 85000?". A subquery lets you combine them: "Who earns more than the average?"</p>
<p>When a subquery returns exactly <strong>one row and one column</strong>, it is a <strong>scalar subquery</strong>. You can use it anywhere a single value is allowed: in WHERE, in SELECT, even in ORDER BY.</p>`,
      sql: `SELECT name, salary,
       (SELECT ROUND(AVG(salary)) FROM instructors) AS university_avg
FROM instructors
WHERE salary > (SELECT AVG(salary) FROM instructors)
ORDER BY salary DESC;`,
      note: 'The average is computed once. Change > to < to see the instructors below average.'
    },
    {
      h: 'IN with a subquery: a list of values',
      html: `<p>When the subquery returns <strong>one column and many rows</strong>, treat it as a list. <code>IN</code> keeps an outer row if its value appears anywhere in that list.</p>
<p>Read the query below from the inside out. First: which departments have a budget above 500000? Then: which students major in one of them?</p>`,
      sql: `SELECT name, dept_id
FROM students
WHERE dept_id IN (SELECT dept_id
                  FROM departments
                  WHERE budget > 500000)
ORDER BY dept_id, name;`
    },
    {
      h: 'The NOT IN trap with NULL',
      html: `<p>We want instructors who teach <strong>no</strong> section. <code>NOT IN</code> looks like the obvious tool. But one section (PL100) has no instructor, so the list contains a NULL.</p>
<p>Remember three-valued logic. <code>x NOT IN (101, 102, NULL)</code> means <code>x &lt;&gt; 101 AND x &lt;&gt; 102 AND x &lt;&gt; NULL</code>. The last comparison is UNKNOWN, never TRUE. So the whole condition can never be TRUE, and the query returns <strong>no rows at all</strong>. There is no error message. The result is just silently wrong.</p>`,
      predict: {
        sql: `SELECT name
FROM instructors
WHERE instructor_id NOT IN (SELECT instructor_id FROM sections);`,
        q: 'Omar Farouk teaches no section. How many rows does this query return?',
        options: ['1 row: Omar Farouk', '0 rows', 'All 16 instructors', 'An error, because the list contains NULL'],
        answer: 1,
        why: 'The list from sections contains a NULL. Every NOT IN test becomes UNKNOWN or FALSE, so nothing passes. Fix it with NOT EXISTS, or add WHERE instructor_id IS NOT NULL inside the subquery.'
      }
    },
    {
      h: 'EXISTS and NOT EXISTS',
      html: `<p><code>EXISTS (subquery)</code> is TRUE if the subquery returns at least one row. It does not care about the values, so people often write <code>SELECT 1</code> inside. It only returns TRUE or FALSE, never UNKNOWN, so <strong>NULLs cannot break it</strong>.</p>
<p>Notice that the subquery below mentions <code>i.instructor_id</code> from the outer query. That makes it a <em>correlated</em> subquery (next segment).</p>`,
      sql: `SELECT name
FROM instructors i
WHERE NOT EXISTS (SELECT 1
                  FROM sections s
                  WHERE s.instructor_id = i.instructor_id);`,
      note: 'This is the safe way to write "has no ...". It returns Omar Farouk.'
    },
    {
      h: 'Correlated subqueries: once per outer row',
      html: `<p>A <strong>correlated subquery</strong> refers to a column of the outer query. Logically, it runs again for <strong>each outer row</strong>, with that row's values plugged in.</p>
<p>Question: which instructors earn more than the average of <em>their own</em> department? The average is different for each department, so the subquery must know which instructor we are looking at.</p>
<figure class="diagram"><svg viewBox="0 0 560 120" role="img" aria-label="For each outer row, the inner query runs with that row's department">
<rect x="10" y="20" width="200" height="80" rx="6" fill="var(--surface)" stroke="var(--line)"/>
<text x="110" y="45" text-anchor="middle" fill="var(--ink)" font-size="13">outer row: Marco Rossi</text>
<text x="110" y="70" text-anchor="middle" fill="var(--muted)" font-size="12">dept_id = 1, salary 87000</text>
<line x1="210" y1="60" x2="330" y2="60" stroke="var(--accent)" stroke-width="2"/>
<polygon points="330,54 342,60 330,66" fill="var(--accent)"/>
<text x="272" y="50" text-anchor="middle" fill="var(--accent)" font-size="12">dept_id = 1</text>
<rect x="345" y="20" width="205" height="80" rx="6" fill="var(--bg2)" stroke="var(--line)"/>
<text x="447" y="45" text-anchor="middle" fill="var(--ink)" font-size="13">inner: AVG(salary)</text>
<text x="447" y="70" text-anchor="middle" fill="var(--muted)" font-size="12">WHERE dept_id = 1 → 87000</text>
</svg></figure>`,
      sql: `SELECT i.name, i.dept_id, i.salary
FROM instructors i
WHERE i.salary > (SELECT AVG(i2.salary)
                  FROM instructors i2
                  WHERE i2.dept_id = i.dept_id)
ORDER BY i.dept_id;`,
      note: 'Two copies of the same table need two aliases (i and i2). Otherwise the inner dept_id would refer to itself.'
    },
    {
      h: 'Subqueries in FROM: derived tables',
      html: `<p>A subquery in the FROM clause produces a temporary table, called a <strong>derived table</strong>. Most databases require you to give it an alias. This is useful when you need to aggregate twice, for example "the average of per-student counts". You cannot write <code>AVG(COUNT(*))</code> directly, but you can count first and then average the counts.</p>`,
      sql: `SELECT ROUND(AVG(n), 2) AS avg_enrollments, MAX(n) AS most
FROM (SELECT student_id, COUNT(*) AS n
      FROM enrollments
      GROUP BY student_id) AS per_student;`
    },
    {
      h: 'Subquery or JOIN?',
      html: `<p>Many questions can be written either way. The database optimizer often turns an IN subquery into a join internally. But the results can differ in one important way: a JOIN repeats the outer row once for <strong>each</strong> match, while IN or EXISTS keeps the outer row <strong>once</strong>.</p>
<p>Rule of thumb: use a JOIN when you need columns from both tables. Use IN or EXISTS when the second table is only a filter.</p>`,
      predict: {
        sql: `SELECT COUNT(*) AS join_rows
FROM students st JOIN enrollments e ON e.student_id = st.student_id;

SELECT COUNT(*) AS in_rows
FROM students
WHERE student_id IN (SELECT student_id FROM enrollments);`,
        q: '38 students have at least one enrollment, and there are 156 enrollments. What do the two counts return?',
        options: ['38 and 38', '156 and 156', '156 and 38', '38 and 156'],
        answer: 2,
        why: 'The JOIN produces one row per enrollment (156). IN keeps each student once (38). If you used a JOIN for filtering, you would need DISTINCT to remove the copies.'
      }
    },
    {
      h: 'UNION and UNION ALL',
      html: `<p>Set operators combine the <strong>rows</strong> of two queries (a join combines <em>columns</em>). Both queries must return the same number of columns with compatible types. The column names come from the first query. A single ORDER BY at the very end sorts the combined result.</p>
<ul><li><code>UNION</code> removes duplicate rows (this costs a sort or a hash).</li><li><code>UNION ALL</code> keeps every row. It is faster. Use it when you know there are no duplicates, or when you want them.</li></ul>`,
      predict: {
        sql: `SELECT advisor_id AS instructor_id FROM students WHERE advisor_id IS NOT NULL
UNION
SELECT mentor_id FROM instructors WHERE mentor_id IS NOT NULL
ORDER BY 1;`,
        q: 'Students have 33 non-NULL advisor values and instructors have 9 non-NULL mentor values. Roughly how many rows does UNION return?',
        options: ['42 rows', 'At most 16 rows, because only 16 instructors exist', '31 rows', '11 rows'],
        answer: 1,
        why: 'UNION removes duplicates, and every value is an instructor id, so there can be at most 16 different values. UNION ALL would return all 42 values.'
      }
    },
    {
      h: 'INTERSECT and EXCEPT',
      html: `<p><code>INTERSECT</code> keeps rows that appear in <strong>both</strong> results. <code>EXCEPT</code> keeps rows of the first result that do <strong>not</strong> appear in the second. Oracle calls EXCEPT <code>MINUS</code>.</p>
<p>Unlike NOT IN, set operators treat two NULLs as equal, so they do not have the NULL trap.</p>`,
      sql: `-- courses that are a prerequisite for something
-- but have no prerequisite of their own (the "root" courses)
SELECT prereq_id FROM prereqs
EXCEPT
SELECT course_id FROM prereqs
ORDER BY 1;`
    },
    {
      h: 'Relational division: "for all" questions',
      html: `<p>Some questions say <strong>every</strong> or <strong>all</strong>: "Which students took every Biology course?" SQL has no FOR ALL keyword. We rewrite the sentence with a double negative:</p>
<div class="callout">A student took <em>every</em> Biology course<br>= there is <strong>no</strong> Biology course<br>that the student did <strong>not</strong> take.</div>
<p>Each "no" becomes a NOT EXISTS. In relational algebra this operation is called <strong>division</strong> (÷). A second method counts: the number of different Biology courses the student took equals the number of Biology courses.</p>`,
      sql: `SELECT st.name
FROM students st
WHERE NOT EXISTS (
  SELECT 1 FROM courses c
  WHERE c.dept_id = 4                         -- every Biology course...
    AND NOT EXISTS (                          -- ...that this student did NOT take
      SELECT 1
      FROM enrollments e
      JOIN sections s ON s.section_id = e.section_id
      WHERE e.student_id = st.student_id
        AND s.course_id = c.course_id));`
    }
  ],
  pitfalls: [
    '<code>NOT IN (subquery)</code> when the subquery can return NULL. The query silently returns no rows. Prefer <code>NOT EXISTS</code>, or filter the NULLs out inside the subquery.',
    'Using <code>=</code> with a subquery that returns more than one row. PostgreSQL and SQL Server raise an error. SQLite silently uses the first row, which hides the bug.',
    'Forgetting the alias for a derived table. PostgreSQL (before v16), MySQL and SQL Server reject <code>FROM (SELECT ...)</code> without <code>AS name</code>.',
    'In a correlated subquery, using the same table without two aliases. <code>WHERE dept_id = dept_id</code> compares the inner column with itself and is always TRUE (when not NULL).',
    'Using UNION when UNION ALL is meant. UNION removes duplicates, so two different payments of 500 by the same student would collapse into one row.',
    'Joining to a table only to filter, then getting duplicate rows. Use EXISTS or IN, or add DISTINCT.'
  ],
  dialect: `<ul>
<li><strong>EXCEPT:</strong> SQLite, PostgreSQL, SQL Server and MySQL 8.0.31+ use <code>EXCEPT</code>. Oracle uses <code>MINUS</code> (Oracle 21c also accepts EXCEPT). Older MySQL has no INTERSECT or EXCEPT: use NOT EXISTS or a LEFT JOIN instead.</li>
<li><strong>Derived table alias:</strong> required in MySQL and SQL Server, optional in SQLite and PostgreSQL 16+. Oracle does not allow the word AS before a table alias: <code>FROM (SELECT ...) t</code>.</li>
<li><strong>Multi-row with =:</strong> PostgreSQL, SQL Server, Oracle and MySQL raise "subquery returns more than one row". SQLite takes the first row.</li>
<li><strong>ALL / ANY:</strong> PostgreSQL, MySQL, SQL Server and Oracle support <code>salary &gt; ALL (subquery)</code> and <code>= ANY (...)</code>. SQLite does not. Use MAX/MIN subqueries or EXISTS instead.</li>
<li><strong>Row values:</strong> PostgreSQL, MySQL and SQLite allow <code>(a, b) IN (SELECT x, y ...)</code>. SQL Server does not: use EXISTS.</li>
</ul>`,
  exercises: [
    {
      id: 'd5-1', level: 1,
      prompt: 'List the <code>name</code> and <code>salary</code> of every instructor who earns more than the average salary of all instructors.',
      solution: `SELECT name, salary FROM instructors WHERE salary > (SELECT AVG(salary) FROM instructors);`,
      hints: ['First write a query that returns only the average salary.', 'Put that query in parentheses on the right side of a comparison.', 'WHERE salary > (SELECT AVG(...) FROM ...)']
    },
    {
      id: 'd5-2', level: 1,
      prompt: 'List the <code>name</code> of every student whose major department is located in <code>Turing Hall</code> or <code>Tesla Center</code>. Use a subquery, not a join.',
      solution: `SELECT name FROM students WHERE dept_id IN (SELECT dept_id FROM departments WHERE building IN ('Turing Hall', 'Tesla Center'));`,
      hints: ['The building is stored in departments, the student in students. Link them with dept_id.', 'The inner query should return a list of dept_id values.', 'WHERE dept_id IN (SELECT dept_id FROM departments WHERE building IN (...))']
    },
    {
      id: 'd5-3', level: 1,
      prompt: 'Which courses have never been offered (they have no section at all)? Return <code>course_id</code> and <code>title</code>.',
      solution: `SELECT course_id, title FROM courses c WHERE NOT EXISTS (SELECT 1 FROM sections s WHERE s.course_id = c.course_id);`,
      hints: ['"Never" or "no ..." questions are a good fit for NOT EXISTS.', 'The inner query looks for a section of the current course.', 'WHERE NOT EXISTS (SELECT 1 FROM sections s WHERE s.course_id = c.course_id)']
    },
    {
      id: 'd5-4', level: 2,
      prompt: 'Return the <code>name</code> of every instructor who teaches no section. Careful: one section has no instructor (its <code>instructor_id</code> is NULL). Your query must still give the right answer.',
      solution: `SELECT name FROM instructors i WHERE NOT EXISTS (SELECT 1 FROM sections s WHERE s.instructor_id = i.instructor_id);`,
      hints: ['If you got zero rows, read the lesson segment about the NOT IN trap.', 'NOT EXISTS is not affected by NULLs.', 'Alternative: keep NOT IN, but add WHERE instructor_id IS NOT NULL inside the subquery.']
    },
    {
      id: 'd5-5', level: 2,
      prompt: 'List the <code>name</code> of every student who has made at least one payment in <code>cash</code>. Each student should appear once.',
      solution: `SELECT name FROM students st WHERE EXISTS (SELECT 1 FROM payments p WHERE p.student_id = st.student_id AND p.method = 'cash');`,
      hints: ['A JOIN would repeat students who paid cash twice. EXISTS keeps each student once.', 'The inner query needs two conditions: same student, and method = \'cash\'.', 'WHERE EXISTS (SELECT 1 FROM payments p WHERE p.student_id = st.student_id AND ...)']
    },
    {
      id: 'd5-6', level: 2,
      prompt: 'Which instructors earn more than the average salary of their own department? Return <code>name</code>, <code>dept_id</code> and <code>salary</code>.',
      solution: `SELECT i.name, i.dept_id, i.salary FROM instructors i WHERE i.salary > (SELECT AVG(i2.salary) FROM instructors i2 WHERE i2.dept_id = i.dept_id);`,
      hints: ['The average must be computed per department, so the subquery needs to know the outer row\'s department.', 'Use two aliases for the same table, for example i (outer) and i2 (inner).', 'WHERE i.salary > (SELECT AVG(i2.salary) FROM instructors i2 WHERE i2.dept_id = i.dept_id)']
    },
    {
      id: 'd5-7', level: 2,
      prompt: 'Consider only students who have at least one enrollment. On average, how many enrollments does such a student have? Return one column <code>avg_enrollments</code>, rounded to 2 decimals.',
      solution: `SELECT ROUND(AVG(n), 2) AS avg_enrollments FROM (SELECT student_id, COUNT(*) AS n FROM enrollments GROUP BY student_id) AS per_student;`,
      hints: ['You need two levels of aggregation: count per student, then average the counts.', 'Put the per-student count in a derived table in FROM.', 'SELECT ROUND(AVG(n), 2) FROM (SELECT student_id, COUNT(*) AS n FROM enrollments GROUP BY ...) AS t']
    },
    {
      id: 'd5-8', level: 2,
      prompt: 'Find the "root" courses: course ids that are a prerequisite of some course but have no prerequisite themselves. Return one column <code>course_id</code>. Use a set operator.',
      solution: `SELECT prereq_id AS course_id FROM prereqs EXCEPT SELECT course_id FROM prereqs;`,
      hints: ['Two lists: courses that appear as a prerequisite, and courses that have a prerequisite.', 'You want the first list minus the second.', 'SELECT prereq_id FROM prereqs EXCEPT SELECT course_id FROM prereqs']
    },
    {
      id: 'd5-9', level: 3,
      prompt: 'For each graded enrollment, find the students who scored <strong>above the average score of their own section</strong>. Return <code>name</code>, <code>section_id</code> and <code>score</code>.',
      solution: `SELECT st.name, e.section_id, e.score FROM enrollments e JOIN students st ON st.student_id = e.student_id WHERE e.score > (SELECT AVG(e2.score) FROM enrollments e2 WHERE e2.section_id = e.section_id);`,
      hints: ['You need the name, so join enrollments to students.', 'The section average changes per row: a correlated subquery on enrollments with a second alias.', 'AVG ignores NULL scores, and NULL > anything is not TRUE, so in-progress rows drop out by themselves.']
    },
    {
      id: 'd5-10', level: 3,
      prompt: 'Relational division: which students took <strong>every</strong> Biology course (department 4)? Return <code>name</code>. Count a course as taken if the student enrolled in any section of it.',
      solution: `SELECT st.name FROM students st WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.dept_id = 4 AND NOT EXISTS (SELECT 1 FROM enrollments e JOIN sections s ON s.section_id = e.section_id WHERE e.student_id = st.student_id AND s.course_id = c.course_id));`,
      hints: ['Rewrite "took every course" as "there is no Biology course they did not take".', 'Two nested NOT EXISTS: the outer one loops over Biology courses, the inner one looks for an enrollment of this student in that course.', 'Alternative: GROUP BY student and compare COUNT(DISTINCT course_id) with (SELECT COUNT(*) FROM courses WHERE dept_id = 4).']
    }
  ],
  quiz: [
    { id: 'd5-q1', q: 'A subquery used as <code>WHERE salary &gt; (SELECT ...)</code> must return…', options: ['Any number of rows', 'Exactly one column and at most one row', 'Exactly one row with any number of columns', 'A table with an alias'], answer: 1, why: 'A comparison needs a single value. That is a scalar subquery: one column, one row (zero rows gives NULL).' },
    { id: 'd5-q2', q: 'The list returned by a subquery is (5, 7, NULL). What does <code>3 NOT IN (that list)</code> evaluate to?', options: ['TRUE', 'FALSE', 'UNKNOWN', 'An error'], answer: 2, why: '3 <> 5 is TRUE, 3 <> 7 is TRUE, 3 <> NULL is UNKNOWN. TRUE AND TRUE AND UNKNOWN is UNKNOWN, and WHERE keeps only TRUE.' },
    { id: 'd5-q3', q: 'What makes a subquery "correlated"?', options: ['It uses an aggregate', 'It appears in the FROM clause', 'It refers to a column of the outer query', 'It returns more than one row'], answer: 2, why: 'A correlated subquery depends on the current outer row, so logically it is evaluated once per outer row.' },
    { id: 'd5-q4', q: 'Query A returns 10 rows and query B returns 6 rows. 4 rows appear in both. How many rows does <code>A UNION ALL B</code> return?', options: ['12', '16', '10', '4'], answer: 1, why: 'UNION ALL keeps everything: 10 + 6 = 16. UNION (without ALL) would return 12, assuming no duplicates inside A or B.' },
    { id: 'd5-q5', q: 'With the same A and B, how many rows does <code>A EXCEPT B</code> return (assuming no duplicates inside A)?', options: ['6', '4', '10', '2'], answer: 0, why: 'EXCEPT removes from A the 4 rows that also appear in B: 10 − 4 = 6.' },
    { id: 'd5-q6', q: 'Which question needs relational division?', options: ['Students with no enrollments', 'Students who took at least one CS course', 'Students who took all CS courses', 'Students in the largest department'], answer: 2, why: '"All" or "every" questions are division. They are usually written with a double NOT EXISTS or with a COUNT comparison.' },
    { id: 'd5-q7', q: 'Why is <code>EXISTS</code> usually written with <code>SELECT 1</code> inside?', options: ['It is required by the standard', 'EXISTS only checks whether any row exists, so the selected values do not matter', 'It makes the subquery return one row', 'SELECT * would be an error'], answer: 1, why: 'EXISTS is TRUE if at least one row is returned. SELECT 1, SELECT * and SELECT NULL all behave the same.' }
  ],
  teach: 'Explain why "WHERE id NOT IN (subquery)" can return no rows when the subquery contains a NULL, and show how to fix it.',
  rubric: 'NOT IN expands to a chain of <> comparisons joined by AND; any comparison with NULL is UNKNOWN; TRUE AND UNKNOWN is UNKNOWN, so no row is ever TRUE; WHERE keeps only TRUE rows; fix with NOT EXISTS (correlated) or by filtering NULLs out of the subquery (WHERE col IS NOT NULL); bonus: a LEFT JOIN ... WHERE right.key IS NULL anti-join also works.'
});
