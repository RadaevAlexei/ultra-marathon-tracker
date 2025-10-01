const fs = require('fs');
const path = require('path');

// Используем тот же файл данных, что и stats.js
const DATA_FILE = path.join(__dirname, 'run_stats.json');
const LAP_LENGTH_KM = 0.4; // 400 метров

function getStats() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Ошибка чтения данных:', error);
  }
  
  // Возвращаем начальные данные
  return {
    id: 1,
    total_km: 0.0,
    updated_at: new Date().toISOString()
  };
}

function saveStats(stats) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(stats, null, 2));
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
    const { laps } = JSON.parse(event.body || '{}');
    
    if (laps === undefined || isNaN(laps) || laps <= 0) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Некорректное количество кругов' }),
      };
    }

    const lapsNumber = Number(laps);
    const kmToAdd = lapsNumber * LAP_LENGTH_KM;
    
    const currentStats = getStats();
    const newTotalKm = currentStats.total_km + kmToAdd;
    const totalLaps = Math.round(newTotalKm / LAP_LENGTH_KM);
    
    const newStats = {
      ...currentStats,
      total_km: newTotalKm,
      updated_at: new Date().toISOString(),
    };

    if (saveStats(newStats)) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          added_laps: lapsNumber,
          total_laps: totalLaps,
          total_km: newTotalKm,
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

