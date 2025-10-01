const fetch = require('node-fetch');

const API_BASE = 'https://ultra-marathon-tracker.netlify.app/.netlify/functions';

async function testRaceTimeFunction() {
  console.log('🧪 Тестирование функции установки времени забега');
  console.log('================================================');

  try {
    // 1. Получаем текущее время
    console.log('\n1️⃣ Получение текущего времени забега...');
    const getResponse = await fetch(`${API_BASE}/set_race_time`);
    const currentTime = await getResponse.json();
    console.log('✅ Текущее время:', currentTime);

    // 2. Устанавливаем новое время
    console.log('\n2️⃣ Установка нового времени забега...');
    const newTime = {
      race_start: '2025-12-31T18:00:00+03:00',
      race_end: '2026-01-01T18:00:00+03:00'
    };
    
    const setResponse = await fetch(`${API_BASE}/set_race_time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTime)
    });
    
    const setResult = await setResponse.json();
    console.log('✅ Результат установки:', setResult);

    // 3. Проверяем, что время обновилось
    console.log('\n3️⃣ Проверка обновления...');
    const verifyResponse = await fetch(`${API_BASE}/set_race_time`);
    const updatedTime = await verifyResponse.json();
    console.log('✅ Обновленное время:', updatedTime);

    // 4. Проверяем корректность
    if (updatedTime.race_start === newTime.race_start && updatedTime.race_end === newTime.race_end) {
      console.log('\n🎉 ТЕСТ ПРОЙДЕН! Функция работает корректно.');
    } else {
      console.log('\n❌ ТЕСТ НЕ ПРОЙДЕН! Время не обновилось.');
    }

    // 5. Тестируем парсинг даты (как в боте)
    console.log('\n4️⃣ Тестирование парсинга даты...');
    const testDate = '31.12.2025 18:00';
    const timeRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/;
    const match = testDate.match(timeRegex);
    
    if (match) {
      const [, day, month, year, hour, minute] = match;
      const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+03:00`);
      console.log('✅ Парсинг даты работает:', parsedDate.toISOString());
    } else {
      console.log('❌ Ошибка парсинга даты');
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запускаем тест
testRaceTimeFunction();
