export interface AppConfig {
  usbPort: string;
  language: 'english' | 'french';
}

const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electron;
};

const CONFIG_FILE_PATH = 'data/config.json';

const getConfigPath = (): string => {
  if (isElectron()) {
    const path = (window as any).require('path');
    const electron = (window as any).require('electron');
    const app = electron.app || electron.remote?.app;

    if (app.isPackaged) {
      return path.join(process.resourcesPath, CONFIG_FILE_PATH);
    }
    return path.join(process.cwd(), CONFIG_FILE_PATH);
  }
  return CONFIG_FILE_PATH;
};

export const loadConfig = async (): Promise<AppConfig> => {
  try {
    if (isElectron()) {
      const fs = (window as any).require('fs').promises;
      const configPath = getConfigPath();
      const data = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(data);
    }

    const response = await fetch(`/${CONFIG_FILE_PATH}`);
    if (!response.ok) {
      throw new Error('Failed to load config');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading config:', error);
    return {
      usbPort: '',
      language: 'english'
    };
  }
};

export const saveConfig = async (config: AppConfig): Promise<void> => {
  try {
    if (isElectron()) {
      const fs = (window as any).require('fs').promises;
      const configPath = getConfigPath();
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } else {
      console.warn('Config saving is only available in Electron app');
    }
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};
