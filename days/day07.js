LAB.days.push({
  n: 7,
  week: 1,
  tag: 'REVIEW',
  title: 'Week 1 Review and SQL Exam',
  hours: 3,
  goals: [
    'Use a fixed method to turn any English question into a correct query',
    'Read common error messages and know the fix for each',
    'Check your own queries with small tests before you trust them',
    'Solve mixed problems from days 1–6 without being told which topic they belong to'
  ],
  lesson: [
    {
      h: 'Why today is mixed',
      html: `<p>Until now each day practised one topic. In an exam, nobody tells you "this is a JOIN question". Today's exercises are <strong>mixed on purpose</strong>: filtering, NULLs, grouping, joins, subqueries and windows in random order. Research on learning calls this <strong>interleaving</strong>. It feels harder, but it trains the most important exam skill: <em>recognising which tool a question needs</em>.</p>
<p>Try each exercise <strong>without looking back</strong> at earlier days first. Struggling to remember is what makes memory stronger. Use the hints only after a real attempt.</p>`
    },
    {
      h: 'How to attack any query question',
      html: `<p>Follow the same steps every time. Write them as comments if it helps.</p>
<ol class="steps">
<li><strong>Output:</strong> what does one row of the answer look like? Which columns, in which order?</li>
<li><strong>Tables:</strong> which tables hold those columns and the columns you filter on?</li>
<li><strong>Join path:</strong> how are those tables connected? Follow the foreign keys (look at the Schema panel).</li>
<li><strong>Filter rows:</strong> which conditions go in WHERE?</li>
<li><strong>Group:</strong> does the question say "per", "each", "for every"? Then GROUP BY. Conditions on totals go in HAVING.</li>
<li><strong>Output and sort:</strong> write the SELECT list, then ORDER BY and LIMIT if the question asks for them.</li>
</ol>
<p>Example: "For each department, how many Fall 2025 enrollments did its courses have?" One row = department name + a count. Tables: departments, courses, sections, enrollments. Path: departments → courses (dept_id) → sections (course_id) → enrollments (section_id). Filter: semester and year. Group: per department.</p>`,
      sql: `SELECT d.name, COUNT(*) AS fall_2025_enrollments
FROM departments d
JOIN courses c     ON c.dept_id = d.dept_id
JOIN sections s    ON s.course_id = c.course_id
JOIN enrollments e ON e.section_id = s.section_id
WHERE s.semester = 'Fall' AND s.year = 2025
GROUP BY d.name
ORDER BY fall_2025_enrollments DESC, d.name;`
    },
    {
      h: 'Words that point to a tool',
      html: `<p>Certain words in a question almost always mean a certain construct. Learn this table. It is the fastest way to start.</p>
<table class="mini"><thead><tr><th>The question says…</th><th>Think of…</th></tr></thead><tbody>
<tr><td>"for each", "per", "by department"</td><td>GROUP BY</td></tr>
<tr><td>"groups with more than…"</td><td>HAVING</td></tr>
<tr><td>"including those with none", "even if"</td><td>LEFT JOIN + COUNT(column)</td></tr>
<tr><td>"at least one", "has any"</td><td>EXISTS, IN or JOIN + DISTINCT</td></tr>
<tr><td>"no", "never", "without"</td><td>NOT EXISTS, or LEFT JOIN … IS NULL</td></tr>
<tr><td>"every", "all"</td><td>double NOT EXISTS (division) or COUNT comparison</td></tr>
<tr><td>"more than the average"</td><td>scalar subquery; per-group average → correlated subquery or window</td></tr>
<tr><td>"top N in each…", "best per…"</td><td>RANK / ROW_NUMBER in a CTE, then filter</td></tr>
<tr><td>"running", "so far", "cumulative"</td><td>SUM(...) OVER (ORDER BY ...)</td></tr>
<tr><td>"previous", "change since last"</td><td>LAG</td></tr>
<tr><td>"both A and B" / "A but not B" (lists)</td><td>INTERSECT / EXCEPT</td></tr>
<tr><td>"chain", "all levels", "hierarchy"</td><td>recursive CTE</td></tr>
</tbody></table>`
    },
    {
      h: 'Reading error messages',
      html: `<p>An error message is a clue, not a punishment. Most errors in this course come from five causes. SQLite's wording is shown; other databases say almost the same.</p>
<table class="mini"><thead><tr><th>Message</th><th>Usual cause</th><th>Fix</th></tr></thead><tbody>
<tr><td><code>no such column: nmae</code></td><td>Typo, or the column is in a table you did not put in FROM</td><td>Check spelling in the Schema panel; add the join</td></tr>
<tr><td><code>ambiguous column name: dept_id</code></td><td>Two joined tables both have dept_id</td><td>Prefix it: <code>s.dept_id</code></td></tr>
<tr><td><code>misuse of aggregate: AVG()</code></td><td>Aggregate inside WHERE</td><td>Move the condition to HAVING, or use a subquery</td></tr>
<tr><td><code>misuse of window function</code></td><td>Window function inside WHERE or GROUP BY</td><td>Compute it in a CTE, filter outside</td></tr>
<tr><td><code>column must appear in the GROUP BY clause</code> (PostgreSQL)</td><td>A selected column is neither grouped nor aggregated</td><td>Add it to GROUP BY or wrap it in an aggregate</td></tr>
<tr><td><code>near "FROM": syntax error</code></td><td>Usually a comma before FROM, or a missing comma between columns</td><td>Look at the word just before the one named</td></tr>
</tbody></table>
<div class="callout warn">SQLite does <strong>not</strong> raise the GROUP BY error. It silently picks a value from some row in the group. Your query "works" here and fails in PostgreSQL or in your exam. Always group every non-aggregated column.</div>`,
      predict: {
        q: "Which query gives the error <code>misuse of aggregate</code>?",
        options: [
        "SELECT dept_id, AVG(salary) FROM instructors GROUP BY dept_id",
        "SELECT name FROM instructors WHERE salary > AVG(salary)",
        "SELECT dept_id FROM instructors GROUP BY dept_id HAVING AVG(salary) > 80000",
        "SELECT name FROM instructors WHERE salary > (SELECT AVG(salary) FROM instructors)"
      ],
        answer: 1,
        why: "WHERE works on single rows, before any grouping. So it cannot use AVG directly. Option D shows the fix: compute the average in a subquery."
      }
    },
    {
      h: 'Test your query before you trust it',
      html: `<p>A query that runs without an error can still be wrong. Professionals check results with small, cheap tests:</p>
<ul>
<li><strong>Count before and after a join.</strong> If the count jumps, the join is multiplying rows (one-to-many). Maybe you need DISTINCT, EXISTS, or to aggregate first.</li>
<li><strong>Check one row by hand.</strong> Pick one student, compute their answer with a simple query, and compare.</li>
<li><strong>Check totals.</strong> The sum of per-group counts should equal the total count (unless you filtered on purpose).</li>
<li><strong>Look for NULLs.</strong> Run <code>WHERE col IS NULL</code> on every column you filter or join on.</li>
</ul>`,
      sql: `-- Check: do the per-method counts add up to all payments?
SELECT (SELECT COUNT(*) FROM payments) AS total_payments,
       (SELECT SUM(n) FROM (SELECT method, COUNT(*) AS n
                            FROM payments GROUP BY method)) AS sum_of_groups,
       (SELECT COUNT(*) FROM students WHERE city IS NULL) AS students_without_city;`
    },
    {
      h: 'NULL review: three different counts',
      html: `<p>NULL causes more wrong answers than any other topic. Remember: <code>COUNT(*)</code> counts rows, <code>COUNT(col)</code> counts non-NULL values, <code>COUNT(DISTINCT col)</code> counts different non-NULL values.</p>`,
      predict: {
        sql: `SELECT COUNT(*) AS all_rows,
       COUNT(advisor_id) AS with_advisor,
       COUNT(DISTINCT advisor_id) AS different_advisors
FROM students;`,
        q: "There are 40 students. 7 of them have no advisor. 14 instructors are advisors. What are the three numbers?",
        options: [
        "40, 40, 14",
        "40, 33, 14",
        "33, 33, 14",
        "40, 33, 15"
      ],
        answer: 1,
        why: "COUNT(*) counts every row (40). COUNT(advisor_id) skips the 7 NULLs (33). COUNT(DISTINCT advisor_id) counts the different values that are not NULL (14)."
      }
    },
    {
      h: 'Joins in one picture',
      html: `<p>A quick review before the exam. All examples join students (left) to departments (right).</p>
<table class="mini"><thead><tr><th>Join</th><th>Keeps</th><th>Typical use</th></tr></thead><tbody>
<tr><td>INNER JOIN</td><td>only students with a matching department</td><td>normal lookups</td></tr>
<tr><td>LEFT JOIN</td><td>all students; department columns NULL if no match</td><td>"including students without a major"</td></tr>
<tr><td>RIGHT JOIN</td><td>all departments</td><td>rare; usually rewritten as LEFT JOIN</td></tr>
<tr><td>FULL OUTER JOIN</td><td>all students and all departments</td><td>comparing two lists</td></tr>
<tr><td>CROSS JOIN</td><td>every student × every department</td><td>generating combinations</td></tr>
<tr><td>Self join</td><td>a table joined to itself with two aliases</td><td>instructor → mentor</td></tr>
</tbody></table>
<div class="callout">A condition on the right table in <strong>WHERE</strong> removes the NULL rows a LEFT JOIN created. Put it in the <strong>ON</strong> clause if you want to keep them.</div>`,
      sql: `SELECT d.name, COUNT(s.student_id) AS students
FROM departments d
LEFT JOIN students s ON s.dept_id = d.dept_id AND s.year = 4
GROUP BY d.name
ORDER BY students DESC, d.name;`,
      note: 'The year filter is in ON, so departments with no fourth-year students still appear with 0. Move it to WHERE and watch them disappear.'
    },
    {
      h: 'Cheat sheet: the full SELECT',
      html: `<p>Everything from this week in one statement. The numbers show the order in which the database evaluates each part.</p>
<pre class="code">WITH step AS (SELECT ...)                    -- 0  named steps (CTEs)
SELECT DISTINCT col, expr AS alias,          -- 6  output (7 DISTINCT)
       AGG(col),                             --    aggregates per group
       FN() OVER (PARTITION BY g             -- 5  window functions
                  ORDER BY o
                  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
FROM t1 a                                    -- 1  sources
[INNER | LEFT] JOIN t2 b ON b.k = a.k        --    joins
WHERE row_condition                          -- 2  filter rows (no aggregates)
GROUP BY col                                 -- 3  form groups
HAVING group_condition                       -- 4  filter groups (aggregates OK)
ORDER BY col DESC, other                     -- 8  sort (aliases OK)
LIMIT n OFFSET m;                            -- 9  cut

query1 UNION [ALL] | INTERSECT | EXCEPT query2

WHERE x IN (SELECT ...)          WHERE EXISTS (SELECT 1 ... correlated)
WHERE x > (SELECT AVG(...) ...)  FROM (SELECT ...) AS derived
CASE WHEN cond THEN a ELSE b END COALESCE(x, default)   x IS [NOT] NULL</pre>`
    }
  ],
  pitfalls: [
    'Starting to type before deciding what one output row looks like. Write the column list first, in a comment if needed.',
    'Trusting a query because it ran without errors. Check row counts and one example row by hand.',
    'Selecting a column that is not in GROUP BY and not aggregated. SQLite allows it; your exam database will not.',
    'Filtering the right table of a LEFT JOIN in WHERE, which turns it back into an inner join.',
    'Forgetting NULLs: in NOT IN lists, in comparisons (<code>= NULL</code> is never true), and in COUNT(column).'
  ],
  dialect: `<ul>
<li><strong>GROUP BY strictness:</strong> PostgreSQL, SQL Server and Oracle reject non-grouped columns. MySQL rejects them when <code>ONLY_FULL_GROUP_BY</code> is on (the default since 5.7). SQLite accepts them.</li>
<li><strong>Limit:</strong> <code>LIMIT</code> (SQLite, PostgreSQL, MySQL), <code>TOP n</code> (SQL Server), <code>FETCH FIRST n ROWS ONLY</code> (Oracle 12c+, standard).</li>
<li><strong>Set difference:</strong> <code>EXCEPT</code> everywhere except Oracle, which uses <code>MINUS</code>.</li>
<li><strong>String matching:</strong> <code>LIKE</code> is case-insensitive for ASCII in SQLite and MySQL (default collation), but case-sensitive in PostgreSQL and Oracle. PostgreSQL has <code>ILIKE</code> for case-insensitive matching.</li>
<li><strong>Dates:</strong> SQLite stores dates as text and uses <code>strftime</code>/<code>julianday</code>. PostgreSQL uses <code>EXTRACT</code>/<code>date_trunc</code>, MySQL <code>YEAR()</code>/<code>DATE_FORMAT</code>, SQL Server <code>YEAR()</code>/<code>FORMAT</code>, Oracle <code>EXTRACT</code>/<code>TO_CHAR</code>.</li>
</ul>`,
  exercises: [
    {
      id: 'd7-1', level: 1,
      prompt: "<p>How many students major in each department?</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code> (the department name), <code>student_count</code></li><li><b>Note:</b> Show every department. A department with no students shows 0.</li></ul>",
      solution: `SELECT d.name, COUNT(s.student_id) AS student_count FROM departments d LEFT JOIN students s ON s.dept_id = d.dept_id GROUP BY d.dept_id, d.name;`,
      hints: [
        "\"Show every department\" means the departments table must keep all its rows.",
        "LEFT JOIN from departments to students. Then GROUP BY department.",
        "COUNT(*) gives 1 for an empty department. Count a column from students instead."
      ]
    },
    {
      id: 'd7-2', level: 1,
      prompt: "<p>Find the courses that have the word <code>Systems</code> in their title.</p><ul class=\"spec\"><li><b>Columns:</b> <code>course_id</code>, <code>title</code></li></ul>",
      solution: `SELECT course_id, title FROM courses WHERE title LIKE '%Systems%';`,
      hints: [
        "To search inside text, use LIKE.",
        "% matches any number of characters, before or after the word.",
        "WHERE title LIKE '%Systems%'"
      ]
    },
    {
      id: 'd7-3', level: 2,
      prompt: "<p>For each enrollment that has a score, show the score next to the average score of its section.</p><ul class=\"spec\"><li><b>Columns:</b> <code>section_id</code>, <code>student_id</code>, <code>score</code>, <code>section_avg</code></li><li><b>Note:</b> Use only rows where score is not NULL. Round <code>section_avg</code> to 2 decimals.</li></ul>",
      solution: `SELECT section_id, student_id, score, ROUND(AVG(score) OVER (PARTITION BY section_id), 2) AS section_avg FROM enrollments WHERE score IS NOT NULL;`,
      hints: [
        "You need one row per enrollment plus one value per section. GROUP BY would merge the rows.",
        "A window function with PARTITION BY section_id keeps every row.",
        "Remove rows without a score first: WHERE score IS NOT NULL."
      ]
    },
    {
      id: 'd7-4', level: 1,
      prompt: "<p>Find every student who has no advisor.</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code>, <code>city</code></li></ul>",
      solution: `SELECT name, city FROM students WHERE advisor_id IS NULL;`,
      hints: [
        "\"No advisor\" means the advisor_id value is missing (NULL).",
        "You cannot test NULL with =.",
        "WHERE advisor_id IS NULL"
      ]
    },
    {
      id: 'd7-5', level: 2,
      prompt: "<p>Find the instructors who teach 3 or more sections. Count the sections of all terms.</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code>, <code>sections</code> (how many sections they teach)</li></ul>",
      solution: `SELECT i.name, COUNT(*) AS sections FROM instructors i JOIN sections s ON s.instructor_id = i.instructor_id GROUP BY i.instructor_id, i.name HAVING COUNT(*) >= 3;`,
      hints: [
        "Count the sections of each instructor: join, then GROUP BY instructor.",
        "A condition on a count goes in HAVING, not in WHERE.",
        "Group by instructor_id and name, in case two instructors have the same name."
      ]
    },
    {
      id: 'd7-6', level: 2,
      prompt: "<p>Show each instructor who has a mentor, next to the mentor's name.</p><ul class=\"spec\"><li><b>Columns:</b> <code>instructor</code>, <code>mentor</code></li></ul>",
      solution: `SELECT i.name AS instructor, m.name AS mentor FROM instructors i JOIN instructors m ON m.instructor_id = i.mentor_id;`,
      hints: [
        "Both names are in the same table. So you need the table twice.",
        "Give the two copies different aliases, for example i and m.",
        "JOIN instructors m ON m.instructor_id = i.mentor_id"
      ]
    },
    {
      id: 'd7-7', level: 1,
      prompt: "<p>Find the students who never enrolled in any section.</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code></li></ul>",
      solution: `SELECT name FROM students st WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = st.student_id);`,
      hints: [
        "\"Never\" is a sign for NOT EXISTS (or LEFT JOIN ... IS NULL).",
        "Use NOT EXISTS with a subquery on enrollments that links to the outer student.",
        "WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = st.student_id)"
      ]
    },
    {
      id: 'd7-8', level: 2,
      prompt: "<p>Split all enrollments into two groups and count each group: <code>graded</code> (the grade is known) and <code>in progress</code> (the grade is NULL).</p><ul class=\"spec\"><li><b>Columns:</b> <code>status</code>, <code>n</code> (the number of enrollments)</li><li><b>Note:</b> <code>status</code> must be exactly the text <code>graded</code> or <code>in progress</code>.</li></ul>",
      solution: `SELECT CASE WHEN grade IS NULL THEN 'in progress' ELSE 'graded' END AS status, COUNT(*) AS n FROM enrollments GROUP BY status;`,
      hints: [
        "Make the label with a CASE expression.",
        "Then group by that label.",
        "CASE WHEN grade IS NULL THEN 'in progress' ELSE 'graded' END"
      ]
    },
    {
      id: 'd7-9', level: 2,
      prompt: "<p>Find the students who took at least one section taught by <code>Marco Rossi</code>.</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code></li><li><b>Note:</b> Show each student only once.</li></ul>",
      solution: `SELECT DISTINCT st.name FROM students st JOIN enrollments e ON e.student_id = st.student_id JOIN sections s ON s.section_id = e.section_id JOIN instructors i ON i.instructor_id = s.instructor_id WHERE i.name = 'Marco Rossi';`,
      hints: [
        "Path: students → enrollments → sections → instructors.",
        "A student may have taken several of his sections. Remove the copies.",
        "Use DISTINCT, or an EXISTS subquery."
      ]
    },
    {
      id: 'd7-10', level: 2,
      prompt: "<p>Find the cities that have both a Computer Science student (dept_id 1) and a Mathematics student (dept_id 2).</p><ul class=\"spec\"><li><b>Columns:</b> <code>city</code></li><li><b>Note:</b> Ignore students whose city is NULL.</li></ul>",
      solution: `SELECT city FROM students WHERE dept_id = 1 AND city IS NOT NULL INTERSECT SELECT city FROM students WHERE dept_id = 2 AND city IS NOT NULL;`,
      hints: [
        "You want the cities that are in both lists.",
        "INTERSECT keeps the values that are in both lists.",
        "INTERSECT treats NULLs as equal. So remove NULL cities in both halves."
      ]
    },
    {
      id: 'd7-11', level: 3,
      prompt: "<p>Find the student with the highest average score. Use only enrollments that have a score.</p><ul class=\"spec\"><li><b>Columns:</b> <code>name</code>, <code>avg_score</code></li><li><b>Note:</b> Do not round the average. If several students share the highest average, show all of them.</li></ul>",
      solution: `WITH avgs AS (SELECT student_id, AVG(score) AS avg_score FROM enrollments WHERE score IS NOT NULL GROUP BY student_id) SELECT st.name, a.avg_score FROM avgs a JOIN students st ON st.student_id = a.student_id WHERE a.avg_score = (SELECT MAX(avg_score) FROM avgs);`,
      hints: [
        "Step 1: the average score of each student. Step 2: the highest of those averages.",
        "A WITH step lets you use the averages twice.",
        "WHERE avg_score = (SELECT MAX(avg_score) FROM avgs). ORDER BY ... LIMIT 1 would hide ties."
      ]
    },
    {
      id: 'd7-12', level: 3,
      prompt: "<p>Show the total payments of each month in 2026, and the change from the month before.</p><ul class=\"spec\"><li><b>Columns:</b> <code>month</code> (text like <code>2026-03</code>), <code>total</code>, <code>change</code></li><li><b>Order:</b> by <code>month</code>.</li><li><b>Note:</b> <code>change</code> is this month's total minus the previous month's total. The first month of 2026 has no previous month, so its change is NULL.</li></ul>",
      solution: `WITH monthly AS (SELECT strftime('%Y-%m', paid_on) AS month, SUM(amount) AS total FROM payments WHERE paid_on >= '2026-01-01' AND paid_on < '2027-01-01' GROUP BY month) SELECT month, total, total - LAG(total) OVER (ORDER BY month) AS change FROM monthly ORDER BY month;`,
      ordered: true,
      hints: [
        "strftime('%Y-%m', paid_on) turns a date into its month.",
        "First compute the total of each month (GROUP BY in a WITH step). Then compare each month with the one before.",
        "total - LAG(total) OVER (ORDER BY month). Keep only 2026 before grouping."
      ]
    }
  ],
  quiz: [
    { id: 'd7-q1', q: "A question says \"list every department, even those with no courses\". What do you need?", options: [
        "INNER JOIN",
        "LEFT JOIN from departments",
        "CROSS JOIN",
        "UNION"
      ], answer: 1, why: "A LEFT JOIN keeps every row of the left table. When there is no match, the right side gets NULLs." },
    { id: 'd7-q2', q: "Where must a condition like <code>COUNT(*) &gt; 5</code> go?", options: [
        "WHERE",
        "HAVING",
        "ON",
        "ORDER BY"
      ], answer: 1, why: "Counts exist only after grouping. WHERE runs before grouping. HAVING runs after it." },
    { id: 'd7-q3', q: "What does <code>WHERE city = NULL</code> return?", options: [
        "Rows where city is NULL",
        "All rows",
        "No rows",
        "An error"
      ], answer: 2, why: "Any comparison with NULL is UNKNOWN. WHERE keeps only TRUE rows. Use IS NULL instead." },
    { id: 'd7-q4', q: "After a join, 40 students became 156 rows. What most likely happened?", options: [
        "A bug in the database",
        "The join is one-to-many: each student matches several enrollments",
        "The LEFT JOIN added NULL rows",
        "DISTINCT was applied"
      ], answer: 1, why: "When you join to the \"many\" side, each \"one\" row repeats once per match. Depending on the question, use GROUP BY, EXISTS or DISTINCT." },
    { id: 'd7-q5', q: "You need the best-paid instructor in each department, and you must keep ties. Which is correct?", options: [
        "GROUP BY dept_id with MAX(salary) and SELECT name",
        "RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) in a CTE, then keep rank 1",
        "ORDER BY salary DESC LIMIT 1",
        "ROW_NUMBER() without PARTITION BY"
      ], answer: 1, why: "Option A selects a name that is not grouped (wrong in strict SQL). Option C gives one row for the whole university. Option D does not start again per department, and it drops ties." },
    { id: 'd7-q6', q: "In which order does the database run the clauses?", options: [
        "SELECT, FROM, WHERE, GROUP BY",
        "FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY",
        "FROM, SELECT, WHERE, ORDER BY",
        "WHERE, FROM, GROUP BY, SELECT"
      ], answer: 1, why: "This order explains why aliases work in ORDER BY but not in WHERE. It also explains why WHERE cannot use COUNT or AVG." },
    { id: 'd7-q7', q: "<code>payments.student_id</code> might contain NULLs. Which query safely finds students with no payments?", options: [
        "WHERE student_id NOT IN (SELECT student_id FROM payments)",
        "WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.student_id = s.student_id)",
        "WHERE student_id <> (SELECT student_id FROM payments)",
        "JOIN payments ON ... WHERE amount IS NULL"
      ], answer: 1, why: "NOT EXISTS is never UNKNOWN, so NULLs cannot empty the result. NOT IN returns no rows if the list contains a NULL." },
    { id: 'd7-q8', q: "The cities are Cairo, Cairo, NULL, Amman, NULL. What does <code>SELECT COUNT(DISTINCT city) FROM students</code> return?", options: [
        "5",
        "4",
        "3",
        "2"
      ], answer: 3, why: "COUNT(DISTINCT col) counts the different values that are not NULL: Cairo and Amman, so 2." },
    { id: 'd7-q9', q: "Which question needs a recursive CTE?", options: [
        "Average salary per department",
        "All courses a course depends on, at any depth",
        "Students with no advisor",
        "Second highest salary"
      ], answer: 1, why: "Chains and trees of unknown depth need recursion. The others need GROUP BY, IS NULL, or a ranking or subquery." }
  ],
  teach: 'Describe your step-by-step method for writing a SQL query from an English question, and apply it to: "For each department, the number of students who have never made a payment."',
  rubric: 'Starts from the shape of one output row (department name, count); identifies tables (departments, students, payments); join path via dept_id and student_id; "never made a payment" → NOT EXISTS / LEFT JOIN ... IS NULL on payments; "for each department" → GROUP BY department; mentions including departments with zero such students (LEFT JOIN + COUNT(column)) or justifies excluding them; mentions checking the result (counts, one example by hand).'
});
