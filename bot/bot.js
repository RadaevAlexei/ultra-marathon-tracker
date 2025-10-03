const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fetch = require('node-fetch');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:' + (process.env.PORT || 3000);

// ID администраторов (добавьте свой Telegram ID)
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];

let bot = null;
if (!TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN не задан. Бот отключён.');
  module.exports = { disabled: true };
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log('🤖 Telegram бот запущен с админ-панелью (polling)');
}

// Простое хранение состояния
const chatState = new Map();

// Проверка, является ли пользователь администратором
function isAdmin(userId) {
  return ADMIN_IDS.length === 0 || ADMIN_IDS.includes(userId);
}

// Клавиатура для обычных пользователей
const userKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📊 Открыть приложение', web_app: { url: SERVER_URL } }]
    ]
  }
};

// Клавиатура для администраторов (без Web App для локальной разработки)
const adminKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '➕ Добавить км', callback_data: 'admin_add_km' },
        { text: '➕ Добавить круги', callback_data: 'admin_add_laps' }
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

if (bot) {
  // Команда /start
  bot.onText(/\/start/, (msg) => {
    const userId = msg.from.id;
    const userName = msg.from.first_name;
    
    console.log(`📱 User ${userName} (ID: ${userId}) started the bot`);
    
    if (isAdmin(userId)) {
      bot.sendMessage(
        msg.chat.id,
        `👋 Привет, ${userName}!\n\n` +
        `Вы администратор бота для отслеживания марафона.\n\n` +
        `🎯 Доступные действия:\n` +
        `• Открыть Mini App для просмотра\n` +
        `• Добавить километры\n` +
        `• Добавить круги\n` +
        `• Сбросить данные\n` +
        `• Просмотр статистики`,
        adminKeyboard
      );
    } else {
      bot.sendMessage(
        msg.chat.id,
        `👋 Привет, ${userName}!\n\n` +
        `Добро пожаловать в трекер суточного забега Шри Чинмоя.\n\n` +
        `Нажмите кнопку ниже, чтобы открыть приложение! 🏃‍♂️`,
        userKeyboard
      );
    }
  });

  // Команда /admin
  bot.onText(/\/admin/, (msg) => {
    const userId = msg.from.id;
    
    if (isAdmin(userId)) {
      bot.sendMessage(msg.chat.id, '🔧 Админ-панель', adminKeyboard);
    } else {
      bot.sendMessage(msg.chat.id, '❌ У вас нет прав администратора.');
    }
  });

  // Обработка callback кнопок
  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (data.startsWith('admin_') && !isAdmin(userId)) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ У вас нет прав администратора',
        show_alert: true
      });
      return;
    }

    switch (data) {
      case 'admin_add_km':
        chatState.set(chatId, { action: 'waiting_km' });
        bot.sendMessage(chatId, '📝 Введите количество километров для добавления (например: 5.2):');
        bot.answerCallbackQuery(callbackQuery.id);
        break;

      case 'admin_add_laps':
        chatState.set(chatId, { action: 'waiting_laps' });
        bot.sendMessage(chatId, '📝 Введите количество кругов для добавления (например: 10):');
        bot.answerCallbackQuery(callbackQuery.id);
        break;

      case 'admin_set_race_time':
        chatState.set(chatId, { action: 'waiting_race_time' });
        bot.sendMessage(chatId, 
          '⏰ Введите дату и время начала забега в формате:\n\n' +
          '📅 <b>Дата:</b> ДД.ММ.ГГГГ (например: 01.10.2025)\n' +
          '🕐 <b>Время:</b> ЧЧ:ММ (например: 14:00)\n\n' +
          'Пример: <code>01.10.2025 14:00</code>\n\n' +
          'Забег будет длиться 24 часа с указанного времени.',
          { parse_mode: 'HTML' }
        );
        bot.answerCallbackQuery(callbackQuery.id);
        break;

      case 'admin_stats':
        try {
          // Получаем статистику и время забега
          const [statsResp, raceTimeResp] = await Promise.all([
            fetch(`${SERVER_URL}/api/stats`),
            fetch(`${SERVER_URL}/api/set_race_time`)
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
            rankEmoji = '��';
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
            const raceTimeResp = await fetch(`${SERVER_URL}/api/set_race_time`);
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
          
          // Красивое сообщение (используем HTML разметку)
          let message = `📊 <b>СТАТИСТИКА ЗАБЕГА</b>\n`;
          message += `━━━━━\n\n`;
          
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

          message += `⏳ <b>Осталось времени:</b>\n`;
          message += `   ${remainingTime}\n\n`;
          
          message += `📈 <b>Прогресс до КМС:</b>\n`;
          message += `   ${progressBar} ${progress.toFixed(0)}%\n\n`;
          
          message += `━━━━━\n`;
          message += `🕐 Обновлено: ${dateStr}`;
          
          bot.sendMessage(chatId, message, {
            ...adminKeyboard,
            parse_mode: 'HTML'
          });
          bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
          console.error('Ошибка получения статистики:', error);
          bot.sendMessage(chatId, '❌ Ошибка получения статистики');
          bot.answerCallbackQuery(callbackQuery.id);
        }
        break;

      case 'admin_reset':
        bot.sendMessage(
          chatId,
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
        bot.answerCallbackQuery(callbackQuery.id);
        break;

      case 'admin_reset_confirm':
        try {
          const resp = await fetch(`${SERVER_URL}/api/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const result = await resp.json();
          
          if (result.success) {
            bot.sendMessage(chatId, '✅ Данные успешно сброшены к нулю!\n\n📊 Километры: 0\n🔄 Круги: 0', adminKeyboard);
          } else {
            bot.sendMessage(chatId, '❌ Ошибка при сбросе данных');
          }
          bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
          console.error('Ошибка сброса данных:', error);
          bot.sendMessage(chatId, '❌ Ошибка сервера при сбросе данных');
          bot.answerCallbackQuery(callbackQuery.id);
        }
        break;

      case 'admin_cancel':
        bot.sendMessage(chatId, '❌ Действие отменено', adminKeyboard);
        bot.answerCallbackQuery(callbackQuery.id);
        break;
    }
  });

  // Обработка текстовых сообщений
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = (msg.text || '').trim();

    if (text.startsWith('/')) return;

    const state = chatState.get(chatId);
    if (!state) return;

    if (!isAdmin(userId)) {
      bot.sendMessage(chatId, '❌ У вас нет прав администратора');
      chatState.delete(chatId);
      return;
    }

    if (state.action === 'waiting_km') {
      const km = Number(text.replace(',', '.'));
      
      if (!Number.isFinite(km) || km < 0) {
        bot.sendMessage(chatId, '❌ Введите корректное число (например, 5.2)');
        return;
      }

      try {
        const statsResp = await fetch(`${SERVER_URL}/api/stats`);
        const stats = await statsResp.json();
        const currentKm = Number(stats.total_km || 0);
        const newKm = currentKm + km;

        const resp = await fetch(`${SERVER_URL}/api/update_km`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ km: newKm })
        });
        const result = await resp.json();

        if (result.success) {
          bot.sendMessage(
            chatId,
            `✅ Добавлено ${km.toFixed(2)} км\n\n` +
            `📊 Было: ${currentKm.toFixed(2)} км\n` +
            `📊 Стало: ${newKm.toFixed(2)} км`,
            adminKeyboard
          );
        }
      } catch (error) {
        bot.sendMessage(chatId, '❌ Ошибка сервера');
      } finally {
        chatState.delete(chatId);
      }
    } else if (state.action === 'waiting_laps') {
      const laps = parseInt(text);
      
      if (!Number.isInteger(laps) || laps < 0) {
        bot.sendMessage(chatId, '❌ Введите целое число кругов (например, 10)');
        return;
      }

      try {
        const resp = await fetch(`${SERVER_URL}/api/add_laps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ laps })
        });
        const result = await resp.json();

        if (result.success) {
          const addedKm = laps * 0.4;
          bot.sendMessage(
            chatId,
            `✅ Добавлено ${laps} кругов (${addedKm.toFixed(2)} км)\n\n` +
            `📊 Текущий километраж: ${result.total_km.toFixed(2)} км`,
            adminKeyboard
          );
        }
      } catch (error) {
        bot.sendMessage(chatId, '❌ Ошибка сервера');
      } finally {
        chatState.delete(chatId);
      }
    } else if (state.action === 'waiting_race_time') {
      // Парсим дату и время в формате "ДД.ММ.ГГГГ ЧЧ:ММ"
      const timeRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/;
      const match = text.match(timeRegex);
      
      if (!match) {
        bot.sendMessage(chatId, 
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
        bot.sendMessage(chatId, '❌ Время забега не может быть более чем на неделю в прошлом!');
        return;
      }
      
      if (raceStart > oneYearFromNow) {
        bot.sendMessage(chatId, '❌ Время забега не может быть более чем на год в будущем!');
        return;
      }

      try {
        const resp = await fetch(`${SERVER_URL}/api/set_race_time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            race_start: raceStart.toISOString(),
            race_end: raceEnd.toISOString()
          })
        });
        const result = await resp.json();

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

          bot.sendMessage(
            chatId,
            `✅ Время забега успешно установлено!\n\n` +
            `🏁 <b>Старт:</b> ${startStr}\n` +
            `🏆 <b>Финиш:</b> ${endStr}\n\n` +
            `⏱ Длительность: 24 часа`,
            { parse_mode: 'HTML', ...adminKeyboard }
          );
        } else {
          bot.sendMessage(chatId, '❌ Ошибка при установке времени забега');
        }
      } catch (error) {
        console.error('Ошибка установки времени забега:', error);
        bot.sendMessage(chatId, '❌ Ошибка сервера при установке времени');
      } finally {
        chatState.delete(chatId);
      }
    }
  });
}

module.exports = bot || { disabled: true };