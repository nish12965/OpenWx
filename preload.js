
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  /*
   * getWeather({ query }) - query can be city name ex- Delhi, Mumbai etc
   * returns data on sucess and error on failure
   */
  getWeather: (query) => ipcRenderer.invoke('get-weather', { query })
});
