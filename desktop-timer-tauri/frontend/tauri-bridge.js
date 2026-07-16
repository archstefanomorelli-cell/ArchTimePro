(function () {
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) return;

  window.archTimeDesktop = {
    setCompactMode(compact) {
      return invoke('set_compact_mode', { compact: Boolean(compact) });
    },
    minimizeWindow() {
      return invoke('minimize_window');
    },
    closeWindow() {
      return invoke('hide_window');
    }
  };
})();
