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

// Новый endpoint для добавления кругов
app.post('/api/add_laps', async (req, res) => {
  try {
    const { laps } = req.body;
    if (laps === undefined || isNaN(laps)) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }
    
    const LAP_LENGTH_KM = 0.4;
    const lapsNumber = Number(laps);
    
    // Получаем текущий километраж
    const currentStats = await database.getStats();
    const currentKm = currentStats.total_km;
    
    // Вычисляем текущее количество кругов
    const currentLaps = Math.round(currentKm / LAP_LENGTH_KM);
    
    // Добавляем новые круги
    const newLaps = currentLaps + lapsNumber;
    const newKm = newLaps * LAP_LENGTH_KM;
    
    // Обновляем километраж
    const result = await database.updateKm(newKm);
    
    res.json({
      success: true,
      added_laps: lapsNumber,
      total_laps: newLaps,
      total_km: result.total_km,
      updated_at: result.updated_at
    });
  } catch (error) {
    console.error('Ошибка добавления кругов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Endpoint для сброса данных
app.post('/api/reset', async (req, res) => {
  try {
    const result = await database.resetStats();
    res.json(result);
  } catch (error) {
    console.error('Ошибка сброса данных:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Endpoint для установки времени забега
app.get('/api/set_race_time', async (req, res) => {
  try {
    const raceTime = await database.getRaceTime();
    res.json(raceTime);
  } catch (error) {
    console.error('Ошибка получения времени забега:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/set_race_time', async (req, res) => {
  try {
    const { race_start, race_end } = req.body;
    if (!race_start || !race_end) {
      return res.status(400).json({ error: 'Необходимо указать race_start и race_end' });
    }
    
    const result = await database.setRaceTime(race_start, race_end);
    res.json(result);
  } catch (error) {
    console.error('Ошибка установки времени забега:', error);
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

