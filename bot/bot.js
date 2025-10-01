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

// Клавиатура для администраторов
const adminKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📊 Открыть приложение', web_app: { url: SERVER_URL } }],
      [
        { text: '➕ Добавить км', callback_data: 'admin_add_km' },
        { text: '➕ Добавить круги', callback_data: 'admin_add_laps' }
      ],
      [
        { text: '🔄 Сбросить данные', callback_data: 'admin_reset' },
        { text: '📈 Статистика', callback_data: 'admin_stats' }
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

      case 'admin_stats':
        try {
          const resp = await fetch(`${SERVER_URL}/api/stats`);
          const stats = await resp.json();
          
          const totalKm = Number(stats.total_km || 0);
          const totalLaps = Math.round(totalKm / 0.4);
          
          bot.sendMessage(
            chatId,
            `📊 Текущая статистика:\n\n` +
            `🏃‍♂️ Километры: ${totalKm.toFixed(2)} км\n` +
            `🔄 Круги: ${totalLaps} кругов\n` +
            `🕐 Обновлено: ${stats.updated_at || 'N/A'}`,
            adminKeyboard
          );
          bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
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
          const resp = await fetch(`${SERVER_URL}/api/update_km`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ km: 0 })
          });
          const result = await resp.json();
          
          if (result.success) {
            bot.sendMessage(chatId, '✅ Данные успешно сброшены к нулю!', adminKeyboard);
          } else {
            bot.sendMessage(chatId, '❌ Ошибка при сбросе данных');
          }
          bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
          bot.sendMessage(chatId, '❌ Ошибка сервера');
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
    }
  });
}

module.exports = bot || { disabled: true };