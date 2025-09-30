const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const fetch = require('node-fetch');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:' + (process.env.PORT || 3000);

let bot = null;
if (!TOKEN) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN не задан. Бот отключён.');
  module.exports = { disabled: true };
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log('🤖 Telegram бот запущен (polling)');
}

// Простое хранение состояния: ждем число после нажатия кнопки
const chatState = new Map(); // chatId -> { waitingForKm: boolean }

const mainKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '➕ Добавить километраж' }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
};

if (bot) {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      'Привет! Я бот для учета километража. Нажмите «Добавить километраж», чтобы обновить дистанцию.',
      mainKeyboard
    );
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();

    if (text === '➕ Добавить километраж') {
      chatState.set(chatId, { waitingForKm: true });
      bot.sendMessage(chatId, 'Введите количество километров (например: 1.6)');
      return;
    }

    const state = chatState.get(chatId);
    if (state && state.waitingForKm) {
      const km = Number(text.replace(',', '.'));
      if (!Number.isFinite(km) || km <= 0) {
        bot.sendMessage(chatId, 'Пожалуйста, введите положительное число (например, 0.8).');
        return;
      }
      try {
        const resp = await fetch(`${SERVER_URL}/api/update_km`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ km }),
        });
        const data = await resp.json();
        if (data && data.success) {
          bot.sendMessage(
            chatId,
            `Готово! Добавлено ${km} км. Текущий суммарный километраж: ${Number(data.total_km).toFixed(2)} км`
          );
        } else {
          bot.sendMessage(chatId, 'Не удалось обновить данные. Попробуйте снова.');
        }
      } catch (e) {
        console.error('Ошибка запроса к API:', e);
        bot.sendMessage(chatId, 'Произошла ошибка на сервере. Попробуйте позже.');
      } finally {
        chatState.delete(chatId);
      }
    }
  });
}

module.exports = bot || { disabled: true };


