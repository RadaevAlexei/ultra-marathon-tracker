// Хранилище данных с использованием JSON API сервиса
const fetch = require('node-fetch');

// Используем httpbin.org как временное хранилище
// В продакшене лучше использовать MongoDB Atlas, Supabase или Firebase

let currentData = {
  id: 1,
  total_km: 0.0,
  updated_at: new Date().toISOString()
};

async function getStats() {
  // Для простоты используем глобальную переменную
  // В реальном проекте здесь был бы запрос к внешней БД
  return currentData;
}

async function saveStats(stats) {
  try {
    // Сохраняем в глобальную переменную
    currentData = { ...stats };
    return true;
  } catch (error) {
    console.error('Ошибка сохранения данных:', error);
    return false;
  }
}

module.exports = { getStats, saveStats };
