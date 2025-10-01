const { getStats, saveStats } = require('./storage');

exports.handler = async (event, context) => {
  // Настройка CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Обработка preflight запросов
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Получение статистики
      const stats = await getStats();
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          total_km: stats.total_km, 
          updated_at: stats.updated_at 
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      // Обновление километража
      const { km } = JSON.parse(event.body || '{}');
      
      if (km === undefined || isNaN(km)) {
        return {
          statusCode: 400,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Некорректные данные' }),
        };
      }

      const kmNumber = Number(km);
      const currentStats = await getStats();
      const newStats = {
        ...currentStats,
        total_km: currentStats.total_km + kmNumber,
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
          body: JSON.stringify({ error: 'Ошибка сервера' }),
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
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
