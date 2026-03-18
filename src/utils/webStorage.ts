interface StorageNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: StorageNode[];
  expanded?: boolean;
}

export function getWebStorageStructure(): StorageNode {
  const root: StorageNode = {
    name: 'Browser Storage',
    path: '/',
    type: 'folder',
    expanded: true,
    children: []
  };

  const scenariosFolder = buildScenariosFolder();
  const layoutsFolder = buildLayoutsFolder();
  const patternsFolder = buildPatternsFolder();
  const configFolder = buildConfigFolder();

  root.children = [scenariosFolder, layoutsFolder, patternsFolder, configFolder];

  return root;
}

function buildScenariosFolder(): StorageNode {
  const scenariosFolder: StorageNode = {
    name: 'Scenarios',
    path: '/scenarios',
    type: 'folder',
    expanded: false,
    children: []
  };

  const gamesListStr = localStorage.getItem('uploaded_games_list');
  if (gamesListStr) {
    try {
      const gamesList = JSON.parse(gamesListStr);
      for (const game of gamesList) {
        const gameKey = `game_${game.uniqid}`;
        const gameDataStr = localStorage.getItem(gameKey);
        if (gameDataStr) {
          const size = new Blob([gameDataStr]).size;
          scenariosFolder.children?.push({
            name: `${game.name || game.uniqid}`,
            path: `/scenarios/${game.uniqid}`,
            type: 'file',
            size
          });
        }
      }
    } catch (error) {
      console.error('Error parsing games list:', error);
    }
  }

  return scenariosFolder;
}

function buildLayoutsFolder(): StorageNode {
  const layoutsFolder: StorageNode = {
    name: 'Layouts',
    path: '/layouts',
    type: 'folder',
    expanded: false,
    children: []
  };

  const layoutKeys = Object.keys(localStorage).filter(key => key.startsWith('layout_'));
  for (const key of layoutKeys) {
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const size = new Blob([dataStr]).size;
      layoutsFolder.children?.push({
        name: key.replace('layout_', ''),
        path: `/layouts/${key}`,
        type: 'file',
        size
      });
    }
  }

  return layoutsFolder;
}

function buildPatternsFolder(): StorageNode {
  const patternsFolder: StorageNode = {
    name: 'Patterns',
    path: '/patterns',
    type: 'folder',
    expanded: false,
    children: []
  };

  const patternKeys = Object.keys(localStorage).filter(key => key.startsWith('pattern_'));
  for (const key of patternKeys) {
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const size = new Blob([dataStr]).size;
      patternsFolder.children?.push({
        name: key.replace('pattern_', ''),
        path: `/patterns/${key}`,
        type: 'file',
        size
      });
    }
  }

  return patternsFolder;
}

function buildConfigFolder(): StorageNode {
  const configFolder: StorageNode = {
    name: 'Configuration',
    path: '/config',
    type: 'folder',
    expanded: false,
    children: []
  };

  const configKeys = ['app_config', 'selected_client', 'launched_games'];
  for (const key of configKeys) {
    const dataStr = localStorage.getItem(key);
    if (dataStr) {
      const size = new Blob([dataStr]).size;
      configFolder.children?.push({
        name: key,
        path: `/config/${key}`,
        type: 'file',
        size
      });
    }
  }

  return configFolder;
}

export function getWebStorageInfo(): { used: number; total: number } {
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += new Blob([key, value]).size;
      }
    }
  }

  const quota = 10 * 1024 * 1024;

  return { used: totalSize, total: quota };
}

export function getAllLocalStorageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

export function getLocalStorageItemSize(key: string): number {
  const value = localStorage.getItem(key);
  if (!value) return 0;
  return new Blob([key, value]).size;
}

export function clearLocalStorageByPrefix(prefix: string): number {
  let deletedCount = 0;
  const keysToDelete: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    localStorage.removeItem(key);
    deletedCount++;
  }

  return deletedCount;
}
