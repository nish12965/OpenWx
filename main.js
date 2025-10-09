const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const https = require("https");

// Backend proxy endpoint
const BACKEND_BASE = "https://weather-proxy-fb81.onrender.com"; 
const CLIENT_APP_KEY = "some_random_secret_string"; // optional key

let tray = null;

// Create the main app window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 360,
    minHeight: 520,
    resizable: true,
    maximizable: true,
    title: " Weathering with You ",
    icon: path.join(__dirname, "assets/app_icon.png"),// Icon not created yet
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  // FIX: minimize-to-tray behavior
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault(); // stop window from closing
      mainWindow.hide();      // hide window instead
    }
  });

  return mainWindow;
}

function createTray(win) {
  const iconPath = path.join(__dirname, "assets/weather.png"); // tray icon not created
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => win.show(),
    },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true; // FIX: allow window to quit
        app.quit();
      },
    },
  ]);

  tray.setToolTip("OpenWx Weather App");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    win.show();
  });
}

// Function to call backend endpoints
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

// Electron app lifecycle
app.whenReady().then(() => {
  const mainWindow = createWindow(); 
  createTray(mainWindow); 
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const mainWindow = createWindow(); 
    createTray(mainWindow);
  }
});

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

// Get 7-day forecast
ipcMain.handle("get-forecast-7day", async (event, { query }) => {
  try {
    const data = await callBackend("forecast", query, 7);
    return { data };
  } catch (err) {
    return { error: err.message || "Failed to fetch 7-day forecast" };
  }
});
