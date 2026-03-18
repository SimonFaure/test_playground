import { supabase } from '../lib/db';

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

export async function getWebStorageStructure(): Promise<StorageNode> {
  const root: StorageNode = {
    name: 'Browser Storage',
    path: '/',
    type: 'folder',
    expanded: true,
    children: []
  };

  const scenariosFolder = await buildScenariosFolder();
  const layoutsFolder = buildLayoutsFolder();
  const patternsFolder = buildPatternsFolder();
  const configFolder = buildConfigFolder();

  root.children = [scenariosFolder, layoutsFolder, patternsFolder, configFolder];

  return root;
}

async function buildScenariosFolder(): Promise<StorageNode> {
  const scenariosFolder: StorageNode = {
    name: 'Scenarios',
    path: '/scenarios',
    type: 'folder',
    expanded: false,
    children: []
  };

  try {
    const { data: scenarios, error } = await supabase
      .from('scenarios')
      .select('uniqid, title, csv_game, csv_enigmas, csv_media_images, csv_meta, csv_sounds, csv_user_meta');

    if (error) {
      console.error('Error fetching scenarios:', error);
      return scenariosFolder;
    }

    if (!scenarios || scenarios.length === 0) {
      return scenariosFolder;
    }

    for (const scenario of scenarios) {
      const { uniqid } = scenario;
      const gameFolder: StorageNode = {
        name: uniqid,
        path: `/scenarios/${uniqid}`,
        type: 'folder',
        expanded: false,
        children: []
      };

      const csvFolder: StorageNode = {
        name: 'csv',
        path: `/scenarios/${uniqid}/csv`,
        type: 'folder',
        expanded: false,
        children: []
      };

      const csvFiles = {
        'game.csv': scenario.csv_game,
        'game_enigmas.csv': scenario.csv_enigmas,
        'game_media_images.csv': scenario.csv_media_images,
        'game_meta.csv': scenario.csv_meta,
        'game_sounds.csv': scenario.csv_sounds,
        'game_user_meta.csv': scenario.csv_user_meta
      };

      for (const [filename, content] of Object.entries(csvFiles)) {
        if (content) {
          const size = new Blob([content]).size;
          csvFolder.children?.push({
            name: filename,
            path: `/scenarios/${uniqid}/csv/${filename}`,
            type: 'file',
            size
          });
        }
      }

      if (csvFolder.children && csvFolder.children.length > 0) {
        gameFolder.children?.push(csvFolder);
      }

      const { data: mediaFiles, error: mediaError } = await supabase
        .from('scenario_media')
        .select('filename, media_type, data')
        .eq('scenario_uniqid', uniqid);

      if (!mediaError && mediaFiles && mediaFiles.length > 0) {
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

        const soundsFolder: StorageNode = {
          name: 'sounds',
          path: `/scenarios/${uniqid}/media/sounds`,
          type: 'folder',
          expanded: false,
          children: []
        };

        const videosFolder: StorageNode = {
          name: 'videos',
          path: `/scenarios/${uniqid}/media/videos`,
          type: 'folder',
          expanded: false,
          children: []
        };

        const mediaByType: Record<string, Record<string, string>> = {
          images: {},
          sounds: {},
          videos: {}
        };

        for (const media of mediaFiles) {
          if (media.media_type === 'image') {
            mediaByType.images[media.filename] = media.data;
          } else if (media.media_type === 'sound') {
            mediaByType.sounds[media.filename] = media.data;
          } else if (media.media_type === 'video') {
            mediaByType.videos[media.filename] = media.data;
          }
        }

        if (Object.keys(mediaByType.images).length > 0) {
          buildMediaTree(mediaByType.images, imagesFolder, `/scenarios/${uniqid}/media/images`);
          mediaFolder.children?.push(imagesFolder);
        }

        if (Object.keys(mediaByType.sounds).length > 0) {
          buildMediaTree(mediaByType.sounds, soundsFolder, `/scenarios/${uniqid}/media/sounds`);
          mediaFolder.children?.push(soundsFolder);
        }

        if (Object.keys(mediaByType.videos).length > 0) {
          buildMediaTree(mediaByType.videos, videosFolder, `/scenarios/${uniqid}/media/videos`);
          mediaFolder.children?.push(videosFolder);
        }

        if (mediaFolder.children && mediaFolder.children.length > 0) {
          gameFolder.children?.push(mediaFolder);
        }
      }

      scenariosFolder.children?.push(gameFolder);
    }
  } catch (error) {
    console.error('Error building scenarios folder:', error);
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

export async function deleteWebStorageItem(path: string): Promise<boolean> {
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
        const { error } = await supabase
          .from('scenarios')
          .delete()
          .eq('uniqid', uniqid);

        if (error) {
          console.error('Error deleting scenario:', error);
          return false;
        }

        return true;
      }

      if (pathParts.length >= 3) {
        if (pathParts[2] === 'csv') {
          if (pathParts.length === 4) {
            const filename = pathParts[3];
            const csvColumnMap: Record<string, string> = {
              'game.csv': 'csv_game',
              'game_enigmas.csv': 'csv_enigmas',
              'game_media_images.csv': 'csv_media_images',
              'game_meta.csv': 'csv_meta',
              'game_sounds.csv': 'csv_sounds',
              'game_user_meta.csv': 'csv_user_meta'
            };

            const columnName = csvColumnMap[filename];
            if (columnName) {
              const { error } = await supabase
                .from('scenarios')
                .update({ [columnName]: '' })
                .eq('uniqid', uniqid);

              if (error) {
                console.error('Error deleting CSV file:', error);
                return false;
              }
              return true;
            }
          }
        } else if (pathParts[2] === 'media') {
          if (pathParts.length === 3) {
            const { error } = await supabase
              .from('scenario_media')
              .delete()
              .eq('scenario_uniqid', uniqid);

            if (error) {
              console.error('Error deleting all media:', error);
              return false;
            }
            return true;
          } else if (pathParts.length === 4) {
            const mediaType = pathParts[3];
            const { error } = await supabase
              .from('scenario_media')
              .delete()
              .eq('scenario_uniqid', uniqid)
              .eq('media_type', mediaType.slice(0, -1));

            if (error) {
              console.error('Error deleting media type:', error);
              return false;
            }
            return true;
          } else if (pathParts.length === 5) {
            const mediaType = pathParts[3];
            const filename = pathParts[4];
            const { error } = await supabase
              .from('scenario_media')
              .delete()
              .eq('scenario_uniqid', uniqid)
              .eq('media_type', mediaType.slice(0, -1))
              .eq('filename', filename);

            if (error) {
              console.error('Error deleting media file:', error);
              return false;
            }
            return true;
          }
        }

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
