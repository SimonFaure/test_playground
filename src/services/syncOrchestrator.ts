import { checkInternetConnection } from '../utils/connectivity';
import { getBillingStatus, getCardsVersion, getPatterns, getLayouts, downloadCardsFile, downloadPattern, downloadLayout } from './resourceSync';
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
      onProgress?.('cards', 'skipped');
      onProgress?.('gameTypes', 'skipped');
      onProgress?.('patterns', 'skipped');
      onProgress?.('layouts', 'skipped');
      return { success: true, billingUpdated: false, downloadsNeeded: [] };
    }

    onProgress?.('connectivity', 'loading');
    console.log('[Sync] Step 1: Checking internet connectivity...');
    const hasInternet = await checkInternetConnection();

    if (!hasInternet) {
      console.log('[Sync] No internet connection, skipping resource sync');
      onProgress?.('connectivity', 'error', 'No internet connection detected');
      onProgress?.('billing', 'skipped');
      onProgress?.('cards', 'skipped');
      onProgress?.('gameTypes', 'skipped');
      onProgress?.('patterns', 'skipped');
      onProgress?.('layouts', 'skipped');
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

    onProgress?.('cards', 'loading');
    console.log('[Sync] Step 3: Checking cards version...');
    try {
      const remoteCards = await getCardsVersion(apiUrl, config.email);
      const localVersionResult = await (window as any).electron.cards.getLocalVersion();
      const localVersion = localVersionResult.version || 0;

      console.log(`[Sync] Cards - Local: v${localVersion}, Remote: v${remoteCards.version}`);

      if (compareVersions(localVersion, remoteCards.version)) {
        console.log('[Sync] Cards update available, adding to queue');
        downloadQueue.addItem({
          type: 'cards',
          name: 'Client Cards',
          version: remoteCards.version,
          priority: getPriorityForType('cards'),
          downloadUrl: `${apiUrl}?action=get_cards&email=${encodeURIComponent(config.email)}`,
          targetPath: `cards_v${remoteCards.version}.csv`,
        });
        onProgress?.('cards', 'success', `Update available: v${remoteCards.version}`);
      } else {
        onProgress?.('cards', 'success', `Up to date: v${localVersion}`);
      }
    } catch (error) {
      console.error('[Sync] Failed to check cards version:', error);
      onProgress?.('cards', 'error', 'Failed to check cards version');
    }

    onProgress?.('gameTypes', 'loading');
    console.log('[Sync] Step 4: Discovering game types from scenarios...');
    const gameTypes = await getGameTypesFromScenarios();
    console.log(`[Sync] Found ${gameTypes.length} game types from local scenarios:`, gameTypes);

    // Always check for patterns and layouts from the server
    // Even if we don't have local scenarios yet, we should fetch available resources
    const allGameTypes = gameTypes.length > 0 ? gameTypes : ['mystery'];
    console.log(`[Sync] Will check patterns and layouts for: ${allGameTypes.join(', ')}`);
    onProgress?.('gameTypes', 'success', `Checking ${allGameTypes.length} game types`);

    if (true) {
      onProgress?.('patterns', 'loading');
      console.log('[Sync] Step 5: Checking patterns...');
      let patternUpdates = 0;
      try {
        const patternsResponse = await getPatterns(apiUrl, config.email);
        console.log(`[Sync] Patterns API returned ${patternsResponse.patterns?.length || 0} patterns`);

        if (patternsResponse.patterns && patternsResponse.patterns.length > 0) {
          for (const pattern of patternsResponse.patterns) {
            console.log(`[Sync] Checking pattern: ${pattern.slug} (type: ${pattern.type})`);

            // Extract game type from the pattern slug or download URL structure
            // Patterns are typically organized by game type in their path
            const gameTypeMatch = pattern.download_url.match(/patterns\/([^/]+)\//);
            const gameType = gameTypeMatch ? gameTypeMatch[1] : 'mystery';

            const localVersionResult = await (window as any).electron.patterns.getLocalVersions(gameType, pattern.slug);
            const localVersion = localVersionResult.version || 0;

            console.log(`[Sync] Pattern ${pattern.slug} (${gameType}) - Local: v${localVersion}, Remote: v${pattern.version}`);

            if (compareVersions(localVersion, pattern.version)) {
              console.log(`[Sync] Pattern ${pattern.slug} update available, adding to queue`);
              console.log(`[Sync] Download URL: ${pattern.download_url}`);
              patternUpdates++;
              downloadQueue.addItem({
                type: 'pattern',
                name: pattern.name || pattern.slug,
                version: pattern.version,
                gameType: gameType,
                priority: getPriorityForType('pattern'),
                downloadUrl: pattern.download_url,
                targetPath: `${gameType}/${pattern.type}_patterns/${pattern.slug}_${pattern.version}`,
              });
            } else {
              console.log(`[Sync] Pattern ${pattern.slug} is up to date`);
            }
          }
        }
      } catch (error) {
        console.error(`[Sync] Failed to check patterns:`, error);
        console.error(`[Sync] Error details:`, error instanceof Error ? error.message : 'Unknown error');
      }
      console.log(`[Sync] Pattern check complete. Total updates needed: ${patternUpdates}`);
      onProgress?.('patterns', 'success', patternUpdates > 0 ? `${patternUpdates} updates available` : 'All patterns up to date');

      onProgress?.('layouts', 'loading');
      console.log('[Sync] Step 6: Checking layouts...');
      let layoutUpdates = 0;
      try {
        const layoutsResponse = await getLayouts(apiUrl, config.email);
        console.log(`[Sync] Layouts API returned ${layoutsResponse.layouts?.length || 0} layouts`);

        if (layoutsResponse.layouts && layoutsResponse.layouts.length > 0) {
          for (const layout of layoutsResponse.layouts) {
            const gameType = layout.game_type;
            console.log(`[Sync] Checking layout: ${gameType}`);
            const localVersionResult = await (window as any).electron.layouts.getLocalVersions(gameType);
            const localVersion = localVersionResult.version || 0;

            console.log(`[Sync] Layout ${gameType} - Local: v${localVersion}, Remote: v${layout.version}`);

            if (compareVersions(localVersion, layout.version)) {
              console.log(`[Sync] Layout ${gameType} update available, adding to queue`);
              console.log(`[Sync] Download URL: ${layout.download_url}`);
              layoutUpdates++;
              downloadQueue.addItem({
                type: 'layout',
                name: `${gameType} Layout`,
                version: layout.version,
                gameType: gameType,
                priority: getPriorityForType('layout'),
                downloadUrl: layout.download_url,
                targetPath: `${gameType}_${layout.version}`,
              });
            } else {
              console.log(`[Sync] Layout ${gameType} is up to date`);
            }
          }
        }
      } catch (error) {
        console.error(`[Sync] Failed to check layouts:`, error);
        console.error(`[Sync] Error details:`, error instanceof Error ? error.message : 'Unknown error');
      }
      console.log(`[Sync] Layout check complete. Total updates needed: ${layoutUpdates}`);
      onProgress?.('layouts', 'success', layoutUpdates > 0 ? `${layoutUpdates} updates available` : 'All layouts up to date');
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
