// Функция для установки времени забега
// Используем Netlify Blobs для постоянного хранения данных
const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'marathon-data';
const RACE_TIME_KEY = 'race_time';

async function getRaceTime() {
  try {
    const store = getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN
    });
    
    // Пытаемся получить данные из Blob store
    const data = await store.get(RACE_TIME_KEY);
    
    if (data) {
      return JSON.parse(data);
    } else {
      // Если данных нет, возвращаем время по умолчанию
      const defaultTime = {
        race_start: '2025-10-04T10:00:00+03:00',
        race_end: '2025-10-05T10:00:00+03:00',
        updated_at: new Date().toISOString()
      };
      
      // Сохраняем время по умолчанию
      await saveRaceTime(defaultTime);
      return defaultTime;
    }
  } catch (error) {
    console.error('Ошибка получения времени забега из Blob store:', error);
    
    // Fallback: возвращаем время по умолчанию
    const defaultTime = {
      race_start: '2025-10-04T10:00:00+03:00',
      race_end: '2025-10-05T10:00:00+03:00',
      updated_at: new Date().toISOString()
    };
    
    return defaultTime;
  }
}

async function saveRaceTime(raceTime) {
  try {
    const store = getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN
    });
    
    await store.set(RACE_TIME_KEY, JSON.stringify(raceTime, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения времени забега в Blob store:', error);
    return false;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Получить время забега
      const raceTime = await getRaceTime();
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(raceTime)
      };
    } else if (event.httpMethod === 'POST') {
      // Установить время забега
      const body = JSON.parse(event.body || '{}');
      
      if (body.race_start && body.race_end) {
        const raceTime = {
          race_start: body.race_start,
          race_end: body.race_end,
          updated_at: new Date().toISOString()
        };
        
        if (await saveRaceTime(raceTime)) {
          return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              success: true, 
              ...raceTime,
              message: 'Время забега успешно установлено'
            })
          };
        } else {
          return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Ошибка сохранения времени забега' })
          };
        }
      } else {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Необходимо указать race_start и race_end' })
        };
      }
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
