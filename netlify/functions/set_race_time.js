// Функция для установки времени забега
const fs = require('fs').promises;
const path = require('path');

const RACE_TIME_FILE = '/tmp/race_time.json';

async function getRaceTime() {
  try {
    const data = await fs.readFile(RACE_TIME_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Если файл не существует, возвращаем время по умолчанию
    const defaultTime = {
      race_start: '2025-10-01T14:00:00+03:00',
      race_end: '2025-10-02T14:00:00+03:00',
      updated_at: new Date().toISOString()
    };
    
    // Создаем файл с временем по умолчанию
    await saveRaceTime(defaultTime);
    return defaultTime;
  }
}

async function saveRaceTime(raceTime) {
  try {
    await fs.writeFile(RACE_TIME_FILE, JSON.stringify(raceTime, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения времени забега:', error);
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
