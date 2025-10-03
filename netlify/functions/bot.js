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
    const update = JSON.parse(event.body);
    
    // Игнорируем старые обновления
    if (Date.now() - update.message?.date * 1000 > 60000) {
      return { statusCode: 200, headers, body: 'OK' };
    }

    // Загружаем состояния пользователей
    userStates = await getUserStates();

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
    
    // Хранилище состояний пользователей в файловой системе
    const fs = require('fs').promises;
    const path = require('path');
    const STATES_FILE = '/tmp/user_states.json';
    
    async function getUserStates() {
      try {
        const data = await fs.readFile(STATES_FILE, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        return {};
      }
    }
    
    async function saveUserStates(states) {
      try {
        await fs.writeFile(STATES_FILE, JSON.stringify(states, null, 2));
        return true;
      } catch (error) {
        console.error('Ошибка сохранения состояний:', error);
        return false;
      }
    }
    
    let userStates = {};

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
      } else if (isAdmin(userId)) {
        const userState = userStates[userId];
        
        if (userState === 'setting_race_time') {
          // Парсим дату и время в формате "ДД.ММ.ГГГГ ЧЧ:ММ"
          const timeRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/;
          const match = text.match(timeRegex);
          
          if (!match) {
            await sendMessage(chatId, 
              '❌ Неверный формат даты и времени!\n\n' +
              'Используйте формат: <code>ДД.ММ.ГГГГ ЧЧ:ММ</code>\n' +
              'Пример: <code>01.10.2025 14:00</code>',
              { parse_mode: 'HTML' }
            );
            return;
          }

          const [, day, month, year, hour, minute] = match;
          const raceStart = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+03:00`);
          const raceEnd = new Date(raceStart.getTime() + 24 * 60 * 60 * 1000); // +24 часа

          // Проверяем, что дата разумная (не слишком далеко в прошлом)
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          
          if (raceStart < oneWeekAgo) {
            await sendMessage(chatId, '❌ Время забега не может быть более чем на неделю в прошлом!');
            return;
          }
          
          if (raceStart > oneYearFromNow) {
            await sendMessage(chatId, '❌ Время забега не может быть более чем на год в будущем!');
            return;
          }

          try {
            const response = await fetch(`${serverUrl}/.netlify/functions/set_race_time`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                race_start: raceStart.toISOString(),
                race_end: raceEnd.toISOString()
              })
            });
            const result = await response.json();

            if (result.success) {
              const startStr = raceStart.toLocaleString('ru-RU', {
                timeZone: 'Europe/Volgograd',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              const endStr = raceEnd.toLocaleString('ru-RU', {
                timeZone: 'Europe/Volgograd',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              await sendMessage(chatId,
                `✅ Время забега успешно установлено!\n\n` +
                `🏁 <b>Старт:</b> ${startStr}\n` +
                `🏆 <b>Финиш:</b> ${endStr}\n\n` +
                `⏱ Длительность: 24 часа`,
                { parse_mode: 'HTML', ...adminKeyboard }
              );
            } else {
              await sendMessage(chatId, '❌ Ошибка при установке времени забега');
            }
          } catch (error) {
            console.error('Ошибка установки времени забега:', error);
            await sendMessage(chatId, '❌ Ошибка сервера при установке времени');
          } finally {
            delete userStates[userId];
            await saveUserStates(userStates);
          }
        } else if (!isNaN(parseFloat(text))) {
          // Обработка числового ввода для обновления км/кругов
          const number = parseFloat(text);
          if (number > 0) {
            try {
              let response;
              let successMessage;
              
              if (userState === 'adding_laps') {
                // Обновляем круги
                console.log(`🔄 Отправляем круги: ${number}`);
                const requestBody = { lapsNumber: number };
                console.log(`📤 Request body:`, requestBody);
                
                response = await fetch(`${serverUrl}/.netlify/functions/data`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody)
                });
                // Не используем локальное сообщение, только из API
                successMessage = null;
              } else if (userState === 'adding_km') {
                // Обновляем километры
                console.log(`🔄 Отправляем километры: ${number}`);
                const requestBody = { kmNumber: number };
                console.log(`📤 Request body:`, requestBody);
                
                response = await fetch(`${serverUrl}/.netlify/functions/data`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody)
                });
                // Не используем локальное сообщение, только из API
                successMessage = null;
              } else {
                // Если состояние не определено, игнорируем
                console.log(`⚠️ Неопределенное состояние пользователя: ${userState}`);
                await sendMessage(chatId, '❌ Пожалуйста, выберите действие из меню');
                return;
              }
              
              if (response.ok) {
                const result = await response.json();
                // Всегда используем сообщение из API
                await sendMessage(chatId, result.message, adminKeyboard);
                
                // Сбрасываем состояние пользователя
                delete userStates[userId];
                await saveUserStates(userStates);
              } else {
                await sendMessage(chatId, '❌ Ошибка обновления данных');
              }
            } catch (error) {
              console.error('Error updating data:', error);
              await sendMessage(chatId, '❌ Ошибка сервера при обновлении данных');
            }
          }
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
            userStates[userId] = 'adding_km';
            await saveUserStates(userStates);
            await sendMessage(chatId, 'Введите количество километров для обновления:', { reply_markup: { remove_keyboard: true } });
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_add_laps':
          if (isAdmin(userId)) {
            userStates[userId] = 'adding_laps';
            await saveUserStates(userStates);
            await sendMessage(chatId, 'Введите количество кругов для обновления:', { reply_markup: { remove_keyboard: true } });
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_set_race_time':
          if (isAdmin(userId)) {
            userStates[userId] = 'setting_race_time';
            await saveUserStates(userStates);
            await sendMessage(chatId, 
              '⏰ Введите дату и время начала забега в формате:\n\n' +
              '📅 <b>Дата:</b> ДД.ММ.ГГГГ (например: 01.10.2025)\n' +
              '🕐 <b>Время:</b> ЧЧ:ММ (например: 14:00)\n\n' +
              'Пример: <code>01.10.2025 14:00</code>\n\n' +
              'Забег будет длиться 24 часа с указанного времени.',
              { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
            );
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_reset':
          if (isAdmin(userId)) {
            await sendMessage(chatId, 
              '⚠️ Вы уверены, что хотите сбросить все данные к нулю?',
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ Да, сбросить', callback_data: 'admin_reset_confirm' },
                      { text: '❌ Отмена', callback_data: 'admin_cancel' }
                    ]
                  ]
                }
              }
            );
          } else {
            await sendMessage(chatId, '❌ У вас нет прав администратора');
          }
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_reset_confirm':
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

        case 'admin_cancel':
          await sendMessage(chatId, '❌ Действие отменено', adminKeyboard);
          await answerCallbackQuery(update.callback_query.id);
          break;

        case 'admin_stats':
        try {
          // Получаем статистику и время забега
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
            
          // Получаем время забега с сервера
          let raceStart, raceEnd;
          try {
            const raceTimeResp = await fetch(`${serverUrl}/.netlify/functions/set_race_time`);
            if (raceTimeResp.ok) {
              const raceTime = await raceTimeResp.json();
              raceStart = new Date(raceTime.race_start);
              raceEnd = new Date(raceTime.race_end);
            } else {
              // Используем время по умолчанию
              raceStart = new Date('2025-10-01T14:00:00+03:00');
              raceEnd = new Date('2025-10-02T14:00:00+03:00');
            }
          } catch (error) {
            console.error('Ошибка получения времени забега:', error);
            raceStart = new Date('2025-10-01T14:00:00+03:00');
            raceEnd = new Date('2025-10-02T14:00:00+03:00');
          }

          const now = new Date();
          const elapsedMs = Math.max(0, now - raceStart);
          const elapsedHours = Math.floor(elapsedMs / 3600000);
          const elapsedMinutes = Math.floor((elapsedMs % 3600000) / 60000);
          const elapsedTime = elapsedHours > 0 
            ? `${elapsedHours} ч ${elapsedMinutes} мин`
            : elapsedHours === 0 && now >= raceStart
              ? `${elapsedMinutes} мин`
              : 'Не начался';

          // Вычисляем оставшееся время
          const remainingMs = Math.max(0, raceEnd - now);
          const remainingHours = Math.floor(remainingMs / 3600000);
          const remainingMinutes = Math.floor((remainingMs % 3600000) / 60000);
          const remainingTime = now >= raceEnd
            ? 'Завершен'
            : now < raceStart
              ? 'Не начался'
              : `${remainingHours} ч ${remainingMinutes} мин`;
            
            // Форматируем дату обновления
            const updateDate = new Date(stats.updated_at);
            const dateStr = updateDate.toLocaleString('ru-RU', {
              timeZone: 'Europe/Volgograd',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            
            // Прогресс-бар
            const maxKm = 220;
            const progress = Math.min(100, (totalKm / maxKm) * 100);
            const barLength = 10;
            const filledBars = Math.round((progress / 100) * barLength);
            const progressBar = '▓'.repeat(filledBars) + '░'.repeat(barLength - filledBars);
            
            // Форматируем дату старта забега
            const raceStartDate = new Date(raceTime.race_start);
            const raceStartStr = raceStartDate.toLocaleDateString('ru-RU', {
              timeZone: 'Europe/Volgograd',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            // Красивое сообщение
            let message = `📊 <b>СТАТИСТИКА ЗАБЕГА</b>\n`;
            message += `━━━━━━━━━━━━━━━━\n\n`;
            
            message += `🏁 <b>Дата старта забега:</b>\n`;
            message += `   ${raceStartStr}\n\n`;
            
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
            
            message += `⏱ <b>Прошло времени:</b>\n`;
            message += `   ${elapsedTime}\n\n`;

            // Показываем "Осталось времени" только во время забега
            if (now >= raceStart && now < raceEnd) {
              message += `⏳ <b>Осталось времени:</b>\n`;
              message += `   ${remainingTime}\n\n`;
            }
            
            message += `📈 <b>Прогресс до КМС:</b>\n`;
            message += `   ${progressBar} ${progress.toFixed(0)}%\n\n`;
            
            message += `━━━━━━━━━━━━━━━━\n`;
            message += `🕐 Обновлено: ${dateStr}`;
            
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
