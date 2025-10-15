// Единая функция для работы с данными
// Используем Netlify Blobs для постоянного хранения данных
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'marathon-data';
const DATA_KEY = 'run_stats';

async function getStats() {
  try {
    const store = getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN
    });
    
    // Пытаемся получить данные из Blob store
    const data = await store.get(DATA_KEY);
    
    if (data) {
      const stats = JSON.parse(data);
      
      // Убеждаемся что total_laps есть
      if (stats.total_laps === undefined) {
        stats.total_laps = Math.round(stats.total_km / 0.4);
      }
      
      return stats;
    } else {
      // Если данных нет, возвращаем данные по умолчанию
      const defaultStats = {
        id: 1,
        total_km: 0.0,
        total_laps: 0,
        updated_at: new Date().toISOString()
      };
      
      // Сохраняем данные по умолчанию
      await saveStats(defaultStats);
      return defaultStats;
    }
  } catch (error) {
    console.error('Ошибка получения данных из Blob store:', error);
    
    // Fallback: возвращаем данные по умолчанию
    const defaultStats = {
      id: 1,
      total_km: 0.0,
      total_laps: 0,
      updated_at: new Date().toISOString()
    };
    
    return defaultStats;
  }
}

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
      
      // Установить километры
      if (body.kmNumber !== undefined) {
        const currentStats = await getStats();
        const km = Number(body.kmNumber);
        const laps = Math.round(km / 0.4); // Пересчитываем круги из км
        const newStats = {
          ...currentStats,
          total_km: km,
          total_laps: laps,
          updated_at: new Date().toISOString()
        };
        
        if (await saveStats(newStats)) {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: true, 
              ...newStats,
              message: `Обновлено ${km} км (${laps} кругов)`
            })
          };
        }
      }
      
      // Обновить круги (конвертировать в километры)
      if (body.lapsNumber !== undefined) {
        const currentStats = await getStats();
        const laps = Number(body.lapsNumber);
        const km = Math.round((laps * 0.4) * 100) / 100; // 400 метров за круг, округляем до 2 знаков
        
        const newStats = {
          ...currentStats,
          total_km: km,
          total_laps: laps,
          updated_at: new Date().toISOString()
        };
        
        if (await saveStats(newStats)) {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: true, 
              ...newStats,
              message: `Обновлено ${laps} кругов (${km} км)`
            })
          };
        }
      }
      
      if (body.reset === true) {
        const resetStats = {
          id: 1,
          total_km: 0.0,
          total_laps: 0,
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
