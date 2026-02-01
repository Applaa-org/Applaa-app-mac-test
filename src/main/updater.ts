import { app, autoUpdater, dialog } from 'electron';
import log from 'electron-log';

export function initAutoUpdater() {
    if (process.platform === 'linux' || !app.isPackaged) {
        return;
    }

    const server = 'https://update.electronjs.org';
    const feed = `${server}/Applaa-Builder/applaa-releases/${process.platform}-${process.arch}/${app.getVersion()}`;

    log.info('Initializing auto-updater with feed:', feed);

    try {
        autoUpdater.setFeedURL({ url: feed });
    } catch (error) {
        log.error('Failed to set feed URL:', error);
        return;
    }

    autoUpdater.on('error', (err) => {
        log.error('Updater error:', err);
    });

    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for update...');
    });

    autoUpdater.on('update-available', () => {
        log.info('Update available.');
    });

    autoUpdater.on('update-not-available', () => {
        log.info('Update not available.');
    });

    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        log.info('Update downloaded:', releaseName);

        // Notify renderer or show dialog
        const dialogueOpts = {
            type: 'info' as const,
            buttons: ['Restart', 'Later'],
            title: 'Application Update',
            message: process.platform === 'win32' ? releaseNotes : releaseName,
            detail: 'A new version has been downloaded. Restart the application to apply the updates.'
        };

        dialog.showMessageBox(dialogueOpts).then((returnValue) => {
            if (returnValue.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    // Check for updates immediately
    autoUpdater.checkForUpdates();

    // Check every 10 minutes
    setInterval(() => {
        autoUpdater.checkForUpdates();
    }, 10 * 60 * 1000);
}
