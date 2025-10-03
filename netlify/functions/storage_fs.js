// Простое хранилище данных с использованием файловой системы Netlify
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = '/tmp/run_stats.json';

async function getStats() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Если файл не существует, возвращаем данные по умолчанию
    return getDefaultStats();
  }
}

async function saveStats(stats) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(stats, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения данных:', error);
    return false;
  }
}

function getDefaultStats() {
  return {
    id: 1,
    total_km: 0.0,
    total_laps: 0,
    updated_at: new Date().toISOString()
  };
}

module.exports = { getStats, saveStats };
