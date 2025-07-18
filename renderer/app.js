
// Firebase database URL
const FIREBASE_URL = 'https://dashboard-app-fcd42-default-rtdb.firebaseio.com';

// Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('dashboardUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showDashboard();
            // Load user data after showing dashboard
            await this.loadUserData();
        } else {
            this.showAuthOverlay();
        }
    }

    async loadUserData() {
        try {
            await loadDataFromStorage();
            
            // Ensure appData has the required structure
            if (!appData || typeof appData !== 'object') {
                appData = getDefaultAppData();
            }
            
            // Ensure all required properties exist
            if (!appData.tasks) appData.tasks = {};
            if (!appData.quickLinks) appData.quickLinks = [];
            if (!appData.creditCards) appData.creditCards = [];
            if (!appData.transactions) appData.transactions = [];
            if (!appData.importantFeed) appData.importantFeed = [];
            if (!appData.quickNotes) appData.quickNotes = '';
            
            await initializeUI();
        } catch (error) {
            console.error('Error loading user data:', error);
            // Ensure appData is initialized even if loading fails
            appData = getDefaultAppData();
        }
    }

    showAuthOverlay() {
        document.getElementById('authOverlay').style.display = 'flex';
        document.querySelector('.dashboard-container').style.display = 'none';
        document.getElementById('userInfoBar').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('authOverlay').style.display = 'none';
        document.querySelector('.dashboard-container').style.display = 'block';
        document.getElementById('userInfoBar').style.display = 'flex';
        document.querySelector('.dashboard-container').classList.add('logged-in');
        
        // Update user info
        if (this.currentUser) {
            document.getElementById('userName').textContent = this.currentUser.name;
            document.getElementById('userAvatar').textContent = this.currentUser.name.charAt(0).toUpperCase();
            
            // Update profile info
            updateProfileInfo();
        }
    }

    async authenticateUser(email, password) {
        try {
            const response = await fetch(`${FIREBASE_URL}/users.json`);
            const users = await response.json() || {};
            
            const userEmail = email.replace(/[.#$[\]]/g, '_');
            const user = users[userEmail];

            if (user && user.password === this.hashPassword(password)) {
                // Update last login
                user.lastLogin = new Date().toISOString();
                await fetch(`${FIREBASE_URL}/users/${userEmail}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                });

                return {
                    name: user.name,
                    email: user.email,
                    userFile: `${userEmail}.json`
                };
            }
        } catch (error) {
            console.error('❌ Authentication error:', error);
        }
        return null;
    }

    hashPassword(password) {
        // Simple hash function (use a proper hash in production)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    async createUserDataFile(userEmail) {
        try {
            const defaultData = {
                tasks: {
                    // Add a placeholder to prevent Firebase from removing empty object
                    "_placeholder": []
                },
                quickNotes: '',
                quickLinks: [
                    { id: 1, name: 'Gmail', url: 'https://gmail.com' },
                    { id: 2, name: 'GitHub', url: 'https://github.com' }
                ],
                importantFeed: [
                    // Add a placeholder to prevent Firebase from removing empty array
                    { _placeholder: true }
                ],
                creditCards: [
                    // Add a placeholder to prevent Firebase from removing empty array
                    { _placeholder: true }
                ],
                transactions: [
                    // Add a placeholder to prevent Firebase from removing empty array
                    { _placeholder: true }
                ],
                teamMembers: ['Harsha (Me)', 'Ujjawal', 'Arun', 'Sanskar', 'Thombre', 'Sakshi', 'Soumi', 'Ayush', 'Aditya', 'Sankalp'],
                currentDate: new Date().toISOString().split('T')[0],
                lastUpdated: new Date().toISOString()
            };

            const response = await fetch(`${FIREBASE_URL}/${userEmail}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(defaultData)
            });

            if (response.ok) {
                return true;
            }
        } catch (error) {
            console.error('Error creating user data file:', error);
        }
        return false;
    }

    getUserFilePath() {
        return this.currentUser ? this.currentUser.userFile : 'data.json';
    }
}

// Initialize auth system after DOM is ready
let authSystem;

// Authentication Functions
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const user = await authSystem.authenticateUser(email, password);
        if (user) {
            authSystem.currentUser = user;
            localStorage.setItem('dashboardUser', JSON.stringify(user));
            showAuthMessage('Login successful!', 'success');
            
            setTimeout(async () => {
                authSystem.showDashboard();
                // Load user data after login
                await authSystem.loadUserData();
            }, 1000);
        } else {
            showAuthMessage('Invalid email or password', 'error');
        }
    } catch (error) {
        showAuthMessage('Login failed. Please try again.', 'error');
    }
}

async function signup() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Check if user already exists
        const response = await fetch(`${FIREBASE_URL}/users.json`);
        const users = await response.json() || {};
        const userEmail = email.replace(/[.#$[\]]/g, '_');
        
        if (users[userEmail]) {
            showAuthMessage('User already exists', 'error');
            return;
        }

        // Create new user
        const userData = {
            name: name,
            email: email,
            password: authSystem.hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        users[userEmail] = userData;
        
        const saveResponse = await fetch(`${FIREBASE_URL}/users.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });

        if (saveResponse.ok) {
            // Create user data file
            await authSystem.createUserDataFile(userEmail);
            
            showAuthMessage('Account created successfully!', 'success');
            setTimeout(() => {
                showLogin();
            }, 1500);
        } else {
            showAuthMessage('Failed to create account', 'error');
        }
    } catch (error) {
        showAuthMessage('Signup failed. Please try again.', 'error');
    }
}

function logout() {
    authSystem.currentUser = null;
    
    // Clear all localStorage data
    localStorage.removeItem('dashboardUser');
    localStorage.clear();
    
    // Reset app data
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
    
    // Close any open dropdowns
    closeProfileDropdown();
    
    authSystem.showAuthOverlay();
    
    // Clear form fields
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    showLogin();
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('auth-message').style.display = 'none';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('auth-message').style.display = 'none';
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
    messageEl.style.display = 'block';
}

// Profile Functions
function toggleProfileDropdown() {
    const dropdown = document.querySelector('.profile-dropdown');
    const content = document.getElementById('profile-dropdown-content');
    
    if (content.classList.contains('show')) {
        closeProfileDropdown();
    } else {
        openProfileDropdown();
    }
}

function openProfileDropdown() {
    const dropdown = document.querySelector('.profile-dropdown');
    const content = document.getElementById('profile-dropdown-content');
    
    dropdown.classList.add('active');
    content.classList.add('show');
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}

function closeProfileDropdown() {
    const dropdown = document.querySelector('.profile-dropdown');
    const content = document.getElementById('profile-dropdown-content');
    
    dropdown.classList.remove('active');
    content.classList.remove('show');
    
    document.removeEventListener('click', handleOutsideClick);
}

function handleOutsideClick(event) {
    const profileDropdown = document.querySelector('.profile-dropdown');
    if (!profileDropdown.contains(event.target)) {
        closeProfileDropdown();
    }
}

function openProfile() {
    closeProfileDropdown();
    
    if (!authSystem.currentUser) {
        return;
    }
    
    const modal = document.getElementById('profileModal');
    const user = authSystem.currentUser;
    
    // Update profile info
    document.getElementById('profile-avatar-large').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('profile-display-name').value = user.name;
    document.getElementById('profile-display-email').value = user.email;
    
    // Format dates
    const createdAt = new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const lastLogin = new Date(user.lastLogin || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('profile-created-at').value = createdAt;
    document.getElementById('profile-last-login').value = lastLogin;
    
    modal.style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Update profile info when user logs in
function updateProfileInfo() {
    if (authSystem.currentUser) {
        const user = authSystem.currentUser;
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-avatar').textContent = user.name.charAt(0).toUpperCase();
    }
}

// Connect Email Function (placeholder)
function connectEmail() {
    // TODO: Implement email connection functionality
    alert('Connect Email functionality will be implemented later!');
}

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
    }
    
    // Initialize authentication system
    authSystem = new AuthSystem();
    
    // Only render UI if user is authenticated
    if (authSystem.currentUser) {
        renderQuickLinks();
        renderTasks();
        renderImportantFeed();
    }
    initializeFilterModal();
    fetchWeather();
    
    // Restore timers now that flickering is fixed
    setInterval(updateClocks, 1000);
    setInterval(function() {
        try {
            updateMotivationalMessage();
        } catch (error) {
        }
    }, 60 * 60 * 1000);
    setInterval(fetchWeather, 30 * 60 * 1000);
    
    // Auto-refresh data from JSON file every 3 seconds
    setInterval(async function() {
        try {
            await refreshDataFromFile();
        } catch (error) {
        }
    }, 3000);
    
    // Add additional event listeners for quick notes
    const quickNotesElement = document.getElementById('quick-notes');
    if (quickNotesElement) {
        // Add comprehensive paste event handling
        quickNotesElement.addEventListener('paste', (event) => {
            handleQuickNotesPaste(event);
        });
        
        // Add input event listener as backup
        quickNotesElement.addEventListener('input', (event) => {
            
            // Check if this is a paste operation
            if (event.inputType === 'insertFromPaste' || event.inputType === 'insertCompositionText') {
                handleQuickNotesPaste(event);
            } else {
                saveNotes();
            }
        });
        
        // Add change event listener for additional safety
        quickNotesElement.addEventListener('change', (event) => {
            saveNotes();
        });
        
        // Add MutationObserver to detect value changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    saveNotes();
                }
            });
        });
        
        observer.observe(quickNotesElement, {
            childList: true,
            characterData: true,
            subtree: true
        });
        
    }
    
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
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await saveDataToStorage();
        }, 1000); // 1 second delay for quick notes
    }
}

// Handle paste events for quick notes
function handleQuickNotesPaste(event) {
    
    // Set flag to prevent refresh interference
    isPasting = true;
    
    // Try multiple approaches to ensure paste is saved
    const saveAfterPaste = () => {
        const quickNotesElement = document.getElementById('quick-notes');
        if (quickNotesElement) {
            const newValue = quickNotesElement.value;
            appData.quickNotes = newValue;
            
            // Save immediately without waiting for the timeout
            clearTimeout(saveTimeout);
            saveDataToStorage().then(() => {
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
        // Check if user is authenticated
        if (!authSystem || !authSystem.currentUser) {
            return;
        }
        
        // Save data to Firebase API
        const userFile = authSystem.getUserFilePath();
        const response = await fetch(`${FIREBASE_URL}/${userFile}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appData)
        });
        
        if (!response.ok) {
            console.error('Failed to save data to Firebase:', response.status);
        }
    } catch (error) {
        console.error('Unable to save data to Firebase API:', error);
    }
}

// Store last known file modification time to detect changes
let lastFileModTime = null;
let isPasting = false; // Flag to prevent refresh during paste

// Default app data structure
function getDefaultAppData() {
    return {
        tasks: {
            // Add a placeholder to prevent Firebase from removing empty object
            "_placeholder": []
        },
        quickNotes: '',
        importantFeed: [
            // Add a placeholder to prevent Firebase from removing empty array
            { _placeholder: true }
        ],
        quickLinks: [
            { id: 1, name: 'Gmail', url: 'https://gmail.com' },
            { id: 2, name: 'GitHub', url: 'https://github.com' }
        ],
        teamMembers: ['Harsha (Me)', 'Ujjawal', 'Arun', 'Sanskar', 'Thombre', 'Sakshi', 'Soumi', 'Ayush', 'Aditya', 'Sankalp'],
        transactions: [
            // Add a placeholder to prevent Firebase from removing empty array
            { _placeholder: true }
        ],
        creditCards: [
            // Add a placeholder to prevent Firebase from removing empty array
            { _placeholder: true }
        ],
        currentDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString()
    };
}

// Clean up placeholder data and ensure proper structure
function cleanupAppData() {
    // Initialize missing properties
    if (!appData.tasks) appData.tasks = {};
    if (!appData.quickLinks) appData.quickLinks = [];
    if (!appData.creditCards) appData.creditCards = [];
    if (!appData.transactions) appData.transactions = [];
    if (!appData.importantFeed) appData.importantFeed = [];
    
    // Remove placeholder from tasks
    if (appData.tasks._placeholder) {
        delete appData.tasks._placeholder;
    }
    
    // Remove placeholders from arrays
    if (Array.isArray(appData.importantFeed)) {
        appData.importantFeed = appData.importantFeed.filter(item => !item._placeholder);
    }
    
    if (Array.isArray(appData.creditCards)) {
        appData.creditCards = appData.creditCards.filter(item => !item._placeholder);
    }
    
    if (Array.isArray(appData.transactions)) {
        appData.transactions = appData.transactions.filter(item => !item._placeholder);
    }
}

async function refreshDataFromFile() {
    try {
        // Check if user is authenticated
        if (!authSystem || !authSystem.currentUser) {
            return;
        }
        
        // Refresh data from Firebase API
        const userFile = authSystem.getUserFilePath();
        const response = await fetch(`${FIREBASE_URL}/${userFile}`);
        
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
            }
        }
    } catch (error) {
        // Silently fail during auto-refresh
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
        // Check if user is authenticated
        if (!authSystem || !authSystem.currentUser) {
            return;
        }
        
        // Load data from Firebase API instead of local JSON
        const userFile = authSystem.getUserFilePath();
        const response = await fetch(`${FIREBASE_URL}/${userFile}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data) {
                // Ensure all required properties exist
                appData = {
                    ...getDefaultAppData(),
                    ...data
                };
                
                // Clean up placeholders and ensure proper structure
                cleanupAppData();
                
                // If the loaded data was missing critical properties, save the updated structure
                if (!data.tasks || !data.quickLinks) {
                    await saveDataToStorage();
                }
                
                updateUIFromLoadedData();
            } else {
                appData = getDefaultAppData();
                cleanupAppData();
            }
        } else if (response.status === 404) {
            appData = getDefaultAppData();
            cleanupAppData();
            // Create the user data file with default data
            await authSystem.createUserDataFile(authSystem.currentUser.email.replace(/[.#$[\]]/g, '_'));
        } else {
            appData = getDefaultAppData();
            cleanupAppData();
        }
    } catch (error) {
        appData = getDefaultAppData();
        cleanupAppData();
    }
}

function updateUIFromLoadedData() {
    
    // Update quick notes only if user is not typing or pasting
    const quickNotesElement = document.getElementById('quick-notes');
    if (quickNotesElement) {
        // Don't overwrite if user is currently typing or pasting
        const isFocused = document.activeElement === quickNotesElement || quickNotesElement.matches(':focus');
        if (!isFocused && !isPasting) {
            quickNotesElement.value = appData.quickNotes || '';
        } else {
        }
    }
    
    renderQuickLinks();
    
    renderTransactions();
    
    renderTasks();
    
    renderImportantFeed();
    
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
        
        // Ensure appData.tasks exists
        if (!appData.tasks) appData.tasks = {};
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
        
        
        renderTasks();
        saveDataToStorage();
    }
}

function toggleTask(dateKey, taskId) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
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
                appData.tasks[dateKey].splice(taskIndex, 1);
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
            renderTasks();
            saveDataToStorage();
        }
    }
}

function openTaskNote(dateKey, taskId) {
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
        } else {
        }
    } else {
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
        }
    }
}

function closeTaskNoteModal() {
    document.getElementById('taskNoteModal').style.display = 'none';
    currentTaskForNote = null;
    
    // Clear inputs
    document.getElementById('new-issue-input').value = '';
    document.getElementById('new-appreciation-input').value = '';
    
}

function saveTaskNote() {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            task.note = document.getElementById('task-note-content').value;
            task.status = document.getElementById('task-status-select').value;
            task.noteUpdatedAt = new Date().toISOString();
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
}

function applyTaskFilters(tasks) {
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
        // Last resort fallback
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

// Recent Transactions functions
function renderTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    // Filter out read transactions
    const allTransactions = (appData.transactions || []);
    const unreadTransactions = allTransactions.filter(t => !t.isRead);
    const transactions = unreadTransactions.slice(0, 5);
    
    if (transactions.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">No unread transactions</div>';
        return;
    }
    
    container.innerHTML = transactions.map(transaction => {
        const timeAgo = getTimeAgo(transaction.timestamp);
        const sign = transaction.type === 'credited' ? '+' : '-';
        const amountDisplay = `${sign}₹${transaction.amount.toLocaleString()}`;
        
        return `
            <div class="transaction-item ${transaction.type}" onclick="showTransactionDetails(${transaction.id})">
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

// Transaction functions
let currentTransactionId = null;

function toggleTransactions() {
    const container = document.getElementById('transactions-list');
    const arrow = document.getElementById('transactions-arrow');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        arrow.classList.add('expanded');
        arrow.textContent = '▲';
    } else {
        container.style.display = 'none';
        arrow.classList.remove('expanded');
        arrow.textContent = '▼';
    }
}

function showTransactionDetails(transactionId) {
    const transaction = appData.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    currentTransactionId = transactionId;
    
    const sign = transaction.type === 'credited' ? '+' : '-';
    const amountDisplay = `${sign}₹${transaction.amount.toLocaleString()}`;
    
    const detailsHtml = `
        <div class="transaction-amount-large ${transaction.type}">
            ${amountDisplay}
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Type:</span>
            <span class="transaction-detail-value">${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Description:</span>
            <span class="transaction-detail-value">${transaction.description}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Bank:</span>
            <span class="transaction-detail-value">${transaction.bank}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Mode:</span>
            <span class="transaction-detail-value">${transaction.mode}</span>
        </div>
        
        ${transaction.balance ? `
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Balance:</span>
            <span class="transaction-detail-value">₹${transaction.balance.toLocaleString()}</span>
        </div>
        ` : ''}
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Date & Time:</span>
            <span class="transaction-detail-value">${new Date(transaction.timestamp).toLocaleString()}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Transaction ID:</span>
            <span class="transaction-detail-value">${transaction.id}</span>
        </div>
        
        ${transaction.rawMessage ? `
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Raw Message:</span>
            <span class="transaction-detail-value" style="font-size: 12px; color: rgba(255, 255, 255, 0.7);">${transaction.rawMessage}</span>
        </div>
        ` : ''}
    `;
    
    document.getElementById('transaction-details-content').innerHTML = detailsHtml;
    document.getElementById('transactionModal').style.display = 'block';
}

function markTransactionAsRead() {
    if (!currentTransactionId) return;
    
    const transaction = appData.transactions.find(t => t.id === currentTransactionId);
    if (transaction) {
        transaction.isRead = true;
        saveDataToStorage();
        closeTransactionModal();
        renderTransactions();
    }
}

function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
    currentTransactionId = null;
}

// Credit Card Management
function simpleEncrypt(text) {
    // Simple Base64 + Caesar cipher for demo purposes
    // In production, use proper encryption libraries
    const base64 = btoa(text);
    let encrypted = '';
    for (let i = 0; i < base64.length; i++) {
        encrypted += String.fromCharCode(base64.charCodeAt(i) + 3);
    }
    return btoa(encrypted);
}

function simpleDecrypt(encryptedText) {
    try {
        const decoded = atob(encryptedText);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(decoded.charCodeAt(i) - 3);
        }
        return atob(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        return 'Error decrypting';
    }
}

function maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return cardNumber;
    const lastFour = cleaned.slice(-4);
    const masked = '**** **** **** ' + lastFour;
    return masked;
}

function formatCardNumber(value) {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted;
}

function formatExpiry(value) {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
        return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
}

function showCreditCards() {
    document.getElementById('creditCardsModal').style.display = 'block';
    renderCreditCards();
}

function renderCreditCards() {
    const container = document.getElementById('credit-cards-list');
    const creditCards = appData.creditCards || [];
    
    if (creditCards.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px;">No saved credit cards</div>';
        return;
    }
    
    container.innerHTML = creditCards.map(card => {
        const cardNumber = simpleDecrypt(card.encryptedNumber);
        const maskedNumber = maskCardNumber(cardNumber);
        
        return `
            <div class="credit-card-item">
                <div class="card-info">
                    <div class="card-name">${card.name}</div>
                    <div class="card-number">${maskedNumber}</div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn" onclick="showCardDetails(${card.id})">View</button>
                    <button class="card-action-btn delete" onclick="deleteCard(${card.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddCardModal() {
    document.getElementById('addCardModal').style.display = 'block';
    // Clear form
    document.getElementById('card-name').value = '';
    document.getElementById('card-number').value = '';
    document.getElementById('card-expiry').value = '';
    document.getElementById('card-cvv').value = '';
}

function saveNewCard() {
    const name = document.getElementById('card-name').value.trim();
    const number = document.getElementById('card-number').value.replace(/\s/g, '');
    const expiry = document.getElementById('card-expiry').value;
    const cvv = document.getElementById('card-cvv').value;
    
    if (!name || !number || !expiry || !cvv) {
        alert('Please fill all fields');
        return;
    }
    
    if (number.length < 13 || number.length > 19) {
        alert('Please enter a valid card number');
        return;
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        alert('Please enter expiry in MM/YY format');
        return;
    }
    
    if (cvv.length < 3 || cvv.length > 4) {
        alert('Please enter a valid CVV');
        return;
    }
    
    const newCard = {
        id: Date.now(),
        name: name,
        encryptedNumber: simpleEncrypt(number),
        encryptedExpiry: simpleEncrypt(expiry),
        encryptedCVV: simpleEncrypt(cvv),
        addedDate: new Date().toISOString()
    };
    
    if (!appData.creditCards) {
        appData.creditCards = [];
    }
    
    appData.creditCards.push(newCard);
    saveDataToStorage();
    closeAddCardModal();
    renderCreditCards();
}

function showCardDetails(cardId) {
    const card = appData.creditCards.find(c => c.id === cardId);
    if (!card) return;
    
    const cardNumber = simpleDecrypt(card.encryptedNumber);
    const expiry = simpleDecrypt(card.encryptedExpiry);
    const cvv = simpleDecrypt(card.encryptedCVV);
    
    alert(`Card Details:\n\nName: ${card.name}\nNumber: ${formatCardNumber(cardNumber)}\nExpiry: ${expiry}\nCVV: ${cvv}\n\nAdded: ${new Date(card.addedDate).toLocaleDateString()}`);
}

function deleteCard(cardId) {
    const card = appData.creditCards.find(c => c.id === cardId);
    if (!card) return;
    
    if (confirm(`Are you sure you want to delete "${card.name}"?`)) {
        appData.creditCards = appData.creditCards.filter(c => c.id !== cardId);
        saveDataToStorage();
        renderCreditCards();
    }
}

function closeCreditCardsModal() {
    document.getElementById('creditCardsModal').style.display = 'none';
}

function closeAddCardModal() {
    document.getElementById('addCardModal').style.display = 'none';
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
        // Ensure appData.quickLinks exists
        if (!appData.quickLinks) appData.quickLinks = [];
        
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
        
    }
}

// Initialize UI after authentication
async function initializeUI() {
    renderQuickLinks();
    renderTasks();
    renderImportantFeed();
    initializeFilterModal();
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
            } else {
            }
        }
    } catch (error) {
    }
}

// System Trash function
async function openSystemTrash() {
    try {
        if (window.electronAPI?.shell?.openTrash) {
            const success = await window.electronAPI.shell.openTrash();
            if (success) {
            } else {
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
            } else {
            }
        } else {
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
    const modals = ['linkModal', 'taskNoteModal', 'filterModal', 'trashInstructionsModal', 'transactionModal', 'creditCardsModal', 'addCardModal', 'profileModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
            // Special handling for transaction modal
            if (modalId === 'transactionModal') {
                currentTransactionId = null;
            }
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
        const modals = ['linkModal', 'taskNoteModal', 'filterModal', 'trashInstructionsModal', 'profileModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
        
        // Close profile dropdown
        closeProfileDropdown();
        
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



// Test if functions are defined

// Dashboard Application Logic for Electron
class DashboardApp {
    constructor() {
        this.init();
    }

    init() {
        this.checkElectronAPI();
        this.setupSystemIntegrations();
        
        // Only load data if user is authenticated
        if (authSystem.currentUser) {
            this.loadData();
        }
    }

    async loadData() {
        await loadDataFromStorage();
        await initializeUI();
    }

    checkElectronAPI() {
        if (window.electronAPI) {
            this.showSystemStatus('Electron API Ready', 'ready');
        } else {
            this.showSystemStatus('Browser Mode', 'browser');
        }
    }

    setupSystemIntegrations() {
        if (!window.electronAPI) return;
        
        // Setup Siri integration
        if (window.electronAPI.siri) {
            
            // Register Siri shortcuts
            window.electronAPI.siri.registerShortcuts()
                .then(success => {
                    if (success) {
                        this.showSystemStatus('Siri Ready', 'ready');
                    } else {
                        this.showSystemStatus('Siri Unavailable', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error registering Siri shortcuts:', error);
                    this.showSystemStatus('Siri Error', 'error');
                });
            
            // Listen for Siri commands
            window.electronAPI.siri.onCommand((_event, data) => {
                this.handleSiriCommand(data);
            });
        }
        
    }
    
    showSiriSetupInstructions() {
        return;
    }

    handleSiriCommand(data) {
        const { action, text } = data;
        
        
        // Handle different action formats
        let normalizedAction = action;
        if (action === 'add-task' || action === 'addTask') {
            normalizedAction = 'add-task';
        } else if (action === 'show-tasks' || action === 'showTasks') {
            normalizedAction = 'show-tasks';
        } else if (action === 'complete-task' || action === 'completeTask') {
            normalizedAction = 'complete-task';
        }
        
        
        switch (normalizedAction) {
            case 'add-task':
                this.addTaskFromSiri(text);
                this.showSiriNotification(`Added task: "${text || 'New task'}"`);
                break;
            
            case 'show-tasks':
                this.showTasksFromSiri();
                this.showSiriNotification('Showing your tasks');
                break;
            
            case 'complete-task':
                this.completeTaskFromSiri(text);
                this.showSiriNotification(`Completed task: "${text}"`);
                break;
            
            default:
                this.showSiriNotification(`Sorry, I didn't understand the command: "${normalizedAction}"`);
        }
    }

    async addTaskFromSiri(taskText) {
        if (!taskText || taskText.trim() === '') {
            taskText = 'New task from Siri';
        }
        
        const input = document.getElementById('new-task-input');
        
        if (input) {
            input.value = taskText;
            
            try {
                addTask(); // Call the existing addTask function
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
        
    }
    
    addTaskDirectly(taskText) {
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
            this.showSiriNotification(`Task "${taskText}" not found`);
        } else {
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
        
    }


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
    
    // Add input formatting for credit card fields
    const formatCardNumber = (input) => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            e.target.value = formattedValue;
        });
    };
    
    const formatExpiryDate = (input) => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    };
    
    // Also add paste support to dynamically created inputs
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Check if the node itself is an input/textarea
                    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                        addPasteSupport(node);
                        // Add formatting for specific credit card inputs
                        if (node.id === 'card-number') {
                            formatCardNumber(node);
                        } else if (node.id === 'card-expiry') {
                            formatExpiryDate(node);
                        }
                    }
                    // Check for input/textarea children
                    const inputs = node.querySelectorAll && node.querySelectorAll('input, textarea');
                    if (inputs) {
                        inputs.forEach(input => {
                            addPasteSupport(input);
                            if (input.id === 'card-number') {
                                formatCardNumber(input);
                            } else if (input.id === 'card-expiry') {
                                formatExpiryDate(input);
                            }
                        });
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