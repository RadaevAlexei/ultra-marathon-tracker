const fetch = require('node-fetch');

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
    const update = JSON.parse(event.body || '{}');
    
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      
      // Простая обработка команд
      if (text === '/start') {
        const response = await sendTelegramMessage(chatId, 
          'Привет! Я бот для учета километража. Отправьте число километров для обновления дистанции.'
        );
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }
      
      // Обработка числовых значений (километров)
      const km = Number(text.replace(',', '.'));
      if (!Number.isNaN(km) && km > 0) {
        // Обновляем статистику через наш API
        const statsResponse = await fetch(`${process.env.URL}/.netlify/functions/stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ km }),
        });
        
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
          await sendTelegramMessage(chatId, 
            `Готово! Добавлено ${km} км. Текущий суммарный километраж: ${Number(statsData.total_km).toFixed(2)} км`
          );
        } else {
          await sendTelegramMessage(chatId, 'Не удалось обновить данные. Попробуйте снова.');
        }
      } else if (text) {
        await sendTelegramMessage(chatId, 
          'Пожалуйста, отправьте число километров (например: 1.6) или /start для начала.'
        );
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ошибка сервера' }),
    };
  }
};

async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN не задан');
    return;
  }
  
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_markup: {
          keyboard: [[{ text: '➕ Добавить километраж' }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        }
      }),
    });
  } catch (error) {
    console.error('Ошибка отправки сообщения в Telegram:', error);
  }
}
