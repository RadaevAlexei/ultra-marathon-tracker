exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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
    
    // Простой ответ для тестирования
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        success: true, 
        km: kmValueNumber,
        message: 'Километры обновлены (тестовый режим)'
      }),
    };

  } catch (error) {
    console.error('Ошибка:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
