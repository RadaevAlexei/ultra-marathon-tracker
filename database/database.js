const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    const dbPath = path.join(__dirname, 'run_stats.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
      } else {
        console.log('✅ Подключение к базе данных установлено');
        this.createTables();
      }
    });
  }

  createTables() {
    const createRunStats = `
      CREATE TABLE IF NOT EXISTS run_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_km REAL DEFAULT 0.0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createRunStats, (err) => {
      if (err) {
        console.error('Ошибка создания таблицы run_stats:', err.message);
      } else {
        console.log('✅ Таблица run_stats готова');
        this.initializeRunStats();
      }
    });
  }

  initializeRunStats() {
    const checkData = 'SELECT COUNT(*) as count FROM run_stats';
    this.db.get(checkData, (err, row) => {
      if (err) {
        console.error('Ошибка проверки данных:', err.message);
        return;
      }
      if (row.count === 0) {
        const insertInitial = 'INSERT INTO run_stats (total_km) VALUES (0.0)';
        this.db.run(insertInitial, (err) => {
          if (err) {
            console.error('Ошибка инициализации данных:', err.message);
          } else {
            console.log('✅ Начальные данные run_stats добавлены');
          }
        });
      }
    });
  }

  getStats() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT id, total_km, updated_at FROM run_stats ORDER BY id DESC LIMIT 1';
      this.db.get(query, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            row || {
              id: 1,
              total_km: 0.0,
              updated_at: new Date().toISOString(),
            }
          );
        }
      });
    });
  }

  updateKm(km) {
    return new Promise((resolve, reject) => {
      if (typeof km !== 'number' || Number.isNaN(km)) {
        reject(new Error('Некорректное число километров'));
        return;
      }
      const updateSql = `
        UPDATE run_stats
        SET total_km = total_km + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM run_stats ORDER BY id DESC LIMIT 1)
      `;
      this.db.run(updateSql, [km], (err) => {
        if (err) {
          reject(err);
          return;
        }
        this.getStats()
          .then((row) => resolve({ success: true, total_km: row.total_km, updated_at: row.updated_at }))
          .catch(reject);
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Ошибка закрытия базы данных:', err.message);
        } else {
          console.log('✅ Соединение с базой данных закрыто');
        }
      });
    }
  }
}

module.exports = new Database();

