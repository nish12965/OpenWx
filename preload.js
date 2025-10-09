// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Existing weather methods
  getWeather: (query) => ipcRenderer.invoke("get-weather", { query }),
  getForecast: (query, days) => ipcRenderer.invoke("get-forecast", { query, days }),
  getForecast7Day: (query) => ipcRenderer.invoke("get-forecast-7day", { query }),

  // Added for widget communication
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
