const tempEl = document.getElementById("temp");
const condEl = document.getElementById("cond");
const container = document.querySelector(".widget-container");

// Function to set dynamic background ---
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

// Always ready listener (no DOMContentLoaded delay) 
window.api.receive("weather-update", (data) => {
  if (!data?.current) return;

  tempEl.textContent = `${Math.round(data.current.temp_c)}°C`;
  condEl.textContent = data.current.condition.text;

  setWidgetBackground(data.current.condition.text, data.current.is_day === 1);
});
