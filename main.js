const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const https = require("https");

// Backend proxy endpoint
const BACKEND_BASE = "https://weather-proxy-fb81.onrender.com"; 
const CLIENT_APP_KEY = "some_random_secret_string"; // optional key

let tray = null;
let mainWindow = null;
let widgetWindow = null;

// Create the main app window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 580,
    height: 950,
    minWidth: 360,
    minHeight: 520,
    resizable: true,
    maximizable: true,
    title: "Weathering with You",
    icon: path.join(__dirname, "assets/app_icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");

  // minimize-to-tray behavior
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

// Create the widget window 
function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: 250,
    height: 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    movable:true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  widgetWindow.loadFile("widget.html");
  widgetWindow.setAlwaysOnTop(true, "screen-saver");
  widgetWindow.setVisibleOnAllWorkspaces(true);
}

// Tray setup 
function createTray() {
  const iconPath = path.join(__dirname, "assets/weather.png");
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        if (!mainWindow) createWindow();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Refresh",
      click: () => {
        if (widgetWindow) {
          widgetWindow.webContents.send("widget-refresh"); 
        }
        if (mainWindow) {
          mainWindow.webContents.send("refresh-main"); 
        }
      },
    },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("OpenWx Weather App");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (!mainWindow) createWindow();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

// Backend API helper
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
            if (json?.error) reject(new Error(json.error.message || "Backend error"));
            else resolve(json);
          } catch {
            reject(new Error("Invalid JSON from backend"));
          }
        });
      })
      .on("error", (err) => reject(new Error("Network error: " + err.message)));
  });
}

// App lifecycle 
app.whenReady().then(() => {
  mainWindow = createWindow();  // 
  createTray();
  createWidgetWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) {
    mainWindow = createWindow(); 
    createTray();
  }
});

// IPC Communication 

// 
ipcMain.on("widget-clicked", () => {
  console.log("Widget clicked event received");

  if (!mainWindow) {
    mainWindow = createWindow();
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

// Update widget dynamically
ipcMain.on("update-widget", (event, weatherData) => {
  if (widgetWindow) widgetWindow.webContents.send("weather-update", weatherData);
});

//  Weather API handlers
ipcMain.handle("get-weather", async (event, { query }) => {
  try {
    const data = await callBackend("weather", query);
    if (widgetWindow) widgetWindow.webContents.send("weather-update", data);
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

ipcMain.handle("get-forecast-7day", async (event, { query }) => {
  try {
    const data = await callBackend("forecast", query, 7);
    return { data };
  } catch (err) {
    return { error: err.message || "Failed to fetch 7-day forecast" };
  }
});
