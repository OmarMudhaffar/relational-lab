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
        q: 'History (dept 6) starts with a budget of 210000. What is its budget at the end?',
        options: ['210000', '0', '1', 'NULL'],
        answer: 1,
        why: 'ROLLBACK TO s1 undoes only the change after the savepoint (budget = 1). The change before the savepoint (budget = 0) stays, and COMMIT saves it.'
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
        q: 'A report reads the same account twice in one transaction. It must get the same value both times. New rows (phantoms) are not a problem. Which is the lowest level that is enough?',
        options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
        answer: 2,
        why: 'Getting the same value twice means "no non-repeatable reads". REPEATABLE READ is the first level that promises this.'
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
        q: 'Look at this schedule: R1(A), W1(A), R2(A), W2(A), R1(B), W1(B), R2(B), W2(B). Is it conflict-serializable?',
        options: ['No, there is a cycle', 'Yes, equivalent to T1 then T2', 'Yes, equivalent to T2 then T1', 'It cannot be decided'],
        answer: 1,
        why: 'In every conflict on A and on B, T1 comes first. So all edges go T1 → T2. There is no cycle, and the serial order is T1, then T2.'
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
      prompt: '<p>Move money from one account to another. Do it inside one transaction (a group of statements that succeed or fail together).</p><ul class="spec"><li><b>Start:</b> table <code>accounts</code> has <code>A</code> = 500, <code>B</code> = 300, <code>C</code> = 0.</li><li><b>Steps:</b> write <code>BEGIN</code>, take <strong>200</strong> from <code>A</code>, add <strong>200</strong> to <code>B</code>, then write <code>COMMIT</code>.</li></ul>',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);`,
      solution: `BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE id = 'A';
UPDATE accounts SET balance = balance + 200 WHERE id = 'B';
COMMIT;`,
      check: `SELECT id, balance FROM accounts ORDER BY id;`,
      hints: ['You need two UPDATE statements between BEGIN and COMMIT.', 'Take money from A: SET balance = balance - 200 WHERE id = \'A\'.', 'BEGIN; UPDATE ... A; UPDATE ... B; COMMIT;'],
      explain: `<p><b>The idea:</b> A transfer is two changes: money leaves A and arrives in B. A transaction makes both changes happen together, or not at all.</p><p><b>How it works:</b> <code>BEGIN</code> starts the transaction. The first <code>UPDATE</code> takes 200 from A with <code>balance = balance - 200</code>. The second <code>UPDATE</code> adds 200 to B. <code>COMMIT</code> saves both changes at the same moment. If the system stops before <code>COMMIT</code>, the database undoes everything.</p><p><b>Common mistake:</b> Writing the two UPDATEs without <code>BEGIN</code> and <code>COMMIT</code>. Then a crash between them can lose 200: it leaves A but never arrives in B.</p>`
    },
    {
      id: 'd11-2', level: 1, kind: 'script',
      prompt: '<p>Change all the balances, then cancel the change. Nothing should change in the end.</p><ul class="spec"><li><b>Start:</b> <code>accounts</code> has A = 500, B = 300, C = 0.</li><li><b>Steps:</b> start a transaction, set every balance to 0, then cancel the transaction.</li><li><b>Note:</b> at the end, no transaction may be open.</li></ul>',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);`,
      solution: `BEGIN;
UPDATE accounts SET balance = 0;
ROLLBACK;`,
      check: `SELECT id, balance FROM accounts ORDER BY id;`,
      hints: ['One keyword cancels a transaction. It undoes every change since BEGIN.', 'BEGIN; UPDATE accounts SET balance = 0; ROLLBACK;'],
      explain: `<p><b>The idea:</b> <code>ROLLBACK</code> cancels a transaction. Every change since <code>BEGIN</code> disappears, as if it never happened.</p><p><b>How it works:</b> <code>BEGIN</code> opens the transaction. <code>UPDATE accounts SET balance = 0</code> changes every row, but only inside the transaction. <code>ROLLBACK</code> throws these changes away. The balances are back to 500, 300 and 0, and no transaction is open.</p><p><b>Common mistake:</b> Writing <code>COMMIT</code> instead of <code>ROLLBACK</code>. COMMIT saves the zeros for ever. Another mistake is to forget ROLLBACK, so the transaction stays open.</p>`
    },
    {
      id: 'd11-3', level: 2, kind: 'script',
      prompt: '<p>Use a savepoint to undo only part of a transaction.</p><ul class="spec"><li><b>Start:</b> A = 500, B = 300, C = 0.</li><li><b>Steps:</b> (1) start a transaction. (2) Move 100 from A to C. (3) Create a savepoint named <code>sp</code>. (4) Move 300 from B to C. (5) Undo step 4 only, with <code>ROLLBACK TO</code>. (6) Commit.</li><li><b>Result:</b> A = 400, B = 300, C = 100.</li></ul>',
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
      hints: ['Each move of money is two UPDATE statements.', 'Write SAVEPOINT sp; between the first move and the second move.', 'After the second move, write ROLLBACK TO sp; and then COMMIT;'],
      explain: `<p><b>The idea:</b> A savepoint is a mark inside a transaction. <code>ROLLBACK TO</code> a savepoint undoes only the work after the mark. The work before it stays.</p><p><b>How it works:</b> <code>BEGIN</code> starts. Two UPDATEs move 100 from A to C. <code>SAVEPOINT sp</code> puts a mark here. Two more UPDATEs move 300 from B to C. <code>ROLLBACK TO sp</code> undoes only this second move. <code>COMMIT</code> saves the first move, so A = 400, B = 300, C = 100.</p><p><b>Common mistake:</b> Writing <code>ROLLBACK</code> without <code>TO sp</code>. That cancels the whole transaction, including the first move, so nothing changes.</p>`
    },
    {
      id: 'd11-4', level: 2, kind: 'script',
      prompt: '<p>Start a money transfer, notice a problem, and cancel everything.</p><ul class="spec"><li><b>Start:</b> A = 500, B = 300, C = 0. The table <code>audit(msg)</code> is empty.</li><li><b>Steps:</b> start a transaction. Insert the row <code>\'transfer C-&gt;A started\'</code> into <code>audit</code>. Add 50 to A. C has no money, so the transfer must fail. Cancel the whole transaction.</li><li><b>Result:</b> the balances do not change, and <code>audit</code> is empty.</li></ul>',
      setup: `CREATE TABLE accounts (id TEXT PRIMARY KEY, owner TEXT NOT NULL, balance REAL NOT NULL CHECK (balance >= 0));
INSERT INTO accounts VALUES ('A','Layla',500),('B','Omar',300),('C','Mei',0);
CREATE TABLE audit (msg TEXT);`,
      solution: `BEGIN;
INSERT INTO audit VALUES ('transfer C->A started');
UPDATE accounts SET balance = balance + 50 WHERE id = 'A';
ROLLBACK;`,
      check: `SELECT (SELECT group_concat(id || '=' || balance, ',') FROM (SELECT * FROM accounts ORDER BY id)) AS balances, (SELECT COUNT(*) FROM audit) AS audit_rows;`,
      hints: ['Everything between BEGIN and ROLLBACK disappears. This includes the INSERT into audit.', 'BEGIN; ...your statements...; ROLLBACK;', 'Your script must end with ROLLBACK. Then the final state equals the start state.'],
      explain: `<p><b>The idea:</b> When something goes wrong in the middle, you cancel the whole transaction. Even the rows you inserted into other tables disappear.</p><p><b>How it works:</b> <code>BEGIN</code> starts. The INSERT writes a message into <code>audit</code>. The UPDATE adds 50 to A. Then we see that C has no money to send. <code>ROLLBACK</code> undoes both the INSERT and the UPDATE. The balances are unchanged and <code>audit</code> is empty again.</p><p><b>Common mistake:</b> Thinking that ROLLBACK only undoes UPDATEs. It undoes every change since BEGIN, including INSERT and DELETE. Writing COMMIT here would keep a half-done transfer.</p>`
    },
    {
      id: 'd11-5', level: 2, kind: 'script',
      prompt: '<p>Give pay raises to two departments in one transaction.</p><ul class="spec"><li><b>Steps:</b> give every instructor in <strong>Physics</strong> a 10% raise. Give every instructor in <strong>History</strong> a 5% raise. Put both changes in one transaction.</li><li><b>Note:</b> find each department by its <code>name</code>. Do not type the id number.</li><li><b>Note:</b> round the new salaries to whole numbers with <code>ROUND(...)</code>.</li></ul>',
      solution: `BEGIN;
UPDATE instructors SET salary = ROUND(salary * 1.10) WHERE dept_id = (SELECT dept_id FROM departments WHERE name = 'Physics');
UPDATE instructors SET salary = ROUND(salary * 1.05) WHERE dept_id = (SELECT dept_id FROM departments WHERE name = 'History');
COMMIT;`,
      check: `SELECT instructor_id, salary FROM instructors ORDER BY instructor_id;`,
      hints: ['Use a subquery in WHERE. It finds the dept_id from the department name.', 'UPDATE instructors SET salary = ROUND(salary * 1.10) WHERE dept_id = (SELECT dept_id FROM departments WHERE name = \'Physics\');', 'Put both UPDATE statements between BEGIN and COMMIT.'],
      explain: `<p><b>The idea:</b> Two related changes go in one transaction, so the raises for Physics and History are saved together. A subquery finds each department id from its name.</p><p><b>How it works:</b> <code>(SELECT dept_id FROM departments WHERE name = 'Physics')</code> returns one number. The UPDATE changes only instructors with that <code>dept_id</code>. <code>ROUND(salary * 1.10)</code> adds 10% and rounds to a whole number. The second UPDATE does the same for History with 5%. <code>COMMIT</code> saves both.</p><p><b>Common mistake:</b> Typing the id numbers (3 and 6) instead of finding them by name. The query breaks if the ids change. Another mistake is <code>salary * 0.10</code>, which sets the salary to 10% instead of adding 10%.</p>`
    },
    {
      id: 'd11-6', level: 2, kind: 'script',
      prompt: '<p>Add 1 to a counter twice, in a safe way. This avoids a lost update.</p><ul class="spec"><li><b>Start:</b> table <code>counters</code> has the row <code>name = \'home\'</code>, <code>value = 41</code>.</li><li><b>Steps:</b> add 1 with one UPDATE that does the math inside the database. Then do the same again (like two users).</li><li><b>Result:</b> <code>value</code> = 43.</li></ul>',
      setup: `CREATE TABLE counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT INTO counters VALUES ('home', 41);`,
      solution: `UPDATE counters SET value = value + 1 WHERE name = 'home';
UPDATE counters SET value = value + 1 WHERE name = 'home';`,
      check: `SELECT name, value FROM counters ORDER BY name;`,
      hints: ['Do not write a fixed number, like SET value = 42.', 'SET value = value + 1 reads and writes in one statement.'],
      explain: `<p><b>The idea:</b> To avoid a lost update, do the math inside the database. <code>value = value + 1</code> reads and writes the value in one step, so two users cannot overwrite each other.</p><p><b>How it works:</b> Each UPDATE takes the current value and adds 1 in the same statement. The first makes 41 into 42. The second makes 42 into 43. Even if two users run it at the same time, the database applies them one after the other.</p><p><b>Common mistake:</b> Reading the value first and then writing a fixed number, like <code>SET value = 42</code> twice. Both users read 41, both write 42, and one update is lost.</p>`
    },
    {
      id: 'd11-7', level: 3, kind: 'script',
      prompt: '<p>Create a log table. Then move money and log it in one transaction.</p><ul class="spec"><li><b>Create:</b> table <code>transfers</code> with columns <code>transfer_id INTEGER PRIMARY KEY</code>, <code>from_id TEXT</code>, <code>to_id TEXT</code>, <code>amount REAL</code>.</li><li><b>Start:</b> A = 500, B = 300, C = 0.</li><li><b>Then:</b> in one transaction, move 120 from <code>B</code> to <code>A</code>. Update both balances. Insert one row into <code>transfers</code> for this move.</li><li><b>Note:</b> do not give <code>transfer_id</code> a value. The database creates it.</li></ul>',
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
      hints: ['First write CREATE TABLE, then BEGIN.', 'Leave transfer_id out of the INSERT column list. SQLite fills it in.', 'Inside the transaction: two UPDATE statements and one INSERT.'],
      explain: `<p><b>The idea:</b> The transfer and its log row belong together. Put the two UPDATEs and the INSERT in one transaction, so you never have a transfer without a log, or a log without a transfer.</p><p><b>How it works:</b> <code>CREATE TABLE transfers</code> makes the log table. <code>transfer_id INTEGER PRIMARY KEY</code> gets a value by itself. <code>BEGIN</code> starts. Two UPDATEs move 120 from B to A. The INSERT lists only <code>from_id, to_id, amount</code>, so the database creates <code>transfer_id</code>. <code>COMMIT</code> saves all three changes.</p><p><b>Common mistake:</b> Writing the INSERT after COMMIT. Then a crash in between leaves money moved but not logged. Giving <code>transfer_id</code> a value by hand is also not needed.</p>`
    },
    {
      id: 'd11-8', level: 1,
      prompt: '<p>Many users change popular rows at the same time. Find the most popular sections: the ones with at least 6 enrollments.</p><ul class="spec"><li><b>Columns:</b> <code>section_id</code>, <code>enrolled</code> (the number of students in the section)</li><li><b>Order:</b> <code>enrolled</code> from high to low, then <code>section_id</code> from low to high</li></ul>',
      solution: `SELECT section_id, COUNT(*) AS enrolled FROM enrollments GROUP BY section_id HAVING COUNT(*) >= 6 ORDER BY enrolled DESC, section_id;`,
      ordered: true,
      hints: ['Use GROUP BY section_id and COUNT(*).', 'Filter groups with HAVING, not WHERE.', 'ORDER BY enrolled DESC, section_id'],
      explain: `<p><b>The idea:</b> Count enrollments per section with GROUP BY. Then keep only the big groups with HAVING.</p><p><b>How it works:</b> <code>GROUP BY section_id</code> makes one group per section. <code>COUNT(*) AS enrolled</code> counts the rows in each group. <code>HAVING COUNT(*) &gt;= 6</code> keeps groups with 6 or more students. <code>ORDER BY enrolled DESC, section_id</code> puts the biggest first and breaks ties by id.</p><p><b>Common mistake:</b> Writing <code>WHERE COUNT(*) &gt;= 6</code>. WHERE runs before grouping, so it cannot use COUNT. Use HAVING for conditions on groups.</p>`
    },
    {
      id: 'd11-9', level: 3,
      prompt: '<p>Check the payment totals before a big change. Show one row per payment method, and one extra row for all payments together.</p><ul class="spec"><li><b>Columns:</b> <code>method</code>, <code>n</code> (number of payments), <code>total</code> (sum of <code>amount</code>)</li><li><b>Note:</b> the extra row has <code>method</code> = <code>\'ALL\'</code>. It holds the count and total of all payments.</li><li><b>Order:</b> the methods in A–Z order, and the <code>\'ALL\'</code> row last</li></ul>',
      solution: `SELECT method, n, total FROM (
  SELECT method, COUNT(*) AS n, SUM(amount) AS total, 0 AS grp FROM payments GROUP BY method
  UNION ALL
  SELECT 'ALL', COUNT(*), SUM(amount), 1 FROM payments
) ORDER BY grp, method;`,
      ordered: true,
      hints: ['Make the rows per method with GROUP BY. Make the ALL row with a second SELECT without GROUP BY.', 'Join the two results with UNION ALL.', 'To put ALL last, add a helper column: 0 for normal rows, 1 for the ALL row. Sort by it first.'],
      explain: `<p><b>The idea:</b> Build two results, one row per method and one total row, and stack them with <code>UNION ALL</code>. An extra column <code>grp</code> puts the total row last.</p><p><b>How it works:</b> The first SELECT groups by <code>method</code> and counts and sums each group, with <code>grp = 0</code>. The second SELECT counts and sums all payments, labelled <code>'ALL'</code>, with <code>grp = 1</code>. <code>UNION ALL</code> joins the two results. The outer query sorts by <code>grp</code>, then <code>method</code>, and shows only the three columns.</p><p><b>Common mistake:</b> Sorting only by <code>method</code>. Then <code>'ALL'</code> comes first, because capital letters sort before small letters. It must be the last row.</p>`
    }
  ],
  quiz: [
    { id: 'd11-q1', q: 'A transaction moves 100 from A to B. The server crashes after taking the money from A, but before adding it to B. After the restart, A has its old balance again. Which ACID property did this?', options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'], answer: 0, why: 'Atomicity means all or nothing. The recovery process undid the unfinished transaction.' },
    { id: 'd11-q2', q: 'T2 reads a value that T1 wrote. Then T1 rolls back (cancels). What problem did T2 have?', options: ['Phantom read', 'Lost update', 'Dirty read', 'Non-repeatable read'], answer: 2, why: 'T2 read data that was never committed and then disappeared. This is a dirty read.' },
    { id: 'd11-q3', q: 'In the SQL standard, which is the lowest isolation level that stops non-repeatable reads but can still allow phantoms?', options: ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'], answer: 2, why: 'REPEATABLE READ protects the rows you already read. But new rows that match your search can still appear.' },
    { id: 'd11-q4', q: 'Which pair of operations does NOT conflict?', options: ['R1(X), W2(X)', 'W1(X), R2(X)', 'R1(X), R2(X)', 'W1(X), W2(X)'], answer: 2, why: 'Two reads never conflict. A conflict needs two transactions, the same item, and at least one write.' },
    { id: 'd11-q5', q: 'Schedule: R1(A), W2(A), W1(A). What does the precedence graph have?', options: ['Only T1 → T2', 'Only T2 → T1', 'T1 → T2 and T2 → T1 (a cycle)', 'No edges'], answer: 2, why: 'R1(A) comes before W2(A), so T1 → T2. W2(A) comes before W1(A), so T2 → T1. That is a cycle, so the schedule is not conflict-serializable.' },
    { id: 'd11-q6', q: 'What is NOT allowed under two-phase locking (2PL)?', options: ['Holding two locks at once', 'Taking a new lock after giving up any lock', 'Reading an item after writing it', 'Keeping an exclusive lock until commit'], answer: 1, why: 'First a transaction only takes locks. After it gives up one lock, it cannot take new ones. Keeping exclusive locks until commit is strict 2PL, and that is allowed.' },
    { id: 'd11-q7', q: 'In PostgreSQL, a long report runs and does not block writers. Why?', options: ['Reports use READ UNCOMMITTED', 'MVCC lets the report read old row versions from its snapshot', 'PostgreSQL has no locks', 'Writers wait until the report ends'], answer: 1, why: 'With MVCC, writers make new versions of rows. Readers see the versions from their snapshot. So readers and writers do not block each other.' },
    { id: 'd11-q8', q: 'What does the write-ahead logging (WAL) rule say?', options: ['Data pages are written before the log', 'The log record must reach disk before the data page it describes', 'The log is written only at checkpoints', 'Every page is written at commit'], answer: 1, why: 'If the log is on disk first, recovery can always redo committed work and undo unfinished work.' }
  ],
  teach: 'Explain the lost-update problem with a two-column timeline (T1 and T2), and give two different ways to prevent it.',
  rubric: 'Both transactions read the same old value; each computes a new value; the later write overwrites the earlier one so one change is lost; concrete numbers (e.g. 500 + 100 and 500 + 50 gives 550 instead of 650); prevention: do the arithmetic in one UPDATE (SET x = x + n), lock the row with SELECT ... FOR UPDATE, use a SERIALIZABLE / higher isolation level, or optimistic concurrency with a version column.'
});
