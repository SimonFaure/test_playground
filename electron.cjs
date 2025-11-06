const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  // Set up IPC handlers
  const os = require('os');

  ipcMain.handle('get-computer-name', async () => {
    return os.hostname();
  });

  ipcMain.handle('check-wifi', async () => {
    try {
      const interfaces = os.networkInterfaces();
      let isConnected = false;
      let networkName = null;

      // Check all network interfaces for WiFi connection
      for (const [name, addrs] of Object.entries(interfaces)) {
        if (addrs) {
          for (const addr of addrs) {
            // Check for non-internal IPv4 addresses
            if (addr.family === 'IPv4' && !addr.internal) {
              // Check if it's a WiFi interface (common names)
              if (name.toLowerCase().includes('wi-fi') ||
                  name.toLowerCase().includes('wifi') ||
                  name.toLowerCase().includes('wlan')) {
                isConnected = true;
                networkName = name;
                break;
              }
            }
          }
        }
        if (isConnected) break;
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
