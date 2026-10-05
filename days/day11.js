LAB.days.push({
  n: 11,
  week: 2,
  tag: 'ACID',
  title: 'Transactions and Concurrency',
  hours: 3,
  goals: [
    'Explain the four ACID properties with the bank-transfer example',
    'Use BEGIN, COMMIT, ROLLBACK and SAVEPOINT to make several changes all-or-nothing',
    'Name the five classic concurrency anomalies and the isolation level that prevents each',
    'Test a schedule for conflict serializability with a precedence graph',
    'Describe how locking (2PL), MVCC and write-ahead logging work'
  ],
  lesson: [
    {
      h: 'What a transaction is: ACID',
      html: `<p>A <strong>transaction</strong> is a group of SQL statements that the database treats as <em>one unit of work</em>. Either every statement in the group takes effect, or none of them do.</p>
<p>The classic example is a bank transfer of 100 from account A to account B. It needs two statements:</p>
<pre class="code">UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';</pre>
<p>If the power fails after the first statement, the money has left A but never arrived at B. 100 has disappeared. A transaction makes this impossible: after a crash the database sees that the transfer never finished and removes the half-done change. A transaction gives four promises, known as <strong>ACID</strong>:</p>
<table class="mini"><thead><tr><th>Letter</th><th>Property</th><th>Meaning in the transfer example</th><th>Who provides it</th></tr></thead><tbody>
<tr><td><strong>A</strong></td><td>Atomicity</td><td>Both updates happen, or neither happens.</td><td>Undo log / rollback</td></tr>
<tr><td><strong>C</strong></td><td>Consistency</td><td>Every rule still holds after the transaction: no negative balance if there is a CHECK, total money unchanged.</td><td>Constraints + correct application logic</td></tr>
<tr><td><strong>I</strong></td><td>Isolation</td><td>Another user running at the same time never sees the money "in the air" (taken from A but not yet given to B).</td><td>Locks or MVCC</td></tr>
<tr><td><strong>D</strong></td><td>Durability</td><td>Once the bank says "transfer complete", the change survives a crash one millisecond later.</td><td>Write-ahead log on disk</td></tr>
</tbody></table>
<div class="callout"><strong>Exam tip.</strong> Consistency is the only property the database cannot give alone. If your code moves 100 out of A and 90 into B, every constraint may still pass, but the data is wrong. Atomicity, isolation and durability are the tools; consistency is the goal.</div>`
    },
    {
      h: 'BEGIN, COMMIT and ROLLBACK',
      html: `<p><code>BEGIN</code> starts a transaction. <code>COMMIT</code> makes all its changes permanent. <code>ROLLBACK</code> throws all of them away. Without BEGIN, most databases run in <strong>autocommit</strong> mode: every single statement is its own transaction.</p>
<p>Run the example below. The two departments get a budget change inside a transaction, then we change our mind and roll back. The final SELECT shows the original budgets.</p>`,
      sql: `BEGIN;
UPDATE departments SET budget = budget - 50000 WHERE dept_id = 1;
UPDATE departments SET budget = budget + 50000 WHERE dept_id = 8;
SELECT dept_id, name, budget FROM departments WHERE dept_id IN (1, 8);
ROLLBACK;
SELECT dept_id, name, budget FROM departments WHERE dept_id IN (1, 8);`,
      note: 'The first result shows the changed budgets (visible inside the transaction). The second result, after ROLLBACK, shows the original values.'
    },
    {
      h: 'SAVEPOINT: undo part of a transaction',
      html: `<p>A <strong>savepoint</strong> is a named point inside a transaction. <code>ROLLBACK TO name</code> undoes only the work done after that point; the transaction stays open and you can continue. This is useful in long jobs: if one step fails, you undo that step and not the whole job.</p>`,
      sql: `BEGIN;
UPDATE instructors SET salary = salary + 1000 WHERE dept_id = 1;
SAVEPOINT before_math;
UPDATE instructors SET salary = salary + 99999 WHERE dept_id = 2;  -- a mistake
ROLLBACK TO before_math;
COMMIT;
SELECT name, dept_id, salary FROM instructors WHERE dept_id IN (1, 2) ORDER BY dept_id, name;`,
      note: 'Computer Science (dept 1) keeps its raise. The wrong Mathematics raise was undone by ROLLBACK TO.',
      predict: {
        sql: `BEGIN;
UPDATE departments SET budget = 0 WHERE dept_id = 6;
SAVEPOINT s1;
UPDATE departments SET budget = 1 WHERE dept_id = 6;
ROLLBACK TO s1;
COMMIT;
SELECT budget FROM departments WHERE dept_id = 6;`,
        q: 'What budget does History (dept 6) have at the end? (It started at 210000.)',
        options: ['210000', '0', '1', 'NULL'],
        answer: 1,
        why: 'ROLLBACK TO s1 removes only the change made after the savepoint (budget = 1). The change before the savepoint (budget = 0) is kept and then committed.'
      }
    },
    {
      h: 'Concurrency anomalies, part 1: reading problems',
      html: `<p>Many users run transactions at the same time. Without isolation, one transaction can see another one in a half-finished state. Read each timeline from top to bottom; T1 and T2 are two users.</p>
<p><strong>Dirty read</strong>: reading data that another transaction has not committed yet.</p>
<table class="mini"><thead><tr><th>Step</th><th>T1</th><th>T2</th></tr></thead><tbody>
<tr><td>1</td><td>UPDATE balance of A to 0</td><td></td></tr>
<tr><td>2</td><td></td><td>SELECT balance of A → <strong>0</strong></td></tr>
<tr><td>3</td><td>ROLLBACK (A is back to 500)</td><td></td></tr>
<tr><td>4</td><td></td><td>T2 acted on a value that never officially existed</td></tr>
</tbody></table>
<p><strong>Non-repeatable read</strong>: you read the same row twice and get different values, because someone committed a change in between.</p>
<table class="mini"><thead><tr><th>Step</th><th>T1</th><th>T2</th></tr></thead><tbody>
<tr><td>1</td><td>SELECT balance of A → 500</td><td></td></tr>
<tr><td>2</td><td></td><td>UPDATE A to 300; COMMIT</td></tr>
<tr><td>3</td><td>SELECT balance of A → <strong>300</strong></td><td></td></tr>
</tbody></table>
<p><strong>Phantom read</strong>: you run the same <em>search</em> twice and new rows appear (or disappear), because someone inserted or deleted matching rows.</p>
<table class="mini"><thead><tr><th>Step</th><th>T1</th><th>T2</th></tr></thead><tbody>
<tr><td>1</td><td>SELECT COUNT(*) FROM students WHERE year = 1 → 9</td><td></td></tr>
<tr><td>2</td><td></td><td>INSERT a new first-year student; COMMIT</td></tr>
<tr><td>3</td><td>same SELECT → <strong>10</strong></td><td></td></tr>
</tbody></table>`
    },
    {
      h: 'Concurrency anomalies, part 2: writing problems',
      html: `<p><strong>Lost update</strong>: two transactions read the same value, both compute a new value from it, and the second write overwrites the first.</p>
<table class="mini"><thead><tr><th>Step</th><th>T1 (deposit 100)</th><th>T2 (deposit 50)</th></tr></thead><tbody>
<tr><td>1</td><td>read balance → 500</td><td></td></tr>
<tr><td>2</td><td></td><td>read balance → 500</td></tr>
<tr><td>3</td><td>write 600; COMMIT</td><td></td></tr>
<tr><td>4</td><td></td><td>write 550; COMMIT</td></tr>
<tr><td>5</td><td colspan="2">Final balance 550. The deposit of 100 is lost; it should be 650.</td></tr>
</tbody></table>
<p>The fix in SQL is to let the database do the arithmetic in one statement (<code>SET balance = balance + 100</code>) or to lock the row when reading (<code>SELECT ... FOR UPDATE</code> in PostgreSQL, MySQL, Oracle).</p>
<p><strong>Write skew</strong>: two transactions read the same data, each checks a rule, then each updates a <em>different</em> row. Each change is fine alone, together they break the rule.</p>
<table class="mini"><thead><tr><th>Step</th><th>T1 (Dr. X goes home)</th><th>T2 (Dr. Y goes home)</th></tr></thead><tbody>
<tr><td>1</td><td>count doctors on call → 2, OK to leave</td><td></td></tr>
<tr><td>2</td><td></td><td>count doctors on call → 2, OK to leave</td></tr>
<tr><td>3</td><td>set X off call; COMMIT</td><td></td></tr>
<tr><td>4</td><td></td><td>set Y off call; COMMIT</td></tr>
<tr><td>5</td><td colspan="2">Rule "at least one doctor on call" is broken: zero doctors.</td></tr>
</tbody></table>`
    },
    {
      h: 'Isolation levels',
      html: `<p>Full isolation costs speed, so the SQL standard defines four levels. Each level forbids more anomalies than the one above it.</p>
<table class="mini"><thead><tr><th>Level</th><th>Dirty read</th><th>Non-repeatable read</th><th>Phantom</th></tr></thead><tbody>
<tr><td>READ UNCOMMITTED</td><td>possible</td><td>possible</td><td>possible</td></tr>
<tr><td>READ COMMITTED</td><td>prevented</td><td>possible</td><td>possible</td></tr>
<tr><td>REPEATABLE READ</td><td>prevented</td><td>prevented</td><td>possible</td></tr>
<tr><td>SERIALIZABLE</td><td>prevented</td><td>prevented</td><td>prevented</td></tr>
</tbody></table>
<p><strong>SERIALIZABLE</strong> means: the result is the same as if the transactions had run one after another in some order. It also prevents lost updates and write skew.</p>
<div class="callout"><strong>Defaults to remember.</strong> PostgreSQL, Oracle and SQL Server default to READ COMMITTED. MySQL InnoDB defaults to REPEATABLE READ. SQLite is SERIALIZABLE, because only one writer can work at a time.</div>
<pre class="code">-- PostgreSQL / MySQL / SQL Server
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;</pre>`,
      predict: {
        q: 'A report reads the same account twice in one transaction and must get the same value both times. Phantoms do not matter. What is the weakest level that is enough?',
        options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
        answer: 2,
        why: 'Reading the same row twice and getting the same value is exactly "no non-repeatable reads". REPEATABLE READ is the first level that guarantees it.'
      }
    },
    {
      h: 'Locks and two-phase locking',
      html: `<p>Many databases implement isolation with <strong>locks</strong>:</p>
<ul><li><strong>Shared lock (S)</strong>: taken to read. Many transactions can hold S on the same item.</li><li><strong>Exclusive lock (X)</strong>: taken to write. Only one transaction can hold it, and nobody else can hold S or X on that item.</li></ul>
<table class="mini"><thead><tr><th>Held \\ Requested</th><th>S</th><th>X</th></tr></thead><tbody><tr><td>S</td><td>granted</td><td>wait</td></tr><tr><td>X</td><td>wait</td><td>wait</td></tr></tbody></table>
<p><strong>Two-phase locking (2PL)</strong> has one rule: a transaction first only <em>acquires</em> locks (growing phase), and after it releases its first lock it may never acquire another one (shrinking phase). 2PL guarantees conflict-serializable schedules.</p>
<p><strong>Strict 2PL</strong> keeps all exclusive locks until COMMIT or ROLLBACK. This also prevents dirty reads and cascading rollbacks, so real systems use it.</p>
<p><strong>Deadlock</strong>: T1 holds a lock on A and waits for B; T2 holds B and waits for A. Neither can continue. Databases detect the cycle in a <em>wait-for graph</em> and abort one transaction (the victim), which must retry. Applications should be ready to retry, and should lock rows in the same order everywhere to make deadlocks rare.</p>`
    },
    {
      h: 'MVCC: readers do not block writers',
      html: `<p>PostgreSQL, Oracle, MySQL InnoDB and SQL Server (with snapshot isolation) use <strong>multi-version concurrency control (MVCC)</strong>. An UPDATE does not overwrite the row; it creates a new <em>version</em> and keeps the old one for a while.</p>
<p>Each transaction reads from a <strong>snapshot</strong>: the versions that were committed when its snapshot was taken. So a long report reads old versions while writers create new ones, and nobody waits. Writers still conflict with writers: two transactions updating the same row cannot both win.</p>
<div class="callout">Under MVCC, REPEATABLE READ usually means "one snapshot for the whole transaction" (often called <em>snapshot isolation</em>). It prevents phantoms in PostgreSQL, but it still allows <strong>write skew</strong>. Only SERIALIZABLE prevents write skew.</div>`
    },
    {
      h: 'Schedules and conflict serializability',
      html: `<p>A <strong>schedule</strong> is the order in which the operations of several transactions run. We write R1(A) for "T1 reads A" and W2(B) for "T2 writes B".</p>
<ul><li><strong>Serial schedule</strong>: one transaction runs completely, then the next. Always correct, but slow.</li><li><strong>Serializable schedule</strong>: interleaved, but with the same effect as some serial schedule.</li></ul>
<p>Two operations <strong>conflict</strong> when they (1) belong to different transactions, (2) touch the same item, and (3) at least one is a write. So R–W, W–R and W–W conflict; R–R does not.</p>
<p><strong>The precedence-graph test</strong> (an exam favorite):</p>
<ol class="steps"><li>Draw one node per transaction.</li><li>Go through the schedule. For every pair of conflicting operations where Ti's operation comes first, draw an edge Ti → Tj.</li><li>If the graph has <strong>no cycle</strong>, the schedule is conflict-serializable. A topological order of the graph gives the equivalent serial order.</li><li>If there is a cycle, it is not conflict-serializable.</li></ol>
<p><strong>Worked example.</strong> S = R1(A), R2(A), W1(A), W2(A)</p>
<ul><li>R1(A) before W2(A): edge T1 → T2</li><li>R2(A) before W1(A): edge T2 → T1</li><li>W1(A) before W2(A): edge T1 → T2</li></ul>
<figure class="diagram"><svg viewBox="0 0 300 90" width="300" height="90" role="img" aria-label="Precedence graph with a cycle between T1 and T2"><defs><marker id="ar11" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs><circle cx="60" cy="45" r="24" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/><text x="60" y="50" text-anchor="middle" font-size="15" fill="var(--ink)">T1</text><circle cx="240" cy="45" r="24" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/><text x="240" y="50" text-anchor="middle" font-size="15" fill="var(--ink)">T2</text><path d="M84,38 Q150,8 216,38" fill="none" stroke="var(--ink)" stroke-width="1.6" marker-end="url(#ar11)"/><path d="M216,52 Q150,82 84,52" fill="none" stroke="var(--bad)" stroke-width="1.6" marker-end="url(#ar11)"/><text x="150" y="16" text-anchor="middle" font-size="11" fill="var(--muted)">R1(A)…W2(A)</text><text x="150" y="86" text-anchor="middle" font-size="11" fill="var(--bad)">R2(A)…W1(A)</text></svg><figcaption>A cycle T1 → T2 → T1, so S is not conflict-serializable. This is the lost-update schedule.</figcaption></figure>`,
      predict: {
        q: 'Schedule: R1(A), W1(A), R2(A), W2(A), R1(B), W1(B), R2(B), W2(B). Is it conflict-serializable?',
        options: ['No, there is a cycle', 'Yes, equivalent to T1 then T2', 'Yes, equivalent to T2 then T1', 'It cannot be decided'],
        answer: 1,
        why: 'Every conflict on A and on B has T1\'s operation first, so all edges go T1 → T2. No cycle, and the serial order is T1, T2.'
      }
    },
    {
      h: 'Durability: write-ahead logging and recovery',
      html: `<p>Writing changed data pages to disk on every COMMIT would be slow, because changes are spread all over the file. Instead, databases use a <strong>write-ahead log (WAL)</strong>:</p>
<ol class="steps"><li>Every change is first written as a small record to an append-only log file.</li><li>At COMMIT, the log records are forced to disk (<code>fsync</code>). Only then does the database answer "committed".</li><li>The changed data pages are written to disk later, in the background (a <em>checkpoint</em>).</li></ol>
<p>The rule: <strong>the log record must reach disk before the data page it describes</strong>. After a crash, recovery reads the log:</p>
<ul><li><strong>REDO</strong> changes of committed transactions whose pages never reached disk (durability).</li><li><strong>UNDO</strong> changes of transactions that never committed (atomicity).</li></ul>
<p>The well-known algorithm that does this is called <strong>ARIES</strong> (analysis, redo, undo).</p>`
    }
  ],
  pitfalls: [
    'Forgetting that autocommit is on by default. Two separate UPDATE statements without BEGIN are two transactions; a crash between them leaves half the work done.',
    'Reading a value in application code, adding to it, and writing it back. This causes lost updates. Use <code>SET x = x + 1</code> or <code>SELECT ... FOR UPDATE</code>.',
    'Believing REPEATABLE READ prevents every anomaly. It still allows phantoms in the standard and write skew under MVCC.',
    'Keeping a transaction open while waiting for user input. It holds locks or old versions for minutes and slows everyone.',
    'Thinking ROLLBACK TO ends the transaction. It only goes back to the savepoint; you still need COMMIT or ROLLBACK.',
    'Not retrying after a deadlock or serialization error. These errors are normal under load; the application must try the transaction again.'
  ],
  dialect: `<ul><li><strong>Start a transaction:</strong> <code>BEGIN</code> (SQLite, PostgreSQL), <code>START TRANSACTION</code> (MySQL, standard), <code>BEGIN TRANSACTION</code> (SQL Server). Oracle starts one automatically with the first DML statement.</li><li><strong>Isolation:</strong> <code>SET TRANSACTION ISOLATION LEVEL ...</code> in PostgreSQL, MySQL, SQL Server, Oracle (Oracle supports only READ COMMITTED and SERIALIZABLE). SQLite is always serializable.</li><li><strong>Row locks:</strong> <code>SELECT ... FOR UPDATE</code> in PostgreSQL, MySQL, Oracle; <code>WITH (UPDLOCK)</code> hint in SQL Server. SQLite locks the whole database for writing.</li><li><strong>DDL inside transactions:</strong> PostgreSQL and SQLite can roll back CREATE TABLE. MySQL and Oracle commit automatically before DDL.</li></ul>`,
  exercises: [
    {
      id: 'd11-1', level: 1, kind: 'script',
      prompt: 'An <code>accounts</code> table has been created for you with accounts <code>A</code> (500), <code>B</code> (300) and <code>C</code> (0). Inside one transaction (<code>BEGIN</code> … <code>COMMIT</code>), transfer <strong>200</strong> from <code>A</code> to <code>B</code>.',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);`,
      solution: `BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE id = 'A';
UPDATE accounts SET balance = balance + 200 WHERE id = 'B';
COMMIT;`,
      check: `SELECT id, balance FROM accounts ORDER BY id;`,
      hints: ['You need two UPDATE statements between BEGIN and COMMIT.', 'Subtract from A, add to B: SET balance = balance - 200 WHERE id = \'A\'.', 'BEGIN; UPDATE ... A; UPDATE ... B; COMMIT;']
    },
    {
      id: 'd11-2', level: 1, kind: 'script',
      prompt: 'Same <code>accounts</code> table (A = 500, B = 300, C = 0). Start a transaction, set every balance to 0, then <strong>cancel</strong> the transaction so nothing changes. Finish with no open transaction.',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);`,
      solution: `BEGIN;
UPDATE accounts SET balance = 0;
ROLLBACK;`,
      check: `SELECT id, balance FROM accounts ORDER BY id;`,
      hints: ['The keyword that cancels a transaction undoes every change since BEGIN.', 'BEGIN; UPDATE accounts SET balance = 0; ROLLBACK;']
    },
    {
      id: 'd11-3', level: 2, kind: 'script',
      prompt: 'Accounts A = 500, B = 300, C = 0. In one transaction: (1) move 100 from A to C, (2) create a savepoint named <code>sp</code>, (3) move 300 from B to C, (4) undo step 3 only with <code>ROLLBACK TO</code>, (5) commit. Expected final balances: A = 400, B = 300, C = 100.',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);`,
      solution: `BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'C';
SAVEPOINT sp;
UPDATE accounts SET balance = balance - 300 WHERE id = 'B';
UPDATE accounts SET balance = balance + 300 WHERE id = 'C';
ROLLBACK TO sp;
COMMIT;`,
      check: `SELECT id, balance FROM accounts ORDER BY id;`,
      hints: ['Each transfer is two UPDATE statements.', 'SAVEPOINT sp; goes between the first and the second transfer.', 'After the second transfer write ROLLBACK TO sp; and then COMMIT;']
    },
    {
      id: 'd11-4', level: 2, kind: 'script',
      prompt: 'Accounts A = 500, B = 300, C = 0, and an empty <code>audit(msg)</code> table exist. Simulate a failed transfer of 50 from C to A: start a transaction, insert the audit row <code>\'transfer C-&gt;A started\'</code>, add 50 to A, then notice that C has no money (it would break the <code>CHECK (balance &gt;= 0)</code>) and cancel everything. At the end the balances must be unchanged and <code>audit</code> must be empty.',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);
CREATE TABLE audit (msg TEXT);`,
      solution: `BEGIN;
INSERT INTO audit VALUES ('transfer C->A started');
UPDATE accounts SET balance = balance + 50 WHERE id = 'A';
ROLLBACK;`,
      check: `SELECT (SELECT group_concat(id || '=' || balance, ',') FROM (SELECT * FROM accounts ORDER BY id)) AS balances, (SELECT COUNT(*) FROM audit) AS audit_rows;`,
      hints: ['Anything you do between BEGIN and ROLLBACK disappears, including INSERTs into audit.', 'BEGIN; ...your statements...; ROLLBACK;', 'The important part: the script must end with ROLLBACK, so the checked state equals the start state.']
    },
    {
      id: 'd11-5', level: 2, kind: 'script',
      prompt: 'Give every instructor of the <strong>Physics</strong> department (look it up by name, do not hard-code the id) a 10% raise and every instructor of <strong>History</strong> a 5% raise, in a single transaction. Round new salaries to whole numbers with <code>ROUND(...)</code>.',
      solution: `BEGIN;
UPDATE instructors SET salary = ROUND(salary * 1.10) WHERE dept_id = (SELECT dept_id FROM departments WHERE name = 'Physics');
UPDATE instructors SET salary = ROUND(salary * 1.05) WHERE dept_id = (SELECT dept_id FROM departments WHERE name = 'History');
COMMIT;`,
      check: `SELECT instructor_id, salary FROM instructors ORDER BY instructor_id;`,
      hints: ['Use a subquery in WHERE to find the dept_id from the department name.', 'UPDATE instructors SET salary = ROUND(salary * 1.10) WHERE dept_id = (SELECT dept_id FROM departments WHERE name = \'Physics\');', 'Wrap both UPDATEs in BEGIN ... COMMIT.']
    },
    {
      id: 'd11-6', level: 2, kind: 'script',
      prompt: 'Avoid a lost update. A <code>counters</code> table holds a page-view counter <code>(name = \'home\', value = 41)</code>. Increase it by 1 using a <strong>single UPDATE that does the arithmetic inside the database</strong>, then increase it by 1 again the same way (simulating two users). The final value must be 43.',
      setup: `CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT INTO counters VALUES ('home', 41);`,
      solution: `UPDATE counters SET value = value + 1 WHERE name = 'home';
UPDATE counters SET value = value + 1 WHERE name = 'home';`,
      check: `SELECT name, value FROM counters ORDER BY name;`,
      hints: ['Do not write a fixed number like SET value = 42.', 'SET value = value + 1 reads and writes in one atomic statement.']
    },
    {
      id: 'd11-7', level: 3, kind: 'script',
      prompt: 'Create a table <code>transfers</code> with columns <code>transfer_id INTEGER PRIMARY KEY</code>, <code>from_id TEXT</code>, <code>to_id TEXT</code>, <code>amount REAL</code>. Then, in one transaction, transfer 120 from <code>B</code> to <code>A</code>, update both balances <em>and</em> insert a matching row into <code>transfers</code> (let the id be generated). Accounts start at A = 500, B = 300, C = 0.',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);`,
      solution: `CREATE TABLE transfers (transfer_id INTEGER PRIMARY KEY, from_id TEXT, to_id TEXT, amount REAL);
BEGIN;
UPDATE accounts SET balance = balance - 120 WHERE id = 'B';
UPDATE accounts SET balance = balance + 120 WHERE id = 'A';
INSERT INTO transfers (from_id, to_id, amount) VALUES ('B', 'A', 120);
COMMIT;`,
      check: `SELECT 'acct' AS kind, id AS k, balance AS v, NULL AS extra FROM accounts
UNION ALL SELECT 'xfer', from_id, amount, to_id FROM transfers
ORDER BY kind, k;`,
      hints: ['First the CREATE TABLE, then BEGIN.', 'Leave transfer_id out of the INSERT column list; SQLite fills it in.', 'Three statements inside the transaction: two UPDATEs and one INSERT.']
    },
    {
      id: 'd11-8', level: 1,
      prompt: 'Concurrency often hits popular rows. Using the university data, list each <code>section_id</code> together with the number of enrolled students as <code>enrolled</code>, only for sections with at least 6 enrollments. Sort by <code>enrolled</code> descending, then <code>section_id</code> ascending.',
      solution: `SELECT section_id, COUNT(*) AS enrolled FROM enrollments GROUP BY section_id HAVING COUNT(*) >= 6 ORDER BY enrolled DESC, section_id;`,
      ordered: true,
      hints: ['GROUP BY section_id and COUNT(*).', 'Filter groups with HAVING, not WHERE.', 'ORDER BY enrolled DESC, section_id']
    },
    {
      id: 'd11-9', level: 3,
      prompt: 'Imagine a transaction that moves all tuition paid in cash into the bank. Before running it, you want a check. For each payment <code>method</code>, return <code>method</code>, the number of payments <code>n</code> and the total <code>total</code>, plus a final row with method <code>\'ALL\'</code> holding the overall count and total. Sort with <code>\'ALL\'</code> last and the others alphabetically.',
      solution: `SELECT method, n, total FROM (
  SELECT method, COUNT(*) AS n, SUM(amount) AS total, 0 AS grp FROM payments GROUP BY method
  UNION ALL
  SELECT 'ALL', COUNT(*), SUM(amount), 1 FROM payments
) ORDER BY grp, method;`,
      ordered: true,
      hints: ['Build the per-method rows with GROUP BY, and the total row with a second SELECT without GROUP BY.', 'Combine them with UNION ALL.', 'To put ALL last, add a helper column (0 for normal rows, 1 for the total) and sort by it first.']
    }
  ],
  quiz: [
    { id: 'd11-q1', q: 'A transaction moves 100 from A to B. The server crashes after the debit and before the credit. After restart, A still has its original balance. Which ACID property made this happen?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 0, why: 'All-or-nothing is atomicity. The recovery process undid the unfinished transaction.' },
    { id: 'd11-q2', q: 'T2 reads a value written by T1. Then T1 rolls back. What anomaly did T2 experience?', options: ['Phantom read', 'Lost update', 'Dirty read', 'Non-repeatable read'], answer: 2, why: 'Reading uncommitted data that later disappears is a dirty read.' },
    { id: 'd11-q3', q: 'Which is the weakest isolation level that prevents non-repeatable reads but may still allow phantoms (SQL standard)?', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'], answer: 2, why: 'REPEATABLE READ locks or snapshots the rows you read, but new rows matching your search can still appear.' },
    { id: 'd11-q4', q: 'Which pair of operations does NOT conflict?', options: ['R1(X), W2(X)', 'W1(X), R2(X)', 'R1(X), R2(X)', 'W1(X), W2(X)'], answer: 2, why: 'Two reads never conflict. A conflict needs at least one write on the same item by different transactions.' },
    { id: 'd11-q5', q: 'Schedule: R1(A), W2(A), W1(A). The precedence graph has…', options: ['Only T1 → T2', 'Only T2 → T1', 'T1 → T2 and T2 → T1 (a cycle)', 'No edges'], answer: 2, why: 'R1(A) before W2(A) gives T1 → T2. W2(A) before W1(A) gives T2 → T1. Cycle, so not conflict-serializable.' },
    { id: 'd11-q6', q: 'Under two-phase locking, what is forbidden?', options: ['Holding two locks at once', 'Acquiring a new lock after releasing any lock', 'Reading an item after writing it', 'Holding an exclusive lock until commit'], answer: 1, why: 'The growing phase must end before the shrinking phase starts. Holding X locks until commit is strict 2PL, which is allowed.' },
    { id: 'd11-q7', q: 'Why can a long report in PostgreSQL run without blocking writers?', options: ['Reports use READ UNCOMMITTED', 'MVCC lets the report read old row versions from its snapshot', 'PostgreSQL has no locks', 'Writers wait until the report ends'], answer: 1, why: 'With MVCC, writers create new versions and readers see the versions from their snapshot. Readers and writers do not block each other.' },
    { id: 'd11-q8', q: 'The write-ahead logging rule says…', options: ['Data pages are written before the log', 'The log record must reach disk before the data page it describes', 'The log is written only at checkpoints', 'Every page is written at commit'], answer: 1, why: 'If the log is on disk first, recovery can always redo committed work and undo uncommitted work.' }
  ],
  teach: 'Explain the lost-update problem with a two-column timeline (T1 and T2), and give two different ways to prevent it.',
  rubric: 'Both transactions read the same old value; each computes a new value; the later write overwrites the earlier one so one change is lost; concrete numbers (e.g. 500 + 100 and 500 + 50 gives 550 instead of 650); prevention: do the arithmetic in one UPDATE (SET x = x + n), lock the row with SELECT ... FOR UPDATE, use a SERIALIZABLE / higher isolation level, or optimistic concurrency with a version column.'
});
