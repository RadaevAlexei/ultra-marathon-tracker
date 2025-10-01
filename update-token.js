const fs = require('fs');
const path = require('path');

console.log('🔧 Скрипт для обновления токена бота');
console.log('=====================================');

// Проверяем, есть ли .env файл
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Файл .env не найден!');
  console.log('📝 Создайте файл .env на основе env.example');
  process.exit(1);
}

// Читаем текущий .env
const envContent = fs.readFileSync(envPath, 'utf8');
console.log('📄 Текущий .env файл найден');

// Проверяем, есть ли токен
if (envContent.includes('YOUR_BOT_TOKEN_HERE')) {
  console.log('⚠️  Токен еще не обновлен в .env файле');
  console.log('📝 Замените YOUR_BOT_TOKEN_HERE на ваш новый токен');
} else {
  console.log('✅ Токен найден в .env файле');
}

console.log('\n📋 Инструкции:');
console.log('1. Откройте Telegram и найдите @BotFather');
console.log('2. Отправьте /revoke и выберите вашего бота');
console.log('3. Отправьте /newtoken и выберите вашего бота');
console.log('4. Скопируйте новый токен');
console.log('5. Замените токен в файле .env');
console.log('6. Запустите: node setup-webhook.js');
console.log('7. Обновите переменные окружения на Netlify');

console.log('\n🔗 Netlify настройки:');
console.log('- Зайдите в панель Netlify');
console.log('- Settings → Environment variables');
console.log('- Обновите TELEGRAM_BOT_TOKEN');
