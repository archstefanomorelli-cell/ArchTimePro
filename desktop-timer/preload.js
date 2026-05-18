const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('archTimeDesktop', {
  setCompactMode(isCompact) {
    ipcRenderer.send('timer-compact-mode', Boolean(isCompact));
  },
  minimizeWindow() {
    ipcRenderer.send('window-minimize');
  },
  closeWindow() {
    ipcRenderer.send('window-close');
  }
});
