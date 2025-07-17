# Dashboard UI - Electron App

An Electron-based dashboard application with Firebase integration for task management, quick notes, and productivity tracking.

## 🚀 Features

- **Task Management**: Create, assign, and track tasks with status updates
- **Quick Notes**: Real-time note-taking with Firebase sync
- **Important Feed**: Drag-and-drop task prioritization
- **Quick Links**: Customizable bookmark management
- **Team Management**: Multi-user task assignment
- **Search & Filter**: Advanced task filtering and search
- **Siri Integration**: Voice commands for task creation
- **Real-time Sync**: Firebase-powered data synchronization
- **Responsive UI**: Modern, clean interface

## 🏗️ Architecture

- **Frontend**: Electron + HTML/CSS/JavaScript
- **Backend**: Firebase Realtime Database
- **API**: Flask API (separate repository)
- **Integration**: Siri Shortcuts for voice commands

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/harsham1998/dashboard-ui.git
   cd dashboard-ui
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
dashboard-ui/
├── main.js              # Electron main process
├── preload.js           # Preload script for IPC
├── renderer/            # Renderer process files
│   ├── index.html       # Main UI
│   ├── app.js           # Application logic
│   └── styles.css       # Styling
├── assets/              # Static assets
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🔥 Firebase Integration

The app connects to Firebase Realtime Database:
- **Database URL**: `https://dashboard-app-fcd42-default-rtdb.firebaseio.com`
- **Endpoint**: `/data.json`

### Data Structure:
```json
{
  "tasks": {
    "2025-07-17": [
      {
        "id": 1752739988034,
        "text": "Task description",
        "completed": false,
        "assignee": "Harsha (Me)",
        "status": "pending",
        "note": "",
        "issues": [],
        "appreciation": []
      }
    ]
  },
  "quickNotes": "Your notes here...",
  "quickLinks": [
    {
      "id": 1,
      "name": "Gmail",
      "url": "https://gmail.com"
    }
  ],
  "importantFeed": [],
  "teamMembers": ["Harsha (Me)", "Ujjawal", "Arun"],
  "transactions": []
}
```

## 📱 Siri Integration

The app supports Siri Shortcuts for voice commands:

### Setup:
1. Create Siri Shortcuts on iPhone
2. Add Web Request action
3. Use these endpoints:
   - **Add Task**: `https://dashboard-flask-api.onrender.com/siri/add-task?text=[Spoken Text]`
   - **Add Transaction**: `https://dashboard-flask-api.onrender.com/siri/addTransaction?message=[SMS Content]`

## 🎯 Key Features

### Task Management
- ✅ Create tasks with assignees and status
- ✅ Mark tasks as complete/incomplete
- ✅ Add notes, issues, and appreciation
- ✅ Filter by status, assignee, date range
- ✅ Search across all task fields

### Quick Notes
- ✅ Real-time auto-save (1 second delay)
- ✅ Smart refresh (preserves typing)
- ✅ Firebase synchronization
- ✅ Copy-paste support

### Important Feed
- ✅ Drag-and-drop task prioritization
- ✅ Visual task highlighting
- ✅ Automatic Firebase sync

### Quick Links
- ✅ Add/remove bookmark links
- ✅ Chrome integration
- ✅ Persistent storage

## 🛠️ Development

### Scripts:
- `npm start` - Start the Electron app
- `npm run build` - Build the app for distribution
- `npm run dev` - Development mode with hot reload

### Key Files:
- **main.js**: Electron main process, window management
- **preload.js**: Secure IPC bridge between main and renderer
- **renderer/app.js**: Core application logic and Firebase integration
- **renderer/index.html**: Main UI structure
- **renderer/styles.css**: Application styling

## 🔄 Data Flow

1. **User Interaction** → UI updates local state
2. **Auto-save** → Firebase API call (1 second delay)
3. **Auto-refresh** → Pulls latest data every 3 seconds
4. **Smart Sync** → Preserves user input during typing/pasting

## 🎨 UI Components

- **Task Cards**: Interactive task display with actions
- **Modal Dialogs**: Task editing, filters, settings
- **Drag & Drop**: Task prioritization interface
- **Search Bar**: Real-time task filtering
- **Status Indicators**: Visual task status representation

## 🚀 Deployment

The app is designed to work with:
- **API Backend**: [dashboard-flask-api](https://github.com/harsham1998/dashboard-flask-api)
- **Firebase**: Real-time database for data persistence
- **Siri Shortcuts**: Voice command integration

## 📊 Performance

- **Auto-save**: 1 second delay for responsiveness
- **Auto-refresh**: 3 second interval for real-time updates
- **Smart refresh**: Preserves user input during active typing
- **Conflict resolution**: Prevents data loss during simultaneous edits

## 🔐 Security

- **Firebase Rules**: Configured for public read/write access
- **No local storage**: All data stored in Firebase
- **Secure IPC**: Preload script for safe communication

## 🐛 Troubleshooting

### Common Issues:
1. **Tasks not saving**: Check Firebase connection and console logs
2. **Siri not working**: Verify API endpoint URLs
3. **Copy-paste issues**: Check browser console for event logs
4. **Sync problems**: Verify Firebase database rules

### Debug Mode:
Open Developer Tools (F12) to see detailed console logs for:
- Firebase operations
- Auto-save events
- Paste detection
- Error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Projects

- [Dashboard Flask API](https://github.com/harsham1998/dashboard-flask-api) - Backend API
- [Firebase Console](https://console.firebase.google.com/project/dashboard-app-fcd42) - Database management

---

**Built with ❤️ using Electron, Firebase, and modern web technologies**