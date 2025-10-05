// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
require('dotenv').config();

//Getting api key from .env file
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
//Warning if API key not found
if (!WEATHER_API_KEY) {
  console.warn('WARNING: WEATHER_API_KEY not found in environment. Create a .env file.');
}

//properties of Window
function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    resizable: true,
    maximizable: true,
    minimizable: true,
    title: 'Weather Dashboard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');

  
}


function callWeatherAPIByQuery(query) {
  
  const encoded = encodeURIComponent(query);
  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encoded}&aqi=no`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (json && json.error) {
            reject(new Error(json.error.message || 'API error'));
          } else resolve(json);
        } catch (err) {
          reject(new Error('Invalid JSON from WeatherAPI'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // on macOS apps usually stay until user quits explicitly
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC: renderer will call this to get weather data
ipcMain.handle('get-weather', async (event, { query }) => {
  if (!WEATHER_API_KEY) return { error: 'API key not configured (server).' };
  try {
    const data = await callWeatherAPIByQuery(query);
    return { data };
  } catch (err) {
    return { error: err.message || 'Failed to fetch weather' };
  }
});
