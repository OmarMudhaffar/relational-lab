LAB.days.push({
  n: 6,
  week: 1,
  tag: 'WINDOW',
  title: 'CTEs and Window Functions',
  hours: 3,
  goals: [
    'Break a long query into named steps with WITH (common table expressions)',
    'Walk hierarchies and chains with recursive CTEs',
    'Compute per-row results over a group without losing rows, using OVER (PARTITION BY ... ORDER BY ...)',
    'Choose correctly between ROW_NUMBER, RANK and DENSE_RANK',
    'Build running totals, moving averages, LAG/LEAD comparisons and percent-of-total columns'
  ],
  lesson: [
    {
      h: 'WITH: give a step a name',
      html: `<p>Yesterday you nested subqueries. Nesting gets hard to read after two levels. A <strong>common table expression (CTE)</strong> lets you write the inner query first, give it a name, and then use that name like a table.</p>
<pre class="code">WITH name AS (
  SELECT ...          -- step 1
)
SELECT ... FROM name; -- step 2 uses step 1</pre>
<p>The CTE exists only while this one statement runs. It is not saved anywhere.</p>`,
      sql: `WITH credits_taken AS (
  SELECT e.student_id, SUM(c.credits) AS credits
  FROM enrollments e
  JOIN sections s ON s.section_id = e.section_id
  JOIN courses  c ON c.course_id  = s.course_id
  GROUP BY e.student_id
)
SELECT st.name, ct.credits
FROM credits_taken ct
JOIN students st ON st.student_id = ct.student_id
WHERE ct.credits >= 20
ORDER BY ct.credits DESC, st.name;`
    },
    {
      h: 'Chaining CTEs',
      html: `<p>You can define several CTEs, separated by commas. Each one may use the CTEs defined before it. Think of it as a small pipeline: each step does one job. This is also the easiest way to <strong>debug</strong> a long query: run <code>SELECT * FROM step1</code> on its own, check it, then move on.</p>`,
      sql: `WITH dept_pay AS (
  SELECT dept_id, AVG(salary) AS avg_salary
  FROM instructors
  WHERE dept_id IS NOT NULL
  GROUP BY dept_id
),
overall AS (
  SELECT AVG(avg_salary) AS mean_of_depts FROM dept_pay
)
SELECT d.name, ROUND(dp.avg_salary) AS avg_salary
FROM dept_pay dp
JOIN departments d ON d.dept_id = dp.dept_id
CROSS JOIN overall o
WHERE dp.avg_salary > o.mean_of_depts
ORDER BY dp.avg_salary DESC;`
    },
    {
      h: 'Recursive CTEs: following a chain',
      html: `<p>CS420 requires CS340 and CS220. Those require CS201, which requires CS101. How do you list <em>all</em> prerequisites, at any depth? A join handles one level. A <strong>recursive CTE</strong> repeats a join until no new rows appear.</p>
<ol class="steps"><li><strong>Anchor member:</strong> the starting rows (the direct prerequisites of CS420).</li><li><strong>Recursive member:</strong> joins the CTE to the table again to find the next level.</li><li>The engine repeats step 2 with the newest rows until a round produces nothing.</li></ol>
<p>Use <code>UNION</code> (not UNION ALL) when the same row could be reached twice. It also protects you from infinite loops if the data has a cycle.</p>`,
      sql: `WITH RECURSIVE chain(course_id, level) AS (
  SELECT prereq_id, 1 FROM prereqs WHERE course_id = 'CS420'   -- anchor
  UNION
  SELECT p.prereq_id, chain.level + 1                          -- recursive step
  FROM prereqs p
  JOIN chain ON p.course_id = chain.course_id
)
SELECT course_id, MIN(level) AS distance
FROM chain
GROUP BY course_id
ORDER BY distance, course_id;`
    },
    {
      h: 'Recursive CTEs: walking a hierarchy',
      html: `<p>The same idea walks a tree such as an organisation chart. Here the anchor is every instructor without a mentor (depth 0). Each round adds the people they mentor, one level deeper. We also build a readable <code>path</code> string as we go.</p>`,
      sql: `WITH RECURSIVE tree(instructor_id, name, depth, path) AS (
  SELECT instructor_id, name, 0, name
  FROM instructors WHERE mentor_id IS NULL
  UNION ALL
  SELECT i.instructor_id, i.name, t.depth + 1, t.path || ' > ' || i.name
  FROM instructors i
  JOIN tree t ON i.mentor_id = t.instructor_id
)
SELECT name, depth, path FROM tree ORDER BY path;`,
      note: 'UNION ALL is safe here because a tree has no cycles. Sorting by path prints each mentor above the people they mentor.'
    },
    {
      h: 'Window functions keep the rows',
      html: `<p>GROUP BY collapses many rows into one row per group. Sometimes you want the group result <strong>next to every row</strong>: each instructor's salary and the department average on the same line. A <strong>window function</strong> does this. The <code>OVER (...)</code> clause defines the "window" of rows the function looks at.</p>
<ul><li><code>OVER ()</code>: the whole result is one window.</li><li><code>OVER (PARTITION BY dept_id)</code>: one window per department.</li></ul>
<p>Window functions are computed after WHERE, GROUP BY and HAVING, just before ORDER BY.</p>`,
      predict: {
        sql: `SELECT name, dept_id, salary,
       ROUND(AVG(salary) OVER (PARTITION BY dept_id)) AS dept_avg,
       salary - AVG(salary) OVER (PARTITION BY dept_id) AS diff
FROM instructors
WHERE dept_id IS NOT NULL
ORDER BY dept_id, salary DESC;`,
        q: '15 instructors have a department, in 7 departments. How many rows does this query return?',
        options: ['7 rows, one per department', '15 rows, one per instructor', '1 row', 'An error: salary is not in a GROUP BY'],
        answer: 1,
        why: 'There is no GROUP BY, so no rows are collapsed. The window function adds the department average to each of the 15 rows.'
      }
    },
    {
      h: 'ROW_NUMBER, RANK and DENSE_RANK',
      html: `<p>Ranking functions need an <code>ORDER BY</code> inside OVER. They differ only when there are <strong>ties</strong>:</p>
<table class="mini"><thead><tr><th>credits</th><th>ROW_NUMBER</th><th>RANK</th><th>DENSE_RANK</th></tr></thead><tbody>
<tr><td>4</td><td>1</td><td>1</td><td>1</td></tr><tr><td>4</td><td>2</td><td>1</td><td>1</td></tr><tr><td>3</td><td>3</td><td>3</td><td>2</td></tr><tr><td>3</td><td>4</td><td>3</td><td>2</td></tr>
</tbody></table>
<ul><li><strong>ROW_NUMBER</strong> always gives 1, 2, 3, ... Ties are broken in an unpredictable way unless you add a tiebreaker.</li><li><strong>RANK</strong> gives ties the same number, then skips (like a sports table: 1, 1, 3).</li><li><strong>DENSE_RANK</strong> gives ties the same number and does not skip (1, 1, 2).</li></ul>`,
      predict: {
        sql: `SELECT course_id, credits,
       ROW_NUMBER() OVER (ORDER BY credits DESC, course_id) AS rn,
       RANK()       OVER (ORDER BY credits DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY credits DESC) AS dense
FROM courses
ORDER BY rn;`,
        q: 'Eleven courses have 4 credits and the rest have 3. What RANK do the 3-credit courses get?',
        options: ['2', '3', '11', '12'],
        answer: 3,
        why: 'Eleven rows share rank 1, so RANK skips to 12 for the next value. DENSE_RANK would give them 2.'
      }
    },
    {
      h: 'Top-N per group',
      html: `<p>A classic interview question: "Show the best student in each section." You cannot write a window function inside WHERE, because WHERE runs before windows are computed. So rank inside a CTE, then filter outside.</p>
<p>Use <code>RANK</code> if tied students should all be shown. Use <code>ROW_NUMBER</code> if you need exactly one row per group (and add a tiebreaker).</p>`,
      sql: `WITH ranked AS (
  SELECT e.section_id, st.name, e.score,
         RANK() OVER (PARTITION BY e.section_id ORDER BY e.score DESC) AS pos
  FROM enrollments e
  JOIN students st ON st.student_id = e.student_id
  WHERE e.score IS NOT NULL
)
SELECT section_id, name, score
FROM ranked
WHERE pos = 1
ORDER BY section_id;`
    },
    {
      h: 'Running totals and moving averages',
      html: `<p>When a window has an ORDER BY, aggregate functions become <strong>cumulative</strong>: <code>SUM(amount) OVER (ORDER BY paid_on)</code> adds up everything from the first row to the current row.</p>
<p>A <strong>frame clause</strong> chooses exactly which rows count. <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> means "this row and the two before it", which gives a 3-row moving average.</p>
<div class="callout warn"><strong>Ties in the ORDER BY.</strong> With only ORDER BY, the default frame is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. Rows with the same date are peers and are added together. Add a unique tiebreaker (like payment_id) or write <code>ROWS</code> to get a true row-by-row running total.</div>`,
      sql: `SELECT payment_id, student_id, paid_on, amount,
       SUM(amount) OVER (PARTITION BY student_id ORDER BY paid_on, payment_id) AS running_total,
       ROUND(AVG(amount) OVER (PARTITION BY student_id ORDER BY paid_on, payment_id
                               ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS moving_avg_3
FROM payments
ORDER BY student_id, paid_on, payment_id;`
    },
    {
      h: 'LAG and LEAD: compare with the neighbour row',
      html: `<p><code>LAG(col)</code> returns the value of <code>col</code> from the <strong>previous</strong> row of the window. <code>LEAD(col)</code> returns it from the <strong>next</strong> row. The first row has no previous row, so LAG returns NULL there (or a default you give as the third argument).</p>
<p>In SQLite, <code>julianday(a) - julianday(b)</code> gives the number of days between two dates.</p>`,
      sql: `SELECT student_id, paid_on, amount,
       LAG(paid_on) OVER (PARTITION BY student_id ORDER BY paid_on) AS previous_payment,
       julianday(paid_on)
         - julianday(LAG(paid_on) OVER (PARTITION BY student_id ORDER BY paid_on)) AS days_since_previous
FROM payments
ORDER BY student_id, paid_on;`
    },
    {
      h: 'NTILE and percent of total',
      html: `<p><code>NTILE(4) OVER (ORDER BY x)</code> splits the rows into 4 groups of nearly equal size (quartiles) and returns the group number.</p>
<p>A percent of total divides each row's value by a window sum over everything: <code>x / SUM(x) OVER ()</code>. Window functions can even wrap an aggregate: <code>SUM(SUM(salary)) OVER ()</code> is the total of the per-group totals.</p>`,
      sql: `SELECT d.name,
       SUM(i.salary) AS total_salary,
       ROUND(100.0 * SUM(i.salary) / SUM(SUM(i.salary)) OVER (), 1) AS pct_of_payroll,
       NTILE(3) OVER (ORDER BY SUM(i.salary) DESC) AS tier
FROM instructors i
JOIN departments d ON d.dept_id = i.dept_id
GROUP BY d.name
ORDER BY total_salary DESC;`
    }
  ],
  pitfalls: [
    'Putting a window function in WHERE or HAVING. It is not allowed, because windows are computed after them. Rank in a CTE or subquery, then filter outside.',
    'Using ROW_NUMBER for "top N" when ties exist and without a tiebreaker. The result can change from run to run. Use RANK, or add a unique column to the ORDER BY.',
    'Forgetting that ORDER BY inside OVER changes the default frame. <code>SUM(x) OVER (PARTITION BY g)</code> is the group total, but <code>SUM(x) OVER (PARTITION BY g ORDER BY d)</code> is a running total.',
    'Writing a recursive CTE without a condition that stops it. With UNION ALL and a cycle in the data, it runs forever. Use UNION, a depth limit (<code>WHERE depth &lt; 20</code>), or a path check.',
    'Assuming a CTE is stored or reused across queries. It exists only for the one statement that defines it.'
  ],
  dialect: `<ul>
<li><strong>Support:</strong> CTEs and window functions exist in PostgreSQL, SQL Server, Oracle, SQLite 3.25+ and MySQL 8.0+. MySQL 5.7 has neither, which is why old tutorials use user variables for ranking.</li>
<li><strong>RECURSIVE keyword:</strong> required in PostgreSQL and MySQL, optional in SQLite. SQL Server and Oracle do not use it: they just write <code>WITH name AS (...)</code> and detect the recursion.</li>
<li><strong>Oracle hierarchies:</strong> Oracle also has its own older syntax, <code>START WITH ... CONNECT BY PRIOR</code>, which you will see in exams that use Oracle.</li>
<li><strong>Date differences:</strong> SQLite uses <code>julianday(a) - julianday(b)</code>. PostgreSQL subtracts dates directly (<code>a - b</code>). MySQL uses <code>DATEDIFF(a, b)</code>. SQL Server uses <code>DATEDIFF(day, b, a)</code>.</li>
<li><strong>QUALIFY:</strong> Snowflake, BigQuery and DuckDB allow <code>QUALIFY rank = 1</code> to filter on a window directly. The other databases need the CTE pattern.</li>
</ul>`,
  exercises: [
    {
      id: 'd6-1', level: 1,
      prompt: 'Using a CTE that computes the average salary per department, return the department <code>name</code> and <code>avg_salary</code> of every department whose average instructor salary is above 80000.',
      solution: `WITH dept_pay AS (SELECT dept_id, AVG(salary) AS avg_salary FROM instructors GROUP BY dept_id) SELECT d.name, dp.avg_salary FROM dept_pay dp JOIN departments d ON d.dept_id = dp.dept_id WHERE dp.avg_salary > 80000;`,
      hints: ['Step 1 (the CTE): GROUP BY dept_id with AVG(salary).', 'Step 2: join the CTE to departments to get the name.', 'WITH dept_pay AS (SELECT dept_id, AVG(salary) AS avg_salary FROM instructors GROUP BY dept_id) SELECT ...']
    },
    {
      id: 'd6-2', level: 1,
      prompt: 'For every instructor who belongs to a department, show <code>name</code>, <code>dept_id</code>, <code>salary</code> and <code>dept_avg</code> (the average salary of their department) on the same row. Use a window function.',
      solution: `SELECT name, dept_id, salary, AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg FROM instructors WHERE dept_id IS NOT NULL;`,
      hints: ['You want one row per instructor, so do not use GROUP BY.', 'AVG(...) OVER (PARTITION BY ...)', 'Do not forget to exclude the instructor whose dept_id is NULL.']
    },
    {
      id: 'd6-3', level: 1,
      prompt: 'Number the courses inside each department in alphabetical order of title. Return <code>dept_id</code>, <code>course_id</code>, <code>title</code> and <code>pos</code> (1 for the first title in that department, 2 for the next, ...).',
      solution: `SELECT dept_id, course_id, title, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY title) AS pos FROM courses;`,
      hints: ['The numbering restarts in each department: PARTITION BY.', 'Titles are unique, so ROW_NUMBER gives a stable result here.', 'ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY title)']
    },
    {
      id: 'd6-4', level: 2,
      prompt: 'Inside each department, rank the courses by credits, highest first, so that courses with equal credits share a rank and the next rank is skipped. Return <code>dept_id</code>, <code>course_id</code>, <code>credits</code> and <code>credit_rank</code>.',
      solution: `SELECT dept_id, course_id, credits, RANK() OVER (PARTITION BY dept_id ORDER BY credits DESC) AS credit_rank FROM courses;`,
      hints: ['"Share a rank and skip the next" describes one of the three ranking functions.', 'RANK() skips after ties, DENSE_RANK() does not.', 'RANK() OVER (PARTITION BY dept_id ORDER BY credits DESC)']
    },
    {
      id: 'd6-5', level: 2,
      prompt: 'For each section that has graded scores, find the student(s) with the highest score. Return <code>section_id</code>, <code>student_id</code> and <code>score</code>. If two students tie for the top, show both.',
      solution: `WITH ranked AS (SELECT section_id, student_id, score, RANK() OVER (PARTITION BY section_id ORDER BY score DESC) AS pos FROM enrollments WHERE score IS NOT NULL) SELECT section_id, student_id, score FROM ranked WHERE pos = 1;`,
      hints: ['Rank the students inside each section, then keep rank 1.', 'You cannot filter on a window function in WHERE. Put the ranking in a CTE.', 'Use RANK (not ROW_NUMBER) so ties are kept.']
    },
    {
      id: 'd6-6', level: 2,
      prompt: 'For every payment, show the student\'s running total of payments so far. Return <code>student_id</code>, <code>payment_id</code>, <code>paid_on</code>, <code>amount</code> and <code>running_total</code>. Accumulate per student in order of <code>paid_on</code>, then <code>payment_id</code>. Sort the output by <code>student_id</code>, <code>paid_on</code>, <code>payment_id</code>.',
      solution: `SELECT student_id, payment_id, paid_on, amount, SUM(amount) OVER (PARTITION BY student_id ORDER BY paid_on, payment_id) AS running_total FROM payments ORDER BY student_id, paid_on, payment_id;`,
      ordered: true,
      hints: ['A running total is SUM with an ORDER BY inside OVER.', 'Restart the total for each student with PARTITION BY.', 'SUM(amount) OVER (PARTITION BY student_id ORDER BY paid_on, payment_id)']
    },
    {
      id: 'd6-7', level: 2,
      prompt: 'For every payment, show how many days have passed since the same student\'s previous payment (NULL for a student\'s first payment). Return <code>payment_id</code>, <code>student_id</code>, <code>paid_on</code> and <code>days_since_prev</code>.',
      solution: `SELECT payment_id, student_id, paid_on, julianday(paid_on) - julianday(LAG(paid_on) OVER (PARTITION BY student_id ORDER BY paid_on)) AS days_since_prev FROM payments;`,
      hints: ['The previous payment\'s date comes from LAG.', 'Partition by student and order by date inside OVER.', 'julianday(paid_on) - julianday(LAG(paid_on) OVER (...))']
    },
    {
      id: 'd6-8', level: 2,
      prompt: 'List every course that CS420 depends on, directly or indirectly (prerequisites of prerequisites, and so on). Return one column <code>course_id</code>, each course once.',
      solution: `WITH RECURSIVE chain(course_id) AS (SELECT prereq_id FROM prereqs WHERE course_id = 'CS420' UNION SELECT p.prereq_id FROM prereqs p JOIN chain c ON p.course_id = c.course_id) SELECT course_id FROM chain;`,
      hints: ['A chain of unknown length needs a recursive CTE.', 'Anchor: the direct prerequisites of CS420. Recursive step: prerequisites of the rows already found.', 'WITH RECURSIVE chain(course_id) AS (SELECT prereq_id FROM prereqs WHERE course_id = \'CS420\' UNION SELECT p.prereq_id FROM prereqs p JOIN chain ...)']
    },
    {
      id: 'd6-9', level: 3,
      prompt: 'Show every instructor with their depth in the mentoring tree: 0 for instructors without a mentor, 1 for people they mentor, and so on. Return <code>name</code> and <code>depth</code>.',
      solution: `WITH RECURSIVE tree(instructor_id, name, depth) AS (SELECT instructor_id, name, 0 FROM instructors WHERE mentor_id IS NULL UNION ALL SELECT i.instructor_id, i.name, t.depth + 1 FROM instructors i JOIN tree t ON i.mentor_id = t.instructor_id) SELECT name, depth FROM tree;`,
      hints: ['The anchor is every instructor whose mentor_id IS NULL, with depth 0.', 'The recursive step joins instructors whose mentor is already in the tree, adding 1 to depth.', 'JOIN tree t ON i.mentor_id = t.instructor_id']
    },
    {
      id: 'd6-10', level: 3,
      prompt: 'For each department that has instructors, show its <code>name</code>, <code>total_salary</code> (sum of its instructors\' salaries) and <code>pct</code>: its share of the payroll of all instructors who belong to a department, as a percentage rounded to 1 decimal (e.g. 23.4).',
      solution: `SELECT d.name, SUM(i.salary) AS total_salary, ROUND(100.0 * SUM(i.salary) / SUM(SUM(i.salary)) OVER (), 1) AS pct FROM instructors i JOIN departments d ON d.dept_id = i.dept_id GROUP BY d.name;`,
      hints: ['First group by department to get each total.', 'The grand total can come from a window over the grouped rows: SUM(SUM(salary)) OVER ().', 'Multiply by 100.0 (not 100) to avoid integer division, then ROUND(..., 1).']
    }
  ],
  quiz: [
    { id: 'd6-q1', q: 'What is the main difference between <code>AVG(salary) ... GROUP BY dept_id</code> and <code>AVG(salary) OVER (PARTITION BY dept_id)</code>?', options: ['The window version is faster', 'GROUP BY returns one row per department; the window version keeps every row', 'The window version ignores NULL salaries', 'There is no difference'], answer: 1, why: 'Window functions compute over a set of rows but do not collapse them. Every input row stays in the result.' },
    { id: 'd6-q2', q: 'Scores 95, 90, 90, 85 are ranked with DENSE_RANK (highest first). What does 85 get?', options: ['2', '3', '4', '1'], answer: 1, why: 'DENSE_RANK: 95→1, 90→2, 90→2, 85→3. RANK would give 85 the value 4.' },
    { id: 'd6-q3', q: 'Why does <code>WHERE ROW_NUMBER() OVER (...) = 1</code> fail?', options: ['ROW_NUMBER needs PARTITION BY', 'Window functions are evaluated after WHERE', 'You must use RANK in WHERE', 'WHERE cannot compare with numbers'], answer: 1, why: 'Logical order: FROM, WHERE, GROUP BY, HAVING, window functions, SELECT, ORDER BY. Compute the window in a CTE and filter in the outer query.' },
    { id: 'd6-q4', q: 'A recursive CTE has two parts joined by UNION or UNION ALL. What are they called?', options: ['Base table and view', 'Anchor member and recursive member', 'Outer query and inner query', 'Seed and index'], answer: 1, why: 'The anchor produces the starting rows; the recursive member refers to the CTE itself and runs until it adds no new rows.' },
    { id: 'd6-q5', q: 'What does <code>LAG(score) OVER (ORDER BY exam_date)</code> return on the first row?', options: ['0', 'The first score', 'NULL', 'An error'], answer: 2, why: 'There is no previous row, so LAG returns NULL, unless you pass a default as the third argument: LAG(score, 1, 0).' },
    { id: 'd6-q6', q: 'Which frame gives a 3-row moving average (this row and the two before it)?', options: ['ROWS BETWEEN 3 PRECEDING AND CURRENT ROW', 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', 'RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING'], answer: 1, why: '2 preceding rows + the current row = 3 rows. The RANGE option is the default running-total frame.' },
    { id: 'd6-q7', q: 'Which database needs a different syntax because it does not support CTEs at all?', options: ['PostgreSQL 15', 'SQL Server 2019', 'MySQL 5.7', 'SQLite 3.40'], answer: 2, why: 'MySQL added CTEs and window functions in version 8.0. The others all support them.' }
  ],
  teach: 'Explain the difference between ROW_NUMBER, RANK and DENSE_RANK, and describe a real question where the choice changes the answer.',
  rubric: 'All three need ORDER BY inside OVER; ROW_NUMBER gives unique consecutive numbers even for ties (arbitrary order among ties unless a tiebreaker is added); RANK gives ties the same number and skips the following numbers (1,1,3); DENSE_RANK gives ties the same number without gaps (1,1,2); example: top-3 students per section where ties exist, or "second highest salary" where DENSE_RANK = 2 is needed; PARTITION BY restarts numbering per group.'
});
