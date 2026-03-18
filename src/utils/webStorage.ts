interface StorageNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: StorageNode[];
  expanded?: boolean;
}

function buildMediaTree(mediaFiles: Record<string, string>, parentFolder: StorageNode, basePath: string): void {
  const folderMap = new Map<string, StorageNode>();

  console.log(`[webStorage] Building media tree for ${basePath}, files:`, Object.keys(mediaFiles));

  for (const [filePath, base64Content] of Object.entries(mediaFiles)) {
    const parts = filePath.split('/').filter(p => p);
    const fileName = parts[parts.length - 1];
    const folderParts = parts.slice(0, -1);

    console.log(`[webStorage] Processing file: ${filePath}, parts:`, parts, 'folderParts:', folderParts);

    let currentFolder = parentFolder;
    let currentPath = basePath;

    for (let i = 0; i < folderParts.length; i++) {
      const folderName = folderParts[i];
      if (!folderName) continue;

      currentPath = `${currentPath}/${folderName}`;

      if (!folderMap.has(currentPath)) {
        const newFolder: StorageNode = {
          name: folderName,
          path: currentPath,
          type: 'folder',
          expanded: false,
          children: []
        };
        currentFolder.children?.push(newFolder);
        folderMap.set(currentPath, newFolder);
        console.log(`[webStorage] Created folder node: ${currentPath}`);
      }

      currentFolder = folderMap.get(currentPath)!;
    }

    const size = base64Content ? new Blob([base64Content]).size : 0;
    currentFolder.children?.push({
      name: fileName,
      path: `${currentPath}/${fileName}`,
      type: 'file',
      size
    });
    console.log(`[webStorage] Added file: ${fileName} to folder: ${currentPath}`);
  }
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
      for (const uniqid of gamesList) {
        const gameKey = `game_${uniqid}`;
        const gameDataStr = localStorage.getItem(gameKey);
        if (gameDataStr) {
          try {
            const gameStorage = JSON.parse(gameDataStr);
            const gameFolder: StorageNode = {
              name: uniqid,
              path: `/scenarios/${uniqid}`,
              type: 'folder',
              expanded: false,
              children: []
            };

            if (gameStorage.gameData) {
              const gameDataSize = new Blob([JSON.stringify(gameStorage.gameData)]).size;
              gameFolder.children?.push({
                name: 'game-data.json',
                path: `/scenarios/${uniqid}/game-data.json`,
                type: 'file',
                size: gameDataSize
              });
            }

            if (gameStorage.csv) {
              const csvFolder: StorageNode = {
                name: 'csv',
                path: `/scenarios/${uniqid}/csv`,
                type: 'folder',
                expanded: false,
                children: []
              };

              for (const [filename, content] of Object.entries(gameStorage.csv)) {
                const size = new Blob([content as string]).size;
                csvFolder.children?.push({
                  name: filename,
                  path: `/scenarios/${uniqid}/csv/${filename}`,
                  type: 'file',
                  size
                });
              }

              if (csvFolder.children && csvFolder.children.length > 0) {
                gameFolder.children?.push(csvFolder);
              }
            }

            if (gameStorage.media) {
              const mediaFolder: StorageNode = {
                name: 'media',
                path: `/scenarios/${uniqid}/media`,
                type: 'folder',
                expanded: false,
                children: []
              };

              const imagesFolder: StorageNode = {
                name: 'images',
                path: `/scenarios/${uniqid}/media/images`,
                type: 'folder',
                expanded: false,
                children: []
              };

              if (gameStorage.media.images) {
                buildMediaTree(gameStorage.media.images, imagesFolder, `/scenarios/${uniqid}/media/images`);
              }

              if ((imagesFolder.children?.length ?? 0) > 0) {
                mediaFolder.children?.push(imagesFolder);
              }

              const soundsFolder: StorageNode = {
                name: 'sounds',
                path: `/scenarios/${uniqid}/media/sounds`,
                type: 'folder',
                expanded: false,
                children: []
              };

              if (gameStorage.media.sounds) {
                buildMediaTree(gameStorage.media.sounds, soundsFolder, `/scenarios/${uniqid}/media/sounds`);
              }

              if ((soundsFolder.children?.length ?? 0) > 0) {
                mediaFolder.children?.push(soundsFolder);
              }

              const videosFolder: StorageNode = {
                name: 'videos',
                path: `/scenarios/${uniqid}/media/videos`,
                type: 'folder',
                expanded: false,
                children: []
              };

              if (gameStorage.media.videos) {
                buildMediaTree(gameStorage.media.videos, videosFolder, `/scenarios/${uniqid}/media/videos`);
              }

              if ((videosFolder.children?.length ?? 0) > 0) {
                mediaFolder.children?.push(videosFolder);
              }

              gameFolder.children?.push(mediaFolder);
            }

            scenariosFolder.children?.push(gameFolder);
          } catch (parseError) {
            console.error(`Error parsing game data for ${uniqid}:`, parseError);
          }
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

  const quota = 100 * 1024 * 1024;

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

export function deleteWebStorageItem(path: string): boolean {
  try {
    const pathParts = path.split('/').filter(p => p);

    if (pathParts.length === 0) {
      return false;
    }

    if (pathParts[0] === 'scenarios') {
      if (pathParts.length === 1) {
        return false;
      }

      const uniqid = pathParts[1];

      if (pathParts.length === 2) {
        const gameKey = `game_${uniqid}`;
        localStorage.removeItem(gameKey);

        const gamesListStr = localStorage.getItem('uploaded_games_list');
        if (gamesListStr) {
          const gamesList = JSON.parse(gamesListStr);
          const updatedList = gamesList.filter((id: string) => id !== uniqid);
          localStorage.setItem('uploaded_games_list', JSON.stringify(updatedList));
        }
        return true;
      }

      if (pathParts.length >= 3) {
        const gameKey = `game_${uniqid}`;
        const gameDataStr = localStorage.getItem(gameKey);
        if (!gameDataStr) return false;

        const gameStorage = JSON.parse(gameDataStr);

        if (pathParts[2] === 'csv') {
          if (pathParts.length === 3) {
            delete gameStorage.csv;
          } else if (pathParts.length === 4) {
            const filename = pathParts[3];
            if (gameStorage.csv && gameStorage.csv[filename]) {
              delete gameStorage.csv[filename];
            }
          }
        } else if (pathParts[2] === 'media') {
          if (pathParts.length === 3) {
            delete gameStorage.media;
          } else if (pathParts.length === 4) {
            const mediaType = pathParts[3];
            if (gameStorage.media && gameStorage.media[mediaType]) {
              delete gameStorage.media[mediaType];
            }
          } else if (pathParts.length === 5) {
            const mediaType = pathParts[3];
            const filename = pathParts[4];
            if (gameStorage.media && gameStorage.media[mediaType] && gameStorage.media[mediaType][filename]) {
              delete gameStorage.media[mediaType][filename];
            }
          }
        }

        localStorage.setItem(gameKey, JSON.stringify(gameStorage));
        return true;
      }
    }

    if (pathParts[0] === 'layouts') {
      if (pathParts.length === 2) {
        const layoutKey = pathParts[1];
        localStorage.removeItem(layoutKey);

        const layoutsListStr = localStorage.getItem('uploaded_layouts_list');
        if (layoutsListStr) {
          const layoutsList = JSON.parse(layoutsListStr);
          const layoutId = layoutKey.replace('layout_', '');
          const updatedList = layoutsList.filter((id: string) => id !== layoutId);
          localStorage.setItem('uploaded_layouts_list', JSON.stringify(updatedList));
        }
        return true;
      }
    }

    if (pathParts[0] === 'patterns') {
      if (pathParts.length === 2) {
        const patternKey = pathParts[1];
        localStorage.removeItem(patternKey);

        const patternsListStr = localStorage.getItem('uploaded_patterns_list');
        if (patternsListStr) {
          const patternsList = JSON.parse(patternsListStr);
          const patternId = patternKey.replace('pattern_', '');
          const updatedList = patternsList.filter((id: string) => id !== patternId);
          localStorage.setItem('uploaded_patterns_list', JSON.stringify(updatedList));
        }
        return true;
      }
    }

    if (pathParts[0] === 'config') {
      if (pathParts.length === 2) {
        const configKey = pathParts[1];
        localStorage.removeItem(configKey);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error deleting web storage item:', error);
    return false;
  }
}
