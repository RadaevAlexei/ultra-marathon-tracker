# 🤖 Настройка Telegram Бота для продакшн

## 📋 Текущая проблема

Бот отправляет запросы на `http://localhost:3000`, а нужно на `https://ultra-marathon-tracker.netlify.app`

## ✅ Решение

### 1. Обновите файл `.env`

Откройте файл `.env` в корне проекта и измените:

```env
# БЫЛО:
SERVER_URL=http://localhost:3000

# СТАЛО:
SERVER_URL=https://ultra-marathon-tracker.netlify.app
```

### 2. Перезапустите бота

```bash
# Остановите текущий процесс (Ctrl+C)
# Затем запустите заново:
npm start
```

### 3. Проверьте работу

1. **В Telegram боте** нажмите `/start`
2. **Нажмите** "➕ Добавить км"
3. **Введите** число (например, `5`)
4. **Откройте** https://ultra-marathon-tracker.netlify.app
5. **Обновите** страницу (F5)
6. **Проверьте**, что данные синхронизировались!

## 🔄 Как это работает

```
Telegram Bot (локально)
    ↓ (HTTPS POST)
Netlify API (/api/update_km)
    ↓
База данных (Netlify)
    ↓ (каждые 3 сек)
Mini App (https://ultra-marathon-tracker.netlify.app)
```

## ⚠️ Важно

- **Бот работает локально** на вашем компьютере
- **API работает на Netlify** (продакшн)
- **Mini App обновляется** каждые 3 секунды
- **Не забудьте** перезапустить бота после изменения `.env`!

## 🧪 Тестирование API

Проверить текущие данные на Netlify:

```bash
curl https://ultra-marathon-tracker.netlify.app/api/stats
```

Добавить километры через API:

```bash
curl -X POST https://ultra-marathon-tracker.netlify.app/api/update_km \
  -H "Content-Type: application/json" \
  -d '{"km": 10.5}'
```

## 📱 Для локальной разработки

Если хотите протестировать локально:

```env
SERVER_URL=http://localhost:3000
```

Но не забудьте вернуть обратно для продакшн!

