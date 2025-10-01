// Единая функция для работы с данными
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Получить данные
      const stats = await getStats();
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(stats)
      };
    } else if (event.httpMethod === 'POST') {
      // Обновить данные
      const body = JSON.parse(event.body || '{}');
      
      if (body.kmNumber !== undefined) {
        const currentStats = await getStats();
        const newStats = {
          ...currentStats,
          total_km: Number(body.kmNumber),
          updated_at: new Date().toISOString()
        };
        
        if (await saveStats(newStats)) {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, ...newStats })
          };
        }
      }
      
      if (body.reset === true) {
        const resetStats = {
          id: 1,
          total_km: 0.0,
          updated_at: new Date().toISOString()
        };
        
        if (await saveStats(resetStats)) {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, ...resetStats })
          };
        }
      }
      
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid request' })
      };
    }
    
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Ошибка:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
