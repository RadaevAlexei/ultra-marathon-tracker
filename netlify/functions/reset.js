// Используем ту же систему хранения, что и в data.js
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = '/tmp/run_stats.json';

let cache = null;
let lastModified = null;

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
    // Сбрасываем данные к начальному состоянию
    const resetStats = {
      id: 1,
      total_km: 0.0,
      total_laps: 0,
      updated_at: new Date().toISOString()
    };

    if (await saveStats(resetStats)) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: 'Данные сброшены',
          total_km: 0,
          total_laps: 0,
          updated_at: resetStats.updated_at,
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Ошибка сброса данных' }),
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

