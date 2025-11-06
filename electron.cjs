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
}

app.whenReady().then(() => {
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
