import { supabase } from '../lib/db';

export interface AppConfig {
  usbPort: string;
  language: 'english' | 'french';
}

const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electron?.isElectron;
};

export const loadConfig = async (): Promise<AppConfig> => {
  try {
    if (isElectron()) {
      const response = await fetch('/data/config.json');
      if (!response.ok) {
        throw new Error('Failed to load config file');
      }
      return await response.json();
    } else {
      const [usbPortResult, languageResult] = await Promise.all([
        supabase.from('configuration').select('value').eq('key', 'usb_port').maybeSingle(),
        supabase.from('configuration').select('value').eq('key', 'language').maybeSingle()
      ]);

      return {
        usbPort: usbPortResult.data?.value || '',
        language: (languageResult.data?.value as 'english' | 'french') || 'english'
      };
    }
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
      throw new Error('Config saving via file system is not yet implemented in Electron. Please update manually.');
    } else {
      await Promise.all([
        supabase.from('configuration').upsert(
          { key: 'usb_port', value: config.usbPort, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        ),
        supabase.from('configuration').upsert(
          { key: 'language', value: config.language, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      ]);
    }
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};
