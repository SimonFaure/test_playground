export type DownloadItemType = 'cards' | 'pattern' | 'layout' | 'scenario';

export interface DownloadItem {
  type: DownloadItemType;
  name: string;
  version: number;
  gameType?: string;
  priority: number;
  downloadUrl: string;
  targetPath: string;
}

export interface DownloadProgress {
  current: number;
  total: number;
  currentItem: DownloadItem | null;
}
