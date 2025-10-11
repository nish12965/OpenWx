const tempEl = document.getElementById("temp");
const condEl = document.getElementById("cond");
const container = document.querySelector(".widget-container");

// Add weather icon dynamically 
let iconEl = document.getElementById("weatherIcon");
if (!iconEl) {
  iconEl = document.createElement("img");
  iconEl.id = "weatherIcon";
  iconEl.style.width = "48px";
  iconEl.style.height = "48px";
  iconEl.style.marginBottom = "4px";
  iconEl.style.borderRadius = "8px";
  container.prepend(iconEl); 
}

window.currentQuery = null;

// Function to set dynamic background
function setWidgetBackground(conditionText, isDay) {
  const text = (conditionText || "").toLowerCase();
  let bg = "linear-gradient(135deg, #f0f0f0, #e0e0e0)";

  if (text.includes("rain") || text.includes("shower"))
    bg = "linear-gradient(135deg,#5f72bd,#9b23ea)";
  else if (text.includes("cloud"))
    bg = "linear-gradient(135deg,#d7d2cc,#304352)";
  else if (text.includes("snow"))
    bg = "linear-gradient(135deg,#e0eafc,#cfdef3)";
  else if (text.includes("clear") || text.includes("sun"))
    bg = isDay
      ? "linear-gradient(135deg,#fceabb,#f8b500)"
      : "linear-gradient(135deg,#74ebd5,#acb6e5)";

  container.style.background = bg;
  container.style.color = "black";
}

// Always ready listener
window.api.receive("weather-update", (data) => {
  if (!data?.current) return;

  const conditionText = data.current.condition.text;

  iconEl.src = `https:${data.current.condition.icon}`;
  iconEl.alt = conditionText;

  tempEl.textContent = `${Math.round(data.current.temp_c)}°C`;
  condEl.textContent = conditionText; 

  setWidgetBackground(conditionText, data.current.is_day === 1);

  window.currentQuery = data.location?.name || window.currentQuery;
});

// Make widget clickable to open main app
container.addEventListener("click", () => {
  console.log("Widget clicked (renderer)");
  window.api.send("widget-clicked");
});

// refresh widget
setInterval(() => {
  if (window.currentQuery) {
    window.api.getWeather(window.currentQuery).then((res) => {
      if (res.data) {
        window.api.send("update-widget", res.data);
      }
    }).catch(err => console.error("Widget auto-refresh failed:", err));
  }
}, 3 * 60 * 1000);

window.api.receive("widget-refresh", () => {
  if (!window.currentQuery) return;

  // Show temporary feedback
  condEl.textContent = "Refreshing…";
  tempEl.textContent = "--°C";
  iconEl.src = ""; // clear icon temporarily

  window.api.getWeather(window.currentQuery)
    .then(res => {
      if (res.data) window.api.send("update-widget", res.data);
    })
    .catch(err => {
      console.error("Tray refresh failed:", err);
      condEl.textContent = "Failed to refresh";
    });
});
