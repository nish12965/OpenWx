// renderer.js

const $ = (id) => document.getElementById(id);

// --- UI Elements ---
const cityInput = $("cityInput");
const searchBtn = $("searchBtn");
const locateBtn = $("locateBtn");
const toggleUnitBtn = $("toggleUnit");
const addFavBtn = $("addFav");
const refreshBtn = $("refresh");
const forecastBtn = $("forecastBtn");
const favList = $("favList");
const card = $("card");
const cityName = $("cityName");
const localtime = $("localtime");
const icon = $("icon");
const tempEl = $("temp");
const condEl = $("cond");
const humidityEl = $("humidity");
const windEl = $("wind");
const feelsEl = $("feelslike");
const forecastContainer = $("forecastContainer");
const errorEl = $("error");

let isCelsius = true;
let currentQuery = "";
const FAVORITES_KEY = "weatherapp.favs";
let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");

// --- Helpers ---
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}
function hideError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}
function formatTemp(c) {
  return isCelsius ? `${Math.round(c)}°C` : `${Math.round(c * 9/5 + 32)}°F`;
}

// --- Dynamic Background ---
function setDynamicBackground(text, isDay) {
  text = (text || "").toLowerCase();
  const body = document.body;
  if (text.includes("rain") || text.includes("shower"))
    body.style.background = "linear-gradient(135deg,#5f72bd,#9b23ea)";
  else if (text.includes("cloud"))
    body.style.background = "linear-gradient(135deg,#d7d2cc,#304352)";
  else if (text.includes("snow"))
    body.style.background = "linear-gradient(135deg,#e0eafc,#cfdef3)";
  else if (text.includes("clear") || text.includes("sun"))
    body.style.background = isDay
      ? "linear-gradient(135deg,#fceabb,#f8b500)"
      : "linear-gradient(135deg,#74ebd5,#acb6e5)";
  else body.style.background = "linear-gradient(135deg,#74ebd5,#acb6e5)";
}

// --- Favorites ---
function renderFavs() {
  favList.innerHTML = "";
  favorites.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.onclick = () => fetchAndRender(c);
    li.appendChild(openBtn);

    li.oncontextmenu = (e) => {
      e.preventDefault();
      if (confirm(`Remove ${c} from favorites?`)) {
        favorites = favorites.filter((x) => x !== c);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        renderFavs();
      }
    };
    favList.appendChild(li);
  });
}

// --- Render Current Weather ---
function renderWeather(data) {
  if (!data || !data.location || !data.current) {
    showError("No weather data available.");
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

  card.classList.remove("hidden");
  setDynamicBackground(cur.condition.text, cur.is_day === 1);
  currentQuery = loc.name;
}

// --- Render 3-Day Forecast ---
function renderForecast(data) {
  if (!data || !data.forecast || !data.forecast.forecastday) {
    showError("No forecast available.");
    return;
  }

  forecastContainer.innerHTML = "";
  data.forecast.forecastday.forEach((day) => {
    const div = document.createElement("div");
    div.className = "forecast-day";
    div.innerHTML = `
      <h4>${day.date}</h4>
      <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" />
      <p>${day.day.condition.text}</p>
      <p>Avg Temp: ${formatTemp(day.day.avgtemp_c)}</p>
      <p>Humidity: ${day.day.avghumidity}%</p>
      <p>Max Wind: ${day.day.maxwind_kph} km/h</p>
    `;
    forecastContainer.appendChild(div);
  });
  forecastContainer.classList.remove("hidden");
}

// --- Fetch Current Weather ---
async function fetchWeather(query) {
  hideError();
  try {
    const res = await window.api.getWeather(query);
    if (res.error) showError(res.error);
    else renderWeather(res.data);
  } catch (err) {
    showError(err.message || "Failed to fetch weather data.");
  }
}

// --- Fetch Forecast ---
async function fetchForecast(query) {
  hideError();
  try {
    const res = await window.api.getForecast(query, 3); // 3-day forecast
    if (res.error) showError(res.error);
    else renderForecast(res.data);
  } catch (err) {
    showError(err.message || "Failed to fetch forecast data.");
  }
}

// --- Fetch and Render Combined ---
async function fetchAndRender(query) {
  await fetchWeather(query);
  forecastContainer.innerHTML = "";
}

// --- Geolocation ---
function getLocationAndFetch() {
  hideError();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        fetchAndRender(coords);
      },
      () => fetchAndRender("auto:ip"),
      { timeout: 8000 }
    );
  } else fetchAndRender("auto:ip");
}

// --- Event Listeners ---
searchBtn.onclick = () => {
  const txt = cityInput.value.trim();
  if (!txt) return showError("Enter a city name.");
  fetchAndRender(txt);
};

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

locateBtn.onclick = getLocationAndFetch;

toggleUnitBtn.onclick = () => {
  isCelsius = !isCelsius;
  toggleUnitBtn.textContent = `Switch to °${isCelsius ? "F" : "C"}`;
  if (currentQuery) fetchAndRender(currentQuery);
};

addFavBtn.onclick = () => {
  if (!currentQuery) return showError("No city selected.");
  if (!favorites.includes(currentQuery)) {
    favorites.push(currentQuery);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    renderFavs();
  }
};

refreshBtn.onclick = () => {
  if (!currentQuery) return showError("Nothing to refresh yet.");
  fetchAndRender(currentQuery);
};

// ✅ 3-Day Forecast Button
forecastBtn.onclick = () => {
  if (!currentQuery) return showError("No city selected for forecast.");
  fetchForecast(currentQuery);
};

// --- Initialize ---
renderFavs();
window.addEventListener("DOMContentLoaded", () => {
  if (favorites.length > 0) fetchAndRender(favorites[0]);
  else getLocationAndFetch();
});
