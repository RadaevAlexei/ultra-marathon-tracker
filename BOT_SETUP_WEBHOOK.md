# Настройка бота для работы с Netlify (без локального сервера)

## ✅ Что уже настроено

### 1. Webhook настроен
- **URL:** `https://ultra-marathon-tracker.netlify.app/.netlify/functions/bot`
- **Статус:** ✅ Активен
- **Ожидающих обновлений:** 1

### 2. Netlify функции работают
- ✅ `/.netlify/functions/bot` - обработка сообщений бота
- ✅ `/.netlify/functions/data` - управление данными забега
- ✅ `/.netlify/functions/set_race_time` - управление временем забега

### 3. Переменные окружения
```
TELEGRAM_BOT_TOKEN=8003771633:AAFPJlCzEFutsgMqN-f9eqi4qDjbZLDz6bs
SERVER_URL=https://ultra-marathon-tracker.netlify.app
ADMIN_IDS=196447886
```

## 🚀 Как использовать

### Бот готов к работе!
1. **Откройте Telegram бота**
2. **Напишите `/start`** - получите приветственное сообщение
3. **Используйте админ-панель** - все кнопки работают:
   - ➕ Добавить км
   - ➕ Добавить круги  
   - 🔄 Сбросить данные
   - 📈 Статистика
   - ⏰ **Установить время забега** (новая функция!)

### Мини-приложение
- **URL:** https://ultra-marathon-tracker.netlify.app/
- **Синхронизация:** Автоматическая с ботом
- **Обновления:** Каждые 2 секунды

## 🔧 Управление webhook

### Проверить статус webhook
```bash
node setup-webhook.js
```

### Сбросить webhook (если нужно)
```bash
curl -X POST "https://api.telegram.org/bot8003771633:AAFPJlCzEFutsgMqN-f9eqi4qDjbZLDz6bs/deleteWebhook"
```

### Установить webhook заново
```bash
node setup-webhook.js
```

## 📊 Тестирование

### Проверить API функции
```bash
# Данные забега
curl -s https://ultra-marathon-tracker.netlify.app/.netlify/functions/data

# Время забега
curl -s https://ultra-marathon-tracker.netlify.app/.netlify/functions/set_race_time

# Обновить километры
curl -X POST https://ultra-marathon-tracker.netlify.app/.netlify/functions/data \
  -H "Content-Type: application/json" \
  -d '{"kmNumber": 10}'
```

## ⚠️ Важные моменты

### 1. НЕ запускайте локальный сервер
- Бот работает через webhook
- Локальный сервер не нужен
- Все данные хранятся в Netlify

### 2. Если бот не отвечает
- Проверьте webhook: `node setup-webhook.js`
- Проверьте логи Netlify в панели управления
- Убедитесь, что переменные окружения настроены

### 3. Для разработки
- Используйте `netlify dev` для локальной разработки
- Или настройте webhook на ngrok для тестирования

## 🎯 Готово к использованию!

Бот полностью настроен и готов к работе:
- ✅ Webhook активен
- ✅ API функции работают  
- ✅ Синхронизация настроена
- ✅ Новая функция установки времени забега добавлена

**Просто откройте бота в Telegram и начинайте использовать!**
