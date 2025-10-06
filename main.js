// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const https = require("https");

// 🌐 Backend proxy endpoint
const BACKEND_BASE = "https://weather-proxy-fb81.onrender.com"; // 🔹 Replace with your deployed proxy URL
const CLIENT_APP_KEY = "openwx_client_key"; // optional harmless key

// 🪟 Create the main app window
function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    resizable: true,
    maximizable: true,
    title: "OpenWx - Weather Dashboard",
    icon: path.join(__dirname, "assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");

  // Optional: Open DevTools in dev mode
  // win.webContents.openDevTools();
}




// 🌤️ Function to call backend endpoints
async function callBackend(endpoint, query, days = null) {
  const encoded = encodeURIComponent(query);
  let url = `${BACKEND_BASE}/${endpoint}?q=${encoded}`;
  if (days) url += `&days=${days}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "x-client-key": CLIENT_APP_KEY } }, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            if (json && json.error) reject(new Error(json.error.message || json.error));
            else resolve(json);
          } catch (err) {
            reject(new Error("Invalid JSON from backend"));
          }
        });
      })
      .on("error", (err) => reject(new Error("Failed to connect to backend: " + err.message)));
  });
}

// 🪶 Electron app lifecycle
app.whenReady().then(() => {
  createWindow();
   // launch both main app and widget
});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ===========================================
// IPC HANDLERS (communication with renderer)
// ===========================================

// Get current weather data
ipcMain.handle("get-weather", async (event, { query }) => {
  try {
    const data = await callBackend("weather", query);
    return { data };
  } catch (err) {
    return { error: err.message || "Failed to fetch weather" };
  }
});

// Get 3-day forecast
ipcMain.handle("get-forecast", async (event, { query, days }) => {
  try {
    const data = await callBackend("forecast", query, days);
    return { data };
  } catch (err) {
    return { error: err.message || "Failed to fetch forecast" };
  }
});
