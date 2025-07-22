const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  system: {
    getPlatform: () => process.platform,
    getVersion: () => process.versions.electron,
    getNodeVersion: () => process.versions.node
  },
  
  notifications: {
    show: (title, body, options = {}) => {
      return ipcRenderer.invoke('show-notification', { title, body, ...options });
    }
  },
  
  data: {
    load: () => ipcRenderer.invoke('data-load'),
    save: (data) => ipcRenderer.invoke('data-save', data),
    getFileStats: () => ipcRenderer.invoke('data-get-file-stats')
  },
  
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
    openTrash: () => ipcRenderer.invoke('shell-open-trash'),
    openApp: (appName) => ipcRenderer.invoke('shell-open-app', appName)
  },
  
  app: {
    getVersion: () => ipcRenderer.invoke('app-get-version'),
    quit: () => ipcRenderer.invoke('app-quit')
  },
  
  siri: {
    registerShortcuts: () => ipcRenderer.invoke('siri-register-shortcuts'),
    processCommand: (command) => ipcRenderer.invoke('siri-process-command', command),
    onCommand: (callback) => {
      ipcRenderer.on('siri-command', callback);
      return () => ipcRenderer.removeListener('siri-command', callback);
    }
  },
  
  // healthkit integration removed
  
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('window-set-always-on-top', flag)
  },
  
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard-read-text'),
    writeText: (text) => ipcRenderer.invoke('clipboard-write-text', text)
  },
  
  biometric: {
    authenticate: (reason) => ipcRenderer.invoke('biometric-authenticate', reason)
  },
  
  attachments: {
    createAttachmentsDir: () => ipcRenderer.invoke('createAttachmentsDir'),
    saveFile: (buffer, filename) => ipcRenderer.invoke('saveFile', buffer, filename),
    openFile: (filePath) => ipcRenderer.invoke('openFile', filePath)
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});