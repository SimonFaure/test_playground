import { supabase } from '../lib/db';

interface StorageNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  children?: StorageNode[];
  expanded?: boolean;
}

export async function getWebStorageStructure(): Promise<StorageNode> {
  const root: StorageNode = {
    name: 'Browser Storage',
    path: '/',
    type: 'folder',
    expanded: true,
    children: []
  };

  const [scenariosFolder, layoutsFolder, patternsFolder, cardsFolder, configFolder] = await Promise.all([
    buildScenariosFolder(),
    buildLayoutsFolder(),
    buildPatternsFolder(),
    buildCardsFolder(),
    buildConfigFolder()
  ]);

  root.children = [scenariosFolder, layoutsFolder, patternsFolder, cardsFolder, configFolder];

  return root;
}

async function listStorageFolder(prefix: string): Promise<{ name: string; metadata?: { size?: number } }[]> {
  const { data, error } = await supabase.storage.from('resources').list(prefix, { limit: 1000 });
  if (error || !data) return [];
  return data;
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
      .select('uniqid, title');

    if (error || !scenarios) return scenariosFolder;

    for (const scenario of scenarios) {
      const { uniqid } = scenario;
      const gameFolder: StorageNode = {
        name: uniqid,
        path: `/scenarios/${uniqid}`,
        type: 'folder',
        expanded: false,
        children: []
      };

      const [rootFiles, imageFiles, soundFiles, videoFiles] = await Promise.all([
        listStorageFolder(`scenarios/${uniqid}`),
        listStorageFolder(`scenarios/${uniqid}/images`),
        listStorageFolder(`scenarios/${uniqid}/sounds`),
        listStorageFolder(`scenarios/${uniqid}/videos`)
      ]);

      for (const file of rootFiles) {
        if (file.name && !['images', 'sounds', 'videos'].includes(file.name)) {
          gameFolder.children?.push({
            name: file.name,
            path: `/scenarios/${uniqid}/${file.name}`,
            type: 'file',
            size: file.metadata?.size
          });
        }
      }

      const mediaSubfolders = [
        { name: 'images', files: imageFiles },
        { name: 'sounds', files: soundFiles },
        { name: 'videos', files: videoFiles }
      ];

      const mediaChildren: StorageNode[] = [];
      for (const { name, files } of mediaSubfolders) {
        if (files.length > 0) {
          const subFolder: StorageNode = {
            name,
            path: `/scenarios/${uniqid}/${name}`,
            type: 'folder',
            expanded: false,
            children: files.map(f => ({
              name: f.name,
              path: `/scenarios/${uniqid}/${name}/${f.name}`,
              type: 'file' as const,
              size: f.metadata?.size
            }))
          };
          mediaChildren.push(subFolder);
        }
      }

      if (mediaChildren.length > 0) {
        const mediaFolder: StorageNode = {
          name: 'media',
          path: `/scenarios/${uniqid}/media`,
          type: 'folder',
          expanded: false,
          children: mediaChildren
        };
        gameFolder.children?.push(mediaFolder);
      }

      scenariosFolder.children?.push(gameFolder);
    }
  } catch (error) {
    console.error('Error building scenarios folder:', error);
  }

  return scenariosFolder;
}

async function buildLayoutsFolder(): Promise<StorageNode> {
  const layoutsFolder: StorageNode = {
    name: 'Layouts',
    path: '/layouts',
    type: 'folder',
    expanded: false,
    children: []
  };

  try {
    const files = await listStorageFolder('layouts');
    for (const file of files) {
      if (file.name) {
        layoutsFolder.children?.push({
          name: file.name,
          path: `/layouts/${file.name}`,
          type: 'file',
          size: file.metadata?.size
        });
      }
    }
  } catch (err) {
    console.warn('Error listing layouts from storage:', err);
  }

  return layoutsFolder;
}

async function buildPatternsFolder(): Promise<StorageNode> {
  const patternsFolder: StorageNode = {
    name: 'Patterns',
    path: '/patterns',
    type: 'folder',
    expanded: false,
    children: []
  };

  try {
    const gameTypeFolders = await listStorageFolder('patterns');

    for (const folder of gameTypeFolders) {
      if (!folder.name) continue;

      const gameTypeFolder: StorageNode = {
        name: folder.name,
        path: `/patterns/${folder.name}`,
        type: 'folder',
        expanded: false,
        children: []
      };

      const patternFiles = await listStorageFolder(`patterns/${folder.name}`);
      for (const file of patternFiles) {
        if (file.name) {
          gameTypeFolder.children?.push({
            name: file.name,
            path: `/patterns/${folder.name}/${file.name}`,
            type: 'file',
            size: file.metadata?.size
          });
        }
      }

      patternsFolder.children?.push(gameTypeFolder);
    }
  } catch (err) {
    console.warn('Error listing patterns from storage:', err);
  }

  return patternsFolder;
}

async function buildCardsFolder(): Promise<StorageNode> {
  const cardsFolder: StorageNode = {
    name: 'Cards',
    path: '/cards',
    type: 'folder',
    expanded: false,
    children: []
  };

  try {
    const files = await listStorageFolder('cards');
    for (const file of files) {
      if (file.name) {
        cardsFolder.children?.push({
          name: file.name,
          path: `/cards/${file.name}`,
          type: 'file',
          size: file.metadata?.size
        });
      }
    }
  } catch (err) {
    console.warn('Error listing cards from storage:', err);
  }

  return cardsFolder;
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
      if (pathParts.length === 1) return false;

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

        const { data: allFiles } = await supabase.storage
          .from('resources')
          .list(`scenarios/${uniqid}`, { limit: 1000 });

        if (allFiles) {
          const filePaths = allFiles.map(f => `scenarios/${uniqid}/${f.name}`);
          if (filePaths.length > 0) {
            await supabase.storage.from('resources').remove(filePaths);
          }
        }

        return true;
      }

      if (pathParts.length >= 3) {
        const storagePath = pathParts.slice(1).join('/');

        if (pathParts[2] === 'media' && pathParts.length === 3) {
          const { error } = await supabase
            .from('scenario_media')
            .delete()
            .eq('scenario_uniqid', uniqid);

          if (error) console.error('Error deleting all media:', error);
          return !error;
        }

        const { error } = await supabase.storage
          .from('resources')
          .remove([`scenarios/${storagePath}`]);

        return !error;
      }
    }

    if (pathParts[0] === 'layouts') {
      if (pathParts.length >= 2) {
        const fileName = pathParts.slice(1).join('/');
        const { error } = await supabase.storage
          .from('resources')
          .remove([`layouts/${fileName}`]);

        return !error;
      }
    }

    if (pathParts[0] === 'patterns') {
      if (pathParts.length >= 2) {
        const fileName = pathParts.slice(1).join('/');
        const { error } = await supabase.storage
          .from('resources')
          .remove([`patterns/${fileName}`]);

        if (!error && pathParts.length === 3) {
          const slug = pathParts[2].replace(/\.(json|csv)$/, '');
          await supabase.from('patterns').delete().eq('slug', slug);
        }

        return !error;
      }
    }

    if (pathParts[0] === 'cards') {
      if (pathParts.length >= 2) {
        const fileName = pathParts.slice(1).join('/');
        const { error } = await supabase.storage
          .from('resources')
          .remove([`cards/${fileName}`]);

        return !error;
      }
    }

    if (pathParts[0] === 'config') {
      if (pathParts.length === 2) {
        localStorage.removeItem(pathParts[1]);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error deleting web storage item:', error);
    return false;
  }
}
