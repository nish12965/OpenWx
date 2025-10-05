const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getWeather: (query) => ipcRenderer.invoke('get-weather', { query })
});

