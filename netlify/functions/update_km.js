const { getStats, saveStats } = require('./storage_fs');

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

