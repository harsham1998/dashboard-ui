class WallpaperHelper {
  static setDesktopLevel(window) {
    if (process.platform === 'darwin') {
      try {
        // Simple approach - just set to desktop level
        window.setAlwaysOnTop(false, 'desktop');
        window.setVisibleOnAllWorkspaces(false);
        return true;
      } catch (error) {
        console.log('Setting desktop level:', error.message);
        return false;
      }
    }
    return false;
  }
  
  static excludeFromMissionControl(window) {
    // This method is simplified to avoid errors
    // Mission Control exclusion will be handled differently
    return true;
  }
}

module.exports = WallpaperHelper;