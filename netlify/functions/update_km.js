// Используем ту же систему хранения, что и в data.js
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = '/tmp/run_stats.json';

let cache = null;
let lastModified = null;

async function getStats() {
  try {
    // Проверяем кеш
    if (cache && lastModified) {
      const stats = await fs.stat(DATA_FILE).catch(() => null);
      if (stats && stats.mtime.getTime() === lastModified) {
        return cache;
      }
    }
    
    // Читаем из файла
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const stats = JSON.parse(data);
    
    // Убеждаемся что total_laps есть
    if (stats.total_laps === undefined) {
      stats.total_laps = Math.round(stats.total_km / 0.4);
    }
    
    // Обновляем кеш
    cache = stats;
    const fileStats = await fs.stat(DATA_FILE);
    lastModified = fileStats.mtime.getTime();
    
    return stats;
  } catch (error) {
    // Если файл не существует, возвращаем данные по умолчанию
    const defaultStats = {
      id: 1,
      total_km: 0.0,
      total_laps: 0,
      updated_at: new Date().toISOString()
    };
    
    // Создаем файл с данными по умолчанию
    await saveStats(defaultStats);
    return defaultStats;
  }
}

async function saveStats(stats) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(stats, null, 2));
    
    // Обновляем кеш
    cache = stats;
    const fileStats = await fs.stat(DATA_FILE);
    lastModified = fileStats.mtime.getTime();
    
    return true;
  } catch (error) {
    console.error('Ошибка сохранения данных:', error);
    return false;
  }
}

exports.handler = async (event, context) => {
  // Настройка CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Обработка preflight запросов
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { km, kmNumber } = JSON.parse(event.body || '{}');
    const kmValue = km || kmNumber;
    
    if (kmValue === undefined || isNaN(kmValue)) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Некорректные данные' }),
      };
    }

    const kmValueNumber = Number(kmValue);
    const totalLaps = Math.round(kmValueNumber / 0.4);
    
    // ВАЖНО: устанавливаем абсолютное значение, а не добавляем!
    const newStats = {
      id: 1,
      total_km: kmValueNumber,
      total_laps: totalLaps,
      updated_at: new Date().toISOString(),
    };

    if (await saveStats(newStats)) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          total_km: newStats.total_km,
          total_laps: newStats.total_laps,
          updated_at: newStats.updated_at,
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Ошибка сохранения данных' }),
      };
    }
  } catch (error) {
    console.error('Ошибка обработки запроса:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Ошибка сервера' }),
    };
  }
};

