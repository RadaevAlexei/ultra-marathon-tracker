// Волгоградский часовой пояс (UTC+3 круглый год)
const VOLGOGRAD_TZ = 'Europe/Volgograd';
function makeLocalRaceTimes() {
  // Фиксируем старт/финиш забега 2025 года по Волгограду 10:00 → 10:00
  const startStr = '2025-10-04T10:00:00';
  const endStr = '2025-10-05T10:00:00';
  // Парсим как время этой TZ и получаем UTC Date через Intl API
  const start = new Date(new Date(startStr + 'Z').toLocaleString('en-US', { timeZone: VOLGOGRAD_TZ }));
  const end = new Date(new Date(endStr + 'Z').toLocaleString('en-US', { timeZone: VOLGOGRAD_TZ }));
  // Прямая конвертация через Date и TZ может разниться, поэтому дополнительно используем Date.UTC с компонентами
  const s = new Date(`${startStr}+03:00`); // Волгоград UTC+3
  const e = new Date(`${endStr}+03:00`);
  return { start: s, end: e };
}
const { start: RACE_START, end: RACE_END } = makeLocalRaceTimes();
const LAP_LENGTH_KM = 0.4; // 400 м

const totalKmEl = document.getElementById('totalKilometers');
const averagePaceKmhEl = document.getElementById('averagePaceKmh');
const averagePaceMinKmEl = document.getElementById('averagePaceMinKm');
const directionTextEl = document.getElementById('directionText');
const currentLapEl = document.getElementById('currentLap');
const forecastKmEl = document.getElementById('forecastKm');
const progressFillNewEl = document.getElementById('progressFillNew');
const rankTextEl = document.getElementById('rankText');

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
  <div class="timer-grid">
    <div class="stat-block elapse live-block" id="elapsedItem" style="display:none;">
      <div class="block-title">Прошло времени <span id="liveBadge" class="badge-live" style="display:none;">LIVE</span></div>
      <div class="stat-card center live-card">
        <div class="stat-value small" id="elapsed">00:00:00</div>
      </div>
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
  if (totalKm <= 0) return { direction: '--', lapNumber: 0 };
  
  const currentLap = Math.floor(totalKm / LAP_LENGTH_KM) + 1;
  const isOddLap = currentLap % 2 === 1;
  const direction = isOddLap ? '↺ Против' : '↻ По';
  
  return { direction, lapNumber: currentLap };
}

function computeRank(forecastKm) {
  if (forecastKm >= 220) return { name: 'КМС', nextAt: null };
  if (forecastKm >= 200) return { name: '1-й разряд', nextAt: 220 };
  if (forecastKm >= 180) return { name: '2-й разряд', nextAt: 200 };
  if (forecastKm >= 160) return { name: '3-й разряд', nextAt: 180 };
  return { name: 'Без разряда', nextAt: 160 };
}

function updateProgressToNextRank(currentKm) {
  const maxKm = 220;
  const progressPercent = Math.min(100, (currentKm / maxKm) * 100);
  
  // Обновляем прогресс-бар
  progressFillNewEl.style.width = `${progressPercent.toFixed(1)}%`;
  
  // Определяем следующий разряд
  const rankInfo = computeRank(currentKm);
  if (rankInfo.nextAt) {
    rankTextEl.textContent = `Следующий разряд: ${rankInfo.nextAt} км`;
  } else {
    rankTextEl.textContent = 'Достигнут максимальный разряд (КМС)';
  }
}

function updateCircularTimer(elapsedMs) {
  const totalMs = 24 * 3600 * 1000;
  const clamped = Math.max(0, Math.min(totalMs, elapsedMs));
  const pct = clamped / totalMs; // 0..1
  
  const progressCircle = document.getElementById('progressCircle');
  if (!progressCircle) return;
  
  const radius = 90; // Новый радиус для viewBox="0 0 200 200"
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct * circumference);
  
  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = offset;
}

async function fetchStats() {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function refreshUI() {
  try {
    const data = await fetchStats();
    const totalKm = Number(data.total_km || 0);
    totalKmEl.textContent = totalKm.toFixed(2);

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
    const avgPace = elapsedHours > 0 ? (totalKm / elapsedHours) : 0;
    const avgPaceMinKm = avgPace > 0 ? (60 / avgPace) : 0;
    
    averagePaceKmhEl.textContent = `${avgPace.toFixed(2)} км/ч`;
    
    if (avgPaceMinKm > 0) {
      const minutes = Math.floor(avgPaceMinKm);
      const seconds = Math.round((avgPaceMinKm - minutes) * 60);
      averagePaceMinKmEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} мин/км`;
    } else {
      averagePaceMinKmEl.textContent = '--:-- мин/км';
    }
    
    forecastKmEl.textContent = `${forecast.toFixed(1)} км`;

    // Обновление направления и текущего круга
    const { direction, lapNumber } = computeDirectionAndLap(totalKm);
    directionTextEl.textContent = direction;
    currentLapEl.textContent = lapNumber > 0 ? `Круг: ${lapNumber}` : 'Круг: --';

    updateProgressToNextRank(totalKm);
    updateCircularTimer(elapsedMs);

    // Показ/скрытие блоков в зависимости от времени
    const untilStartItem = document.getElementById('untilStartItem');
    const elapsedItem = document.getElementById('elapsedItem');
    const raceProgressSection = document.getElementById('raceProgressSection');
    
    if (untilStartItem && elapsedItem && raceProgressSection) {
      if (now >= RACE_START) {
        untilStartItem.style.display = 'none';
        elapsedItem.style.display = 'block';
        raceProgressSection.style.display = 'block';
      } else {
        untilStartItem.style.display = 'block';
        elapsedItem.style.display = 'none';
        raceProgressSection.style.display = 'none';
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function tickTimer() {
  const now = new Date();
  const elapsedMs = Math.min(RACE_END - RACE_START, Math.max(0, now - RACE_START));
  document.getElementById('elapsed').textContent = formatHHMMSS(elapsedMs);
  updateCircularTimer(elapsedMs);
  // Показ бейджа LIVE после старта
  const liveBadge = document.getElementById('liveBadge');
  if (liveBadge) {
    if (now >= RACE_START && now < RACE_END) liveBadge.style.display = 'inline-block';
    else liveBadge.style.display = 'none';
  }
  // Показ/скрытие блоков в зависимости от времени
  const untilStartItem = document.getElementById('untilStartItem');
  const elapsedItem = document.getElementById('elapsedItem');
  const raceProgressSection = document.getElementById('raceProgressSection');
  
  if (untilStartItem && elapsedItem && raceProgressSection) {
    if (now >= RACE_START) {
      untilStartItem.style.display = 'none';
      elapsedItem.style.display = 'block';
      raceProgressSection.style.display = 'block';
    } else {
      untilStartItem.style.display = 'block';
      elapsedItem.style.display = 'none';
      raceProgressSection.style.display = 'none';
    }
  }
}

// Авто‑анимация не нужна — прогресс идёт от времени

refreshUI();
setInterval(refreshUI, 10000);
setInterval(tickTimer, 1000);


