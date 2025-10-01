// Простое хранилище данных в памяти (для тестирования)
// В продакшене лучше использовать Netlify Blobs или внешнюю БД

let dataStore = {
  id: 1,
  total_km: 0.0,
  updated_at: new Date().toISOString()
};

async function getStats() {
  return dataStore;
}

async function saveStats(stats) {
  dataStore = { ...stats };
  return true;
}

module.exports = { getStats, saveStats };
