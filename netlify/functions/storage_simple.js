// Простое хранилище данных с использованием внешнего API
// Используем JSONBin.io как временное решение

const fetch = require('node-fetch');

const JSONBIN_ID = '65f8a8e8dc74654018a9c123'; // Замените на ваш ID
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || 'your-api-key';

async function getStats() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.record || getDefaultStats();
    }
  } catch (error) {
    console.error('Ошибка чтения данных:', error);
  }
  
  return getDefaultStats();
}

async function saveStats(stats) {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(stats)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Ошибка сохранения данных:', error);
    return false;
  }
}

function getDefaultStats() {
  return {
    id: 1,
    total_km: 0.0,
    updated_at: new Date().toISOString()
  };
}

module.exports = { getStats, saveStats };
