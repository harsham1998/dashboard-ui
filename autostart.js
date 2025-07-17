const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

class AutoStart {
  constructor(appName = 'Dashboard Wallpaper') {
    this.appName = appName;
    this.appPath = process.execPath;
    this.platform = process.platform;
  }

  enable() {
    try {
      switch (this.platform) {
        case 'darwin':
          return this.enableMacOS();
        case 'win32':
          return this.enableWindows();
        case 'linux':
          return this.enableLinux();
        default:
          console.log('Autostart not supported on this platform');
          return false;
      }
    } catch (error) {
      console.error('Failed to enable autostart:', error);
      return false;
    }
  }

  disable() {
    try {
      switch (this.platform) {
        case 'darwin':
          return this.disableMacOS();
        case 'win32':
          return this.disableWindows();
        case 'linux':
          return this.disableLinux();
        default:
          console.log('Autostart not supported on this platform');
          return false;
      }
    } catch (error) {
      console.error('Failed to disable autostart:', error);
      return false;
    }
  }

  isEnabled() {
    try {
      switch (this.platform) {
        case 'darwin':
          return this.isEnabledMacOS();
        case 'win32':
          return this.isEnabledWindows();
        case 'linux':
          return this.isEnabledLinux();
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to check autostart status:', error);
      return false;
    }
  }

  // macOS implementation
  enableMacOS() {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `com.dashboard.electron.plist`);
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.dashboard.electron</string>
  <key>ProgramArguments</key>
  <array>
    <string>${this.appPath}</string>
    <string>${path.dirname(this.appPath)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`;

    // Ensure directory exists
    const dir = path.dirname(plistPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(plistPath, plistContent);
    console.log('Autostart enabled for macOS');
    return true;
  }

  disableMacOS() {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `com.dashboard.electron.plist`);
    if (fs.existsSync(plistPath)) {
      fs.unlinkSync(plistPath);
      console.log('Autostart disabled for macOS');
    }
    return true;
  }

  isEnabledMacOS() {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `com.dashboard.electron.plist`);
    return fs.existsSync(plistPath);
  }

  // Windows implementation
  enableWindows() {
    const { exec } = require('child_process');
    const command = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${this.appName}" /t REG_SZ /d "${this.appPath}" /f`;
    
    return new Promise((resolve) => {
      exec(command, (error) => {
        if (error) {
          console.error('Failed to enable autostart on Windows:', error);
          resolve(false);
        } else {
          console.log('Autostart enabled for Windows');
          resolve(true);
        }
      });
    });
  }

  disableWindows() {
    const { exec } = require('child_process');
    const command = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${this.appName}" /f`;
    
    return new Promise((resolve) => {
      exec(command, (error) => {
        if (error) {
          console.log('Autostart was not enabled or failed to disable');
        } else {
          console.log('Autostart disabled for Windows');
        }
        resolve(true);
      });
    });
  }

  isEnabledWindows() {
    const { exec } = require('child_process');
    const command = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${this.appName}"`;
    
    return new Promise((resolve) => {
      exec(command, (error) => {
        resolve(!error);
      });
    });
  }

  // Linux implementation
  enableLinux() {
    const desktopEntry = `[Desktop Entry]
Type=Application
Name=${this.appName}
Comment=Dashboard Wallpaper Application
Exec=${this.appPath}
Icon=${path.join(path.dirname(this.appPath), 'assets', 'icon.png')}
Terminal=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
Hidden=false`;

    const autostartDir = path.join(os.homedir(), '.config', 'autostart');
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    const desktopPath = path.join(autostartDir, 'dashboard-electron.desktop');
    fs.writeFileSync(desktopPath, desktopEntry);
    console.log('Autostart enabled for Linux');
    return true;
  }

  disableLinux() {
    const desktopPath = path.join(os.homedir(), '.config', 'autostart', 'dashboard-electron.desktop');
    if (fs.existsSync(desktopPath)) {
      fs.unlinkSync(desktopPath);
      console.log('Autostart disabled for Linux');
    }
    return true;
  }

  isEnabledLinux() {
    const desktopPath = path.join(os.homedir(), '.config', 'autostart', 'dashboard-electron.desktop');
    return fs.existsSync(desktopPath);
  }
}

module.exports = AutoStart;