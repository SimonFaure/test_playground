const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

let connectToDatabase;
let mysqlConnectionModule;

console.log('=== LOADING MYSQL MODULE ===');
console.log('__dirname:', __dirname);
console.log('Module path:', path.join(__dirname, 'src', 'lib', 'mysql-connection.cjs'));

try {
  const modulePath = path.join(__dirname, 'src', 'lib', 'mysql-connection.cjs');
  console.log('Checking if module exists:', fs.existsSync(modulePath));

  mysqlConnectionModule = require(modulePath);
  console.log('Module loaded, exports:', Object.keys(mysqlConnectionModule));

  connectToDatabase = mysqlConnectionModule.connectToDatabase;
  console.log('connectToDatabase type:', typeof connectToDatabase);
  console.log('MySQL connection module loaded successfully');
} catch (error) {
  console.error('Failed to load mysql-connection module:');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);

  connectToDatabase = async () => {
    return { success: false, message: `MySQL connection module failed to load: ${error.message}` };
  };
}

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

  protocol.interceptFileProtocol('file', (request, callback) => {
    const url = request.url.replace('file:///', '');
    const urlPath = decodeURIComponent(url);

    if (urlPath.startsWith('data/games/')) {
      const relativePath = urlPath.replace('data/games/', '');
      const [gameId, ...pathParts] = relativePath.split('/');
      const filePath = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games', gameId, ...pathParts);
      callback({ path: filePath });
    } else if (urlPath.match(/^[A-Z]:/)) {
      callback({ path: urlPath });
    } else {
      callback({ path: path.join(__dirname, 'dist', urlPath) });
    }
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

  let activePort = null;
  let rxBuffer = Buffer.alloc(0);

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

  ipcMain.handle('serialport:open', async (event, portPath, baudRate = 38400) => {
    try {
      if (activePort && activePort.isOpen) {
        activePort.close();
      }

      const { SerialPort } = require('serialport');
      activePort = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: true,
      });

      rxBuffer = Buffer.alloc(0);

      return new Promise((resolve, reject) => {
        activePort.on('open', () => {
          console.log('Serial port opened successfully');
          resolve({ success: true });
        });

        activePort.on('error', (err) => {
          console.error('Serial port error:', err.message);
          reject({ success: false, error: err.message });
        });

        activePort.on('data', (chunk) => {
          rxBuffer = Buffer.concat([rxBuffer, chunk]);
        });

        activePort.on('close', () => {
          console.log('Serial port closed');
        });
      });
    } catch (error) {
      console.error('Error opening serial port:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('serialport:write', async (event, data) => {
    try {
      if (!activePort || !activePort.isOpen) {
        return { success: false, error: 'Port not open' };
      }

      const buffer = Buffer.from(data);
      return new Promise((resolve) => {
        activePort.write(buffer, (err) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('serialport:read', async (event, length) => {
    try {
      if (length <= rxBuffer.length) {
        const data = rxBuffer.slice(0, length);
        rxBuffer = rxBuffer.slice(length);
        return { success: true, data: Array.from(data) };
      }
      return { success: false, data: [] };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  });

  ipcMain.handle('serialport:peek', async (event, length) => {
    try {
      const data = rxBuffer.slice(0, Math.min(length, rxBuffer.length));
      return { success: true, data: Array.from(data), length: data.length };
    } catch (error) {
      return { success: false, error: error.message, data: [], length: 0 };
    }
  });

  ipcMain.handle('serialport:is-open', async () => {
    return { isOpen: activePort && activePort.isOpen };
  });

  ipcMain.handle('serialport:close', async () => {
    try {
      if (activePort && activePort.isOpen) {
        return new Promise((resolve) => {
          activePort.close(() => {
            activePort = null;
            rxBuffer = Buffer.alloc(0);
            resolve({ success: true });
          });
        });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clients:load', async () => {
    const fs = require('fs');
    const configDir = path.join(app.getPath('appData'), 'TagHunterPlayground');
    const clientsPath = path.join(configDir, 'clients.json');

    try {
      if (fs.existsSync(clientsPath)) {
        const data = fs.readFileSync(clientsPath, 'utf8');
        return { success: true, clients: JSON.parse(data) };
      }
      return { success: false, clients: [] };
    } catch (error) {
      console.error('Error loading clients:', error);
      return { success: false, clients: [] };
    }
  });

  ipcMain.handle('clients:save-selected', async (event, clientData) => {
    const fs = require('fs');
    const configDir = path.join(app.getPath('appData'), 'TagHunterPlayground');
    const selectedClientPath = path.join(configDir, 'selected-client.json');

    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(selectedClientPath, JSON.stringify(clientData, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error saving selected client:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clients:load-selected', async () => {
    const fs = require('fs');
    const configDir = path.join(app.getPath('appData'), 'TagHunterPlayground');
    const selectedClientPath = path.join(configDir, 'selected-client.json');

    try {
      if (fs.existsSync(selectedClientPath)) {
        const data = fs.readFileSync(selectedClientPath, 'utf8');
        return { success: true, client: JSON.parse(data) };
      }
      return { success: false, client: null };
    } catch (error) {
      console.error('Error loading selected client:', error);
      return { success: false, client: null };
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

  ipcMain.handle('games:list-media-folder', async (event, gameId, folderId) => {
    const fs = require('fs');
    try {
      const gamesDir = path.join(app.getPath('appData'), 'TagHunterPlayground', 'games');
      const folderPath = path.join(gamesDir, gameId, 'media', folderId);

      if (!fs.existsSync(folderPath)) {
        return [];
      }

      const files = fs.readdirSync(folderPath);
      return files.filter(file => !file.startsWith('.'));
    } catch (error) {
      console.error(`Error listing media folder ${folderId}:`, error);
      return [];
    }
  });

  ipcMain.handle('patterns:list-folders', async (event, gameTypeName) => {
    const fs = require('fs');
    try {
      const patternsDir = path.join(__dirname, 'data', 'patterns', gameTypeName.toLowerCase());

      if (!fs.existsSync(patternsDir)) {
        console.log('Patterns directory does not exist:', patternsDir);
        return ['ado_adultes', 'kids', 'mini_kids'];
      }

      const folders = fs.readdirSync(patternsDir, { withFileTypes: true });
      const patternFolders = folders
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      console.log('Pattern folders found:', patternFolders);
      return patternFolders;
    } catch (error) {
      console.error('Error reading pattern folders:', error);
      return ['ado_adultes', 'kids', 'mini_kids'];
    }
  });

  ipcMain.handle('db:connect', async () => {
    try {
      if (!connectToDatabase) {
        return { success: false, message: 'Database module not loaded' };
      }
      const result = await connectToDatabase();
      console.log('Database connection result:', result);
      return result;
    } catch (error) {
      console.error('Database connection error:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('db:testConnection', async (event, url) => {
    console.log('=== DB TEST CONNECTION ===');
    console.log('Received URL:', url);
    console.log('URL type:', typeof url);

    try {
      const mysql = require('mysql2/promise');
      const testConfig = {
        host: url,
        port: 3306,
        user: 'bob',
        password: 'WebMaster62',
        database: 'taghunter_playground',
        connectTimeout: 5000
      };

      console.log('Testing database connection with config:', JSON.stringify(testConfig, null, 2));

      const connection = await mysql.createConnection(testConfig);
      console.log('Connection created successfully');

      await connection.ping();
      console.log('Ping successful');

      const [tables] = await connection.query('SHOW TABLES');
      console.log('=== DATABASE TABLES ===');
      console.log('Number of tables:', tables.length);
      console.log('Tables:');
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`  ${index + 1}. ${tableName}`);
      });
      console.log('======================');

      await connection.end();

      const successMessage = `Successfully connected to database at ${url}`;
      console.log('Success:', successMessage);
      return { success: true, message: successMessage };
    } catch (error) {
      console.error('Database test connection error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
      return { success: false, message: `Failed to connect: ${error.message}` };
    }
  });

  ipcMain.handle('db:query', async (event, sql, params = []) => {
    console.log('=== DB QUERY ===');
    console.log('SQL:', sql);
    console.log('Params:', params);

    try {
      const conn = await mysqlConnectionModule.getConnection();
      const [result] = await conn.query(sql, params);
      console.log('Query result:', result);

      return { rows: result, error: null };
    } catch (error) {
      console.error('Database query error:', error);
      return { rows: null, error: error.message };
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
