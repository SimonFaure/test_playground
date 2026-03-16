import { checkInternetConnection } from '../utils/connectivity';
import { getBillingStatus, getUserDataUpdate, downloadCardsFile, downloadPattern, downloadLayout } from './resourceSync';
import { getGameTypesFromScenarios } from '../utils/gameTypes';
import { DownloadQueueManager, getPriorityForType } from './downloadQueue';
import { DownloadItem } from '../types/downloadQueue';
import { loadConfig, saveConfig } from '../utils/config';
import { logApiCall } from './apiLogger';
import { compareVersions } from '../utils/versionCheck';

export interface SyncResult {
  success: boolean;
  billingUpdated: boolean;
  downloadsNeeded: DownloadItem[];
  error?: string;
}

export type SyncProgressCallback = (stepId: string, status: 'loading' | 'success' | 'error' | 'skipped', details?: string) => void;

export async function syncResourcesBeforeScenarios(onProgress?: SyncProgressCallback): Promise<SyncResult> {
  const startTime = Date.now();
  const downloadQueue = new DownloadQueueManager();

  try {
    const config = await loadConfig();

    if (!config.email) {
      console.log('[Sync] No email configured, skipping resource sync');
      onProgress?.('connectivity', 'skipped', 'No email configured');
      onProgress?.('billing', 'skipped');
      onProgress?.('userData', 'skipped');
      return { success: true, billingUpdated: false, downloadsNeeded: [] };
    }

    onProgress?.('connectivity', 'loading');
    console.log('[Sync] Step 1: Checking internet connectivity...');
    const hasInternet = await checkInternetConnection();

    if (!hasInternet) {
      console.log('[Sync] No internet connection, skipping resource sync');
      onProgress?.('connectivity', 'error', 'No internet connection detected');
      onProgress?.('billing', 'skipped');
      onProgress?.('userData', 'skipped');
      await logApiCall({
        endpoint: 'resource-sync',
        method: 'GET',
        statusCode: 0,
        duration: Date.now() - startTime,
        success: false,
        errorMessage: 'No internet connection',
      });
      return { success: true, billingUpdated: false, downloadsNeeded: [] };
    }
    onProgress?.('connectivity', 'success', 'Connected to internet');

    const apiUrl = 'https://admin.taghunter.fr/backend/api/playground.php';

    onProgress?.('billing', 'loading');
    console.log('[Sync] Step 2: Fetching billing status...');
    try {
      const billingStatus = await getBillingStatus(apiUrl, config.email);
      const updatedConfig = {
        ...config,
        billingUpToDate: billingStatus.billing_up_to_date,
        licenseType: billingStatus.license_type,
        lastBillingSyncDate: new Date().toISOString(),
      };
      await saveConfig(updatedConfig);
      console.log('[Sync] Billing status updated:', billingStatus);
      onProgress?.('billing', 'success', `License: ${billingStatus.license_type}`);
    } catch (error) {
      console.error('[Sync] Failed to fetch billing status:', error);
      onProgress?.('billing', 'error', 'Failed to check billing status');
    }

    onProgress?.('userData', 'loading');
    console.log('[Sync] Step 3: Fetching user data update...');
    try {
      const userData = await getUserDataUpdate(apiUrl, config.email);

      const totalScenarios = userData.custom_scenarios.length + userData.product_scenarios.length;
      const totalPatterns = userData.default_patterns.length + userData.custom_patterns.length;
      console.log(`[Sync] User data received: ${totalScenarios} scenarios, ${totalPatterns} patterns, ${userData.layouts.length} layouts`);

      const localCardsVersionResult = await (window as any).electron.cards.getLocalVersion();
      const localCardsVersion = localCardsVersionResult.version || 0;

      console.log(`[Sync] Cards - Local: v${localCardsVersion}, Remote: v${userData.cards_version}`);

      if (compareVersions(localCardsVersion, userData.cards_version)) {
        console.log('[Sync] Cards update available, adding to queue');
        downloadQueue.addItem({
          type: 'cards',
          name: 'Client Cards',
          version: userData.cards_version,
          priority: getPriorityForType('cards'),
          downloadUrl: `${apiUrl}?action=get_cards&email=${encodeURIComponent(config.email)}`,
          targetPath: `cards_v${userData.cards_version}.csv`,
        });
      }

      let patternUpdates = 0;
      const allPatterns = [
        ...userData.default_patterns.map(p => ({ ...p, type: 'default' as const })),
        ...userData.custom_patterns.map(p => ({ ...p, type: 'custom' as const }))
      ];

      for (const pattern of allPatterns) {
        const localVersionResult = await (window as any).electron.patterns.getLocalVersions(pattern.game_type, pattern.name);
        const localVersion = localVersionResult.version || 0;

        console.log(`[Sync] Pattern ${pattern.name} (${pattern.game_type}) - Local: v${localVersion}, Remote: v${pattern.version}`);

        if (compareVersions(localVersion, parseFloat(pattern.version))) {
          console.log(`[Sync] Pattern ${pattern.name} update available, adding to queue`);
          patternUpdates++;
          const patternType = pattern.type === 'default' ? 'default_patterns' : 'user_patterns';
          downloadQueue.addItem({
            type: 'pattern',
            name: pattern.name,
            version: parseFloat(pattern.version),
            gameType: pattern.game_type,
            priority: getPriorityForType('pattern'),
            downloadUrl: `${apiUrl}?action=download_pattern&game_type=${pattern.game_type}&pattern_name=${encodeURIComponent(pattern.name)}&email=${encodeURIComponent(config.email)}`,
            targetPath: `${pattern.game_type}/${patternType}/${pattern.name}_${pattern.version}`,
          });
        }
      }

      let layoutUpdates = 0;
      for (const layout of userData.layouts) {
        const localVersionResult = await (window as any).electron.layouts.getLocalVersions(layout.game_type);
        const localVersion = localVersionResult.version || 0;
        const remoteVersion = typeof layout.version === 'string' ? parseFloat(layout.version) : layout.version;

        console.log(`[Sync] Layout ${layout.game_type} - Local: v${localVersion}, Remote: v${remoteVersion}`);

        if (compareVersions(localVersion, remoteVersion)) {
          console.log(`[Sync] Layout ${layout.game_type} update available, adding to queue`);
          layoutUpdates++;
          downloadQueue.addItem({
            type: 'layout',
            name: `${layout.game_type} Layout`,
            version: remoteVersion,
            gameType: layout.game_type,
            priority: getPriorityForType('layout'),
            downloadUrl: `${apiUrl}?action=download_layout&game_type=${layout.game_type}&email=${encodeURIComponent(config.email)}`,
            targetPath: `${layout.game_type}_${remoteVersion}`,
          });
        }
      }

      const updatesSummary = [
        totalScenarios > 0 ? `${totalScenarios} scenarios` : null,
        patternUpdates > 0 ? `${patternUpdates} pattern updates` : null,
        layoutUpdates > 0 ? `${layoutUpdates} layout updates` : null,
      ].filter(Boolean).join(', ') || 'All up to date';

      onProgress?.('userData', 'success', updatesSummary);
    } catch (error) {
      console.error('[Sync] Failed to fetch user data update:', error);
      onProgress?.('userData', 'error', 'Failed to fetch user data');
    }

    const downloadsNeeded = downloadQueue.getQueue();
    console.log(`[Sync] Resource sync completed. ${downloadsNeeded.length} downloads needed`);

    await logApiCall({
      endpoint: 'resource-sync',
      method: 'GET',
      statusCode: 200,
      duration: Date.now() - startTime,
      success: true,
    });

    return {
      success: true,
      billingUpdated: true,
      downloadsNeeded,
    };
  } catch (error) {
    console.error('[Sync] Error during resource sync:', error);
    await logApiCall({
      endpoint: 'resource-sync',
      method: 'GET',
      statusCode: 0,
      duration: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      billingUpdated: false,
      downloadsNeeded: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function downloadResourceItem(item: DownloadItem): Promise<void> {
  console.log(`[Download] Starting download for ${item.type}: ${item.name}`);

  switch (item.type) {
    case 'cards':
      const cardsContent = await downloadCardsFile(item.downloadUrl);
      await (window as any).electron.cards.saveFile(item.version, cardsContent);
      console.log(`[Download] Cards saved: v${item.version}`);
      break;

    case 'pattern':
      const patternContent = await downloadPattern(item.downloadUrl);
      const isUserPattern = item.targetPath.includes('user_patterns');
      const patternSlug = item.name.toLowerCase().replace(/\s+/g, '_');
      await (window as any).electron.patterns.saveFile(
        item.gameType!,
        patternSlug,
        item.version,
        patternContent,
        isUserPattern
      );
      console.log(`[Download] Pattern saved: ${item.name} v${item.version}`);
      break;

    case 'layout':
      const layoutContent = await downloadLayout(item.downloadUrl);
      await (window as any).electron.layouts.saveFile(item.gameType!, item.version, layoutContent);
      console.log(`[Download] Layout saved: ${item.gameType} v${item.version}`);
      break;

    default:
      console.warn(`[Download] Unknown item type: ${item.type}`);
  }
}
