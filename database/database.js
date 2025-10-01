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

    const createRaceTime = `
      CREATE TABLE IF NOT EXISTS race_time (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        race_start TEXT NOT NULL,
        race_end TEXT NOT NULL,
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

    this.db.run(createRaceTime, (err) => {
      if (err) {
        console.error('Ошибка создания таблицы race_time:', err.message);
      } else {
        console.log('✅ Таблица race_time готова');
        this.initializeRaceTime();
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

  initializeRaceTime() {
    const checkData = 'SELECT COUNT(*) as count FROM race_time';
    this.db.get(checkData, (err, row) => {
      if (err) {
        console.error('Ошибка проверки времени забега:', err.message);
        return;
      }
      if (row.count === 0) {
        const defaultStart = '2025-10-01T14:00:00+03:00';
        const defaultEnd = '2025-10-02T14:00:00+03:00';
        const insertInitial = 'INSERT INTO race_time (race_start, race_end) VALUES (?, ?)';
        this.db.run(insertInitial, [defaultStart, defaultEnd], (err) => {
          if (err) {
            console.error('Ошибка инициализации времени забега:', err.message);
          } else {
            console.log('✅ Начальное время забега добавлено');
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
        SET total_km = ?,
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

  getRaceTime() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT race_start, race_end, updated_at FROM race_time ORDER BY id DESC LIMIT 1';
      this.db.get(query, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            row || {
              race_start: '2025-10-01T14:00:00+03:00',
              race_end: '2025-10-02T14:00:00+03:00',
              updated_at: new Date().toISOString(),
            }
          );
        }
      });
    });
  }

  setRaceTime(raceStart, raceEnd) {
    return new Promise((resolve, reject) => {
      if (!raceStart || !raceEnd) {
        reject(new Error('Необходимо указать время начала и окончания забега'));
        return;
      }
      
      const insertSql = 'INSERT INTO race_time (race_start, race_end) VALUES (?, ?)';
      this.db.run(insertSql, [raceStart, raceEnd], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          success: true,
          race_start: raceStart,
          race_end: raceEnd,
          updated_at: new Date().toISOString()
        });
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

