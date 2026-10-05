LAB.days.push({
  n: 2,
  week: 1,
  tag: 'WHERE',
  title: 'Filtering Rows and Thinking in NULL',
  hours: 2.5,
  goals: [
    'Filter rows with comparison operators, AND, OR, NOT, IN, BETWEEN and LIKE',
    'Explain three-valued logic and why <code>= NULL</code> never matches',
    'Replace missing values with COALESCE and build new values with CASE',
    'Use the most common text and date functions'
  ],
  lesson: [
    {
      h: 'WHERE keeps the rows you want',
      html: `<p><code>WHERE</code> runs right after <code>FROM</code>. It tests a condition on each row. A row stays in the result only if the condition is <strong>TRUE</strong> for that row.</p>
<p>The comparison operators are <code>=</code>, <code>&lt;&gt;</code> (also written <code>!=</code>), <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code> and <code>&gt;=</code>. Text values go in single quotes. Numbers have no quotes.</p>`,
      sql: `SELECT name, year, city
FROM students
WHERE year = 4;`,
      note: `Change 4 to another year, or try WHERE city = 'Cairo'.`,
      predict: {
        sql: `SELECT name, city FROM students WHERE city <> 'Cairo';`,
        q: '<code>&lt;&gt;</code> means "not equal". Some students have no city (NULL). Are these students in the result?',
        options: [
          'Yes, because NULL is not Cairo',
          'No, they are not in the result',
          'Only if their year is NULL too',
          'The query gives an error'
        ],
        answer: 1,
        why: 'NULL means "unknown". Is an unknown city different from Cairo? We do not know, so the answer is UNKNOWN. WHERE keeps only TRUE rows, so these students are dropped.'
      }
    },
    {
      h: 'AND, OR, NOT and the parentheses trap',
      html: `<p>Combine conditions with <code>AND</code> (both must be true), <code>OR</code> (at least one must be true) and <code>NOT</code> (reverse).</p>
<p><strong>AND is evaluated before OR</strong>, like multiplication before addition. This causes a classic bug. Suppose you want 4th-year students from Cairo or Baghdad:</p>
<pre class="code">-- Wrong: means  (city = 'Cairo')  OR  (city = 'Baghdad' AND year = 4)
WHERE city = 'Cairo' OR city = 'Baghdad' AND year = 4

-- Right
WHERE (city = 'Cairo' OR city = 'Baghdad') AND year = 4</pre>
<p>When you mix AND and OR, always write the parentheses. It costs nothing and makes your meaning clear.</p>`,
      predict: {
        sql: `SELECT name, city, year
FROM students
WHERE city = 'Cairo' OR city = 'Baghdad' AND year = 4;`,
        q: 'Does this query return a student from Cairo who is in year 1?',
        options: ['Yes', 'No', 'Only if year is NULL', 'The query gives an error'],
        answer: 0,
        why: `AND runs before OR. So the condition means: city = 'Cairo' OR (city = 'Baghdad' AND year = 4). Every Cairo student passes, in any year.`
      }
    },
    {
      h: 'IN and BETWEEN',
      html: `<p><code>IN (list)</code> is a short way to write many ORs on the same column. <code>BETWEEN a AND b</code> is short for <code>&gt;= a AND &lt;= b</code>. Both ends are <strong>included</strong>.</p>
<p>Because our dates are text in <code>YYYY-MM-DD</code> form, BETWEEN works on them too. They sort the same way as real dates.</p>`,
      sql: `SELECT name, salary, hire_date
FROM instructors
WHERE dept_id IN (1, 7)
  AND salary BETWEEN 75000 AND 100000;`
    },
    {
      h: 'LIKE for patterns',
      html: `<p><code>LIKE</code> compares text with a pattern. Two wildcards exist:</p>
<ul><li><code>%</code> matches any number of characters, including zero.</li><li><code>_</code> matches exactly one character.</li></ul>
<p><code>'CS%'</code> matches every course code that starts with CS. <code>'__1%'</code> matches codes whose third character is 1.</p>
<div class="callout warn"><strong>Case.</strong> In SQLite and MySQL (default settings) LIKE ignores upper/lower case for English letters. In PostgreSQL LIKE is case-sensitive and <code>ILIKE</code> ignores case. To be safe everywhere, write <code>LOWER(col) LIKE '...'</code>.</div>`,
      sql: `SELECT course_id, title
FROM courses
WHERE course_id LIKE 'CS%'
   OR title LIKE '%History%';`
    },
    {
      h: 'NULL means "unknown"',
      html: `<p><code>NULL</code> is not zero and not an empty string. It means the value is <strong>missing or unknown</strong>. Three students have no major, some have no city, and current enrollments have no grade yet.</p>
<p>Any comparison with NULL gives a third truth value: <strong>UNKNOWN</strong>. Is an unknown city equal to Cairo? We cannot know. So <code>city = NULL</code> is UNKNOWN for every row, even rows where city is NULL. WHERE keeps only TRUE rows, so it returns nothing.</p>
<p>To test for NULL, use the special operators <code>IS NULL</code> and <code>IS NOT NULL</code>.</p>`,
      sql: `SELECT name, city
FROM students
WHERE city IS NULL;`,
      predict: {
        sql: 'SELECT COUNT(*) FROM students WHERE city = NULL;',
        q: 'Some students have a NULL city. What number does this query return?',
        options: ['The number of NULL cities', '0', '40', 'An error'],
        answer: 1,
        why: 'city = NULL is never TRUE. It is always UNKNOWN. So no row passes, and the count is 0. Use IS NULL instead.'
      }
    },
    {
      h: 'Three-valued logic tables',
      html: `<p>With UNKNOWN in the game, AND and OR follow these rules. Read UNKNOWN as "could be either".</p>
<table class="mini"><thead><tr><th>A</th><th>B</th><th>A AND B</th><th>A OR B</th></tr></thead><tbody>
<tr><td>TRUE</td><td>UNKNOWN</td><td>UNKNOWN</td><td>TRUE</td></tr>
<tr><td>FALSE</td><td>UNKNOWN</td><td>FALSE</td><td>UNKNOWN</td></tr>
<tr><td>UNKNOWN</td><td>UNKNOWN</td><td>UNKNOWN</td><td>UNKNOWN</td></tr>
</tbody></table>
<p>And <code>NOT UNKNOWN</code> is still UNKNOWN. A quick trick: FALSE AND anything is FALSE; TRUE OR anything is TRUE. Everything else that touches UNKNOWN stays UNKNOWN.</p>
<div class="callout warn"><strong>Preview of a famous bug.</strong> <code>x NOT IN (1, 2, NULL)</code> means <code>x &lt;&gt; 1 AND x &lt;&gt; 2 AND x &lt;&gt; NULL</code>. The last part is UNKNOWN, so the whole condition can never be TRUE. A NOT IN list (or subquery) that contains a NULL returns <strong>no rows</strong>. You will meet this again on Day 5.</div>`,
      sql: `SELECT name, dept_id
FROM students
WHERE dept_id NOT IN (1, 2, NULL);`,
      note: 'Zero rows. Remove the NULL from the list and run it again.'
    },
    {
      h: 'COALESCE fills the gaps',
      html: '<p><code>COALESCE(a, b, c, ...)</code> returns the first argument that is not NULL. Use it to show a default value instead of an empty cell.</p>',
      sql: `SELECT name,
       COALESCE(city, 'Unknown') AS city,
       COALESCE(advisor_id, 0) AS advisor
FROM students
ORDER BY name
LIMIT 8;`
    },
    {
      h: 'CASE: if-then-else inside a query',
      html: `<p><code>CASE</code> builds a value from conditions. The <strong>searched</strong> form tests any condition. The first true WHEN wins. If nothing matches, the result is the ELSE value, or NULL if there is no ELSE.</p>
<pre class="code">CASE WHEN score >= 90 THEN 'Excellent'
     WHEN score >= 60 THEN 'Pass'
     ELSE 'Fail' END</pre>
<p>The <strong>simple</strong> form compares one expression with fixed values:</p>
<pre class="code">CASE year WHEN 1 THEN 'Freshman' WHEN 2 THEN 'Sophomore'
          WHEN 3 THEN 'Junior' ELSE 'Senior' END</pre>`,
      sql: `SELECT student_id, section_id, score,
       CASE WHEN score IS NULL THEN 'In progress'
            WHEN score >= 90 THEN 'Excellent'
            WHEN score >= 60 THEN 'Pass'
            ELSE 'Fail' END AS result
FROM enrollments
LIMIT 12;`,
      predict: {
        q: `A row has score = NULL. Which result does <code>CASE WHEN score &gt;= 60 THEN 'Pass' ELSE 'Fail' END</code> give?`,
        options: ['Pass', 'Fail', 'NULL', 'An error'],
        answer: 1,
        why: 'NULL >= 60 is UNKNOWN, not TRUE. So the WHEN does not match, and the ELSE part runs: the student gets Fail. That is why the lesson tests IS NULL first.'
      }
    },
    {
      h: 'Text and date functions',
      html: `<p>Functions change values row by row. The most useful ones in SQLite:</p>
<table class="mini"><thead><tr><th>Function</th><th>Example</th><th>Result</th></tr></thead><tbody>
<tr><td><code>UPPER / LOWER</code></td><td><code>UPPER('cs')</code></td><td>CS</td></tr>
<tr><td><code>LENGTH</code></td><td><code>LENGTH('Physics')</code></td><td>7</td></tr>
<tr><td><code>SUBSTR(s, start, len)</code></td><td><code>SUBSTR('CS220', 1, 2)</code></td><td>CS</td></tr>
<tr><td><code>TRIM / REPLACE</code></td><td><code>REPLACE('a-b', '-', ' ')</code></td><td>a b</td></tr>
<tr><td><code>DATE</code></td><td><code>DATE('2026-10-05', '+30 days')</code></td><td>2026-11-04</td></tr>
<tr><td><code>STRFTIME</code></td><td><code>STRFTIME('%Y', '2004-10-09')</code></td><td>2004 (as text)</td></tr>
<tr><td><code>JULIANDAY</code></td><td><code>JULIANDAY(b) - JULIANDAY(a)</code></td><td>days between a and b</td></tr>
</tbody></table>
<p>SQLite has no separate DATE type. Dates are text, and these functions understand the <code>YYYY-MM-DD</code> format.</p>`,
      sql: `SELECT name,
       LENGTH(name) AS name_length,
       LOWER(city) AS city_lower,
       SUBSTR(email, 1, INSTR(email, '@') - 1) AS username,
       STRFTIME('%Y', birth_date) AS birth_year,
       CAST((JULIANDAY('2026-10-05') - JULIANDAY(enrolled_on)) AS INTEGER) AS days_since_enrolled
FROM students
LIMIT 6;`
    }
  ],
  pitfalls: [
    'Writing <code>WHERE col = NULL</code> or <code>col &lt;&gt; NULL</code>. These are never TRUE. Use <code>IS NULL</code> / <code>IS NOT NULL</code>.',
    'Mixing AND and OR without parentheses. AND is evaluated first.',
    'Forgetting that BETWEEN includes both ends. <code>BETWEEN 1 AND 3</code> includes 1 and 3.',
    'Using <code>NOT IN</code> with a list or subquery that can contain NULL. The result is empty.',
    'Comparing dates stored as text in a format like <code>05/10/2026</code>. Text comparison only works with <code>YYYY-MM-DD</code>.',
    'Forgetting that a CASE without ELSE returns NULL when nothing matches.'
  ],
  dialect: `<ul><li><strong>Case-insensitive LIKE:</strong> SQLite and MySQL LIKE ignore case by default. PostgreSQL LIKE is case-sensitive; use <code>ILIKE</code>. Oracle and SQL Server depend on the collation.</li>
<li><strong>Not equal:</strong> <code>&lt;&gt;</code> is standard and works everywhere. <code>!=</code> works in all five major systems too.</li>
<li><strong>Dates:</strong> SQLite stores dates as text and uses <code>DATE()</code>, <code>STRFTIME()</code>, <code>JULIANDAY()</code>. PostgreSQL uses <code>EXTRACT(YEAR FROM d)</code> and <code>d2 - d1</code>. MySQL uses <code>YEAR(d)</code> and <code>DATEDIFF(d2, d1)</code>. SQL Server uses <code>YEAR(d)</code> and <code>DATEDIFF(day, d1, d2)</code>. Oracle uses <code>EXTRACT</code> and date subtraction.</li>
<li><strong>NULL replacement:</strong> <code>COALESCE</code> is standard and works everywhere. You will also see <code>IFNULL</code> (SQLite, MySQL), <code>ISNULL</code> (SQL Server) and <code>NVL</code> (Oracle).</li>
<li><strong>Empty string:</strong> Oracle treats <code>''</code> as NULL. All the others treat it as a normal, known value.</li>
<li><strong>Substring:</strong> <code>SUBSTR</code> in SQLite, Oracle, MySQL, PostgreSQL. SQL Server uses <code>SUBSTRING</code>.</li></ul>`,
  exercises: [
    {
      id: 'd2-1',
      level: 1,
      prompt: '<p>Find the instructors who earn more than 85000.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>salary</code></li></ul>',
      solution: 'SELECT name, salary FROM instructors WHERE salary > 85000;',
      hints: ['Use WHERE to keep only some rows.', 'WHERE salary > 85000']
    },
    {
      id: 'd2-2',
      level: 1,
      prompt: '<p>Find the students who have not chosen a major yet. Their <code>dept_id</code> is empty (NULL).</p><ul class="spec"><li><b>Columns:</b> <code>student_id</code>, <code>name</code></li></ul>',
      solution: 'SELECT student_id, name FROM students WHERE dept_id IS NULL;',
      hints: [
        '"No major" means dept_id has no value.',
        'You cannot test for NULL with =.',
        'WHERE dept_id IS NULL'
      ]
    },
    {
      id: 'd2-3',
      level: 1,
      prompt: '<p>Find all Mathematics and Physics courses. Their code starts with <code>MA</code> or <code>PH</code>.</p><ul class="spec"><li><b>Columns:</b> <code>course_id</code>, <code>title</code></li></ul>',
      solution: `SELECT course_id, title FROM courses WHERE course_id LIKE 'MA%' OR course_id LIKE 'PH%';`,
      hints: [
        'Use a pattern with LIKE.',
        `LIKE 'MA%' finds codes that start with MA.`,
        'Join two LIKE conditions with OR.'
      ]
    },
    {
      id: 'd2-4',
      level: 2,
      prompt: '<p>Find students who are in year 3 or year 4 and who live in Cairo, Baghdad or Riyadh.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>city</code>, <code>year</code></li></ul>',
      solution: `SELECT name, city, year FROM students WHERE year IN (3, 4) AND city IN ('Cairo', 'Baghdad', 'Riyadh');`,
      hints: [
        'Both conditions must be true.',
        'IN (...) is a short way to write many ORs.',
        'If you use OR for the cities, put it in brackets ( ).'
      ]
    },
    {
      id: 'd2-5',
      level: 2,
      prompt: '<p>Find the sections in the year 2025 (any semester) that have 25 to 40 seats.</p><ul class="spec"><li><b>Columns:</b> <code>section_id</code>, <code>course_id</code>, <code>semester</code>, <code>capacity</code></li><li><b>Note:</b> the number of seats is the <code>capacity</code> column. Include 25 and 40 too.</li></ul>',
      solution: 'SELECT section_id, course_id, semester, capacity FROM sections WHERE year = 2025 AND capacity BETWEEN 25 AND 40;',
      hints: [
        'The table is sections.',
        'BETWEEN includes both end values.',
        'WHERE year = 2025 AND capacity BETWEEN ...'
      ]
    },
    {
      id: 'd2-6',
      level: 2,
      prompt: '<p>Show every student with their city. If the city is missing, show the text <code>Not provided</code> instead.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>city</code></li><li><b>Note:</b> the second column must be named <code>city</code>.</li></ul>',
      solution: `SELECT name, COALESCE(city, 'Not provided') AS city FROM students;`,
      hints: ['One function returns the first value that is not NULL.', `COALESCE(city, '...') AS city`]
    },
    {
      id: 'd2-7',
      level: 2,
      prompt: '<p>Find the payments made by bank or by cash in the first half of 2026.</p><ul class="spec"><li><b>Columns:</b> <code>payment_id</code>, <code>student_id</code>, <code>amount</code>, <code>paid_on</code>, <code>method</code></li><li><b>Order:</b> by <code>paid_on</code>, oldest first, then by <code>payment_id</code></li><li><b>Note:</b> "first half" means from 2026-01-01 to 2026-06-30. Include both days. The method is <code>bank</code> or <code>cash</code>.</li></ul>',
      solution: `SELECT payment_id, student_id, amount, paid_on, method FROM payments WHERE paid_on BETWEEN '2026-01-01' AND '2026-06-30' AND method IN ('bank', 'cash') ORDER BY paid_on, payment_id;`,
      ordered: true,
      hints: [
        'Dates are text like 2026-01-15, so BETWEEN works on them.',
        'The method is bank or cash: use IN.',
        'ORDER BY paid_on, payment_id'
      ]
    },
    {
      id: 'd2-8',
      level: 3,
      prompt: '<p>Give each enrollment a label, based on its score.</p><ul class="spec"><li><b>Columns:</b> <code>student_id</code>, <code>section_id</code>, <code>score</code>, <code>status</code></li><li><b>Note:</b> <code>status</code> is <code>In progress</code> if the score is NULL, <code>Honours</code> if the score is 90 or more, <code>Pass</code> if the score is 60 or more, and <code>Fail</code> in all other cases.</li></ul>',
      solution: `SELECT student_id, section_id, score,
  CASE WHEN score IS NULL THEN 'In progress'
       WHEN score >= 90 THEN 'Honours'
       WHEN score >= 60 THEN 'Pass'
       ELSE 'Fail' END AS status
FROM enrollments;`,
      hints: [
        'Use CASE WHEN ... THEN ... ELSE ... END.',
        'SQL uses the first WHEN that is true. So the order of the WHENs matters.',
        'Test IS NULL first. If you do not, NULL scores go to ELSE.'
      ]
    },
    {
      id: 'd2-9',
      level: 3,
      prompt: '<p>Find students who were born in 2004 and who have a long email username. The username is the part before <code>@</code>. It must be longer than 12 characters.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>email</code>, <code>birth_date</code></li></ul>',
      solution: `SELECT name, email, birth_date FROM students WHERE STRFTIME('%Y', birth_date) = '2004' AND LENGTH(SUBSTR(email, 1, INSTR(email, '@') - 1)) > 12;`,
      hints: [
        `STRFTIME('%Y', date) gives the year as text. Compare it with '2004'.`,
        `INSTR(email, '@') gives the position of the @ sign.`,
        `The username length is INSTR(email, '@') - 1. You can also use LENGTH(SUBSTR(...)).`
      ]
    },
    {
      id: 'd2-10',
      level: 3,
      prompt: '<p>Find the instructors who have no mentor and who have worked here for more than 10 years. Count up to the date 2026-10-05. "More than 10 years" means more than 3652 days.</p><ul class="spec"><li><b>Columns:</b> <code>name</code>, <code>hire_date</code>, <code>days_worked</code></li><li><b>Note:</b> <code>days_worked</code> is the number of whole days from <code>hire_date</code> to 2026-10-05. Use <code>CAST(... AS INTEGER)</code> to remove the decimals.</li><li><b>Note:</b> "no mentor" means <code>mentor_id</code> is NULL.</li></ul>',
      solution: `SELECT name, hire_date, CAST(JULIANDAY('2026-10-05') - JULIANDAY(hire_date) AS INTEGER) AS days_worked FROM instructors WHERE JULIANDAY('2026-10-05') - JULIANDAY(hire_date) > 3652 AND mentor_id IS NULL;`,
      hints: [
        'JULIANDAY(a) - JULIANDAY(b) gives the number of days between two dates.',
        '"No mentor" means mentor_id IS NULL.',
        'You cannot use the name days_worked in WHERE. Write the full expression again.'
      ]
    }
  ],
  quiz: [
    {
      id: 'd2-q1',
      q: 'What is <code>TRUE AND UNKNOWN</code>?',
      options: ['TRUE', 'FALSE', 'UNKNOWN', 'You cannot use NULL with AND'],
      answer: 2,
      why: 'The result depends on the unknown value. So it is UNKNOWN. Only FALSE AND something is always FALSE.'
    },
    {
      id: 'd2-q2',
      q: 'What is <code>TRUE OR UNKNOWN</code>?',
      options: ['TRUE', 'FALSE', 'UNKNOWN', 'An error'],
      answer: 0,
      why: 'One side is already TRUE. So OR is TRUE, whatever the unknown value is.'
    },
    {
      id: 'd2-q3',
      q: 'Which condition finds rows where <code>grade</code> has no value?',
      options: ['grade = NULL', `grade = ''`, 'grade IS NULL', 'NOT grade'],
      answer: 2,
      why: `Only IS NULL finds missing values. = NULL is always UNKNOWN. And '' is an empty text, which is a real value.`
    },
    {
      id: 'd2-q4',
      q: '<code>WHERE salary BETWEEN 70000 AND 80000</code> is the same as…',
      options: [
        'salary > 70000 AND salary < 80000',
        'salary >= 70000 AND salary <= 80000',
        'salary >= 70000 AND salary < 80000',
        'salary > 70000 OR salary < 80000'
      ],
      answer: 1,
      why: 'BETWEEN includes both end values.'
    },
    {
      id: 'd2-q5',
      q: `Which value matches the pattern <code>'C_220'</code> with LIKE?`,
      options: ['C220', 'CS220', 'CS1220', 'cs22'],
      answer: 1,
      why: '_ matches exactly one character. CS220 has one character (S) between C and 220.'
    },
    {
      id: 'd2-q6',
      q: 'How many rows does <code>WHERE dept_id NOT IN (1, 2, NULL)</code> return?',
      options: [
        'All rows, except departments 1 and 2',
        'Only rows where dept_id is NULL',
        'No rows',
        'An error'
      ],
      answer: 2,
      why: 'NOT IN means: dept_id <> 1 AND dept_id <> 2 AND dept_id <> NULL. The last part is always UNKNOWN. So the whole condition is never TRUE.'
    },
    {
      id: 'd2-q7',
      q: `What does <code>COALESCE(NULL, NULL, 'x', 'y')</code> return?`,
      options: ['NULL', 'x', 'y', 'x,y'],
      answer: 1,
      why: 'COALESCE returns the first value that is not NULL.'
    },
    {
      id: 'd2-q8',
      q: `What does <code>CASE WHEN 1 = 2 THEN 'a' END</code> return?`,
      options: ['a', 'An empty text', 'NULL', 'An error, because ELSE is needed'],
      answer: 2,
      why: 'No WHEN is true, and there is no ELSE. So the result is NULL.'
    }
  ],
  teach: 'Explain to a classmate why <code>WHERE city = NULL</code> returns no rows, and what three-valued logic is. Use a small example from the students table.',
  rubric: 'NULL means unknown/missing, not zero or empty string; any comparison with NULL yields UNKNOWN; WHERE keeps only rows where the condition is TRUE, so UNKNOWN rows are dropped; correct test is IS NULL / IS NOT NULL; mentions TRUE/FALSE/UNKNOWN and at least one AND/OR rule (e.g. FALSE AND UNKNOWN = FALSE, TRUE OR UNKNOWN = TRUE); bonus: NOT IN with a NULL returns nothing, COALESCE to replace NULL.'
});
