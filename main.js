const { app, BrowserWindow, Menu, shell, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs').promises;
// HealthKit integration removed
const AutoStart = require('./autostart');
const WallpaperHelper = require('./wallpaper-helper');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;
  
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    acceptFirstMouse: true,
    hasShadow: false,
    fullscreenable: false,
    enableLargerThanScreen: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js'),
        backgroundThrottling: false
      },
    show: false,
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Set window to desktop level - like Plash
    try {
      if (process.platform === 'darwin') {
        // Use the lowest possible window level
        mainWindow.setAlwaysOnTop(false, 'desktop', -1);
        // Try to set it even lower
        if (mainWindow.setWindowButtonVisibility) {
          mainWindow.setWindowButtonVisibility(false);
        }
      } else if (process.platform === 'win32') {
        // Windows desktop level
        mainWindow.setAlwaysOnTop(false, 'desktop');
      } else {
        // Linux
        mainWindow.setAlwaysOnTop(false);
      }
    } catch (error) {
      console.log('Setting window level:', error.message);
    }
    
    // Configure for desktop wallpaper behavior
    if (process.platform === 'darwin') {
      // Use helper to set proper desktop level and exclude from Mission Control
      WallpaperHelper.setDesktopLevel(mainWindow);
      WallpaperHelper.excludeFromMissionControl(mainWindow);
    } else {
      mainWindow.setVisibleOnAllWorkspaces(true);
    }
    
    // Enable all mouse and keyboard interactions
    mainWindow.setIgnoreMouseEvents(false);
    
    // Ensure window can receive input
    mainWindow.focus();
    mainWindow.webContents.focus();
    
    console.log('🖱️ Mouse events enabled, window focused');
    
    // Periodically ensure it stays at desktop level and excluded from Mission Control
    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          if (process.platform === 'darwin') {
            WallpaperHelper.setDesktopLevel(mainWindow);
            WallpaperHelper.excludeFromMissionControl(mainWindow);
          } else {
            mainWindow.setAlwaysOnTop(false);
          }
        } catch (error) {
          // Ignore interval errors
        }
      }
    }, 5000);
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DISABLED ALL WINDOW MANAGEMENT TO FIX FLICKERING
  // mainWindow.on('focus', () => {
  //   try {
  //     if (process.platform === 'darwin') {
  //       WallpaperHelper.setDesktopLevel(mainWindow);
  //       WallpaperHelper.excludeFromMissionControl(mainWindow);
  //     }
  //     // Ensure mouse events are always enabled
  //     mainWindow.setIgnoreMouseEvents(false);
  //   } catch (error) {
  //     // Ignore focus errors
  //   }
  // });

  // mainWindow.on('show', () => {
  //   try {
  //     if (process.platform === 'darwin') {
  //       WallpaperHelper.setDesktopLevel(mainWindow);
  //       WallpaperHelper.excludeFromMissionControl(mainWindow);
  //     }
  //     // Always ensure interactions are enabled
  //     mainWindow.setIgnoreMouseEvents(false);
  //   } catch (error) {
  //     console.log('Error in show event:', error.message);
  //   }
  // });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Register URL scheme for Siri shortcuts
if (process.platform === 'darwin') {
  app.setAsDefaultProtocolClient('dashboard-electron');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle URL scheme for Siri shortcuts
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('🔗 Received URL:', url);
  
  if (mainWindow && url.startsWith('dashboard-electron://')) {
    try {
      // Custom parsing for custom URL schemes
      // Format: dashboard-electron://add-task?text=something
      let action = '';
      let queryString = '';
      
      // Remove the scheme prefix
      const urlWithoutScheme = url.replace('dashboard-electron://', '');
      
      // Split by '?' to separate action and query string
      const parts = urlWithoutScheme.split('?');
      action = parts[0] || '';
      queryString = parts[1] || '';
      
      // Parse query parameters
      const params = new URLSearchParams(queryString);
      
      console.log('📝 URL components:');
      console.log('  - Raw URL:', url);
      console.log('  - URL without scheme:', urlWithoutScheme);
      console.log('  - Action:', action);
      console.log('  - Query string:', queryString);
      console.log('  - Text param:', params.get('text'));
      
      // Parse Siri command
      const command = {
        action: action,
        text: params.get('text') || '',
        type: params.get('type') || 'task'
      };
      
      console.log('🎤 Processing Siri URL command:', command);
      
      // Send to renderer process
      mainWindow.webContents.send('siri-command', command);
      
      // Bring window to front
      mainWindow.show();
      mainWindow.focus();
      
    } catch (error) {
      console.error('❌ Error parsing URL:', error);
      console.error('Raw URL:', url);
    }
  }
});

// Handle command line arguments (for Windows/Linux)
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    
    // Check for URL scheme in command line
    const url = commandLine.find(arg => arg.startsWith('dashboard-electron://'));
    if (url) {
      app.emit('open-url', event, url);
    }
  }
});

const template = [
  {
    label: 'Dashboard',
    submenu: [
      {
        label: 'About Dashboard',
        role: 'about'
      },
      { type: 'separator' },
      {
        label: 'Hide Dashboard',
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        role: 'hideothers'
      },
      {
        label: 'Show All',
        role: 'unhide'
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => app.quit()
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'Command+R',
        click: () => mainWindow.reload()
      },
      {
        label: 'Force Reload',
        accelerator: 'Command+Shift+R',
        click: () => mainWindow.webContents.reloadIgnoringCache()
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: 'F12',
        click: () => mainWindow.webContents.toggleDevTools()
      },
      {
        label: 'Open DevTools in Separate Window',
        accelerator: 'Command+Option+I',
        click: () => {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
      },
      { type: 'separator' },
      {
        label: 'Actual Size',
        accelerator: 'Command+0',
        role: 'resetZoom'
      },
      {
        label: 'Zoom In',
        accelerator: 'Command+Plus',
        role: 'zoomIn'
      },
      {
        label: 'Zoom Out',
        accelerator: 'Command+-',
        role: 'zoomOut'
      },
      { type: 'separator' },
      {
        label: 'Toggle Fullscreen',
        accelerator: 'Control+Command+F',
        role: 'togglefullscreen'
      }
    ]
  },
  {
    label: 'Window',
    submenu: [
      {
        label: 'Minimize',
        accelerator: 'Command+M',
        role: 'minimize'
      },
      {
        label: 'Close',
        accelerator: 'Command+W',
        role: 'close'
      }
    ]
  },
  {
    label: 'Siri',
    submenu: [
      {
        label: 'Setup Siri Shortcuts',
        click: () => {
          if (process.platform === 'darwin') {
            mainWindow.webContents.executeJavaScript(`
              localStorage.removeItem('siri-setup-shown');
              dashboardApp.showSiriSetupInstructions();
            `);
          } else {
            console.log('Siri shortcuts only available on macOS');
          }
        }
      },
      {
        label: 'Test Voice Command',
        click: () => {
          // Simulate a voice command for testing
          const testCommand = 'Add task Review the quarterly report';
          mainWindow.webContents.send('siri-command', {
            action: 'add-task',
            text: 'Review the quarterly report',
            command: testCommand
          });
        }
      },
      {
        label: 'Test URL Command',
        click: () => {
          // Test the URL scheme handling
          const testUrl = 'dashboard-electron://add-task?text=Test task from URL menu';
          console.log('Testing URL:', testUrl);
          app.emit('open-url', null, testUrl);
        }
      }
    ]
  },
  {
    label: 'Tools',
    submenu: [
      {
        label: 'Export Data',
        accelerator: 'Command+E',
        click: () => {
          mainWindow.webContents.send('export-data');
        }
      },
      {
        label: 'Import Data',
        accelerator: 'Command+I',
        click: () => {
          mainWindow.webContents.send('import-data');
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// File system operations - use shared location so Siri always works
const os = require('os');
const dataFilePath = path.join(os.homedir(), 'Documents', 'DashboardElectron', 'dashboard-data.json');

// Initialize data file if it doesn't exist
async function initializeDataFile() {
  try {
    // Ensure directory exists
    const dataDir = path.dirname(dataFilePath);
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.access(dataFilePath);
  } catch (error) {
    const defaultData = {
      tasks: {},
      quickNotes: '',
      importantFeed: [],
      quickLinks: [
        { id: 1, name: 'Gmail', url: 'https://gmail.com' },
        { id: 2, name: 'GitHub', url: 'https://github.com' }
      ],
      teamMembers: ['Harsha (Me)', 'Ujjawal', 'Arun', 'Sanskar', 'Thombre', 'Sakshi', 'Soumi', 'Ayush', 'Aditya', 'Sankalp']
    };
    await fs.writeFile(dataFilePath, JSON.stringify(defaultData, null, 2));
  }
}

// IPC handlers for file operations
ipcMain.handle('data-load', async () => {
  try {
    await initializeDataFile();
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading data:', error);
    return {
      tasks: {},
      quickNotes: '',
      importantFeed: [],
      quickLinks: [
        { id: 1, name: 'Gmail', url: 'https://gmail.com' },
        { id: 2, name: 'GitHub', url: 'https://github.com' }
      ],
      teamMembers: ['Harsha (Me)', 'Ujjawal', 'Arun', 'Sanskar', 'Thombre', 'Sakshi', 'Soumi', 'Ayush', 'Aditya', 'Sankalp']
    };
  }
});

ipcMain.handle('data-save', async (event, data) => {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
});

ipcMain.handle('data-get-file-stats', async () => {
  try {
    const stats = await fs.stat(dataFilePath);
    return {
      mtime: stats.mtime.getTime(), // Return timestamp for comparison
      size: stats.size
    };
  } catch (error) {
    console.error('Error getting file stats:', error);
    return null;
  }
});

// Handle opening system trash
ipcMain.handle('shell-open-trash', async () => {
  try {
    const { shell } = require('electron');
    if (process.platform === 'darwin') {
      shell.openPath(path.join(require('os').homedir(), '.Trash'));
    } else if (process.platform === 'win32') {
      shell.openPath('shell:RecycleBinFolder');
    } else {
      // Linux
      shell.openPath(path.join(require('os').homedir(), '.local/share/Trash'));
    }
    return true;
  } catch (error) {
    console.error('Error opening trash:', error);
    return false;
  }
});

// Handle opening applications
ipcMain.handle('shell-open-app', async (event, appName) => {
  try {
    const { shell } = require('electron');
    let success = false;
    
    if (process.platform === 'darwin') {
      // macOS - use 'open' command
      const { spawn } = require('child_process');
      const appMappings = {
        'Thunderbird': 'Thunderbird',
        'Microsoft Teams': 'Microsoft Teams',
        'Parallels Desktop': 'Parallels Desktop',
        'DBeaver Community': 'DBeaver',
        'Microsoft Remote Desktop': 'Microsoft Remote Desktop',
        'Visual Studio Code': 'Visual Studio Code',
        'ChatGPT': 'ChatGPT',
        'Claude': 'Claude',
        'WhatsApp': 'WhatsApp'
      };
      
      // Fallback options for apps that might not be installed
      const fallbackApps = {
        'Microsoft Remote Desktop': ['Microsoft Remote Desktop', 'Remote Desktop Connection', 'Jump Desktop', 'TeamViewer', 'Chrome Remote Desktop'],
        'DBeaver Community': ['DBeaver', 'DBeaver Community Edition', 'DBeaver CE']
      };
      
      const actualAppName = appMappings[appName] || appName;
      const possibleNames = fallbackApps[appName] || [actualAppName];
      
      async function tryOpenApp(appNames) {
        for (const name of appNames) {
          try {
            const process = spawn('open', ['-a', name]);
            const result = await new Promise((resolve) => {
              process.on('close', (code) => {
                resolve(code === 0);
              });
            });
            
            if (result) {
              console.log(`✅ ${appName} opened successfully as ${name}`);
              return true;
            }
          } catch (error) {
            console.log(`❌ Failed to open ${name}: ${error.message}`);
          }
        }
        return false;
      }
      
      tryOpenApp(possibleNames).then(success => {
        if (!success) {
          console.log(`❌ Failed to open ${appName} with any available name`);
        }
      });
      
      success = true;
    } else {
      // Windows/Linux - try to open by name
      success = await shell.openExternal(appName);
    }
    
    return success;
  } catch (error) {
    console.error('Error opening app:', error);
    return false;
  }
});

// Handle clipboard operations
ipcMain.handle('clipboard-read-text', async () => {
  try {
    return clipboard.readText();
  } catch (error) {
    console.error('Error reading clipboard:', error);
    return '';
  }
});

ipcMain.handle('clipboard-write-text', async (event, text) => {
  try {
    clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error writing to clipboard:', error);
    return false;
  }
});

// Siri integration handlers
ipcMain.handle('siri-register-shortcuts', async () => {
  if (process.platform !== 'darwin') {
    console.log('Siri shortcuts only available on macOS');
    return false;
  }
  
  try {
    // Register Siri shortcuts for macOS
    // This would typically use NSUserActivity and INVoiceShortcutCenter
    // For now, we'll set up the basic structure
    console.log('Registering Siri shortcuts for task management...');
    
    // Create voice shortcuts for common actions
    const shortcuts = [
      {
        phrase: 'Add task to dashboard',
        action: 'add-task',
        description: 'Add a new task to your dashboard'
      },
      {
        phrase: 'Show my tasks',
        action: 'show-tasks',
        description: 'Show current tasks'
      },
      {
        phrase: 'Complete task',
        action: 'complete-task',
        description: 'Mark a task as completed'
      }
    ];
    
    // In a real implementation, you'd use native macOS APIs here
    // For now, we'll simulate the registration
    console.log('Siri shortcuts registered:', shortcuts.map(s => s.phrase));
    return true;
  } catch (error) {
    console.error('Failed to register Siri shortcuts:', error);
    return false;
  }
});

// Handle Siri voice commands
// Touch ID Authentication - Simplified working approach
ipcMain.handle('biometric-authenticate', async (event, reason = 'Authentication required') => {
  if (process.platform !== 'darwin') {
    console.log('Touch ID only available on macOS');
    return { success: false, error: 'Touch ID not available on this platform' };
  }
  
  try {
    const { spawn } = require('child_process');
    
    console.log('Requesting Touch ID authentication...');
    
    return new Promise((resolve) => {
      // Use the compiled Objective-C binary for Touch ID authentication
      const path = require('path');
      const authBinaryPath = path.join(__dirname, 'touchid_auth');
      
      const authProcess = spawn(authBinaryPath, [reason || 'Access recent transactions'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let error = '';
      
      authProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      authProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      authProcess.on('close', (code) => {
        console.log(`Touch ID authentication process exited with code: ${code}`);
        console.log(`Output: "${output.trim()}"`);
        console.log(`Error: "${error.trim()}"`);
        
        const result = output.trim();
        
        if (code === 0) {
          if (result === 'success_touchid') {
            resolve({ success: true, method: 'touchid' });
          } else if (result === 'success_password') {
            resolve({ success: true, method: 'password' });
          } else if (result === 'cancelled') {
            resolve({ success: false, error: 'Authentication cancelled by user' });
          } else if (result === 'password_fallback') {
            resolve({ success: false, error: 'User chose password fallback' });
          } else if (result === 'not_available') {
            resolve({ success: false, error: 'Touch ID not available on this device' });
          } else if (result === 'not_enrolled') {
            resolve({ success: false, error: 'Touch ID not set up on this device' });
          } else if (result === 'timeout') {
            resolve({ success: false, error: 'Authentication timeout' });
          } else {
            resolve({ success: false, error: `Authentication failed: ${result}` });
          }
        } else {
          resolve({ success: false, error: `Authentication failed: ${error || 'Unknown error'}` });
        }
      });
      
      authProcess.on('error', (err) => {
        console.error('Touch ID spawn error:', err);
        resolve({ success: false, error: err.message });
      });
      
      // Set timeout
      setTimeout(() => {
        authProcess.kill();
        resolve({ success: false, error: 'Authentication timeout' });
      }, 35000);
    });
  } catch (error) {
    console.error('Touch ID authentication error:', error);
    return { success: false, error: `Authentication failed: ${error.message || 'Unknown error'}` };
  }
});

ipcMain.handle('siri-process-command', async (event, command) => {
  try {
    console.log('Processing Siri command:', command);
    
    // Parse the voice command
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('add task') || lowerCommand.includes('create task')) {
      // Extract task text from command
      const taskText = extractTaskFromCommand(command);
      
      // Send command to renderer process
      mainWindow.webContents.send('siri-command', {
        action: 'add-task',
        text: taskText,
        command: command
      });
      
      return { success: true, action: 'add-task', text: taskText };
    }
    
    if (lowerCommand.includes('show tasks') || lowerCommand.includes('list tasks')) {
      mainWindow.webContents.send('siri-command', {
        action: 'show-tasks',
        command: command
      });
      
      return { success: true, action: 'show-tasks' };
    }
    
    if (lowerCommand.includes('complete task') || lowerCommand.includes('finish task')) {
      const taskText = extractTaskFromCommand(command);
      
      mainWindow.webContents.send('siri-command', {
        action: 'complete-task',
        text: taskText,
        command: command
      });
      
      return { success: true, action: 'complete-task', text: taskText };
    }
    
    // Default response for unrecognized commands
    return { success: false, error: 'Command not recognized' };
    
  } catch (error) {
    console.error('Error processing Siri command:', error);
    return { success: false, error: error.message };
  }
});

// Helper function to extract task text from voice command
function extractTaskFromCommand(command) {
  const lowerCommand = command.toLowerCase();
  
  // Remove common prefixes
  let taskText = command;
  const prefixes = [
    'add task to dashboard',
    'add task to my dashboard', 
    'create task to dashboard',
    'new task to dashboard',
    'add task',
    'create task',
    'new task',
    'complete task',
    'finish task',
    'mark task',
    'add',
    'create',
    'new'
  ];
  
  for (const prefix of prefixes) {
    if (lowerCommand.startsWith(prefix)) {
      taskText = command.substring(prefix.length).trim();
      break;
    }
  }
  
  // Remove leading comma and whitespace (for "Add task to dashboard, Write email")
  taskText = taskText.replace(/^[,\s]+/, '');
  
  // Remove common suffixes
  const suffixes = [
    'to my dashboard',
    'to dashboard', 
    'to my tasks',
    'to tasks',
    'as completed',
    'as done'
  ];
  
  for (const suffix of suffixes) {
    if (taskText.toLowerCase().endsWith(suffix)) {
      taskText = taskText.substring(0, taskText.length - suffix.length).trim();
      break;
    }
  }
  
  return taskText || 'New task from Siri';
}

// HealthKit integration removed - all handlers cleaned up

// Initialize data file on startup and register Siri shortcuts
app.whenReady().then(() => {
  initializeDataFile();
  
  // Enable autostart for wallpaper mode
  const autoStart = new AutoStart('Dashboard Wallpaper');
  if (!autoStart.isEnabled()) {
    autoStart.enable();
    console.log('💻 Autostart enabled - app will launch on system boot');
  }
  
  // Register Siri shortcuts on macOS
  if (process.platform === 'darwin') {
    setTimeout(() => {
      // Give the app time to fully initialize before registering shortcuts
      console.log('Initializing Siri integration...');
    }, 2000);
  }
});