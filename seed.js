// University dataset used by every lesson and exercise.
// Deterministic: the same SQL is produced on every load, so graded answers are stable.
var LAB = (typeof LAB !== 'undefined') ? LAB : {};
LAB.days = LAB.days || [];

LAB.SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE departments (
  dept_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  building  TEXT,
  budget    INTEGER CHECK (budget >= 0)
);

CREATE TABLE instructors (
  instructor_id INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  dept_id       INTEGER REFERENCES departments(dept_id),
  salary        INTEGER NOT NULL CHECK (salary > 0),
  hire_date     TEXT NOT NULL,
  mentor_id     INTEGER REFERENCES instructors(instructor_id)
);

CREATE TABLE students (
  student_id  INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  dept_id     INTEGER REFERENCES departments(dept_id),
  year        INTEGER CHECK (year BETWEEN 1 AND 4),
  city        TEXT,
  birth_date  TEXT,
  advisor_id  INTEGER REFERENCES instructors(instructor_id),
  enrolled_on TEXT NOT NULL
);

CREATE TABLE courses (
  course_id TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  dept_id   INTEGER NOT NULL REFERENCES departments(dept_id),
  credits   INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 6)
);

CREATE TABLE prereqs (
  course_id TEXT REFERENCES courses(course_id),
  prereq_id TEXT REFERENCES courses(course_id),
  PRIMARY KEY (course_id, prereq_id)
);

CREATE TABLE sections (
  section_id    INTEGER PRIMARY KEY,
  course_id     TEXT NOT NULL REFERENCES courses(course_id),
  instructor_id INTEGER REFERENCES instructors(instructor_id),
  semester      TEXT NOT NULL CHECK (semester IN ('Fall','Spring','Summer')),
  year          INTEGER NOT NULL,
  room          TEXT,
  capacity      INTEGER NOT NULL
);

CREATE TABLE enrollments (
  student_id INTEGER REFERENCES students(student_id),
  section_id INTEGER REFERENCES sections(section_id),
  grade      TEXT CHECK (grade IN ('A','B','C','D','F')),
  score      REAL,
  PRIMARY KEY (student_id, section_id)
);

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  amount     REAL NOT NULL,
  paid_on    TEXT NOT NULL,
  method     TEXT NOT NULL CHECK (method IN ('card','bank','cash'))
);
`;

LAB.buildSeedSQL = function () {
  var out = [];
  function q(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }
  function ins(table, rows) {
    rows.forEach(function (r) { out.push('INSERT INTO ' + table + ' VALUES (' + r.map(q).join(', ') + ');'); });
  }
  // mulberry32: tiny seeded PRNG
  var seed = 20261005;
  function rnd() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  ins('departments', [
    [1, 'Computer Science', 'Turing Hall', 950000],
    [2, 'Mathematics', 'Noether Hall', 520000],
    [3, 'Physics', 'Curie Building', 610000],
    [4, 'Biology', 'Darwin Labs', 480000],
    [5, 'Economics', 'Smith Hall', 400000],
    [6, 'History', 'Ibn Khaldun Hall', 210000],
    [7, 'Electrical Engineering', 'Tesla Center', 870000],
    [8, 'Philosophy', 'Ibn Rushd Hall', 120000]
  ]);

  ins('instructors', [
    [101, 'Layla Haddad', 1, 98000, '2012-08-15', null],
    [102, 'Marco Rossi', 1, 87000, '2016-01-10', 101],
    [103, 'Aisha Rahman', 1, 76000, '2020-09-01', 101],
    [104, 'David Kim', 2, 91000, '2010-08-20', null],
    [105, 'Sofia Petrova', 2, 72000, '2019-01-07', 104],
    [106, 'Omar Farouk', 3, 95000, '2011-02-14', null],
    [107, 'Hannah Becker', 3, 68000, '2022-08-29', 106],
    [108, 'Yusuf Demir', 4, 83000, '2014-09-03', null],
    [109, 'Grace Okafor', 4, 79000, '2017-08-21', 108],
    [110, 'Lucas Martin', 5, 88000, '2013-01-15', null],
    [111, 'Mei Chen', 5, 70000, '2021-08-30', 110],
    [112, 'Tariq Aziz', 6, 64000, '2015-09-10', null],
    [113, 'Elena Garcia', 7, 102000, '2009-08-17', null],
    [114, 'Nikhil Rao', 7, 81000, '2018-01-08', 113],
    [115, 'Fatima Zahra', 7, 74000, '2023-01-09', 113],
    [116, 'Jonas Berg', null, 60000, '2024-08-26', 101]
  ]);

  var first = ['Ahmed','Sara','Ali','Noor','Yousef','Mariam','Hassan','Zainab','Karim','Lina','Omar','Huda','Adam','Emma','Liam','Olivia','Noah','Ava','Mateo','Chloe','Ibrahim','Rania','Samir','Dina','Leo','Mia','Ethan','Amira','Khalid','Salma','Ravi','Priya','Kenji','Yuki','Ivan','Anya','Tomas','Ines','Bilal','Reem'];
  var last = ['Al-Sayed','Haddad','Nasser','Khalil','Saleh','Mansour','Ibrahim','Jaber','Hamdan','Qasim','Smith','Johnson','Garcia','Muller','Rossi','Tanaka','Patel','Kovac','Silva','Novak'];
  var cities = ['Baghdad','Amman','Cairo','Dubai','Riyadh','Beirut','Istanbul','London','Berlin', null];
  var students = [];
  for (var i = 0; i < 40; i++) {
    var id = 1001 + i;
    var fn = first[i], ln = last[(i * 7) % last.length];
    var dept = (i % 13 === 12) ? null : [1,1,1,2,3,4,5,6,7,7,1,2,3,5,4][Math.floor(rnd() * 15)];
    var year = 1 + Math.floor(rnd() * 4);
    var city = cities[Math.floor(rnd() * cities.length)];
    var by = 2006 - year + (rnd() < 0.3 ? -1 : 0);
    var bm = 1 + Math.floor(rnd() * 12), bd = 1 + Math.floor(rnd() * 28);
    var bdate = by + '-' + String(bm).padStart(2,'0') + '-' + String(bd).padStart(2,'0');
    var advisorPool = { 1:[101,102,103], 2:[104,105], 3:[106,107], 4:[108,109], 5:[110,111], 6:[112], 7:[113,114,115] };
    var advisor = dept && rnd() < 0.85 ? pick(advisorPool[dept]) : null;
    var enrolledYear = 2026 - year;
    var enrolled = enrolledYear + '-09-' + String(1 + Math.floor(rnd() * 10)).padStart(2,'0');
    var email = (fn + '.' + ln).toLowerCase().replace(/[^a-z.]/g,'') + '@uni.edu';
    students.push([id, fn + ' ' + ln, email, dept, year, city, bdate, advisor, enrolled]);
  }
  ins('students', students);

  var courses = [
    ['CS101','Introduction to Programming',1,4],['CS201','Data Structures',1,4],['CS220','Databases',1,3],
    ['CS310','Algorithms',1,4],['CS340','Operating Systems',1,4],['CS420','Distributed Systems',1,3],
    ['MA101','Calculus I',2,4],['MA102','Calculus II',2,4],['MA210','Linear Algebra',2,3],['MA250','Discrete Mathematics',2,3],
    ['PH101','Mechanics',3,4],['PH201','Electromagnetism',3,4],
    ['BI101','Cell Biology',4,3],['BI230','Genetics',4,3],
    ['EC101','Microeconomics',5,3],['EC102','Macroeconomics',5,3],['EC300','Econometrics',5,4],
    ['HI110','World History',6,3],['HI240','History of Science',6,3],
    ['EE101','Circuits',7,4],['EE230','Signals and Systems',7,4],['EE330','Embedded Systems',7,3],
    ['PL100','Logic and Reasoning',8,3]
  ];
  ins('courses', courses);

  ins('prereqs', [
    ['CS201','CS101'],['CS220','CS201'],['CS310','CS201'],['CS310','MA250'],['CS340','CS201'],['CS420','CS340'],['CS420','CS220'],
    ['MA102','MA101'],['MA210','MA101'],['PH201','PH101'],['PH201','MA102'],['BI230','BI101'],
    ['EC102','EC101'],['EC300','EC102'],['EC300','MA210'],['EE230','EE101'],['EE230','MA102'],['EE330','EE230'],['EE330','CS101']
  ]);

  var teachers = { 1:[101,102,103,116], 2:[104,105], 3:[106,107], 4:[108,109], 5:[110,111], 6:[112], 7:[113,114,115], 8:[] };
  var rooms = ['A101','A102','B201','B202','C10','C11','LAB1','LAB2','AUD'];
  var sections = [], sid = 1;
  var terms = [['Fall',2024],['Spring',2025],['Fall',2025],['Spring',2026],['Fall',2026]];
  courses.forEach(function (c) {
    var n = (c[0] === 'PL100') ? 1 : (c[0] === 'HI240' ? 0 : 1 + Math.floor(rnd() * 2) + (c[2] === 1 ? 1 : 0));
    for (var k = 0; k < n; k++) {
      var term = terms[Math.floor(rnd() * terms.length)];
      var pool = teachers[c[2]];
      var instr = pool.length ? pick(pool) : null;
      sections.push([sid++, c[0], instr, term[0], term[1], pick(rooms), pick([25, 30, 40, 60, 120])]);
    }
  });
  ins('sections', sections);

  function letter(s) { return s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F'; }
  var enr = [], seen = {};
  students.forEach(function (s) {
    var count = (s[0] === 1040 || s[0] === 1033) ? 0 : 2 + Math.floor(rnd() * 5);
    var skill = 55 + rnd() * 40;
    for (var k = 0; k < count; k++) {
      var sec = sections[Math.floor(rnd() * sections.length)];
      var key = s[0] + ':' + sec[0];
      if (seen[key]) continue; seen[key] = 1;
      var current = (sec[3] === 'Fall' && sec[4] === 2026);
      var score = current ? null : Math.round(Math.min(100, Math.max(30, skill + (rnd() - 0.5) * 30)) * 10) / 10;
      enr.push([s[0], sec[0], score === null ? null : letter(score), score]);
    }
  });
  ins('enrollments', enr);

  var pays = [], pid = 1;
  students.forEach(function (s) {
    var n = (s[0] === 1040) ? 0 : 1 + Math.floor(rnd() * 4);
    for (var k = 0; k < n; k++) {
      var m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 28);
      var y = rnd() < 0.5 ? 2025 : 2026;
      if (y === 2026 && m > 9) m = 9;
      pays.push([pid++, s[0], pick([250, 500, 750, 1000, 1250, 1500]), y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0'), pick(['card','card','bank','cash'])]);
    }
  });
  ins('payments', pays);

  return out.join('\n');
};

LAB.TABLE_NOTES = {
  departments: 'One row per academic department.',
  instructors: 'Teaching staff. mentor_id points to another instructor (self-reference).',
  students: 'One row per student. dept_id is the major (NULL = undeclared). advisor_id points to an instructor.',
  courses: 'The course catalog. course_id is a text code like CS220.',
  prereqs: 'Course X requires course Y. A many-to-many relationship of courses with themselves.',
  sections: 'A course taught in a specific term by one instructor.',
  enrollments: 'Which student took which section. grade and score are NULL while the course is in progress (Fall 2026).',
  payments: 'Tuition payments made by students.'
};

if (typeof module !== 'undefined') module.exports = LAB;
