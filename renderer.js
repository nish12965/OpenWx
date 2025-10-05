
// Runs in the renderer with no Node access. Uses window.api.getWeather(query) provided by preload.

const q = (id) => document.getElementById(id);

// Elements
const cityInput = q('cityInput');
const searchBtn = q('searchBtn');
const locateBtn = q('locateBtn');
const card = q('card');
const cityName = q('cityName');
const localtime = q('localtime');
const icon = q('icon');
const tempEl = q('temp');
const condEl = q('cond');
const humidityEl = q('humidity');
const windEl = q('wind');
const feelsEl = q('feelslike');
const toggleUnitBtn = q('toggleUnit');
const addFavBtn = q('addFav');
const refreshBtn = q('refresh');
const favList = q('favList');
const errorEl = q('error');

let isCelsius = true;
let currentQuery = ''; // city or "lat,lon"
const FAVORITES_KEY = 'weatherapp.favs';
let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');

// show error
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

// hide error
function hideError() {
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

// Render favorites
function renderFavs() {
  favList.innerHTML = '';
  favorites.forEach((c) => {
    const li = document.createElement('li');
    li.textContent = c;
    const btn = document.createElement('button');
    btn.textContent = 'Open';
    btn.style.marginLeft = '8px';
    btn.onclick = () => fetchAndRender(c);
    li.appendChild(btn);
    // quick remove on right click
    li.oncontextmenu = (e) => {
      e.preventDefault();
      if (confirm(`Remove ${c} from favorites?`)) {
        favorites = favorites.filter(x => x !== c);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        renderFavs();
      }
    };
    favList.appendChild(li);
  });
}

// Format temperature display (we always fetch metric from server and convert on client)
function formatTemp(celsius) {
  if (isCelsius) return `${Math.round(celsius)}°C`;
  return `${Math.round(celsius * 9/5 + 32)}°F`;
}

// Change background based on condition and day/night
function setDynamicBackground(text, isDay) {
  text = (text || '').toLowerCase();
  const body = document.body;
  if (text.includes('rain') || text.includes('shower')) {
    body.style.background = 'linear-gradient(135deg,#5f72bd,#9b23ea)';
  } else if (text.includes('cloud')) {
    body.style.background = 'linear-gradient(135deg,#d7d2cc,#304352)';
  } else if (text.includes('snow')) {
    body.style.background = 'linear-gradient(135deg,#e0eafc,#cfdef3)';
  } else if (text.includes('clear') || text.includes('sun')) {
    body.style.background = isDay ? 'linear-gradient(135deg,#fceabb,#f8b500)' : 'linear-gradient(135deg,#74ebd5,#acb6e5)';
  } else {
    body.style.background = 'linear-gradient(135deg,#74ebd5,#acb6e5)';
  }
}

// Render data from WeatherAPI's in json file
function renderWeather(data) {
  if (!data || !data.location || !data.current) {
    showError('No data to display.');
    return;
  }
  hideError();
  const loc = data.location;
  const cur = data.current;

  cityName.textContent = `${loc.name}, ${loc.country}`;
  localtime.textContent = loc.localtime;
  icon.src = `https:${cur.condition.icon}`;
  tempEl.textContent = formatTemp(cur.temp_c);
  condEl.textContent = cur.condition.text;
  humidityEl.textContent = `${cur.humidity}%`;
  windEl.textContent = `${cur.wind_kph} km/h`;
  feelsEl.textContent = `Feels like ${formatTemp(cur.feelslike_c)}`;

  // remember current query (Prefering city name for refresh)
  currentQuery = loc.name;
  card.classList.remove('hidden');

  setDynamicBackground(cur.condition.text, cur.is_day === 1);
}

// Fetch + render wrapper
async function fetchAndRender(queryOrLatlon) {
  hideError();
  card.classList.add('hidden');
  try {
    // query: city name like Delhi,Mumbai etc
    const res = await window.api.getWeather(queryOrLatlon);
    if (res.error) {
      showError(res.error);
      return;
    }
    renderWeather(res.data);
  } catch (err) {
    showError(err.message || 'Failed to fetch weather.');
  }
}

// For geolocation: try navigator.geolocation first, if fails, call WeatherAPI with "auto:ip" fallback
async function getLocationAndFetch() {
  hideError();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      fetchAndRender(`${lat},${lon}`);
    }, (err) => {
      // fallback: WeatherAPI accepts "auto:ip" as a query
      fetchAndRender('auto:ip');
    }, { timeout: 8000 });
  } else {
    fetchAndRender('auto:ip');
  }
}

// Event wiring
searchBtn.addEventListener('click', () => {
  const txt = cityInput.value.trim();
  if (!txt) { showError('Please enter a city name.'); return; }
  fetchAndRender(txt);
});
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchBtn.click(); });
locateBtn.addEventListener('click', getLocationAndFetch);
toggleUnitBtn.addEventListener('click', () => {
  isCelsius = !isCelsius;
  toggleUnitBtn.textContent = `Switch to °${isCelsius ? 'F' : 'C'}`;
  // re-render current values by fetching again if displayed
  if (currentQuery) fetchAndRender(currentQuery);
});
addFavBtn.addEventListener('click', () => {
  if (!currentQuery) { showError('No city to add.'); return; }
  if (!favorites.includes(currentQuery)) {
    favorites.push(currentQuery);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    renderFavs();
  }
});
refreshBtn.addEventListener('click', () => {
  if (!currentQuery) { showError('Nothing to refresh yet.'); return; }
  fetchAndRender(currentQuery);
});

// init
renderFavs();


window.addEventListener('DOMContentLoaded', () => {
  if (favorites.length > 0) {
    fetchAndRender(favorites[0]);
  } else {
    
    getLocationAndFetch();
  }
});
