const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain, screen } = require('electron');
const path = require('path');

const NORMAL_SIZE = { width: 430, height: 740 };
const COMPACT_SIZE = { width: 244, height: 92 };
const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');
const TRAY_ICON_PATH = ICON_PATH;
const HIDDEN_POSITION = { x: -32000, y: -32000 };

let mainWindow = null;
let tray = null;
let isQuitting = false;
let lastShowRequestAt = 0;
let isParkedInTray = false;

function setLaunchAtLogin(enabled) {
  app.setLoginItemSettings({
    openAtLogin: Boolean(enabled),
    path: app.getPath('exe')
  });
}

function getLaunchAtLogin() {
  return app.getLoginItemSettings().openAtLogin;
}

function moveNearTaskbar(win) {
  const display = screen.getDisplayMatching(win.getBounds());
  const { x, y, width, height } = display.workArea;
  win.setPosition(x + width - COMPACT_SIZE.width - 18, y + height - COMPACT_SIZE.height - 18, true);
}

function setCompactMode(win, compact) {
  if (!win || win.isDestroyed()) return;

  win.setResizable(false);
  win.setMaximizable(false);
  win.setFullScreenable(false);

  if (compact) {
    win.setMinimumSize(COMPACT_SIZE.width, COMPACT_SIZE.height);
    win.setMaximumSize(COMPACT_SIZE.width, COMPACT_SIZE.height);
    win.setAlwaysOnTop(false);
    win.setOpacity(0.72);
    win.setSize(COMPACT_SIZE.width, COMPACT_SIZE.height, true);
    moveNearTaskbar(win);
    return;
  }

  win.setAlwaysOnTop(false);
  win.setOpacity(1);
  win.setMinimumSize(NORMAL_SIZE.width, NORMAL_SIZE.height);
  win.setMaximumSize(NORMAL_SIZE.width, NORMAL_SIZE.height);
  win.setSize(NORMAL_SIZE.width, NORMAL_SIZE.height, true);
  win.center();
}

function parkWindowInTray(win) {
  if (!win || win.isDestroyed()) return;
  isParkedInTray = true;
  win.setSkipTaskbar(true);
  win.setPosition(HIDDEN_POSITION.x, HIDDEN_POSITION.y, false);
}

function createWindow() {
  const win = new BrowserWindow({
    width: NORMAL_SIZE.width,
    height: NORMAL_SIZE.height,
    minWidth: NORMAL_SIZE.width,
    minHeight: NORMAL_SIZE.height,
    maxWidth: NORMAL_SIZE.width,
    maxHeight: NORMAL_SIZE.height,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'Arch Time Mini Timer',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('close', event => {
    if (isQuitting) return;
    event.preventDefault();
    parkWindowInTray(win);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow = win;
  return win;
}

function showMainWindow() {
  const now = Date.now();
  if (now - lastShowRequestAt < 1200) return;
  lastShowRequestAt = now;

  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow();
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (isParkedInTray) {
    isParkedInTray = false;
    mainWindow.setSkipTaskbar(false);
    setCompactMode(mainWindow, false);
    return;
  }
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(TRAY_ICON_PATH).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  if (typeof tray.setIgnoreDoubleClickEvents === 'function') {
    tray.setIgnoreDoubleClickEvents(true);
  }
  tray.setToolTip('Arch Time Mini Timer');
  const refreshMenu = () => tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Apri timer', click: showMainWindow },
    {
      label: 'Avvia con Windows',
      type: 'checkbox',
      checked: getLaunchAtLogin(),
      click: menuItem => {
        setLaunchAtLogin(menuItem.checked);
        refreshMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Esci da Arch Time',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));

  refreshMenu();
  tray.on('click', showMainWindow);
}

ipcMain.on('timer-compact-mode', (event, compact) => {
  setCompactMode(BrowserWindow.fromWebContents(event.sender), Boolean(compact));
});

ipcMain.on('window-minimize', event => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window-close', event => {
  parkWindowInTray(BrowserWindow.fromWebContents(event.sender));
});

app.setAppUserModelId('it.archtimepro.timer');
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  setLaunchAtLogin(true);
  createTray();
  mainWindow = createWindow();

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});
