const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const update = JSON.parse(event.body);
    
    // Игнорируем старые обновления
    if (Date.now() - update.message?.date * 1000 > 60000) {
      return { statusCode: 200, headers, body: 'OK' };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const serverUrl = process.env.SERVER_URL || 'https://ultra-marathon-tracker.netlify.app';
    const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      return { statusCode: 500, headers, body: 'Bot token not configured' };
    }

    // Функция для отправки сообщения
    const sendMessage = async (chatId, text, options = {}) => {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      };
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await response.json();
      } catch (error) {
        console.error('Error sending message:', error);
        return null;
      }
    };

    // Функция для ответа на callback query
    const answerCallbackQuery = async (callbackQueryId, text = '') => {
      const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
      const payload = {
        callback_query_id: callbackQueryId,
        text
      };
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await response.json();
      } catch (error) {
        console.error('Error answering callback query:', error);
        return null;
      }
    };

    // Проверка на админа
    const isAdmin = (userId) => adminIds.includes(userId);

    // Клавиатуры
    const userKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📈 Статистика', callback_data: 'admin_stats' }]
        ]
      }
    };

    const adminKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Обновление км', callback_data: 'admin_add_km' },
            { text: '🔄 Обновление кругов', callback_data: 'admin_add_laps' }
          ],
          [
            { text: '🔄 Сбросить данные', callback_data: 'admin_reset' },
            { text: '📈 Статистика', callback_data: 'admin_stats' }
          ],
          [
            { text: '⏰ Установить время забега', callback_data: 'admin_set_race_time' }
          ]
        ]
      }
    };

    // Обработка команд и сообщений
    if (update.message) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = update.message.text;

      console.log(`📱 Message from ${userId}: ${text}`);

      if (text === '/start') {
        const keyboard = isAdmin(userId) ? adminKeyboard : userKeyboard;
        await sendMessage(chatId, '🏃‍♂️ Добро пожаловать в трекер ультрамарафона!\n\nВыберите действие:', keyboard);
      } else if (text === '/admin') {
        if (isAdmin(userId)) {
          await sendMessage(chatId, '🔧 Админ-панель:', adminKeyboard);
        } else {
          await sendMessage(chatId, '❌ У вас нет прав администратора');
        }
      }
    }

    // Обработка callback queries
    if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const userId = update.callback_query.from.id;
      const data = update.callback_query.data;

      console.log(`🔘 Callback from ${userId}: ${data}`);

      switch (data) {
        case 'admin_add_km':
          if (isAdmin(userId)) {
            await sendMessage(chatId, 'Введите количество километров для обновления:', { reply_markup: { remove_keyboard: true } });
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_add_laps':
          if (isAdmin(userId)) {
            await sendMessage(chatId, 'Введите количество кругов для обновления:', { reply_markup: { remove_keyboard: true } });
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_reset':
          if (isAdmin(userId)) {
            try {
              const response = await fetch(`${serverUrl}/.netlify/functions/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset: true })
              });
              
              if (response.ok) {
                const result = await response.json();
                await sendMessage(chatId, '✅ Данные успешно сброшены к нулю!\n\n📊 Километры: 0\n🔄 Круги: 0', adminKeyboard);
              } else {
                await sendMessage(chatId, '❌ Ошибка при сбросе данных');
              }
            } catch (error) {
              console.error('Error resetting data:', error);
              await sendMessage(chatId, '❌ Ошибка сервера при сбросе данных');
            }
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_stats':
          try {
            const [statsResp, raceTimeResp] = await Promise.all([
              fetch(`${serverUrl}/.netlify/functions/data`),
              fetch(`${serverUrl}/.netlify/functions/set_race_time`)
            ]);
            
            const stats = await statsResp.json();
            const raceTime = await raceTimeResp.json();
              
            const totalKm = Number(stats.total_km || 0);
            const totalLaps = Math.round(totalKm / 0.4);
            
            // Вычисляем разряд
            let rank = '-';
            let rankEmoji = '⚪️';
            let nextRank = 160;
            let kmToNext = 160 - totalKm;
            
            if (totalKm >= 220) {
              rank = 'КМС';
              rankEmoji = '🟣';
              nextRank = null;
              kmToNext = 0;
            } else if (totalKm >= 200) {
              rank = '1-й';
              rankEmoji = '🔴';
              nextRank = 220;
              kmToNext = 220 - totalKm;
            } else if (totalKm >= 180) {
              rank = '2-й';
              rankEmoji = '🟡';
              nextRank = 200;
              kmToNext = 200 - totalKm;
            } else if (totalKm >= 160) {
              rank = '3-й';
              rankEmoji = '🟢';
              nextRank = 180;
              kmToNext = 180 - totalKm;
            }
            
            // Красивое сообщение
            let message = `📊 <b>СТАТИСТИКА ЗАБЕГА</b>\n`;
            message += `━━━━━━━━━━━━━━━━\n\n`;
            
            message += `🏃‍♂️ <b>Километры:</b>\n`;
            message += `   ${totalKm.toFixed(2)} км\n\n`;
            
            message += `🔄 <b>Круги:</b>\n`;
            message += `   ${totalLaps} кругов\n\n`;
            
            message += `${rankEmoji} <b>Разряд:</b>\n`;
            message += `   ${rank}\n\n`;
            
            if (nextRank) {
              message += `🎯 <b>До следующего разряда:</b>\n`;
              message += `   ${kmToNext.toFixed(1)} км (до ${nextRank} км)\n\n`;
            } else {
              message += `🏆 <b>Максимальный разряд!</b>\n\n`;
            }
            
            message += `━━━━━━━━━━━━━━━━`;
            
            const keyboard = isAdmin(userId) ? adminKeyboard : userKeyboard;
            await sendMessage(chatId, message, keyboard);
          } catch (error) {
            console.error('Ошибка получения статистики:', error);
            await sendMessage(chatId, '❌ Ошибка получения статистики');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        default:
          await answerCallbackQuery(update.callback_query.id);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: 'OK',
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};