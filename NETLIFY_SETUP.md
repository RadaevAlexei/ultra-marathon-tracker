# Настройка развертывания в Netlify

## 🚀 Пошаговая инструкция

### 1. Подготовка репозитория
Убедитесь, что все файлы закоммичены в Git:
```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

### 2. Создание проекта в Netlify

1. Зайдите на [netlify.com](https://netlify.com)
2. Нажмите "New site from Git"
3. Выберите "GitHub" и авторизуйтесь
4. Найдите ваш репозиторий `ultra-marathon-tracker`
5. Нажмите "Deploy site"

### 3. Настройки сборки в Netlify

**Build settings:**
- **Build command:** `npm run build`
- **Publish directory:** `public`
- **Node version:** `18` (или выше)

### 4. Переменные окружения

В настройках сайта (Site settings → Environment variables) добавьте:

```
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
RACE_START_TIME=2024-10-04T10:00:00Z
RACE_END_TIME=2024-10-05T10:00:00Z
STADIUM_LAP_LENGTH=0.4
```

**Важно:** Замените `your_actual_bot_token_here` на реальный токен от @BotFather

### 5. Настройка Telegram Bot Webhook

После деплоя получите URL вашего сайта (например: `https://amazing-app-123.netlify.app`)

Установите webhook для бота:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-site.netlify.app/.netlify/functions/webhook"}'
```

### 6. Альтернативные платформы

Если вам нужен полноценный сервер с SQLite и постоянным ботом, рассмотрите:

**Railway:**
- Поддерживает Node.js приложения
- Встроенная база данных PostgreSQL
- Постоянные процессы

**Render:**
- Бесплатный тариф для веб-сервисов
- Поддержка Docker
- Автоматические деплои из Git

**Heroku:**
- Классическая платформа для Node.js
- Add-ons для баз данных
- Простая настройка

## ⚠️ Ограничения Netlify

1. **Нет постоянных процессов** - Telegram бот работает только через webhook
2. **Нет файловой системы** - SQLite заменен на JSON файл (временно)
3. **Serverless функции** - каждая функция выполняется до 10 секунд
4. **Холодный старт** - первая загрузка может быть медленной

## 🔧 Локальная разработка

Для тестирования Netlify Functions локально:
```bash
npm install -g netlify-cli
netlify dev
```

## 📱 Использование

После деплоя:
1. Откройте ваш сайт в браузере
2. Добавьте бота в Telegram и отправьте `/start`
3. Отправляйте числа километров боту для обновления статистики
4. Статистика будет отображаться на веб-странице

## 🆘 Устранение проблем

**Если бот не отвечает:**
- Проверьте, что webhook установлен правильно
- Убедитесь, что токен бота корректный
- Проверьте логи в Netlify Functions

**Если статистика не сохраняется:**
- JSON файл может сбрасываться при перезапуске
- Рекомендуется использовать внешнюю БД (PlanetScale, Supabase)
