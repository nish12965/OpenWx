const tempEl = document.getElementById("temp");
const condEl = document.getElementById("cond");

window.api.receive("weather-update", (data) => {
  if (data?.current) {
    tempEl.textContent = `${Math.round(data.current.temp_c)}°C`;
    condEl.textContent = data.current.condition.text;
  }
});
