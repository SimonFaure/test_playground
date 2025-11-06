const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getComputerName: () => ipcRenderer.invoke('get-computer-name'),
  checkWifi: () => ipcRenderer.invoke('check-wifi'),
  isElectron: true,
  serialport: {
    list: () => ipcRenderer.invoke('serialport:list'),
  }
});
