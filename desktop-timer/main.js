const { app, BrowserWindow, Menu, shell } = require('electron');

const TIMER_URL = process.env.ARCHTIME_TIMER_URL || 'https://www.archtimepro.it/timer.html';

function createWindow() {
  const win = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 390,
    minHeight: 620,
    backgroundColor: '#101827',
    title: 'Arch Time Mini Timer',
    icon: `${__dirname}/assets/icon.png`,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadURL(TIMER_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowedHost = new URL(TIMER_URL).host;
    if (new URL(url).host !== allowedHost) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.setAppUserModelId('it.archtimepro.timer');
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
