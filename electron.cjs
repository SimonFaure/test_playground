const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { connectToDatabase } = require('./src/lib/mysql-connection');

function createWindow() {
  // Handle both development and production preload paths
  const preloadPath = app.isPackaged
    ? path.join(__dirname, '..', 'app.asar.unpacked', 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    icon: path.join(__dirname, 'build', 'icon.png')
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('app-file', (request, callback) => {
    const url = request.url.replace('app-file://', '');
    const [gameId, ...pathParts] = url.split('/');
    const filePath = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games', gameId, ...pathParts);
    callback({ path: filePath });
  });

  // Set up IPC handlers
  const os = require('os');

  ipcMain.handle('get-computer-name', async () => {
    return os.hostname();
  });

  ipcMain.handle('check-wifi', async () => {
    try {
      const { execSync } = require('child_process');
      let isConnected = false;
      let networkName = null;

      if (process.platform === 'win32') {
        const output = execSync('netsh wlan show interfaces', { encoding: 'utf8' });
        const ssidMatch = output.match(/SSID\s*:\s*(.+)/i);
        if (ssidMatch && ssidMatch[1]) {
          networkName = ssidMatch[1].trim();
          isConnected = networkName.toLowerCase().includes('hunter');
        }
      } else if (process.platform === 'darwin') {
        const output = execSync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I', { encoding: 'utf8' });
        const ssidMatch = output.match(/\sSSID:\s*(.+)/);
        if (ssidMatch && ssidMatch[1]) {
          networkName = ssidMatch[1].trim();
          isConnected = networkName.toLowerCase().includes('hunter');
        }
      } else {
        const output = execSync('iwgetid -r', { encoding: 'utf8' });
        networkName = output.trim();
        isConnected = networkName.toLowerCase().includes('hunter');
      }

      return { isConnected, networkName };
    } catch (error) {
      console.error('Error checking WiFi:', error);
      return { isConnected: false, networkName: null };
    }
  });

  ipcMain.handle('serialport:list', async () => {
    try {
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();
      return ports;
    } catch (error) {
      console.error('Error listing serial ports:', error);
      return [];
    }
  });

  ipcMain.handle('config:get-path', async () => {
    const fs = require('fs');
    const configDir = path.join(app.getPath('appData'), 'TagHunterPlayground');
    const configPath = path.join(configDir, 'config.json');

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify({ usbPort: '', language: 'english' }, null, 2));
    }

    return configPath;
  });

  ipcMain.handle('config:load', async () => {
    const fs = require('fs');
    try {
      const configPath = await ipcMain.emit('config:get-path');
      const configDir = path.join(app.getPath('appData'), 'TagHunterPlayground');
      const configFilePath = path.join(configDir, 'config.json');

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      if (!fs.existsSync(configFilePath)) {
        const defaultConfig = { usbPort: '', language: 'english' };
        fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
        return defaultConfig;
      }

      const data = fs.readFileSync(configFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      return { usbPort: '', language: 'english' };
    }
  });

  ipcMain.handle('config:save', async (event, config) => {
    const fs = require('fs');
    try {
      const configDir = path.join(app.getPath('appData'), 'TagHunterPlayground');
      const configPath = path.join(configDir, 'config.json');

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  });

  ipcMain.handle('games:get-folder-path', async () => {
    const fs = require('fs');
    const gamesDir = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games');

    if (!fs.existsSync(gamesDir)) {
      fs.mkdirSync(gamesDir, { recursive: true });
    }

    return gamesDir;
  });

  ipcMain.handle('games:list', async () => {
    const fs = require('fs');
    try {
      const gamesDir = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games');

      if (!fs.existsSync(gamesDir)) {
        fs.mkdirSync(gamesDir, { recursive: true });
        return [];
      }

      const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      return folders;
    } catch (error) {
      console.error('Error listing games:', error);
      return [];
    }
  });

  ipcMain.handle('games:read-file', async (event, gameId, filename) => {
    const fs = require('fs');
    try {
      const gamesDir = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games');
      const filePath = path.join(gamesDir, gameId, filename);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filename}`);
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      return data;
    } catch (error) {
      console.error('Error reading game file:', error);
      throw error;
    }
  });

  ipcMain.handle('games:write-file', async (event, gameId, filename, content, isBinary = false) => {
    try {
      const gamesDir = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games');
      const gameDir = path.join(gamesDir, gameId);

      if (!fs.existsSync(gameDir)) {
        fs.mkdirSync(gameDir, { recursive: true });
      }

      const filePath = path.join(gameDir, filename);
      const fileDir = path.dirname(filePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      if (isBinary) {
        const buffer = Buffer.from(content, 'base64');
        fs.writeFileSync(filePath, buffer);
      } else {
        fs.writeFileSync(filePath, content);
      }

      return { success: true };
    } catch (error) {
      console.error('Error writing game file:', error);
      throw error;
    }
  });

  ipcMain.handle('games:get-media-path', async (event, gameId, filename) => {
    const gamesDir = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games');
    const filePath = path.join(gamesDir, gameId, 'media', filename);
    return filePath;
  });

  ipcMain.handle('db:connect', async () => {
    try {
      const result = await connectToDatabase();
      console.log('Database connection result:', result);
      return result;
    } catch (error) {
      console.error('Database connection error:', error);
      return { success: false, message: error.message };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
