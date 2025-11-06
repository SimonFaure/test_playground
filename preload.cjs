const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getComputerName: () => ipcRenderer.invoke('get-computer-name'),
  checkWifi: () => ipcRenderer.invoke('check-wifi'),
  isElectron: true,
  serialport: {
    list: () => ipcRenderer.invoke('serialport:list'),
  },
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
    getPath: () => ipcRenderer.invoke('config:get-path'),
  }
});
