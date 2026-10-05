# Relational Lab

A free 14-day course that makes you fluent in SQL and database design. A real SQLite engine runs inside the page, so every query you write is actually executed. There is nothing to install and no account to create.

**Open the lab:** https://omarmudhaffar.github.io/relational-lab/

## What you learn

| Week 1 · Querying | Week 2 · Design, theory and internals |
|---|---|
| 1. Tables, keys and your first queries | 8. Creating and changing data (DDL, DML, constraints) |
| 2. Filtering rows and NULL logic | 9. Entity-relationship modeling |
| 3. Aggregation, GROUP BY and HAVING | 10. Normalization (closures, keys, 1NF to BCNF) |
| 4. Joins | 11. Transactions, ACID and concurrency |
| 5. Subqueries and set operations | 12. Indexes and query performance |
| 6. CTEs and window functions | 13. Views, triggers, security, relational algebra |
| 7. Week 1 review and SQL exam | 14. Capstone project and final exam |

## How each day works

1. **Learn:** short lessons with runnable examples. Before each answer, the lesson asks you to predict the result.
2. **Practice:** graded exercises from easy to hard. Feedback tells you what is wrong. Hints come one at a time.
3. **Recall:** a closed-book quiz. The questions return later in **Review**, on a spaced schedule (1, 3, 7, 14 and 30 days).
4. **Explain:** write the idea in your own words, then compare it with the key points.

Each feature follows a learning method with strong research behind it: retrieval practice, spacing, predicting before seeing the answer, worked examples with fading hints, interleaving, and self-explanation. All exercises use one university database: students, instructors, departments, courses, sections, enrollments and payments.

## Interactive extras

- **Live 3D database:** the 8 tables are drawn as database cylinders linked by their foreign keys. When you run a query, the tables it touches light up and data packets travel along the joins. You can drag the model to turn it, and clicking a table shows its columns.
- **Query X-ray:** after every run, an animated breakdown shows how the database built your result in the order it actually runs (FROM, JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT), with the row count after each step.
- **Real-world requests:** each exercise is a request from a university office (Registrar, Finance, HR…). Solving one delivers it, earns XP and moves you up the ranks from Intern to Data Architect.

Your progress (XP, streak, solved exercises, review cards) is saved automatically in your own browser (localStorage). You can download a backup file and restore it on another device.

Designed and built by **Omar Mudhaffar**.

## Run it locally

Open `index.html` in a browser. To edit the lessons:

```bash
npm install
npm test        # runs every lesson example and exercise solution against the database
npm run build   # rebuilds index.html from app.html, seed.js and days/
npm run smoke   # optional: solves every exercise through the UI in headless Chrome
```

## Project layout

- `app.html`: the app (UI, grader, progress, spaced review)
- `seed.js`: schema and deterministic sample data
- `days/dayNN.js`: one file per day (lessons, exercises, quiz)
- `build.js`: inlines everything into the single file `index.html`
- `test.js`, `smoke.js`: content and end-to-end checks

The engine is [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to JavaScript), loaded from cdnjs.
