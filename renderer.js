// renderer.js
const q = (id) => document.getElementById(id);

// Elements
const cityInput = q("cityInput");
const searchBtn = q("searchBtn");
const locateBtn = q("locateBtn");
const card = q("card");
const cityName = q("cityName");
const localtime = q("localtime");
const icon = q("icon");
const tempEl = q("temp");
const condEl = q("cond");
const humidityEl = q("humidity");
const windEl = q("wind");
const feelsEl = q("feelslike");
const toggleUnitBtn = q("toggleUnit");
const addFavBtn = q("addFav");
const refreshBtn = q("refresh");
const favList = q("favList");
const forecastContainer = q("forecastContainer");
const errorEl = q("error");

let isCelsius = true;
let currentQuery = "";
const FAVORITES_KEY = "weatherapp.favs";
let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");

// --- Error handling ---
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

function hideError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

// --- Favorites ---
function renderFavs() {
  favList.innerHTML = "";
  favorites.forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;
    const btn = document.createElement("button");
    btn.textContent = "Open";
    btn.style.marginLeft = "8px";
    btn.onclick = () => fetchAndRender(c);
    li.appendChild(btn);
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

// --- Temperature ---
function formatTemp(celsius) {
  return isCelsius ? `${Math.round(celsius)}°C` : `${Math.round(celsius * 9/5 + 32)}°F`;
}

// --- Background ---
function setDynamicBackground(text, isDay) {
  text = (text || "").toLowerCase();
  const body = document.body;
  if (text.includes("rain") || text.includes("shower")) {
    body.style.background = "linear-gradient(135deg,#5f72bd,#9b23ea)";
  } else if (text.includes("cloud")) {
    body.style.background = "linear-gradient(135deg,#d7d2cc,#304352)";
  } else if (text.includes("snow")) {
    body.style.background = "linear-gradient(135deg,#e0eafc,#cfdef3)";
  } else if (text.includes("clear") || text.includes("sun")) {
    body.style.background = isDay ? "linear-gradient(135deg,#fceabb,#f8b500)" : "linear-gradient(135deg,#74ebd5,#acb6e5)";
  } else {
    body.style.background = "linear-gradient(135deg,#74ebd5,#acb6e5)";
  }
}

// --- Render Current Weather ---
function renderWeather(data) {
  if (!data || !data.location || !data.current) {
    showError("No data to display.");
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

  currentQuery = loc.name;
  card.classList.remove("hidden");
  setDynamicBackground(cur.condition.text, cur.is_day === 1);
}

// --- Render Forecast ---
function renderForecast(forecastData) {
  if (!forecastData || !forecastData.forecast || !forecastData.forecast.forecastday) {
    forecastContainer.innerHTML = "";
    return;
  }
  forecastContainer.innerHTML = "";
  forecastData.forecast.forecastday.forEach((day) => {
    const div = document.createElement("div");
    div.className = "forecast-day";
    div.innerHTML = `
      <div>${day.date}</div>
      <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" />
      <div>${day.day.condition.text}</div>
      <div>${formatTemp(day.day.avgtemp_c)}</div>
    `;
    forecastContainer.appendChild(div);
  });
}

// --- Fetch and render ---
async function fetchAndRender(queryOrLatlon) {
  hideError();
  card.classList.add("hidden");
  forecastContainer.innerHTML = "";
  try {
    const weatherRes = await window.api.getWeather(queryOrLatlon);
    if (weatherRes.error) { showError(weatherRes.error); return; }
    renderWeather(weatherRes.data);

    const forecastRes = await window.api.getForecast(queryOrLatlon, 3);
    if (!forecastRes.error) renderForecast(forecastRes.data);

  } catch (err) {
    showError(err.message || "Failed to fetch weather.");
  }
}

// --- Geolocation ---
async function getLocationAndFetch() {
  hideError();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlon = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        fetchAndRender(latlon);
      },
      () => fetchAndRender("auto:ip"),
      { timeout: 8000 }
    );
  } else {
    fetchAndRender("auto:ip");
  }
}

// --- Event Listeners ---
searchBtn.addEventListener("click", () => {
  const txt = cityInput.value.trim();
  if (!txt) { showError("Please enter a city name."); return; }
  fetchAndRender(txt);
});
cityInput.addEventListener("keypress", (e) => { if (e.key === "Enter") searchBtn.click(); });
locateBtn.addEventListener("click", getLocationAndFetch);
toggleUnitBtn.addEventListener("click", () => {
  isCelsius = !isCelsius;
  toggleUnitBtn.textContent = `Switch to °${isCelsius ? "F" : "C"}`;
  if (currentQuery) fetchAndRender(currentQuery);
});
addFavBtn.addEventListener("click", () => {
  if (!currentQuery) { showError("No city to add."); return; }
  if (!favorites.includes(currentQuery)) {
    favorites.push(currentQuery);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    renderFavs();
  }
});
refreshBtn.addEventListener("click", () => {
  if (!currentQuery) { showError("Nothing to refresh yet."); return; }
  fetchAndRender(currentQuery);
});

// --- Init ---
renderFavs();
window.addEventListener("DOMContentLoaded", () => {
  if (favorites.length > 0) fetchAndRender(favorites[0]);
  else getLocationAndFetch();
});
