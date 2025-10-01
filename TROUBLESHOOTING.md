# Устранение неполадок

## Ошибка при установке времени забега

### Проблема
```
Ошибка установки времени забега: FetchError: invalid json response body at https://ultra-marathon-tracker.netlify.app/api/set_race_time reason: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

### Причина
Локальный бот пытается обратиться к Netlify URL вместо локального сервера.

### Решение

1. **Проверьте файл `.env`:**
   ```bash
   cat .env | grep SERVER_URL
   ```

2. **Исправьте URL на локальный:**
   ```bash
   sed -i '' 's|SERVER_URL=https://ultra-marathon-tracker.netlify.app|SERVER_URL=http://localhost:3000|' .env
   ```

3. **Перезапустите сервер:**
   ```bash
   pkill -f "node server.js"
   npm start
   ```

### Проверка
После исправления проверьте, что API работает:
```bash
curl -s http://localhost:3000/api/set_race_time
```

Должен вернуть JSON с временем забега.

## Другие возможные проблемы

### Бот не отвечает
- Проверьте, что `TELEGRAM_BOT_TOKEN` установлен в `.env`
- Убедитесь, что ваш ID в `ADMIN_IDS`

### База данных не создается
- Проверьте права доступа к папке `database/`
- Убедитесь, что SQLite3 установлен

### Мини-приложение не загружается
- Проверьте, что сервер запущен на порту 3000
- Откройте http://localhost:3000 в браузере
