const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const bot = require('./bot/bot'); // инициализируется при наличии токена
const database = require('./database/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация базы данных
database.init();

// Маршруты API
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await database.getStats();
    res.json({ total_km: stats.total_km, updated_at: stats.updated_at });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/update_km', async (req, res) => {
  try {
    const { km } = req.body;
    if (km === undefined || isNaN(km)) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }
    const kmNumber = Number(km);
    const result = await database.updateKm(kmNumber);
    res.json(result);
  } catch (error) {
    console.error('Ошибка обновления километража:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Главная страница мини-приложения
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 Мини-приложение доступно по адресу: http://localhost:${PORT}`);
});

// Обработка завершения процесса
process.on('SIGINT', () => {
  console.log('\n🛑 Завершение работы сервера...');
  process.exit(0);
});

