const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('electron', {
  getComputerName: () => Promise.resolve(os.hostname()),
  isElectron: true,
  serialport: {
    list: () => ipcRenderer.invoke('serialport:list'),
  }
});

window.addEventListener('DOMContentLoaded', () => {
  window.process = {
    type: 'renderer'
  };
});
