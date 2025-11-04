const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getComputerName: () => ipcRenderer.invoke('get-computer-name'),
  db: {
    register: (username, password) => ipcRenderer.invoke('db:register', username, password),
    login: (username, password) => ipcRenderer.invoke('db:login', username, password),
    getGameTypes: () => ipcRenderer.invoke('db:getGameTypes'),
    getScenarios: (gameTypeId) => ipcRenderer.invoke('db:getScenarios', gameTypeId),
  },
});
