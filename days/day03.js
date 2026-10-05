LAB.days.push({
  n: 3,
  week: 1,
  tag: 'GROUP BY',
  title: 'Aggregation: Summaries, Groups and HAVING',
  hours: 2.5,
  goals: [
    'Summarise many rows into one with COUNT, SUM, AVG, MIN and MAX',
    'Explain how aggregate functions treat NULL',
    'Group rows with GROUP BY and filter groups with HAVING',
    'Count only some rows with conditional aggregation'
  ],
  lesson: [
    {
      h: 'Aggregate functions turn many rows into one',
      html: `<p>So far each output row came from one input row. An <strong>aggregate function</strong> reads many rows and returns one value. The five you must know:</p>
<table class="mini"><thead><tr><th>Function</th><th>Returns</th></tr></thead><tbody>
<tr><td><code>COUNT</code></td><td>how many</td></tr>
<tr><td><code>SUM</code></td><td>the total</td></tr>
<tr><td><code>AVG</code></td><td>the mean</td></tr>
<tr><td><code>MIN</code> / <code>MAX</code></td><td>the smallest / largest (works on numbers, text and dates)</td></tr>
</tbody></table>
<p>Without GROUP BY, the whole table (after WHERE) is one group, so you get exactly one row back.</p>`,
      sql: `SELECT COUNT(*)    AS instructors,
       SUM(salary) AS payroll,
       AVG(salary) AS avg_salary,
       MIN(hire_date) AS first_hire,
       MAX(salary) AS top_salary
FROM instructors;`
    },
    {
      h: 'Three kinds of COUNT',
      html: `<ul><li><code>COUNT(*)</code> counts <strong>rows</strong>. NULLs do not matter.</li>
<li><code>COUNT(col)</code> counts rows where <code>col</code> is <strong>not NULL</strong>.</li>
<li><code>COUNT(DISTINCT col)</code> counts the <strong>different</strong> non-NULL values.</li></ul>
<p>The enrollments table has 156 rows. 28 of them have no score yet (Fall 2026 courses are still running).</p>`,
      sql: `SELECT COUNT(*)                   AS all_rows,
       COUNT(score)               AS graded_rows,
       COUNT(DISTINCT student_id) AS different_students
FROM enrollments;`,
      predict: {
        sql: `SELECT COUNT(city), COUNT(DISTINCT city) FROM students;`,
        q: 'There are 40 students. Some have a NULL city. What is true about <code>COUNT(city)</code>?',
        options: ['It is 40', 'It is less than 40', 'It equals COUNT(DISTINCT city)', 'It raises an error because of NULLs'],
        answer: 1,
        why: 'COUNT(col) skips NULL values, so the students without a city are not counted. COUNT(DISTINCT city) is smaller still because many students share a city.'
      }
    },
    {
      h: 'Aggregates ignore NULL: the AVG trap',
      html: `<p>SUM, AVG, MIN and MAX skip NULLs too. This is usually what you want, but be careful with AVG. <code>AVG(score)</code> divides by the number of <strong>non-NULL</strong> scores, not by the number of rows.</p>
<p>So <code>AVG(score)</code> and <code>SUM(score) / COUNT(*)</code> give different answers when some scores are NULL. Ask yourself: is a missing score "unknown" (skip it) or "zero" (count it)? If it means zero, write <code>AVG(COALESCE(score, 0))</code>.</p>`,
      sql: `SELECT AVG(score)                AS avg_of_known_scores,
       SUM(score) / COUNT(*)     AS sum_over_all_rows,
       AVG(COALESCE(score, 0))   AS avg_with_null_as_zero
FROM enrollments;`,
      note: 'The first value is about 72.6. The other two are about 59.6, because they also divide by the 28 ungraded rows.'
    },
    {
      h: 'GROUP BY: one summary row per group',
      html: `<p><code>GROUP BY col</code> splits the rows into groups that share the same value of <code>col</code>. Then each aggregate is computed <strong>once per group</strong>. The result has one row per group.</p>
<p>NULL values form one group of their own. Below, the instructor with no department appears in a group with <code>dept_id</code> NULL.</p>`,
      sql: `SELECT dept_id,
       COUNT(*)    AS staff,
       AVG(salary) AS avg_salary,
       MAX(salary) AS top_salary
FROM instructors
GROUP BY dept_id
ORDER BY dept_id;`
    },
    {
      h: 'The golden rule of GROUP BY',
      html: `<p>After grouping, each output row stands for a <strong>whole group</strong>. So every column in SELECT must be either</p>
<ol><li>listed in <code>GROUP BY</code> (it has one value per group), or</li><li>inside an aggregate function.</li></ol>
<pre class="code">-- Wrong: which name? A department has many instructors.
SELECT dept_id, name, MAX(salary)
FROM instructors
GROUP BY dept_id;</pre>
<div class="callout warn">SQLite accepts the query above and picks a name for you (it happens to be the row with the max salary, but only for MIN/MAX). PostgreSQL, SQL Server and Oracle reject it. MySQL rejects it when <code>ONLY_FULL_GROUP_BY</code> is on, which is the default since 5.7. In exams, always follow the rule.</div>`,
      predict: {
        q: 'Which query is valid in PostgreSQL?',
        options: ['SELECT dept_id, name, COUNT(*) FROM students GROUP BY dept_id', 'SELECT dept_id, year, COUNT(*) FROM students GROUP BY dept_id, year', 'SELECT name, COUNT(*) FROM students', 'SELECT dept_id, COUNT(*) FROM students GROUP BY year'],
        answer: 1,
        why: 'Both non-aggregated columns (dept_id and year) are in GROUP BY. The other queries select a column that is neither grouped nor aggregated.'
      }
    },
    {
      h: 'Grouping by several columns',
      html: `<p>With <code>GROUP BY a, b</code> each group is one <strong>combination</strong> of a and b. Here every (semester, year) pair is a group: we count how many sections ran in each term.</p>`,
      sql: `SELECT year, semester, COUNT(*) AS sections_offered
FROM sections
GROUP BY year, semester
ORDER BY year, semester;`
    },
    {
      h: 'WHERE filters rows, HAVING filters groups',
      html: `<p>Remember the evaluation order: <code>FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY</code>.</p>
<ul><li><code>WHERE</code> runs <strong>before</strong> grouping. It removes single rows. It cannot use aggregates.</li>
<li><code>HAVING</code> runs <strong>after</strong> grouping. It removes whole groups. It usually tests an aggregate.</li></ul>
<p>Question: "Which students took at least 5 courses that already have a score?" The score condition is about single rows (WHERE). The "at least 5" is about the group (HAVING).</p>`,
      sql: `SELECT student_id,
       COUNT(*) AS graded_courses,
       ROUND(AVG(score), 1) AS avg_score
FROM enrollments
WHERE score IS NOT NULL
GROUP BY student_id
HAVING COUNT(*) >= 5
ORDER BY avg_score DESC;`,
      predict: {
        q: 'What happens with <code>SELECT student_id FROM enrollments WHERE COUNT(*) &gt; 3 GROUP BY student_id</code>?',
        options: ['It returns students with more than 3 enrollments', 'It returns every student', 'An error: aggregates are not allowed in WHERE', 'It returns nothing'],
        answer: 2,
        why: 'WHERE runs before the groups exist, so COUNT(*) has nothing to count yet. Move the condition to HAVING.'
      }
    },
    {
      h: 'Conditional aggregation',
      html: `<p>You often want several counts in one row: how many A grades, how many F grades, and so on. Put a CASE inside the aggregate. Rows that do not match add 0.</p>
<pre class="code">SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END)</pre>
<p>PostgreSQL also has a cleaner standard syntax: <code>COUNT(*) FILTER (WHERE grade = 'A')</code>. SQLite supports FILTER as well, but MySQL and SQL Server do not, so the CASE version is the portable one.</p>`,
      sql: `SELECT section_id,
       COUNT(*) AS students,
       SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) AS a_grades,
       SUM(CASE WHEN grade = 'F' THEN 1 ELSE 0 END) AS f_grades,
       SUM(CASE WHEN grade IS NULL THEN 1 ELSE 0 END) AS in_progress
FROM enrollments
GROUP BY section_id
ORDER BY section_id;`
    },
    {
      h: 'Joining values into a list',
      html: `<p>Sometimes you want the members of a group written out, not just counted. SQLite and MySQL use <code>GROUP_CONCAT(col, ', ')</code>. PostgreSQL and SQL Server use <code>STRING_AGG(col, ', ')</code>. Oracle uses <code>LISTAGG(col, ', ')</code>.</p>`,
      sql: `SELECT city,
       COUNT(*) AS students,
       GROUP_CONCAT(name, ', ') AS names
FROM students
WHERE city IS NOT NULL
GROUP BY city
ORDER BY students DESC, city;`
    }
  ],
  pitfalls: [
    'Using an aggregate in WHERE. Aggregates belong in SELECT, HAVING or ORDER BY.',
    'Selecting a column that is neither grouped nor aggregated. Some databases accept it and return a random value.',
    'Expecting AVG to count NULLs as zero. It skips them.',
    'Using <code>COUNT(col)</code> when you meant <code>COUNT(*)</code>. They differ when col has NULLs.',
    'Putting a row condition in HAVING. It works, but it filters later and is slower. Row conditions belong in WHERE.',
    'Integer averages: in some databases <code>AVG</code> of an integer column returns an integer (SQL Server). Write <code>AVG(col * 1.0)</code> to be safe.'
  ],
  dialect: `<ul><li><strong>Non-grouped columns:</strong> SQLite allows them (bare columns). MySQL allows them only when <code>ONLY_FULL_GROUP_BY</code> is off. PostgreSQL, SQL Server and Oracle always reject them.</li>
<li><strong>List aggregation:</strong> <code>GROUP_CONCAT</code> in SQLite and MySQL; <code>STRING_AGG</code> in PostgreSQL and SQL Server 2017+; <code>LISTAGG</code> in Oracle.</li>
<li><strong>FILTER clause:</strong> <code>COUNT(*) FILTER (WHERE ...)</code> works in PostgreSQL and SQLite 3.30+. Use <code>SUM(CASE ...)</code> in MySQL, SQL Server and Oracle.</li>
<li><strong>AVG of integers:</strong> SQL Server returns an integer for <code>AVG(int_col)</code>. PostgreSQL returns numeric, MySQL and SQLite return a decimal value.</li>
<li><strong>Alias in HAVING:</strong> MySQL and SQLite let you write <code>HAVING n &gt; 3</code> using a SELECT alias. PostgreSQL, SQL Server and Oracle need the full expression <code>HAVING COUNT(*) &gt; 3</code>.</li></ul>`,
  exercises: [
    {
      id: 'd3-1', level: 1,
      prompt: 'How many students are there in total, and how many of them have a declared major? Return one row with two columns: <code>total_students</code>, <code>with_major</code>.',
      solution: `SELECT COUNT(*) AS total_students, COUNT(dept_id) AS with_major FROM students;`,
      hints: ['One COUNT counts rows, the other skips NULLs.', 'COUNT(*) and COUNT(dept_id)']
    },
    {
      id: 'd3-2', level: 1,
      prompt: 'For each payment method, show the <code>method</code>, the number of payments as <code>payments</code>, and the total amount as <code>total</code>.',
      solution: `SELECT method, COUNT(*) AS payments, SUM(amount) AS total FROM payments GROUP BY method;`,
      hints: ['You need one row per method.', 'GROUP BY method, then COUNT(*) and SUM(amount).']
    },
    {
      id: 'd3-3', level: 1,
      prompt: 'Show the lowest, highest and average score across all graded enrollments in one row: <code>lowest</code>, <code>highest</code>, <code>average</code>. Round the average to 1 decimal place.',
      solution: `SELECT MIN(score) AS lowest, MAX(score) AS highest, ROUND(AVG(score), 1) AS average FROM enrollments;`,
      hints: ['MIN, MAX and AVG already ignore NULL scores.', 'ROUND(AVG(score), 1)']
    },
    {
      id: 'd3-4', level: 2,
      prompt: 'How many students are in each year of study? Return <code>year</code> and <code>students</code>, sorted by year.',
      solution: `SELECT year, COUNT(*) AS students FROM students GROUP BY year ORDER BY year;`,
      ordered: true,
      hints: ['Group by the year column.', 'GROUP BY year ORDER BY year']
    },
    {
      id: 'd3-5', level: 2,
      prompt: 'For each section, compute the number of enrolled students (<code>enrolled</code>) and the average score rounded to 1 decimal (<code>avg_score</code>). Only show sections with at least 5 enrolled students. Return <code>section_id</code>, <code>enrolled</code>, <code>avg_score</code>.',
      solution: `SELECT section_id, COUNT(*) AS enrolled, ROUND(AVG(score), 1) AS avg_score FROM enrollments GROUP BY section_id HAVING COUNT(*) >= 5;`,
      hints: ['One row per section: GROUP BY section_id.', 'The "at least 5" condition is about a group, not a row.', 'HAVING COUNT(*) >= 5']
    },
    {
      id: 'd3-6', level: 2,
      prompt: 'Which months had the most tuition income? Return <code>month</code> in the form <code>YYYY-MM</code> and <code>income</code> (the sum of amounts), only for months with income of at least 5000, sorted by income from highest to lowest, then by month.',
      solution: `SELECT STRFTIME('%Y-%m', paid_on) AS month, SUM(amount) AS income FROM payments GROUP BY STRFTIME('%Y-%m', paid_on) HAVING SUM(amount) >= 5000 ORDER BY income DESC, month;`,
      ordered: true,
      hints: ['STRFTIME(\'%Y-%m\', paid_on) turns a date into YYYY-MM.', 'Group by that expression.', 'HAVING SUM(amount) >= 5000, then ORDER BY income DESC, month']
    },
    {
      id: 'd3-7', level: 2,
      prompt: 'For each department that has instructors, show <code>dept_id</code>, the number of instructors (<code>staff</code>) and the total yearly salary cost (<code>payroll</code>). Skip the instructor who has no department.',
      solution: `SELECT dept_id, COUNT(*) AS staff, SUM(salary) AS payroll FROM instructors WHERE dept_id IS NOT NULL GROUP BY dept_id;`,
      hints: ['Remove the NULL department before grouping.', 'WHERE dept_id IS NOT NULL ... GROUP BY dept_id']
    },
    {
      id: 'd3-8', level: 3,
      prompt: 'Grade report per section. Return <code>section_id</code>, <code>passed</code> (grades A, B, C or D), <code>failed</code> (grade F) and <code>pending</code> (no grade yet), for every section that has enrollments.',
      solution: `SELECT section_id,
  SUM(CASE WHEN grade IN ('A','B','C','D') THEN 1 ELSE 0 END) AS passed,
  SUM(CASE WHEN grade = 'F' THEN 1 ELSE 0 END) AS failed,
  SUM(CASE WHEN grade IS NULL THEN 1 ELSE 0 END) AS pending
FROM enrollments GROUP BY section_id;`,
      hints: ['One row per section, three different counts.', 'Put a CASE inside SUM: 1 when the row matches, 0 otherwise.', 'Pending rows have grade IS NULL.']
    },
    {
      id: 'd3-9', level: 3,
      prompt: 'Find students who paid at least 3000 in total but made no cash payment. Return <code>student_id</code> and <code>total_paid</code>, sorted by total_paid from highest to lowest, then by student_id.',
      solution: `SELECT student_id, SUM(amount) AS total_paid FROM payments GROUP BY student_id HAVING SUM(amount) >= 3000 AND SUM(CASE WHEN method = 'cash' THEN 1 ELSE 0 END) = 0 ORDER BY total_paid DESC, student_id;`,
      ordered: true,
      hints: ['Both conditions are about all of a student\'s payments, so both go in HAVING.', 'Count the cash payments per student with SUM(CASE ...).', 'HAVING SUM(amount) >= 3000 AND (number of cash payments) = 0']
    },
    {
      id: 'd3-10', level: 3,
      prompt: 'For each term, show <code>year</code>, <code>semester</code>, the number of sections (<code>sections</code>) and the total seats offered (<code>seats</code>). Only include terms that offered more than 300 seats. Sort by year, then semester.',
      solution: `SELECT year, semester, COUNT(*) AS sections, SUM(capacity) AS seats FROM sections GROUP BY year, semester HAVING SUM(capacity) > 300 ORDER BY year, semester;`,
      ordered: true,
      hints: ['A term is a (year, semester) pair: group by both.', 'Seats = SUM(capacity).', 'HAVING SUM(capacity) > 300']
    }
  ],
  quiz: [
    { id: 'd3-q1', q: 'A table has 10 rows. Column <code>c</code> is NULL in 3 rows. What is <code>COUNT(c)</code>?', options: ['10', '7', '3', 'NULL'], answer: 1, why: 'COUNT(col) counts only non-NULL values: 10 - 3 = 7.' },
    { id: 'd3-q2', q: 'Scores are 80, 60 and NULL. What is <code>AVG(score)</code>?', options: ['46.67', '70', 'NULL', '140'], answer: 1, why: 'AVG ignores the NULL: (80 + 60) / 2 = 70.' },
    { id: 'd3-q3', q: 'Where can you NOT use <code>COUNT(*)</code>?', options: ['SELECT', 'HAVING', 'ORDER BY', 'WHERE'], answer: 3, why: 'WHERE is evaluated before grouping, so aggregates are not available there.' },
    { id: 'd3-q4', q: 'Which query lists departments with more than 5 students?', options: ['SELECT dept_id FROM students WHERE COUNT(*) > 5 GROUP BY dept_id', 'SELECT dept_id FROM students GROUP BY dept_id HAVING COUNT(*) > 5', 'SELECT dept_id, COUNT(*) > 5 FROM students', 'SELECT dept_id FROM students HAVING dept_id > 5'], answer: 1, why: 'Group first, then filter the groups with HAVING.' },
    { id: 'd3-q5', q: 'How does GROUP BY treat NULL values in the grouping column?', options: ['Rows with NULL are dropped', 'Each NULL row is its own group', 'All NULLs form one group', 'It raises an error'], answer: 2, why: 'For grouping (and DISTINCT), NULLs are treated as equal, so they form a single group.' },
    { id: 'd3-q6', q: '<code>SELECT COUNT(*) FROM students WHERE 1 = 0</code> returns…', options: ['No rows', 'One row with 0', 'One row with NULL', 'An error'], answer: 1, why: 'An aggregate without GROUP BY always returns exactly one row. With no input rows, COUNT is 0 (SUM would be NULL).' },
    { id: 'd3-q7', q: 'What is the logical evaluation order?', options: ['SELECT, FROM, WHERE, GROUP BY, HAVING', 'FROM, WHERE, GROUP BY, HAVING, SELECT', 'FROM, GROUP BY, WHERE, SELECT, HAVING', 'WHERE, FROM, GROUP BY, SELECT, HAVING'], answer: 1, why: 'Rows are picked (FROM), filtered (WHERE), grouped, groups are filtered (HAVING), then the output is computed (SELECT).' }
  ],
  teach: 'Explain the difference between WHERE and HAVING to a classmate. Use the question "Which students have more than 4 graded courses?" as your example.',
  rubric: 'WHERE filters individual rows before grouping; HAVING filters groups after GROUP BY; aggregates (COUNT, AVG...) cannot be used in WHERE because groups do not exist yet; in the example, score IS NOT NULL (graded) goes in WHERE and COUNT(*) > 4 goes in HAVING; mentions logical order FROM-WHERE-GROUP BY-HAVING-SELECT; bonus: row conditions in WHERE are more efficient.'
});
