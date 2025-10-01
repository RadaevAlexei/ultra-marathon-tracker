// Волгоградский часовой пояс (UTC+3 круглый год)
const VOLGOGRAD_TZ = 'Europe/Volgograd';

console.log('🚀 Mini App загружается...');

// Глобальные переменные для времени забега
let RACE_START = new Date('2025-10-01T14:00:00+03:00'); // Время по умолчанию
let RACE_END = new Date('2025-10-02T14:00:00+03:00'); // Время по умолчанию

// Функция для получения времени забега с сервера
async function fetchRaceTime() {
  try {
    const response = await fetch('/.netlify/functions/set_race_time');
    if (response.ok) {
      const raceTime = await response.json();
      RACE_START = new Date(raceTime.race_start);
      RACE_END = new Date(raceTime.race_end);
      console.log('⏰ Время забега загружено:', {
        start: RACE_START.toLocaleString('ru-RU', { timeZone: 'Europe/Volgograd' }),
        end: RACE_END.toLocaleString('ru-RU', { timeZone: 'Europe/Volgograd' })
      });
    } else {
      console.warn('⚠️ Не удалось загрузить время забега, используется время по умолчанию');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки времени забега:', error);
  }
}
const LAP_LENGTH_KM = 0.4; // 400 м

const totalKmEl = document.getElementById('totalKilometers');
const directionTextEl = document.getElementById('directionText');
const progressFillNewEl = document.getElementById('progressFillNew');

const timerElapsedEl = document.createElement('div');
timerElapsedEl.className = 'timer-elapsed';

const timerContainer = document.createElement('section');
timerContainer.className = 'timer-section';
timerContainer.innerHTML = `
  <div id="untilStartItem" class="stat-block start-block" style="margin-bottom:12px;">
    <div class="block-title">До старта</div>
    <div class="stat-card center start-card">
      <div class="stat-value start-value" id="untilStart">--:--:--</div>
    </div>
  </div>
  <div id="elapsedItem" class="stat-block start-block" style="display:none; margin-bottom:12px;">
    <div class="block-title">Прошло времени <span id="liveBadge" class="badge-live" style="display:none;">LIVE</span></div>
    <div class="stat-card center live-card">
      <div class="stat-value start-value" id="elapsed">00:00:00</div>
    </div>
  </div>
`;
document.querySelector('.app-container').insertBefore(timerContainer, document.querySelector('.header').nextSibling);

function formatHHMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDHMS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} д`);
  parts.push(`${hours} ч`, `${minutes} мин`, `${seconds} сек`);
  return parts.join(' ');
}

function computeForecastKm(currentKm, elapsedHours) {
  if (elapsedHours <= 0) return 0;
  return (currentKm / elapsedHours) * 24;
}

function computeDirectionAndLap(totalKm) {
  if (totalKm <= 0) return { direction: 'По часовой', directionAlt: 'Против часовой' };
  
  const currentLap = Math.round(totalKm / LAP_LENGTH_KM) + 1;
  const isOddLap = currentLap % 2 === 1;
  
  // Чередуем направление каждые 2 круга (каждый час)
  if (isOddLap) {
    return { direction: 'По часовой', directionAlt: 'Против часовой' };
  } else {
    return { direction: 'Против часовой', directionAlt: 'По часовой' };
  }
}

function computeRank(totalKm) {
  if (totalKm >= 220) return { name: 'КМС', nextAt: null, kmToNext: 0 };
  if (totalKm >= 200) return { name: '1-й', nextAt: 220, kmToNext: 220 - totalKm };
  if (totalKm >= 180) return { name: '2-й', nextAt: 200, kmToNext: 200 - totalKm };
  if (totalKm >= 160) return { name: '3-й', nextAt: 180, kmToNext: 180 - totalKm };
  return { name: '-', nextAt: 160, kmToNext: 160 - totalKm };
}

function updateProgressToNextRank(currentKm) {
  const maxKm = 220; // КМС
  const progressPercent = Math.min(100, (currentKm / maxKm) * 100);
  
  // Обновляем прогресс-бар
  progressFillNewEl.style.width = `${progressPercent.toFixed(1)}%`;
  
  // Обновляем процент в центре прогресс-бара
  const progressPercentageOverlayEl = document.getElementById('progressPercentageOverlay');
  if (progressPercentageOverlayEl) {
    progressPercentageOverlayEl.textContent = `${progressPercent.toFixed(1)}%`;
  }
}

function updateRaceDate() {
  const raceDateEl = document.getElementById('raceDate');
  if (raceDateEl) {
    const startDate = RACE_START.toLocaleDateString('ru-RU', {
      timeZone: 'Europe/Volgograd',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const endDate = RACE_END.toLocaleDateString('ru-RU', {
      timeZone: 'Europe/Volgograd',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Если забег в один день, показываем только одну дату
    if (startDate === endDate) {
      raceDateEl.textContent = startDate;
    } else {
      raceDateEl.textContent = `${startDate} - ${endDate}`;
    }
  }
}


async function fetchStats() {
  const res = await fetch('/.netlify/functions/data');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function refreshUI() {
  try {
    console.log('🔄 Обновление данных...');
    const data = await fetchStats();
    console.log('📊 Получены данные:', data);
    const totalKm = Number(data.total_km || 0);
    console.log('📏 Километры:', totalKm);
    totalKmEl.textContent = totalKm.toFixed(2);
    
    // Обновляем дату забега в заголовке
    updateRaceDate();
    
    // Обновляем количество кругов (используем точные вычисления)
    const totalLaps = Math.round(totalKm / LAP_LENGTH_KM);
    const totalLapsEl = document.getElementById('totalLaps');
    if (totalLapsEl) {
      totalLapsEl.textContent = totalLaps;
    }

    const now = new Date();
    const elapsedMs = Math.min(RACE_END - RACE_START, Math.max(0, now - RACE_START));
    const elapsedHours = elapsedMs / 3600000;
    document.getElementById('elapsed').textContent = formatHHMMSS(elapsedMs);

    // Однократный расчёт «До старта» при загрузке
    const untilEl = document.getElementById('untilStart');
    if (untilEl) {
      const untilMs = Math.max(0, RACE_START - now);
      const untilItem = document.getElementById('untilStartItem');
      if (untilMs === 0) {
        untilEl.textContent = 'Забег начался!';
        if (untilItem) { untilItem.classList.remove('state-pre'); untilItem.classList.add('state-live'); }
      } else {
        untilEl.textContent = formatDHMS(untilMs);
        if (untilItem) { untilItem.classList.remove('state-live'); untilItem.classList.add('state-pre'); }
      }
    }

    const forecast = computeForecastKm(totalKm, elapsedHours);

    // Обновление направления
    const { direction } = computeDirectionAndLap(totalKm);
    directionTextEl.textContent = direction;

    // Обновляем текущий разряд
    const currentRankEl = document.getElementById('currentRank');
    const rankInfo = computeRank(totalKm);
    if (currentRankEl) {
      currentRankEl.textContent = rankInfo.name;
    }
    
    updateProgressToNextRank(totalKm);
    updateRankBlocks(totalKm);
    

    // Показ/скрытие блоков в зависимости от времени
    const untilStartItem = document.getElementById('untilStartItem');
    const elapsedItem = document.getElementById('elapsedItem');
    
    if (untilStartItem && elapsedItem) {
      if (now >= RACE_START) {
        untilStartItem.style.display = 'none';
        elapsedItem.style.display = 'block';
      } else {
        untilStartItem.style.display = 'block';
        elapsedItem.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('❌ Ошибка при обновлении UI:', e);
    console.error('❌ Детали ошибки:', e.message);
  }
}

function tickTimer() {
  const now = new Date();
  const elapsedMs = Math.min(RACE_END - RACE_START, Math.max(0, now - RACE_START));
  document.getElementById('elapsed').textContent = formatHHMMSS(elapsedMs);
  // Показ бейджа LIVE после старта
  const liveBadge = document.getElementById('liveBadge');
  if (liveBadge) {
    if (now >= RACE_START && now < RACE_END) liveBadge.style.display = 'inline-block';
    else liveBadge.style.display = 'none';
  }
  // Показ/скрытие блоков в зависимости от времени
  const untilStartItem = document.getElementById('untilStartItem');
  const elapsedItem = document.getElementById('elapsedItem');
  
  if (untilStartItem && elapsedItem) {
    if (now >= RACE_START) {
      untilStartItem.style.display = 'none';
      elapsedItem.style.display = 'block';
    } else {
      untilStartItem.style.display = 'block';
      elapsedItem.style.display = 'none';
    }
  }
}

// Функция для обновления блоков разрядов
function updateRankBlocks(totalKm) {
  // Пороговые значения для каждого разряда
  const ranks = [
    { id: 'rank3-card', threshold: 160, name: '3-й разряд' },
    { id: 'rank2-card', threshold: 180, name: '2-й разряд' },
    { id: 'rank1-card', threshold: 200, name: '1-й разряд' },
    { id: 'kms-card', threshold: 220, name: 'КМС' }
  ];
  
  // Обновляем каждый блок разряда
  ranks.forEach(rank => {
    const cardElement = document.getElementById(rank.id);
    if (cardElement) {
      if (totalKm >= rank.threshold) {
        // Добавляем класс для активированного разряда
        cardElement.classList.add('rank-card', 'rank-achieved');
        console.log(`✅ ${rank.name} достигнут! (${totalKm} км >= ${rank.threshold} км)`);
      } else {
        // Убираем класс для неактивированного разряда
        cardElement.classList.remove('rank-card', 'rank-achieved');
      }
    }
  });
}

// Инициализация приложения
async function initializeApp() {
  console.log('🎯 Инициализация приложения...');
  
  // Сначала загружаем время забега
  await fetchRaceTime();
  
  // Затем обновляем UI
  await refreshUI();
  
  // Запускаем периодическое обновление
  setInterval(refreshUI, 2000); // Обновляем статистику каждые 2 секунды для быстрого отображения изменений из бота
  setInterval(tickTimer, 1000); // Обновляем таймер каждую секунду
  
  console.log('✅ Приложение инициализировано, обновление каждые 2 секунды');
}

// Запускаем инициализацию
initializeApp();


