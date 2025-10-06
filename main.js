// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const https = require("https");

// Backend endpoint
const BACKEND_BASE = "https://weather-proxy-fb81.onrender.com"; // Your deployed proxy
const CLIENT_APP_KEY = "some_random_secret_string"; // optional harmless key if you add validation in backend

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    resizable: true,
    maximizable: true,
    minimizable: true,
    title: "Weather Dashboard",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
}

// Fetch weather via backend proxy
async function callBackend(endpoint, query, days = null) {
  const encoded = encodeURIComponent(query);
  let url = `${BACKEND_BASE}/${endpoint}?q=${encoded}`;
  if (days) url += `&days=${days}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "x-app-key": CLIENT_APP_KEY } }, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            if (json && json.error) reject(new Error(json.error));
            else resolve(json);
          } catch (err) {
            reject(new Error("Invalid JSON from backend"));
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle("get-weather", async (event, { query }) => {
  try {
    const data = await callBackend("weather", query);
    return { data };
  } catch (err) {
    return { error: err.message || "Failed to fetch weather" };
  }
});

ipcMain.handle("get-forecast", async (event, { query, days }) => {
  try {
    const data = await callBackend("forecast", query, days);
    return { data };
  } catch (err) {
    return { error: err.message || "Failed to fetch forecast" };
  }
});
