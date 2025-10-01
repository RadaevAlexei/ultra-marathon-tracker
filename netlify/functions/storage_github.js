// Хранилище данных с использованием GitHub Gist API
const fetch = require('node-fetch');

const GIST_ID = 'a1b2c3d4e5f6g7h8i9j0'; // Замените на ваш Gist ID
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'your-github-token';

async function getStats() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const gist = await response.json();
      const content = gist.files['run_stats.json'].content;
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Ошибка чтения данных:', error);
  }
  
  return getDefaultStats();
}

async function saveStats(stats) {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'run_stats.json': {
            content: JSON.stringify(stats, null, 2)
          }
        }
      })
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
