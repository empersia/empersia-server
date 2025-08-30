const mysql = require('mysql2');

// اتصال به پایگاه داده MySQL
const connection = mysql.createConnection({
  host: 'localhost',  // یا آدرس سرور شما
  user: 'root',       // نام کاربری MySQL
  password: '',       // پسورد MySQL
  database: 'empersia'  // نام پایگاه داده شما
});

// مدل کاربر
const createUserTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    wood INT DEFAULT 0,
    stone INT DEFAULT 0,
    iron INT DEFAULT 0
  );
`;

// اجرای دستور برای ایجاد جدول اگر وجود نداشت
connection.query(createUserTable, (err, results) => {
  if (err) {
    console.log("Error creating user table: ", err);
  } else {
    console.log("User table created or already exists.");
  }
});

// تابع ذخیره‌سازی کاربر جدید
function createUser(username, email, password, callback) {
  const query = `
    INSERT INTO users (username, email, password) 
    VALUES (?, ?, ?)
  `;
  connection.query(query, [username, email, password], callback);
}

// تابع جستجو برای کاربر
function findUserByUsername(username, callback) {
  const query = 'SELECT * FROM users WHERE username = ?';
  connection.query(query, [username], callback);
}

// صادر کردن توابع برای استفاده در سایر بخش‌های برنامه
module.exports = {
  createUser,
  findUserByUsername
};
