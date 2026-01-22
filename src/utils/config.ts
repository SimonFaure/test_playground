export interface AppConfig {
  usbPort: string;
  language: 'english' | 'french';
  email?: string;
  fullscreenOnLaunch?: boolean;
  autoLaunch?: boolean;
  onboardingCompleted?: boolean;
}

const isElectron = () => {
  return typeof window !== 'undefined' && (window as any).electron?.isElectron;
};

export const loadConfig = async (): Promise<AppConfig> => {
  try {
    if (isElectron()) {
      const config = await (window as any).electron.config.load();
      return config;
    } else {
      const response = await fetch('/data/config.json');
      if (!response.ok) {
        throw new Error('Failed to load config file');
      }
      return await response.json();
    }
  } catch (error) {
    console.error('Error loading config:', error);
    return {
      usbPort: '',
      language: 'english',
      email: ''
    };
  }
};

export const saveConfig = async (config: AppConfig): Promise<void> => {
  try {
    if (isElectron()) {
      await (window as any).electron.config.save(config);
    } else {
      const { supabase } = await import('../lib/db');
      if (!supabase) {
        throw new Error('Database not configured');
      }

      const updates = [
        supabase.from('configuration').upsert(
          { key: 'usb_port', value: config.usbPort, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        ),
        supabase.from('configuration').upsert(
          { key: 'language', value: config.language, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      ];

      if (config.email !== undefined) {
        updates.push(
          supabase.from('configuration').upsert(
            { key: 'email', value: config.email, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
        );
      }

      if (config.fullscreenOnLaunch !== undefined) {
        updates.push(
          supabase.from('configuration').upsert(
            { key: 'fullscreen_on_launch', value: config.fullscreenOnLaunch.toString(), updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
        );
      }

      if (config.autoLaunch !== undefined) {
        updates.push(
          supabase.from('configuration').upsert(
            { key: 'auto_launch', value: config.autoLaunch.toString(), updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
        );
      }

      if (config.onboardingCompleted !== undefined) {
        updates.push(
          supabase.from('configuration').upsert(
            { key: 'onboarding_completed', value: config.onboardingCompleted.toString(), updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
        );
      }

      await Promise.all(updates);
    }
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};
