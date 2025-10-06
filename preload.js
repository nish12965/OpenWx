// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getWeather: (query) => ipcRenderer.invoke("get-weather", { query }),
  getForecast: (query, days) => ipcRenderer.invoke("get-forecast", { query, days }),
});
