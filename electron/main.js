const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { getDatabase } = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
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

ipcMain.handle('get-computer-name', () => {
  return os.hostname();
});

ipcMain.handle('db:register', (event, username, password) => {
  const db = getDatabase();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, passwordHash);
    return { success: true, userId: result.lastInsertRowid };
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return { success: false, error: 'Username already exists' };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:login', (event, username, password) => {
  const db = getDatabase();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const stmt = db.prepare('SELECT id, username, created_at FROM users WHERE username = ? AND password_hash = ?');
  const user = stmt.get(username, passwordHash);

  if (user) {
    return { success: true, user };
  }
  return { success: false, error: 'Invalid username or password' };
});

ipcMain.handle('db:getGameTypes', () => {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM game_types ORDER BY name');
  return stmt.all();
});

ipcMain.handle('db:getScenarios', (event, gameTypeId) => {
  const db = getDatabase();
  let stmt;

  if (gameTypeId) {
    stmt = db.prepare('SELECT * FROM scenarios WHERE game_type_id = ? ORDER BY title');
    return stmt.all(gameTypeId);
  } else {
    stmt = db.prepare('SELECT * FROM scenarios ORDER BY title');
    return stmt.all();
  }
});
