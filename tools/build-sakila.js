// Converts the official MySQL Sakila sample database (sakila-schema.sql + sakila-data.sql)
// into an SQLite file the lab loads on demand: sakila/sakila.db.gz
// Usage: node tools/build-sakila.js /path/to/sakila-data.sql
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dataPath = process.argv[2];
if (!dataPath) { console.error('Usage: node tools/build-sakila.js /path/to/sakila-data.sql'); process.exit(1); }

const SCHEMA = `
CREATE TABLE actor (
  actor_id    INTEGER PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  last_update TEXT NOT NULL
);
CREATE TABLE country (
  country_id  INTEGER PRIMARY KEY,
  country     TEXT NOT NULL,
  last_update TEXT NOT NULL
);
CREATE TABLE city (
  city_id     INTEGER PRIMARY KEY,
  city        TEXT NOT NULL,
  country_id  INTEGER NOT NULL REFERENCES country(country_id),
  last_update TEXT NOT NULL
);
CREATE TABLE address (
  address_id  INTEGER PRIMARY KEY,
  address     TEXT NOT NULL,
  address2    TEXT,
  district    TEXT NOT NULL,
  city_id     INTEGER NOT NULL REFERENCES city(city_id),
  postal_code TEXT,
  phone       TEXT NOT NULL,
  last_update TEXT NOT NULL
);
CREATE TABLE category (
  category_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  last_update TEXT NOT NULL
);
CREATE TABLE language (
  language_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  last_update TEXT NOT NULL
);
CREATE TABLE film (
  film_id              INTEGER PRIMARY KEY,
  title                TEXT NOT NULL,
  description          TEXT,
  release_year         INTEGER,
  language_id          INTEGER NOT NULL REFERENCES language(language_id),
  original_language_id INTEGER REFERENCES language(language_id),
  rental_duration      INTEGER NOT NULL DEFAULT 3,
  rental_rate          REAL NOT NULL DEFAULT 4.99,
  length               INTEGER,
  replacement_cost     REAL NOT NULL DEFAULT 19.99,
  rating               TEXT DEFAULT 'G' CHECK (rating IN ('G','PG','PG-13','R','NC-17')),
  special_features     TEXT,
  last_update          TEXT NOT NULL
);
CREATE TABLE film_actor (
  actor_id    INTEGER NOT NULL REFERENCES actor(actor_id),
  film_id     INTEGER NOT NULL REFERENCES film(film_id),
  last_update TEXT NOT NULL,
  PRIMARY KEY (actor_id, film_id)
);
CREATE TABLE film_category (
  film_id     INTEGER NOT NULL REFERENCES film(film_id),
  category_id INTEGER NOT NULL REFERENCES category(category_id),
  last_update TEXT NOT NULL,
  PRIMARY KEY (film_id, category_id)
);
CREATE TABLE film_text (
  film_id     INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT
);
CREATE TABLE staff (
  staff_id    INTEGER PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  address_id  INTEGER NOT NULL REFERENCES address(address_id),
  picture     BLOB,
  email       TEXT,
  store_id    INTEGER NOT NULL REFERENCES store(store_id),
  active      INTEGER NOT NULL DEFAULT 1,
  username    TEXT NOT NULL,
  password    TEXT,
  last_update TEXT NOT NULL
);
CREATE TABLE store (
  store_id         INTEGER PRIMARY KEY,
  manager_staff_id INTEGER NOT NULL UNIQUE REFERENCES staff(staff_id),
  address_id       INTEGER NOT NULL REFERENCES address(address_id),
  last_update      TEXT NOT NULL
);
CREATE TABLE customer (
  customer_id INTEGER PRIMARY KEY,
  store_id    INTEGER NOT NULL REFERENCES store(store_id),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT,
  address_id  INTEGER NOT NULL REFERENCES address(address_id),
  active      INTEGER NOT NULL DEFAULT 1,
  create_date TEXT NOT NULL,
  last_update TEXT
);
CREATE TABLE inventory (
  inventory_id INTEGER PRIMARY KEY,
  film_id      INTEGER NOT NULL REFERENCES film(film_id),
  store_id     INTEGER NOT NULL REFERENCES store(store_id),
  last_update  TEXT NOT NULL
);
CREATE TABLE rental (
  rental_id    INTEGER PRIMARY KEY,
  rental_date  TEXT NOT NULL,
  inventory_id INTEGER NOT NULL REFERENCES inventory(inventory_id),
  customer_id  INTEGER NOT NULL REFERENCES customer(customer_id),
  return_date  TEXT,
  staff_id     INTEGER NOT NULL REFERENCES staff(staff_id),
  last_update  TEXT NOT NULL,
  UNIQUE (rental_date, inventory_id, customer_id)
);
CREATE TABLE payment (
  payment_id   INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customer(customer_id),
  staff_id     INTEGER NOT NULL REFERENCES staff(staff_id),
  rental_id    INTEGER REFERENCES rental(rental_id),
  amount       REAL NOT NULL,
  payment_date TEXT NOT NULL,
  last_update  TEXT
);`;

// Same secondary indexes as the MySQL original (foreign keys and common lookups)
const INDEXES = `
CREATE INDEX idx_actor_last_name ON actor(last_name);
CREATE INDEX idx_fk_country_id ON city(country_id);
CREATE INDEX idx_fk_city_id ON address(city_id);
CREATE INDEX idx_title ON film(title);
CREATE INDEX idx_fk_language_id ON film(language_id);
CREATE INDEX idx_fk_original_language_id ON film(original_language_id);
CREATE INDEX idx_fk_film_id ON film_actor(film_id);
CREATE INDEX idx_fk_film_category_category ON film_category(category_id);
CREATE INDEX idx_fk_store_address ON store(address_id);
CREATE INDEX idx_fk_staff_store_id ON staff(store_id);
CREATE INDEX idx_fk_staff_address_id ON staff(address_id);
CREATE INDEX idx_fk_customer_store_id ON customer(store_id);
CREATE INDEX idx_fk_customer_address_id ON customer(address_id);
CREATE INDEX idx_customer_last_name ON customer(last_name);
CREATE INDEX idx_fk_inventory_film_id ON inventory(film_id);
CREATE INDEX idx_store_id_film_id ON inventory(store_id, film_id);
CREATE INDEX idx_fk_rental_inventory_id ON rental(inventory_id);
CREATE INDEX idx_fk_rental_customer_id ON rental(customer_id);
CREATE INDEX idx_fk_rental_staff_id ON rental(staff_id);
CREATE INDEX idx_fk_payment_staff_id ON payment(staff_id);
CREATE INDEX idx_fk_payment_customer_id ON payment(customer_id);
CREATE INDEX idx_fk_payment_rental ON payment(rental_id);`;

// SQLite versions of the original MySQL views (CONCAT -> ||, GROUP_CONCAT SEPARATOR -> GROUP_CONCAT(x, sep))
const VIEWS = `
CREATE VIEW customer_list AS
SELECT cu.customer_id AS id, cu.first_name || ' ' || cu.last_name AS name, a.address, a.postal_code AS zip_code,
       a.phone, city.city, country.country, CASE WHEN cu.active THEN 'active' ELSE '' END AS notes, cu.store_id AS sid
FROM customer cu
JOIN address a ON cu.address_id = a.address_id
JOIN city ON a.city_id = city.city_id
JOIN country ON city.country_id = country.country_id;

CREATE VIEW film_list AS
SELECT film.film_id AS fid, film.title, film.description, category.name AS category, film.rental_rate AS price,
       film.length, film.rating, GROUP_CONCAT(actor.first_name || ' ' || actor.last_name, ', ') AS actors
FROM film
LEFT JOIN film_category ON film_category.film_id = film.film_id
LEFT JOIN category ON category.category_id = film_category.category_id
LEFT JOIN film_actor ON film.film_id = film_actor.film_id
LEFT JOIN actor ON film_actor.actor_id = actor.actor_id
GROUP BY film.film_id, category.name;

CREATE VIEW staff_list AS
SELECT s.staff_id AS id, s.first_name || ' ' || s.last_name AS name, a.address, a.postal_code AS zip_code, a.phone,
       city.city, country.country, s.store_id AS sid
FROM staff s
JOIN address a ON s.address_id = a.address_id
JOIN city ON a.city_id = city.city_id
JOIN country ON city.country_id = country.country_id;

CREATE VIEW sales_by_store AS
SELECT c.city || ',' || cy.country AS store, m.first_name || ' ' || m.last_name AS manager, SUM(p.amount) AS total_sales
FROM payment p
JOIN rental r ON p.rental_id = r.rental_id
JOIN inventory i ON r.inventory_id = i.inventory_id
JOIN store s ON i.store_id = s.store_id
JOIN address a ON s.address_id = a.address_id
JOIN city c ON a.city_id = c.city_id
JOIN country cy ON c.country_id = cy.country_id
JOIN staff m ON s.manager_staff_id = m.staff_id
GROUP BY s.store_id
ORDER BY cy.country, c.city;

CREATE VIEW sales_by_film_category AS
SELECT c.name AS category, SUM(p.amount) AS total_sales
FROM payment p
JOIN rental r ON p.rental_id = r.rental_id
JOIN inventory i ON r.inventory_id = i.inventory_id
JOIN film f ON i.film_id = f.film_id
JOIN film_category fc ON f.film_id = fc.film_id
JOIN category c ON fc.category_id = c.category_id
GROUP BY c.name
ORDER BY total_sales DESC;

CREATE VIEW actor_info AS
SELECT a.actor_id, a.first_name, a.last_name,
       GROUP_CONCAT(c.name || ': ' || f.title, '; ') AS film_info
FROM actor a
LEFT JOIN film_actor fa ON a.actor_id = fa.actor_id
LEFT JOIN film f ON fa.film_id = f.film_id
LEFT JOIN film_category fc ON f.film_id = fc.film_id
LEFT JOIN category c ON fc.category_id = c.category_id
GROUP BY a.actor_id, a.first_name, a.last_name;`;

const raw = fs.readFileSync(dataPath, 'utf8');
// keep only INSERT statements; each runs until a line that ends with ");"
const lines = raw.split('\n');
const inserts = []; let cur = null;
for (const ln of lines) {
  if (!cur && /^INSERT INTO /.test(ln)) cur = [];
  if (cur) { cur.push(ln); if (/\);\s*$/.test(ln)) { inserts.push(cur.join('\n')); cur = null; } }
}
const fixed = inserts.map(st => st
  .replace(/`/g, '')
  .replace(/\/\*!\d+\s+0x[0-9A-Fa-f]+,\*\//g, '')       // address.location (MySQL GEOMETRY) is dropped
  .replace(/0x89504E47[0-9A-Fa-f]+/g, 'NULL'));            // staff.picture PNG is dropped to keep the file small

require('sql.js/dist/sql-asm.js')().then(SQL => {
  const db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(SCHEMA);
  db.exec('BEGIN;'); fixed.forEach(st => db.exec(st)); db.exec('COMMIT;');
  db.exec(INDEXES); db.exec(VIEWS);
  // MySQL keeps film_text in sync with triggers; do the same in SQLite
  db.exec(`INSERT INTO film_text (film_id, title, description) SELECT film_id, title, description FROM film;
CREATE TRIGGER ins_film AFTER INSERT ON film BEGIN
  INSERT INTO film_text (film_id, title, description) VALUES (NEW.film_id, NEW.title, NEW.description);
END;
CREATE TRIGGER upd_film AFTER UPDATE ON film WHEN OLD.title IS NOT NEW.title OR OLD.description IS NOT NEW.description OR OLD.film_id IS NOT NEW.film_id BEGIN
  UPDATE film_text SET title = NEW.title, description = NEW.description, film_id = NEW.film_id WHERE film_id = OLD.film_id;
END;
CREATE TRIGGER del_film AFTER DELETE ON film BEGIN
  DELETE FROM film_text WHERE film_id = OLD.film_id;
END;`);
  db.exec('PRAGMA foreign_keys = ON;');
  const fkErr = db.exec('PRAGMA foreign_key_check');
  if (fkErr.length) { console.error('foreign key problems:', fkErr[0].values.slice(0, 5)); process.exit(1); }
  db.exec('VACUUM;');
  const counts = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0].values.map(([t]) => t + ' ' + db.exec('SELECT COUNT(*) FROM ' + t)[0].values[0][0]);
  console.log(counts.join(', '));
  db.exec('SELECT * FROM film_list LIMIT 1; SELECT * FROM sales_by_store; SELECT * FROM actor_info LIMIT 1;');
  const bytes = Buffer.from(db.export());
  const out = path.join(__dirname, '..', 'sakila', 'sakila.db.gz');
  fs.writeFileSync(out, zlib.gzipSync(bytes, { level: 9 }));
  console.log('sqlite', (bytes.length / 1024).toFixed(0) + ' KB → gz', (fs.statSync(out).size / 1024).toFixed(0) + ' KB:', out);
});
