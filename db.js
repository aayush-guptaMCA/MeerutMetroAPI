// db.js
const mysql = require('mysql2');


const pool = mysql.createPool({
  host: '178.62.201.137',
  user: 'usefcrhjus',
  password: 'U9uBSdtvDx',
  database: 'usefcrhjus',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
