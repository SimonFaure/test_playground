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
  },
  games: {
    getFolderPath: () => ipcRenderer.invoke('games:get-folder-path'),
    list: () => ipcRenderer.invoke('games:list'),
    readFile: (gameId, filename) => ipcRenderer.invoke('games:read-file', gameId, filename),
    writeFile: (gameId, filename, content, isBinary) => ipcRenderer.invoke('games:write-file', gameId, filename, content, isBinary),
    getMediaPath: (gameId, filename) => ipcRenderer.invoke('games:get-media-path', gameId, filename),
    listMediaFolder: (gameId, folderId) => ipcRenderer.invoke('games:list-media-folder', gameId, folderId),
  },
  db: {
    connect: () => ipcRenderer.invoke('db:connect'),
    testConnection: (url) => ipcRenderer.invoke('db:testConnection', url),
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  },
  clients: {
    load: () => ipcRenderer.invoke('clients:load'),
    saveSelected: (clientData) => ipcRenderer.invoke('clients:save-selected', clientData),
    loadSelected: () => ipcRenderer.invoke('clients:load-selected'),
  },
  patterns: {
    listFolders: (gameTypeName) => ipcRenderer.invoke('patterns:list-folders', gameTypeName),
  }
});
