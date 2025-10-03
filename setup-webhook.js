const fetch = require('node-fetch');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = 'https://ultra-marathon-tracker.netlify.app/.netlify/functions/webhook';

async function setupWebhook() {
  if (!TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не задан в .env файле');
    process.exit(1);
  }

  try {
    console.log('🔧 Настройка webhook для Telegram бота...');
    console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
    
    const response = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook успешно настроен!');
      console.log(`📋 Описание: ${result.description || 'Нет описания'}`);
    } else {
      console.error('❌ Ошибка настройки webhook:', result.description);
    }

    // Проверим текущий webhook
    console.log('\n🔍 Проверка текущего webhook...');
    const webhookInfo = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
    const webhookData = await webhookInfo.json();
    
    if (webhookData.ok) {
      console.log(`📍 URL: ${webhookData.result.url}`);
      console.log(`📊 Ожидающих обновлений: ${webhookData.result.pending_update_count}`);
      console.log(`🕐 Последняя ошибка: ${webhookData.result.last_error_date ? new Date(webhookData.result.last_error_date * 1000).toLocaleString() : 'Нет'}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

setupWebhook();
