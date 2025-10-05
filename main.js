// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
// require('dotenv').config();

// Backend endpoint for fetching weather securely
const BACKEND_BASE = "https://weather-proxy-fb81.onrender.com"; // your deployed backend
const CLIENT_APP_KEY = "some_random_secret_string"; // harmless validation key

// if (!WEATHER_API_KEY) {
//   console.warn('WARNING: WEATHER_API_KEY not found in environment. Create a .env file.');
// }

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


// --- Secure Weather API Call via Backend ---
function callWeatherAPIByQuery(query) {
  const encoded = encodeURIComponent(query);
  const url = `${BACKEND_BASE}/weather?q=${encoded}`;

  return new Promise((resolve, reject) => {
    const options = {
      headers: { "x-app-key": CLIENT_APP_KEY }
    };

    https.get(url, options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (json && json.error) {
            reject(new Error(json.error.message || 'API error'));
          } else resolve(json);
        } catch (err) {
          reject(new Error('Invalid JSON from backend'));
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
  try {
    const data = await callWeatherAPIByQuery(query);
    return { data };
  } catch (err) {
    return { error: err.message || 'Failed to fetch weather' };
  }
});