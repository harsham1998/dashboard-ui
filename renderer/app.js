
// Global variables
let appData = {
    tasks: {},
    quickNotes: '',
    importantFeed: [],
    quickLinks: [
        { id: 1, name: 'Gmail', url: 'https://gmail.com' },
        { id: 2, name: 'GitHub', url: 'https://github.com' }
    ],
    teamMembers: ['Harsha (Me)', 'Ujjawal', 'Arun', 'Sanskar', 'Thombre', 'Sakshi', 'Soumi', 'Ayush', 'Aditya', 'Sankalp']
};

let currentDate = new Date();
let todoViewDate = new Date(); // Separate date for todo navigation
let saveTimeout = null;
let currentTaskForNote = null;
let activeFilters = {};
let weatherData = {
    temp: 'Loading...',
    condition: 'Getting weather...',
    icon: '🌤️',
    location: 'Hyderabad, IN'
};

// Special events/holidays (including Indian festivals)
const specialEvents = {
    '01-01': 'New Year\'s Day 🎉',
    '01-26': 'Republic Day 🇮🇳',
    '02-14': 'Valentine\'s Day ❤️',
    '03-08': 'Holi 🎨',
    '03-21': 'Spring Equinox 🌸',
    '04-14': 'Baisakhi 🌾',
    '04-22': 'Earth Day 🌍',
    '05-01': 'Labour Day 👷',
    '06-21': 'International Yoga Day 🧘',
    '07-04': 'Independence Day 🇺🇸',
    '08-15': 'Independence Day 🇮🇳',
    '08-19': 'Raksha Bandhan 👫',
    '08-26': 'Janmashtami 🦚',
    '09-05': 'Teachers Day 👨‍🏫',
    '09-10': 'Ganesh Chaturthi 🐘',
    '10-02': 'Gandhi Jayanti 🕊️',
    '10-15': 'Dussehra ⚔️',
    '10-31': 'Halloween 🎃',
    '11-04': 'Diwali 🪔',
    '11-14': 'Children\'s Day 👶',
    '11-28': 'Thanksgiving 🦃',
    '12-25': 'Christmas Day 🎄',
    '12-31': 'New Year\'s Eve 🎆'
};

// Status colors and labels
const statusConfig = {
    programming: { label: 'Programming', color: '#3b82f6' },
    discussion: { label: 'Discussion', color: '#a855f7' },
    pretest: { label: 'PreTest', color: '#fbbf24' },
    test: { label: 'Test', color: '#f97316' },
    live: { label: 'Live', color: '#22c55e' }
};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Dashboard initializing...');
    
    // Set default motivational message first
    document.getElementById('motivation').textContent = '"Today is your opportunity to build the tomorrow you want."';
    
    updateClocks();
    updateDate();
    
    // Initialize weather display immediately
    updateWeatherDisplay();
    
    // Try to update motivational message, fallback to default if error
    try {
        updateMotivationalMessage();
    } catch (error) {
        console.log('Using default motivational message');
    }
    
    // Load data first, then render UI
    await loadDataFromStorage();
    
    renderQuickLinks();
    renderTasks();
    renderImportantFeed();
    initializeFilterModal();
    fetchWeather();
    
    // Restore timers now that flickering is fixed
    setInterval(updateClocks, 1000);
    setInterval(function() {
        try {
            updateMotivationalMessage();
        } catch (error) {
            console.log('Error updating motivational message, keeping current one');
        }
    }, 60 * 60 * 1000);
    setInterval(fetchWeather, 30 * 60 * 1000);
    
    // Auto-save disabled - only save on changes
    // setInterval(async function() {
    //     try {
    //         await saveDataToStorage();
    //     } catch (error) {
    //         console.log('Auto-save error:', error);
    //     }
    // }, 10000);
    
    // Auto-refresh data from JSON file every 3 seconds
    setInterval(async function() {
        try {
            await refreshDataFromFile();
        } catch (error) {
            console.log('Auto-refresh error:', error);
        }
    }, 3000);
    
    // Add additional event listeners for quick notes
    const quickNotesElement = document.getElementById('quick-notes');
    if (quickNotesElement) {
        // Add comprehensive paste event handling
        quickNotesElement.addEventListener('paste', (event) => {
            console.log('📋 Paste event listener triggered');
            handleQuickNotesPaste(event);
        });
        
        // Add input event listener as backup
        quickNotesElement.addEventListener('input', (event) => {
            console.log('📝 Input event listener triggered, inputType:', event.inputType);
            
            // Check if this is a paste operation
            if (event.inputType === 'insertFromPaste' || event.inputType === 'insertCompositionText') {
                console.log('📋 Paste detected via input event');
                handleQuickNotesPaste(event);
            } else {
                saveNotes();
            }
        });
        
        // Add change event listener for additional safety
        quickNotesElement.addEventListener('change', (event) => {
            console.log('🔄 Change event listener triggered');
            saveNotes();
        });
        
        // Add MutationObserver to detect value changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    console.log('📋 Mutation detected in quick notes');
                    saveNotes();
                }
            });
        });
        
        observer.observe(quickNotesElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
        
        console.log('✅ Quick notes event listeners and observer added');
    }
    
    console.log('✅ Dashboard fully initialized with JSON file storage');
});

// Clock and time functions
function updateClocks() {
    const now = new Date();
    
    // Indian Time
    const indianTime = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('indian-clock').textContent = indianTime;
    
    // US Central Time
    const usTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('us-clock').textContent = usTime;
}

function updateMotivationalMessage() {
    try {
        // Check if motivationalMessages exists and has content
        if (typeof motivationalMessages !== 'undefined' && motivationalMessages.length > 0) {
            const newMessage = motivationalMessages[getHourlyIndex(new Date())];
            document.getElementById('motivation').textContent = `"${newMessage}"`;
        } else {
            // Fallback to standard message
            document.getElementById('motivation').textContent = '"Today is your opportunity to build the tomorrow you want."';
        }
    } catch (error) {
        // Fallback to standard message if there's any error
        document.getElementById('motivation').textContent = '"Today is your opportunity to build the tomorrow you want."';
    }
}

function getHourlyIndex(date) {
    try {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hour = date.getHours();
        return (dayOfYear * 24 + hour) % motivationalMessages.length;
    } catch (error) {
        return 0;
    }
}

function updateDate() {
    // Always show current date in header
    const todayString = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('current-date').textContent = todayString;
    
    // Show todo view date in todo section
    const todoDateString = todoViewDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('todo-date').textContent = todoDateString;
    
    // Check for special events on the current date (not todo date)
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const monthDay = `${month}-${day}`;
    const specialEvent = specialEvents[monthDay];
    
    const specialEventEl = document.getElementById('special-event');
    if (specialEvent) {
        specialEventEl.textContent = specialEvent;
        specialEventEl.style.display = 'inline-block';
    } else {
        specialEventEl.textContent = 'Regular Day';
        specialEventEl.style.display = 'inline-block';
    }
}

// Weather functions
async function fetchWeather() {
    try {
        // For real weather data, get a free API key from https://openweathermap.org/api
        // Replace 'your_api_key_here' with your actual API key
        // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Hyderabad,IN&appid=your_api_key_here&units=metric`);
        
        // For demo purposes, using simulated weather data
        // Uncomment the above line and comment out the throw statement below to use real API
        throw new Error('Using demo weather data - add your API key for real weather');
        
        const data = await response.json();
        
        weatherData = {
            temp: Math.round(data.main.temp) + '°C',
            condition: data.weather[0].description.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            icon: getWeatherIcon(data.weather[0].main),
            location: data.name + ', ' + data.sys.country
        };
        
    } catch (error) {
        // Demo weather data for Hyderabad
        const hour = new Date().getHours();
        const month = new Date().getMonth();
        
        // Simulate weather based on time and season for Hyderabad
        let temp, condition, icon;
        
        if (month >= 3 && month <= 6) { // Summer (Apr-Jun)
            temp = Math.round(35 + Math.random() * 8); // 35-43°C
            condition = hour >= 6 && hour < 18 ? 'Hot & Sunny' : 'Clear Night';
            icon = hour >= 6 && hour < 18 ? '☀️' : '🌙';
        } else if (month >= 7 && month <= 9) { // Monsoon (Jul-Sep)
            temp = Math.round(25 + Math.random() * 8); // 25-33°C
            condition = Math.random() > 0.5 ? 'Rainy' : 'Cloudy';
            icon = Math.random() > 0.5 ? '🌧️' : '☁️';
        } else { // Winter (Oct-Mar)
            temp = Math.round(18 + Math.random() * 12); // 18-30°C
            condition = hour >= 6 && hour < 18 ? 'Pleasant' : 'Cool Night';
            icon = hour >= 6 && hour < 18 ? '🌤️' : '🌙';
        }
        
        weatherData = {
            temp: temp + '°C',
            condition: condition,
            icon: icon,
            location: 'Hyderabad, IN'
        };
    }
    
    updateWeatherDisplay();
}

function getWeatherIcon(condition) {
    const iconMap = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌤️'
    };
    return iconMap[condition] || '🌤️';
}

function updateWeatherDisplay() {
    const weatherIcon = document.getElementById('weather-icon');
    const temperature = document.getElementById('temperature');
    const condition = document.getElementById('condition');
    const weatherLocation = document.getElementById('weather-location');
    
    if (weatherIcon) weatherIcon.textContent = weatherData.icon;
    if (temperature) temperature.textContent = weatherData.temp;
    if (condition) condition.textContent = weatherData.condition;
    if (weatherLocation) weatherLocation.textContent = weatherData.location;
}

// Auto-save functionality for quick notes
function saveNotes() {
    const quickNotesElement = document.getElementById('quick-notes');
    if (quickNotesElement) {
        appData.quickNotes = quickNotesElement.value;
        console.log('📝 saveNotes() called, content length:', appData.quickNotes.length);
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            console.log('📝 Saving quick notes to Firebase...', appData.quickNotes.substring(0, 50) + '...');
            await saveDataToStorage();
            console.log('📝 Quick Notes saved to Firebase');
        }, 1000); // 1 second delay for quick notes
    }
}

// Handle paste events for quick notes
function handleQuickNotesPaste(event) {
    console.log('📋 Paste event detected in quick notes');
    
    // Set flag to prevent refresh interference
    isPasting = true;
    
    // Try multiple approaches to ensure paste is saved
    const saveAfterPaste = () => {
        const quickNotesElement = document.getElementById('quick-notes');
        if (quickNotesElement) {
            const newValue = quickNotesElement.value;
            appData.quickNotes = newValue;
            console.log('📋 Quick notes updated after paste:', newValue.length, 'characters');
            console.log('📋 Content preview:', newValue.substring(0, 100) + '...');
            
            // Save immediately without waiting for the timeout
            clearTimeout(saveTimeout);
            saveDataToStorage().then(() => {
                console.log('📋 Paste content saved immediately to Firebase');
                isPasting = false; // Clear flag after save
            });
        }
    };
    
    // Try multiple timeouts to catch the paste
    setTimeout(saveAfterPaste, 10);
    setTimeout(saveAfterPaste, 50);
    setTimeout(saveAfterPaste, 100);
    setTimeout(saveAfterPaste, 200);
}

function showSaveStatus(status) {
    const statusEl = document.getElementById('save-status');
    statusEl.className = 'auto-save ' + status;
    
    if (status === 'saving') {
        statusEl.textContent = 'Saving to file...';
    } else if (status === 'saved') {
        statusEl.textContent = 'Saved to file ✓';
        setTimeout(() => {
            statusEl.className = 'auto-save';
            statusEl.textContent = 'Auto-saved to JSON file';
        }, 2000);
    }
}

async function saveDataToStorage() {
    try {
        console.log('💾 Saving data to Firebase, quickNotes length:', appData.quickNotes?.length || 0);
        
        // Save data to Firebase API
        const response = await fetch('https://dashboard-app-fcd42-default-rtdb.firebaseio.com/data.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appData)
        });
        
        if (response.ok) {
            console.log('✅ Data saved to Firebase API');
        } else {
            console.error('❌ Failed to save data to Firebase:', response.status);
        }
    } catch (error) {
        console.error('❌ Unable to save data to Firebase API:', error);
    }
}

// Store last known file modification time to detect changes
let lastFileModTime = null;
let isPasting = false; // Flag to prevent refresh during paste

// Default app data structure
function getDefaultAppData() {
    return {
        tasks: {},
        quickNotes: '',
        importantFeed: [],
        quickLinks: [
            { id: 1, name: 'Gmail', url: 'https://gmail.com' },
            { id: 2, name: 'GitHub', url: 'https://github.com' }
        ],
        teamMembers: ['Harsha (Me)', 'Ujjawal', 'Arun', 'Sanskar', 'Thombre', 'Sakshi', 'Soumi', 'Ayush', 'Aditya', 'Sankalp'],
        transactions: []
    };
}

async function refreshDataFromFile() {
    try {
        // Refresh data from Firebase API
        const response = await fetch('https://dashboard-app-fcd42-default-rtdb.firebaseio.com/data.json');
        
        if (response.ok) {
            const firebaseData = await response.json();
            if (firebaseData) {
                // Check if user is typing in quick notes or pasting
                const quickNotesElement = document.getElementById('quick-notes');
                const isTypingNotes = quickNotesElement && (
                    document.activeElement === quickNotesElement ||
                    quickNotesElement.matches(':focus')
                );
                
                // Store current quick notes value if user is typing or pasting
                const currentQuickNotes = (isTypingNotes || isPasting) ? appData.quickNotes : null;
                
                // Replace in-memory data completely with Firebase data
                appData = firebaseData;
                
                // Restore quick notes if user was typing or pasting
                if ((isTypingNotes || isPasting) && currentQuickNotes !== null) {
                    appData.quickNotes = currentQuickNotes;
                }
                
                renderTasks();
                updateAllDisplays();
                console.log('🔄 Data refreshed from Firebase API' + ((isTypingNotes || isPasting) ? ' (preserving quick notes)' : ''));
            }
        }
    } catch (error) {
        // Silently fail during auto-refresh
        console.log('❌ Auto-refresh from Firebase failed:', error);
    }
}

function updateAllDisplays() {
    // Update quick notes only if user is not typing or pasting
    const notesElement = document.getElementById('quick-notes');
    if (notesElement && appData.quickNotes !== undefined) {
        // Don't overwrite if user is currently typing or pasting
        const isFocused = document.activeElement === notesElement || notesElement.matches(':focus');
        if (!isFocused && !isPasting) {
            notesElement.value = appData.quickNotes;
        }
    }
    
    // Re-render all sections
    renderTasks();
    renderQuickLinks();
    renderTransactions();
}

async function loadDataFromStorage() {
    try {
        // Load data from Firebase API instead of local JSON
        const response = await fetch('https://dashboard-app-fcd42-default-rtdb.firebaseio.com/data.json');
        
        if (response.ok) {
            const data = await response.json();
            if (data) {
                // Ensure all required properties exist
                appData = {
                    ...getDefaultAppData(),
                    ...data
                };
                updateUIFromLoadedData();
                console.log('✅ Data loaded from Firebase API');
                console.log('📋 Loaded tasks:', Object.keys(appData.tasks || {}).length, 'dates');
                console.log('💳 Loaded transactions:', (appData.transactions || []).length);
                console.log('🔗 Loaded quick links:', (appData.quickLinks || []).length);
            } else {
                console.log('ℹ️ No data found in Firebase, starting fresh');
                appData = getDefaultAppData();
            }
        } else {
            console.log('❌ Failed to load data from Firebase:', response.status);
            appData = getDefaultAppData();
        }
    } catch (error) {
        console.log('❌ Error loading data from Firebase API:', error);
        appData = getDefaultAppData();
    }
}

function updateUIFromLoadedData() {
    console.log('🔄 Updating UI from loaded data...');
    
    // Update quick notes only if user is not typing or pasting
    const quickNotesElement = document.getElementById('quick-notes');
    if (quickNotesElement) {
        // Don't overwrite if user is currently typing or pasting
        const isFocused = document.activeElement === quickNotesElement || quickNotesElement.matches(':focus');
        if (!isFocused && !isPasting) {
            quickNotesElement.value = appData.quickNotes || '';
            console.log('📝 Notes loaded');
        } else {
            console.log('📝 Notes load skipped (user typing or pasting)');
        }
    }
    
    renderQuickLinks();
    console.log('🔗 Links rendered:', (appData.quickLinks || []).length);
    
    renderTransactions();
    console.log('💳 Transactions rendered:', (appData.transactions || []).length);
    
    renderTasks();
    console.log('📋 Tasks rendered for current date');
    
    renderImportantFeed();
    console.log('⭐ Important feed rendered:', (appData.importantFeed || []).length);
    
    console.log('✅ UI update completed');
}

// Task functions
function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

function addTask() {
    const input = document.getElementById('new-task-input');
    const taskText = input.value.trim();
    if (taskText) {
        const dateKey = getDateKey(todoViewDate);
        if (!appData.tasks[dateKey]) appData.tasks[dateKey] = [];
        
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            assignee: 'Harsha (Me)',
            status: 'programming',
            note: '',
            issues: [],
            appreciation: [],
            createdAt: new Date().toISOString()
        };
        
        appData.tasks[dateKey].push(newTask);
        input.value = '';
        
        console.log('➕ Task added:', taskText);
        console.log('📅 Date key:', dateKey);
        console.log('📋 Total tasks for date:', appData.tasks[dateKey].length);
        
        renderTasks();
        saveDataToStorage();
    }
}

function toggleTask(dateKey, taskId) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            console.log('✅ Task toggled:', task.text, 'completed:', task.completed);
            renderTasks();
            saveDataToStorage();
        }
    }
}

function deleteTask(dateKey, taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        if (appData.tasks[dateKey]) {
            const taskIndex = appData.tasks[dateKey].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                const deletedTask = appData.tasks[dateKey][taskIndex];
                appData.tasks[dateKey].splice(taskIndex, 1);
                console.log('🗑️ Task deleted:', deletedTask.text);
                renderTasks();
                saveDataToStorage();
            }
        }
    }
}

function assignTask(dateKey, taskId, assignee) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            task.assignee = assignee;
            console.log('👤 Task assigned:', task.text, 'to:', assignee);
            renderTasks();
            saveDataToStorage();
        }
    }
}

function changeTaskStatus(dateKey, taskId, status) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            task.status = status;
            console.log('📊 Task status changed:', task.text, 'to:', status);
            renderTasks();
            saveDataToStorage();
        }
    }
}

function openTaskNote(dateKey, taskId) {
    console.log('📝 Opening task note for:', dateKey, taskId);
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            currentTaskForNote = { dateKey, taskId };
            document.getElementById('task-modal-title').textContent = task.text;
            document.getElementById('task-note-content').value = task.note || '';
            document.getElementById('task-status-select').value = task.status || 'programming';
            
            // Populate issues and appreciation
            renderModalFeedback(task);
            
            document.getElementById('taskNoteModal').style.display = 'block';
            console.log('✅ Task note modal opened for:', task.text);
        } else {
            console.log('❌ Task not found:', taskId);
        }
    } else {
        console.log('❌ No tasks found for date:', dateKey);
    }
}

function renderModalFeedback(task) {
    // Render issues
    const issuesList = document.getElementById('issues-list');
    issuesList.innerHTML = (task.issues || []).map((issue, index) => `
        <div class="feedback-item issue">
            <span>${issue}</span>
            <button class="feedback-remove" onclick="removeIssue(${index})">×</button>
        </div>
    `).join('');
    
    // Render appreciation
    const appreciationList = document.getElementById('appreciation-list');
    appreciationList.innerHTML = (task.appreciation || []).map((appreciation, index) => `
        <div class="feedback-item appreciation">
            <span>${appreciation}</span>
            <button class="feedback-remove" onclick="removeAppreciation(${index})">×</button>
        </div>
    `).join('');
}

function addIssue() {
    const input = document.getElementById('new-issue-input');
    const issueText = input.value.trim();
    if (issueText && currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            if (!task.issues) task.issues = [];
            task.issues.push(issueText);
            input.value = '';
            renderModalFeedback(task);
            saveDataToStorage();
            console.log('🚨 Issue added:', issueText);
        }
    }
}

function addAppreciation() {
    const input = document.getElementById('new-appreciation-input');
    const appreciationText = input.value.trim();
    if (appreciationText && currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            if (!task.appreciation) task.appreciation = [];
            task.appreciation.push(appreciationText);
            input.value = '';
            renderModalFeedback(task);
            saveDataToStorage();
            console.log('👏 Appreciation added:', appreciationText);
        }
    }
}

function removeIssue(index) {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task && task.issues) {
            task.issues.splice(index, 1);
            renderModalFeedback(task);
            saveDataToStorage();
            console.log('🗑️ Issue removed at index:', index);
        }
    }
}

function removeAppreciation(index) {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task && task.appreciation) {
            task.appreciation.splice(index, 1);
            renderModalFeedback(task);
            saveDataToStorage();
            console.log('🗑️ Appreciation removed at index:', index);
        }
    }
}

function closeTaskNoteModal() {
    document.getElementById('taskNoteModal').style.display = 'none';
    currentTaskForNote = null;
    
    // Clear inputs
    document.getElementById('new-issue-input').value = '';
    document.getElementById('new-appreciation-input').value = '';
    
    console.log('🔐 Task note modal closed');
}

function saveTaskNote() {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            task.note = document.getElementById('task-note-content').value;
            task.status = document.getElementById('task-status-select').value;
            task.noteUpdatedAt = new Date().toISOString();
            console.log('📝 Task details saved:', task.text);
            renderTasks();
            saveDataToStorage();
        }
    }
    closeTaskNoteModal();
}

// Search functionality
let searchTimeout = null;

function searchTasks() {
    // Debounce search to prevent excessive DOM updates
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch();
    }, 150);
}

function performSearch() {
    const searchTerm = document.getElementById('search-task-input').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('search-results');
    
    if (searchTerm.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = `
            <div style="padding: 12px; text-align: center; color: #64748b; font-size: 11px;">
                Type at least 2 characters to search...
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }
    
    const searchResults = [];
    
    // Search through all dates and tasks
    Object.keys(appData.tasks).forEach(dateKey => {
        appData.tasks[dateKey].forEach(task => {
            if (task.text.toLowerCase().includes(searchTerm) || 
                (task.note && task.note.toLowerCase().includes(searchTerm)) ||
                task.assignee.toLowerCase().includes(searchTerm) ||
                task.status.toLowerCase().includes(searchTerm) ||
                (task.issues && task.issues.some(issue => issue.toLowerCase().includes(searchTerm))) ||
                (task.appreciation && task.appreciation.some(app => app.toLowerCase().includes(searchTerm)))) {
                searchResults.push({
                    task: task,
                    dateKey: dateKey,
                    date: new Date(dateKey).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })
                });
            }
        });
    });
    
    if (searchResults.length === 0) {
        resultsContainer.innerHTML = `
            <div style="padding: 12px; text-align: center; color: #64748b; font-size: 11px;">
                No tasks found for "${searchTerm}"
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }
    
    // Sort results by date (newest first)
    searchResults.sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));
    
    resultsContainer.innerHTML = searchResults.map(result => `
        <div class="search-result-item" onclick="navigateToTask('${result.dateKey}', ${result.task.id})">
            <div class="search-result-task">${result.task.text}</div>
            <div class="search-result-details">
                <span>👤 ${result.task.assignee} | 📊 ${statusConfig[result.task.status]?.label || result.task.status}</span>
                <span class="search-result-date">${result.date}</span>
            </div>
            ${result.task.note ? `<div style="color: #94a3b8; font-size: 9px; margin-top: 2px; font-style: italic;">"${result.task.note.substring(0, 30)}${result.task.note.length > 30 ? '...' : ''}"</div>` : ''}
            ${(result.task.issues?.length || 0) > 0 || (result.task.appreciation?.length || 0) > 0 ? `<div style="color: #94a3b8; font-size: 8px; margin-top: 2px;">🚨 ${result.task.issues?.length || 0} issues | 👏 ${result.task.appreciation?.length || 0} appreciation</div>` : ''}
        </div>
    `).join('');
    
    resultsContainer.style.display = 'block';
}

function navigateToTask(dateKey, taskId) {
    // Navigate to the specific date in todo view
    todoViewDate = new Date(dateKey);
    updateDate();
    renderTasks();
    
    // Clear search
    document.getElementById('search-task-input').value = '';
    document.getElementById('search-results').style.display = 'none';
    
    // Highlight the task briefly
    setTimeout(() => {
        const taskElements = document.querySelectorAll('.task-item');
        taskElements.forEach(element => {
            if (element.getAttribute('ondragstart').includes(taskId)) {
                element.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
                element.style.border = '2px solid rgba(59, 130, 246, 0.5)';
                setTimeout(() => {
                    element.style.backgroundColor = '';
                    element.style.border = '';
                }, 2000);
            }
        });
    }, 100);
}

function navigateDate(direction) {
    todoViewDate.setDate(todoViewDate.getDate() + direction);
    updateDate();
    renderTasks();
}

function renderTasks() {
    const dateKey = getDateKey(todoViewDate);
    let currentTasks = appData.tasks[dateKey] || [];
    const container = document.getElementById('tasks-container');
    
    // Apply filters if any are active
    if (Object.keys(activeFilters).length > 0) {
        currentTasks = applyTaskFilters(currentTasks, dateKey);
    }
    
    console.log('📅 Rendering tasks for date:', dateKey);
    console.log('📋 Tasks for this date:', currentTasks.length);
    
    if (currentTasks.length === 0) {
        const isFiltered = Object.keys(activeFilters).length > 0;
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; color: #64748b;">
                <div style="font-size: 32px; margin-bottom: 12px;">${isFiltered ? '🔍' : '📝'}</div>
                <p>${isFiltered ? 'No tasks match your filters' : 'Add your first task above to get started!'}</p>
                ${isFiltered ? `<button onclick="clearFilters()" style="margin-top: 8px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; padding: 6px 12px; color: #3b82f6; cursor: pointer;">Clear Filters</button>` : ''}
            </div>
        `;
        document.getElementById('progress-section').style.display = 'none';
        console.log('📝 Empty state displayed');
    } else {
        container.innerHTML = currentTasks.map(task => `
            <div class="task-item" draggable="true" ondragstart="dragTask(event, '${dateKey}', ${task.id})">
                <div class="task-content">
                    <div class="task-left">
                        <div class="task-main">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                                   onchange="toggleTask('${dateKey}', ${task.id})">
                            <span class="task-text ${task.completed ? 'completed' : ''}" onclick="openTaskNote('${dateKey}', ${task.id})" title="Click to add/edit notes and feedback">${task.text}</span>
                        </div>
                        <div class="task-meta">
                            <div class="task-meta-left">
                                <select class="task-status" onchange="changeTaskStatus('${dateKey}', ${task.id}, this.value)">
                                    ${Object.keys(statusConfig).map(status => 
                                        `<option value="${status}" ${task.status === status ? 'selected' : ''}>${statusConfig[status].label}</option>`
                                    ).join('')}
                                </select>
                                <select class="task-assign" onchange="assignTask('${dateKey}', ${task.id}, this.value)">
                                    ${appData.teamMembers.map(member => 
                                        `<option value="${member}" ${task.assignee === member ? 'selected' : ''}>${member}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="task-meta-right">
                                <div class="task-counts">
                                    ${(task.issues?.length || 0) > 0 ? `<span class="count-badge issues-count">🚨 ${task.issues.length}</span>` : ''}
                                    ${(task.appreciation?.length || 0) > 0 ? `<span class="count-badge appreciation-count">👏 ${task.appreciation.length}</span>` : ''}
                                </div>
                                <button class="task-action-btn" onclick="deleteTask('${dateKey}', ${task.id})" title="Delete Task">🗑️</button>
                            </div>
                        </div>
                        ${task.note ? `<div class="task-note">"${task.note.substring(0, 60)}${task.note.length > 60 ? '...' : ''}"</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Update progress
        const completed = currentTasks.filter(t => t.completed).length;
        const total = currentTasks.length;
        const percentage = Math.round((completed / total) * 100);
        
        document.getElementById('progress-text').textContent = `Progress: ${completed}/${total}`;
        document.getElementById('progress-percent').textContent = `${percentage}%`;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-section').style.display = 'block';
        
        console.log('✅ Tasks rendered successfully:', total, 'tasks,', completed, 'completed');
    }
}

// Filter functionality
function initializeFilterModal() {
    // Populate team members in filter
    const filterPersonSelect = document.getElementById('filter-person');
    filterPersonSelect.innerHTML = `
        <option value="">All People</option>
        ${appData.teamMembers.map(member => `<option value="${member}">${member}</option>`).join('')}
    `;
}

function openFilterModal() {
    document.getElementById('filterModal').style.display = 'block';
    
    // Populate current filter values
    document.getElementById('filter-status').value = activeFilters.status || '';
    document.getElementById('filter-person').value = activeFilters.person || '';
    document.getElementById('filter-date-from').value = activeFilters.dateFrom || '';
    document.getElementById('filter-date-to').value = activeFilters.dateTo || '';
    document.getElementById('filter-feedback').value = activeFilters.feedback || '';
    document.getElementById('filter-min-issues').value = activeFilters.minIssues || '';
    
    // Fix date inputs after modal opens
    setTimeout(() => {
        const dateInputs = document.querySelectorAll('#filterModal input[type="date"]');
        dateInputs.forEach(input => {
            input.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            input.addEventListener('focus', function(e) {
                e.stopPropagation();
            });
            
            input.addEventListener('change', function(e) {
                e.stopPropagation();
            });
        });
    }, 100);
}

function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

function applyFilters() {
    activeFilters = {
        status: document.getElementById('filter-status').value,
        person: document.getElementById('filter-person').value,
        dateFrom: document.getElementById('filter-date-from').value,
        dateTo: document.getElementById('filter-date-to').value,
        feedback: document.getElementById('filter-feedback').value,
        minIssues: parseInt(document.getElementById('filter-min-issues').value) || 0
    };
    
    // Remove empty filters
    Object.keys(activeFilters).forEach(key => {
        if (!activeFilters[key] && activeFilters[key] !== 0) {
            delete activeFilters[key];
        }
    });
    
    // Update filter button appearance
    const filterBtn = document.getElementById('filter-btn');
    if (Object.keys(activeFilters).length > 0) {
        filterBtn.classList.add('active');
        filterBtn.innerHTML = '<span>🔍</span>Filter (' + Object.keys(activeFilters).length + ')';
    } else {
        filterBtn.classList.remove('active');
        filterBtn.innerHTML = '<span>🔍</span>Filter';
    }
    
    renderTasks();
    closeFilterModal();
    console.log('🔍 Filters applied:', activeFilters);
}

function clearFilters() {
    activeFilters = {};
    
    // Reset form
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-person').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    document.getElementById('filter-feedback').value = '';
    document.getElementById('filter-min-issues').value = '';
    
    // Update filter button
    const filterBtn = document.getElementById('filter-btn');
    filterBtn.classList.remove('active');
    filterBtn.innerHTML = '<span>🔍</span>Filter';
    
    renderTasks();
    console.log('🔍 Filters cleared');
}

function applyTaskFilters(tasks, currentDateKey) {
    let filteredTasks = [];
    
    // If we have date range filters, search across all dates
    if (activeFilters.dateFrom || activeFilters.dateTo) {
        Object.keys(appData.tasks).forEach(dateKey => {
            const taskDate = new Date(dateKey);
            let includeDate = true;
            
            if (activeFilters.dateFrom) {
                const fromDate = new Date(activeFilters.dateFrom);
                if (taskDate < fromDate) includeDate = false;
            }
            
            if (activeFilters.dateTo) {
                const toDate = new Date(activeFilters.dateTo);
                if (taskDate > toDate) includeDate = false;
            }
            
            if (includeDate) {
                filteredTasks = filteredTasks.concat(appData.tasks[dateKey] || []);
            }
        });
    } else {
        // Only show tasks from current date
        filteredTasks = tasks;
    }
    
    // Apply other filters
    return filteredTasks.filter(task => {
        // Status filter
        if (activeFilters.status && task.status !== activeFilters.status) {
            return false;
        }
        
        // Person filter
        if (activeFilters.person && task.assignee !== activeFilters.person) {
            return false;
        }
        
        // Feedback type filter
        if (activeFilters.feedback) {
            if (activeFilters.feedback === 'issues' && (!task.issues || task.issues.length === 0)) {
                return false;
            }
            if (activeFilters.feedback === 'appreciation' && (!task.appreciation || task.appreciation.length === 0)) {
                return false;
            }
        }
        
        // Minimum issues filter
        if (activeFilters.minIssues > 0) {
            const issueCount = task.issues?.length || 0;
            if (issueCount < activeFilters.minIssues) {
                return false;
            }
        }
        
        return true;
    });
}

// Quick Links functions
function renderQuickLinks() {
    const container = document.getElementById('quick-links-list');
    container.innerHTML = appData.quickLinks.map(link => `
        <div class="quick-link" onclick="openInChrome('${link.url}')">
            <div class="link-content">
                <span class="link-icon">🔗</span>
                <span>${link.name}</span>
            </div>
            <button class="delete-link" onclick="event.stopPropagation(); deleteQuickLink(${link.id})">×</button>
        </div>
    `).join('');
}

function openInChrome(url) {
    try {
        // In Electron, use shell API to open external links
        if (window.electronAPI && window.electronAPI.shell) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            // Fallback for web environments
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    } catch (error) {
        console.log('Error opening link:', error);
        // Last resort fallback
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

// Recent Transactions functions
function renderTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    const transactions = (appData.transactions || []).slice(0, 5);
    
    if (transactions.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">No transactions yet</div>';
        return;
    }
    
    container.innerHTML = transactions.map(transaction => {
        const timeAgo = getTimeAgo(transaction.timestamp);
        const sign = transaction.type === 'credited' ? '+' : '-';
        const amountDisplay = `${sign}₹${transaction.amount.toLocaleString()}`;
        
        return `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-main">
                    <div class="transaction-amount ${transaction.type}">${amountDisplay}</div>
                    <div class="transaction-details">
                        <span>${transaction.description}</span>
                        <span class="transaction-mode">${transaction.mode}</span>
                        <span>${transaction.bank}</span>
                    </div>
                </div>
                <div class="transaction-time">${timeAgo}</div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return time.toLocaleDateString();
}

function addQuickLink() {
    document.getElementById('linkModal').style.display = 'block';
    // Focus the URL input and enable paste
    setTimeout(() => {
        const urlInput = document.getElementById('link-url');
        urlInput.focus();
        urlInput.select();
    }, 100);
}

function closeLinkModal() {
    document.getElementById('linkModal').style.display = 'none';
    document.getElementById('link-name').value = '';
    document.getElementById('link-url').value = '';
}

function saveLinkModal() {
    const name = document.getElementById('link-name').value.trim();
    const url = document.getElementById('link-url').value.trim();
    
    if (name && url) {
        appData.quickLinks.push({
            id: Date.now(),
            name: name,
            url: url.startsWith('http') ? url : 'https://' + url
        });
        renderQuickLinks();
        saveDataToStorage();
        closeLinkModal();
    }
}


function deleteQuickLink(linkId) {
    if (confirm('Are you sure you want to delete this link?')) {
        appData.quickLinks = appData.quickLinks.filter(l => l.id !== linkId);
        renderQuickLinks();
        saveDataToStorage();
    }
}

// Important Feed functions
function renderImportantFeed() {
    const container = document.getElementById('important-list');
    const emptyState = document.getElementById('feed-empty');
    
    if (appData.importantFeed.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        container.innerHTML = appData.importantFeed.map((item, index) => `
            <div class="important-item">
                <span class="important-task-text" onclick="navigateToImportantTask('${item.originalTaskId}', '${item.originalDate}')" title="Click to go to original task">${item.text}</span>
                <button class="important-remove" onclick="removeImportant(${index})">×</button>
            </div>
        `).join('');
    }
}

function removeImportant(index) {
    appData.importantFeed.splice(index, 1);
    renderImportantFeed();
    saveDataToStorage();
}

function navigateToImportantTask(originalTaskId, originalDate) {
    if (originalDate && originalTaskId) {
        // Navigate to the original date in todo view
        todoViewDate = new Date(originalDate);
        updateDate();
        renderTasks();
        
        // Highlight the original task briefly
        setTimeout(() => {
            const taskElements = document.querySelectorAll('.task-item');
            taskElements.forEach(element => {
                if (element.getAttribute('ondragstart').includes(originalTaskId)) {
                    element.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
                    element.style.border = '2px solid rgba(251, 191, 36, 0.6)';
                    setTimeout(() => {
                        element.style.backgroundColor = '';
                        element.style.border = '';
                    }, 3000);
                }
            });
        }, 100);
        
        console.log('📍 Navigated to important task:', originalTaskId, 'on date:', originalDate);
    }
}

// Drag and Drop for Important Feed
function dragTask(event, dateKey, taskId) {
    const task = appData.tasks[dateKey].find(t => t.id === taskId);
    if (task) {
        event.dataTransfer.setData('application/json', JSON.stringify({
            type: 'task',
            task: task,
            dateKey: dateKey
        }));
    }
}

function allowDrop(event) {
    event.preventDefault();
}

function dragEnter(event) {
    event.preventDefault();
    document.getElementById('important-feed').classList.add('drag-over');
}

function dragLeave(event) {
    event.preventDefault();
    document.getElementById('important-feed').classList.remove('drag-over');
}

function dropToImportant(event) {
    event.preventDefault();
    document.getElementById('important-feed').classList.remove('drag-over');
    
    try {
        const data = JSON.parse(event.dataTransfer.getData('application/json'));
        if (data.type === 'task' && data.task) {
            const duplicateText = `${data.task.text} (${data.task.assignee})`;
            if (!appData.importantFeed.some(item => item.originalTaskId === data.task.id && item.originalDate === data.dateKey)) {
                appData.importantFeed.push({
                    id: Date.now(),
                    text: duplicateText,
                    originalTaskId: data.task.id,
                    originalDate: data.dateKey,
                    addedDate: new Date().toISOString()
                });
                renderImportantFeed();
                saveDataToStorage();
                console.log('⭐ Task added to Important Feed:', data.task.text);
            } else {
                console.log('ℹ️ Task already exists in Important Feed');
            }
        }
    } catch (error) {
        console.log('Drop error:', error);
    }
}

// System Trash function
async function openSystemTrash() {
    try {
        if (window.electronAPI?.shell?.openTrash) {
            const success = await window.electronAPI.shell.openTrash();
            if (success) {
                console.log('✅ System trash opened successfully');
            } else {
                console.log('❌ Failed to open system trash');
                // Fallback to instructions modal
                document.getElementById('trashInstructionsModal').style.display = 'block';
            }
        } else {
            // Fallback to instructions modal for browser mode
            document.getElementById('trashInstructionsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error opening system trash:', error);
        // Fallback to instructions modal
        document.getElementById('trashInstructionsModal').style.display = 'block';
    }
}

function closeTrashInstructionsModal() {
    document.getElementById('trashInstructionsModal').style.display = 'none';
}

// App launcher function
async function openApp(appName) {
    try {
        if (window.electronAPI?.shell?.openApp) {
            const success = await window.electronAPI.shell.openApp(appName);
            if (success) {
                console.log(`✅ ${appName} opened successfully`);
            } else {
                console.log(`❌ Failed to open ${appName}`);
            }
        } else {
            console.log(`🌐 Cannot open ${appName} in browser mode`);
        }
    } catch (error) {
        console.error(`Error opening ${appName}:`, error);
    }
}

// Data export/import with localStorage
function exportData() {
    const data = {
        ...appData,
        exportDate: new Date().toISOString(),
        exportedFrom: 'Desktop Dashboard'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    setTimeout(() => {
        alert('📁 Data exported successfully!\n\nThe file has been downloaded to your Downloads folder.');
    }, 500);
}

function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (data.tasks || data.quickNotes || data.importantFeed || data.quickLinks) {
                    if (confirm('This will replace all your current data. Are you sure you want to import?')) {
                        appData = { ...appData, ...data };
                        updateUIFromLoadedData();
                        saveDataToStorage();
                        alert('✅ Data imported successfully!');
                    }
                } else {
                    alert('❌ Invalid data format - this doesn\'t appear to be a dashboard backup file');
                }
            } catch (error) {
                alert('❌ Error importing data - invalid JSON file');
            }
        };
        reader.readAsText(file);
    }
    
    // Reset file input
    event.target.value = '';
}

// Close modals and search when clicking outside
window.onclick = function(event) {
    const modals = ['linkModal', 'taskNoteModal', 'filterModal', 'trashInstructionsModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close search results when clicking outside
    const searchResults = document.getElementById('search-results');
    const searchInput = document.getElementById('search-task-input');
    if (searchResults && !searchResults.contains(event.target) && event.target !== searchInput) {
        searchResults.style.display = 'none';
    }
}

// Prevent date input events from bubbling up and closing modals
document.addEventListener('click', function(event) {
    // If clicking on a date input or its calendar picker, don't close modal
    if (event.target.type === 'date' || 
        event.target.classList.contains('date-input') ||
        event.target.closest('.date-input')) {
        event.stopPropagation();
    }
});

// Prevent date input change events from closing modal
document.addEventListener('change', function(event) {
    if (event.target.type === 'date' || event.target.classList.contains('date-input')) {
        event.stopPropagation();
    }
});

// Fix for date picker interference with modals
document.addEventListener('DOMContentLoaded', function() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        input.addEventListener('focus', function(e) {
            e.stopPropagation();
        });
        
        input.addEventListener('blur', function(e) {
            e.stopPropagation();
        });
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Close any open modals
        const modals = ['linkModal', 'taskNoteModal', 'filterModal', 'trashInstructionsModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
        
        // Close search results
        const searchResults = document.getElementById('search-results');
        const searchInput = document.getElementById('search-task-input');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Clear filters if active
        if (Object.keys(activeFilters).length > 0) {
            clearFilters();
        }
    }
    
    // Ctrl/Cmd + Enter to add task
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        const taskInput = document.getElementById('new-task-input');
        if (document.activeElement === taskInput) {
            addTask();
        }
    }
    
    // Ctrl/Cmd + F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        document.getElementById('search-task-input').focus();
    }
    
    // Ctrl/Cmd + Shift + F to open filter
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        openFilterModal();
    }
});

// Add keyboard shortcuts for modal inputs
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        // Task note modal shortcuts
        if (document.getElementById('taskNoteModal').style.display === 'block') {
            if (event.target.id === 'new-issue-input') {
                addIssue();
            } else if (event.target.id === 'new-appreciation-input') {
                addAppreciation();
            }
        }
        
        // Link modal shortcut
        if (document.getElementById('linkModal').style.display === 'block') {
            if (event.target.id === 'link-url' || event.target.id === 'link-name') {
                saveLinkModal();
            }
        }
    }
});


console.log('📱 Enhanced Dashboard Script Loaded Successfully');
console.log('💾 Storage: JSON file (persists after system shutdown)');
console.log('🔧 New Features: Task status, Issues/Appreciation tracking, Advanced filtering');
console.log('⌨️ Keyboard shortcuts: Esc (clear), Ctrl+Enter (add task), Ctrl+F (search), Ctrl+Shift+F (filter)');

// Dashboard Application Logic for Electron
class DashboardApp {
    constructor() {
        this.init();
    }

    init() {
        console.log('Dashboard initializing...');
        this.checkElectronAPI();
        this.setupSystemIntegrations();
    }

    checkElectronAPI() {
        if (window.electronAPI) {
            console.log('Electron API available');
            this.showSystemStatus('Electron API Ready', 'ready');
        } else {
            console.log('Running in browser mode');
            this.showSystemStatus('Browser Mode', 'browser');
        }
    }

    setupSystemIntegrations() {
        if (!window.electronAPI) return;
        
        // Setup Siri integration
        if (window.electronAPI.siri) {
            console.log('🎤 Setting up Siri integration...');
            
            // Register Siri shortcuts
            window.electronAPI.siri.registerShortcuts()
                .then(success => {
                    if (success) {
                        console.log('✅ Siri shortcuts registered successfully');
                        this.showSystemStatus('Siri Ready', 'ready');
                        this.showSiriSetupInstructions();
                    } else {
                        console.log('❌ Failed to register Siri shortcuts');
                        this.showSystemStatus('Siri Unavailable', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error registering Siri shortcuts:', error);
                    this.showSystemStatus('Siri Error', 'error');
                });
            
            // Listen for Siri commands
            window.electronAPI.siri.onCommand((event, data) => {
                console.log('🎤 Siri command received:', data);
                this.handleSiriCommand(data);
            });
        }
        
        // HealthKit integration removed
    }
    
    showSiriSetupInstructions() {
        // Check if instructions have been shown before
        const hasShownInstructions = localStorage.getItem('siri-setup-shown');
        if (hasShownInstructions) return;
        
        setTimeout(() => {
            const instructionModal = document.createElement('div');
            instructionModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            `;
            
            instructionModal.innerHTML = `
                <div style="
                    background: rgba(15, 23, 42, 0.95);
                    border: 1px solid rgba(71, 85, 105, 0.3);
                    border-radius: 16px;
                    padding: 32px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    color: #e2e8f0;
                ">
                    <h2 style="color: #f1f5f9; margin-bottom: 20px; font-size: 24px;">🎤 Set up Siri Integration</h2>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #3b82f6; margin-bottom: 12px;">Step 1: Create Siri Shortcuts</h3>
                        <ol style="margin-left: 20px; line-height: 1.6;">
                            <li>Open the <strong>Shortcuts</strong> app on your Mac</li>
                            <li>Click the <strong>+</strong> button to create a new shortcut</li>
                            <li>Search for and add the <strong>"Open URL"</strong> action</li>
                            <li>Set the URL to: <code style="background: rgba(71, 85, 105, 0.3); padding: 2px 6px; border-radius: 4px;">dashboard-electron://add-task?text={{Ask for Input}}</code></li>
                            <li>Name your shortcut: <strong>"Add Task to Dashboard"</strong></li>
                            <li>Click <strong>"Add to Siri"</strong> and set the phrase: <strong>"Add task to dashboard"</strong></li>
                        </ol>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #22c55e; margin-bottom: 12px;">Step 2: Test the Integration</h3>
                        <p style="margin-bottom: 8px;">Once set up, you can say:</p>
                        <ul style="margin-left: 20px; line-height: 1.6;">
                            <li><strong>"Hey Siri, add task to dashboard"</strong> - then speak your task</li>
                            <li>The app will open and add your task automatically</li>
                        </ul>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <h3 style="color: #fbbf24; margin-bottom: 12px;">Additional URLs:</h3>
                        <ul style="margin-left: 20px; line-height: 1.6; font-size: 14px;">
                            <li>Show tasks: <code style="background: rgba(71, 85, 105, 0.3); padding: 2px 6px; border-radius: 4px;">dashboard-electron://show-tasks</code></li>
                            <li>Complete task: <code style="background: rgba(71, 85, 105, 0.3); padding: 2px 6px; border-radius: 4px;">dashboard-electron://complete-task?text={{Ask for Input}}</code></li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center;">
                        <button onclick="this.parentElement.parentElement.parentElement.remove(); localStorage.setItem('siri-setup-shown', 'true');" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 16px;
                            cursor: pointer;
                            margin-right: 12px;
                        ">Got it!</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove();" style="
                            background: rgba(71, 85, 105, 0.4);
                            color: #e2e8f0;
                            border: 1px solid rgba(71, 85, 105, 0.4);
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 16px;
                            cursor: pointer;
                        ">Remind me later</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(instructionModal);
        }, 3000);
    }

    handleSiriCommand(data) {
        console.log('🎤 Received Siri command data:', data);
        
        const { action, text, command } = data;
        
        console.log('🎤 Processing Siri command:');
        console.log('  - Action:', action);
        console.log('  - Text:', text);
        console.log('  - Command:', command);
        
        // Handle different action formats
        let normalizedAction = action;
        if (action === 'add-task' || action === 'addTask') {
            normalizedAction = 'add-task';
        } else if (action === 'show-tasks' || action === 'showTasks') {
            normalizedAction = 'show-tasks';
        } else if (action === 'complete-task' || action === 'completeTask') {
            normalizedAction = 'complete-task';
        }
        
        console.log('🎤 Normalized action:', normalizedAction);
        
        switch (normalizedAction) {
            case 'add-task':
                console.log('✅ Executing add-task with text:', text);
                this.addTaskFromSiri(text);
                this.showSiriNotification(`Added task: "${text || 'New task'}"`);
                break;
            
            case 'show-tasks':
                console.log('✅ Executing show-tasks');
                this.showTasksFromSiri();
                this.showSiriNotification('Showing your tasks');
                break;
            
            case 'complete-task':
                console.log('✅ Executing complete-task with text:', text);
                this.completeTaskFromSiri(text);
                this.showSiriNotification(`Completed task: "${text}"`);
                break;
            
            default:
                console.log('❌ Unknown Siri command:', normalizedAction);
                console.log('Available actions: add-task, show-tasks, complete-task');
                this.showSiriNotification(`Sorry, I didn't understand the command: "${normalizedAction}"`);
        }
    }

    async addTaskFromSiri(taskText) {
        if (!taskText || taskText.trim() === '') {
            taskText = 'New task from Siri';
        }
        
        console.log('🔍 Looking for input element...');
        const input = document.getElementById('new-task-input');
        console.log('🔍 Input element found:', !!input);
        
        if (input) {
            console.log('✏️ Setting input value to:', taskText);
            input.value = taskText;
            
            console.log('📝 Calling addTask function...');
            try {
                addTask(); // Call the existing addTask function
                console.log('✅ addTask function completed');
            } catch (error) {
                console.error('❌ Error calling addTask:', error);
            }
            
            input.value = ''; // Clear input after adding
            this.showNotification(`Task added via Siri: "${taskText}"`);
        } else {
            console.error('❌ Could not find new-task-input element');
            // Try to add task directly
            this.addTaskDirectly(taskText);
        }
        
        console.log('✅ Task added from Siri:', taskText);
    }
    
    addTaskDirectly(taskText) {
        console.log('🚀 Adding task directly:', taskText);
        const today = new Date().toISOString().split('T')[0];
        
        if (!appData.tasks[today]) {
            appData.tasks[today] = [];
        }
        
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            status: 'pending',
            assignedTo: 'Harsha (Me)',
            note: '',
            issues: [],
            appreciation: [],
            timestamp: new Date().toISOString()
        };
        
        appData.tasks[today].push(newTask);
        
        // Save and re-render
        saveDataToStorage();
        renderTasks();
        
        console.log('✅ Task added directly to data:', newTask);
    }
    
    showTasksFromSiri() {
        // Focus on the dashboard and scroll to tasks
        const tasksContainer = document.getElementById('tasks-container');
        if (tasksContainer) {
            tasksContainer.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Highlight tasks briefly
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach(item => {
            item.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            setTimeout(() => {
                item.style.backgroundColor = '';
            }, 2000);
        });
        
        console.log('📋 Showing tasks from Siri');
    }
    
    completeTaskFromSiri(taskText) {
        // Find and complete task by text
        const taskItems = document.querySelectorAll('.task-item');
        let foundTask = false;
        
        taskItems.forEach(item => {
            const textElement = item.querySelector('.task-text');
            if (textElement && textElement.textContent.toLowerCase().includes(taskText.toLowerCase())) {
                const checkbox = item.querySelector('.task-checkbox');
                if (checkbox && !checkbox.classList.contains('checked')) {
                    checkbox.click(); // Use existing click handler
                    foundTask = true;
                }
            }
        });
        
        if (!foundTask) {
            console.log('Task not found:', taskText);
            this.showSiriNotification(`Task "${taskText}" not found`);
        } else {
            console.log('✅ Task completed from Siri:', taskText);
        }
    }
    
    showSiriNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(59, 130, 246, 0.3);
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
        `;
        notification.innerHTML = `🎤 ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
        // Also use system notification if available
        if (window.electronAPI && window.electronAPI.notifications) {
            window.electronAPI.notifications.show('Siri Command', message);
        }
        
        console.log('🎤 Siri notification:', message);
    }

    // HealthKit methods removed

    showNotification(message, type = 'info') {
        if (window.electronAPI?.notifications) {
            window.electronAPI.notifications.show('Dashboard', message);
        }
        
        // Also show in-app notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showSystemStatus(message, status) {
        const statusEl = document.querySelector('.system-integration');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `system-integration ${status}`;
        }
    }
}

// Initialize the Electron app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.electronApp = new DashboardApp();
    
    // Enable paste functionality for all text inputs and textareas
    const addPasteSupport = (element) => {
        if (!element) return;
        
        // Handle keyboard paste (Cmd+V / Ctrl+V)
        element.addEventListener('keydown', async (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                e.preventDefault();
                try {
                    const clipboardText = await window.electronAPI.clipboard.readText();
                    // For textareas, insert at cursor position
                    if (element.tagName === 'TEXTAREA') {
                        const start = element.selectionStart;
                        const end = element.selectionEnd;
                        const text = element.value;
                        element.value = text.substring(0, start) + clipboardText + text.substring(end);
                        element.selectionStart = element.selectionEnd = start + clipboardText.length;
                    } else {
                        element.value = clipboardText;
                    }
                    element.focus();
                } catch (error) {
                    console.error('Failed to read clipboard:', error);
                }
            }
        });
        
        // Handle context menu paste
        element.addEventListener('paste', async (e) => {
            e.preventDefault();
            try {
                const clipboardText = await window.electronAPI.clipboard.readText();
                // For textareas, insert at cursor position
                if (element.tagName === 'TEXTAREA') {
                    const start = element.selectionStart;
                    const end = element.selectionEnd;
                    const text = element.value;
                    element.value = text.substring(0, start) + clipboardText + text.substring(end);
                    element.selectionStart = element.selectionEnd = start + clipboardText.length;
                } else {
                    element.value = clipboardText;
                }
                element.focus();
            } catch (error) {
                console.error('Failed to read clipboard:', error);
            }
        });
    };
    
    // Add paste support to existing inputs
    const inputSelectors = [
        '#link-name',
        '#link-url', 
        '#quick-notes',
        '#task-note-content',
        '#new-issue-input',
        '#new-appreciation-input',
        '#filter-min-issues',
        'input[type="text"]',
        'textarea'
    ];
    
    inputSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(addPasteSupport);
    });
    
    // Also add paste support to dynamically created inputs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Check if the node itself is an input/textarea
                    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                        addPasteSupport(node);
                    }
                    // Check for input/textarea children
                    const inputs = node.querySelectorAll && node.querySelectorAll('input, textarea');
                    if (inputs) {
                        inputs.forEach(addPasteSupport);
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
});

// Handle window controls
if (window.electronAPI?.window) {
    window.minimizeWindow = () => window.electronAPI.window.minimize();
    window.maximizeWindow = () => window.electronAPI.window.maximize();
    window.closeWindow = () => window.electronAPI.window.close();
}