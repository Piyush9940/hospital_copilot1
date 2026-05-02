import Database from 'better-sqlite3';

const db = new Database('./database/hospital.db');
const users = db.prepare('SELECT email FROM users').all();
console.log(users);
