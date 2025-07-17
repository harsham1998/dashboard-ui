#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Path to the built app's data file
const BUILT_APP_DATA_PATH = path.join(
  os.homedir(), 
  'Applications', 
  'Dashboard Wallpaper.app', 
  'Contents', 
  'Resources', 
  'dashboard-electron', 
  'dashboard-data.json'
);

async function addTaskToBuiltApp(taskText) {
  try {
    console.log('📂 Reading built app data from:', BUILT_APP_DATA_PATH);
    
    // Read existing data
    let appData;
    try {
      const dataContent = await fs.readFile(BUILT_APP_DATA_PATH, 'utf8');
      appData = JSON.parse(dataContent);
    } catch (error) {
      console.log('📝 Creating new data file...');
      appData = {
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
    
    // Get today's date in the app's format
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Adding task for date:', today);
    
    // Initialize today's tasks if needed
    if (!appData.tasks[today]) {
      appData.tasks[today] = [];
    }
    
    // Clean up the task text
    const cleanTaskText = (taskText || 'New task from Siri').trim();
    
    // Create new task with all required fields
    const newTask = {
      id: Date.now(),
      text: cleanTaskText,
      completed: false,
      status: 'pending',
      assignedTo: 'Harsha (Me)',
      note: '',
      issues: [],
      appreciation: [],
      timestamp: new Date().toISOString()
    };
    
    // Add task to today's list
    appData.tasks[today].push(newTask);
    
    console.log('📝 Task details:');
    console.log('   Text:', cleanTaskText);
    console.log('   Date:', today);
    console.log('   Status: pending');
    console.log('   Assigned to: Harsha (Me)');
    
    // Save back to file
    await fs.writeFile(BUILT_APP_DATA_PATH, JSON.stringify(appData, null, 2));
    
    console.log('✅ Task added successfully:', taskText);
    console.log('🎯 Task ID:', newTask.id);
    
    // Try to refresh the running app by sending a signal
    try {
      const { exec } = require('child_process');
      // Send a refresh signal to the app if it's running
      exec('osascript -e \'tell application "Dashboard Wallpaper" to reopen\'', (error) => {
        if (!error) {
          console.log('🔄 App refreshed');
        }
      });
    } catch (error) {
      // Ignore refresh errors
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error adding task:', error.message);
    return false;
  }
}

// If called directly from command line
if (require.main === module) {
  const taskText = process.argv[2];
  if (!taskText) {
    console.error('❌ Usage: node update-built-app-data.js "Task text here"');
    process.exit(1);
  }
  
  addTaskToBuiltApp(taskText).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { addTaskToBuiltApp, BUILT_APP_DATA_PATH };