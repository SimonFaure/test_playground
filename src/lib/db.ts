declare global {
  interface Window {
    electron: {
      getComputerName: () => Promise<string>;
      db: {
        register: (username: string, password: string) => Promise<{ success: boolean; userId?: number; error?: string }>;
        login: (username: string, password: string) => Promise<{ success: boolean; user?: any; error?: string }>;
        getGameTypes: () => Promise<any[]>;
        getScenarios: (gameTypeId?: number) => Promise<any[]>;
      };
    };
  }
}

export const db = {
  register: async (username: string, password: string) => {
    return window.electron.db.register(username, password);
  },
  login: async (username: string, password: string) => {
    return window.electron.db.login(username, password);
  },
  getGameTypes: async () => {
    return window.electron.db.getGameTypes();
  },
  getScenarios: async (gameTypeId?: number) => {
    return window.electron.db.getScenarios(gameTypeId);
  },
};
