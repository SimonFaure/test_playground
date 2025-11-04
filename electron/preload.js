const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getComputerName: () => ipcRenderer.invoke('get-computer-name'),
});
