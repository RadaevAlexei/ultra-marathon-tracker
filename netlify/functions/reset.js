// Используем ту же систему хранения, что и в data.js
// Используем Netlify Blobs для постоянного хранения данных
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'marathon-data';
const DATA_KEY = 'run_stats';

async function saveStats(stats) {
  try {
    const store = getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN
    });
    
    await store.set(DATA_KEY, JSON.stringify(stats, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения данных в Blob store:', error);
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

