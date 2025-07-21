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
            
            updateUIFromLoadedData();
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
        
        // Initialize Firebase real-time listeners
        initializeFirebaseListeners();
        
        // Initialize card encryption for the current user
        if (this.currentUser && this.currentUser.id) {
            initializeCardEncryption(this.currentUser.id);
        }
        
        // Update user info
        if (this.currentUser) {
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');
            
            if (userNameEl) userNameEl.textContent = this.currentUser.name;
            if (userAvatarEl) userAvatarEl.textContent = this.currentUser.name.charAt(0).toUpperCase();
            
            // Update profile info
            updateProfileInfo();
            
            // Start email monitoring if Gmail is connected
            if (this.currentUser.gmailTokens) {
                startEmailMonitoring();
            }
            
            // Check for OAuth callback parameters
            checkOAuthCallback();
        }
    }

    async authenticateUser(email, password) {
        try {
            const response = await fetch(`${FIREBASE_URL}/users.json`);
            const users = await response.json() || {};
            let foundUser = null;
            let foundId = null;
            for (const [id, user] of Object.entries(users)) {
                if (user.email === email && user.password === this.hashPassword(password)) {
                    foundUser = user;
                    foundId = id;
                    break;
                }
            }
            if (foundUser) {
                foundUser.lastLogin = new Date().toISOString();
                await fetch(`${FIREBASE_URL}/users/${foundId}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(foundUser)
                });
                return {
                    id: foundId,
                    name: foundUser.name,
                    email: foundUser.email,
                    userFile: foundUser.userFile || `${foundId}.json`
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

    async createUserDataFile(userId) {
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

            const response = await fetch(`${FIREBASE_URL}/${userId}.json`, {
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
        const response = await fetch(`${FIREBASE_URL}/users.json`);
        const users = await response.json() || {};
        for (const user of Object.values(users)) {
            if (user.email === email) {
                showAuthMessage('User already exists', 'error');
                return;
            }
        }
        const userId = email.replace(/[@.]/g, '_').replace(/[^a-zA-Z0-9_]/g, '_');
        const userData = {
            id: userId,
            name: name,
            email: email,
            password: authSystem.hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            userFile: `${userId}.json`
        };
        users[userId] = userData;
        const saveResponse = await fetch(`${FIREBASE_URL}/users.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users)
        });
        if (saveResponse.ok) {
            await authSystem.createUserDataFile(userId);
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
    
    // Clean up Firebase real-time listeners
    cleanupFirebaseListeners();
    
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
    
    // Load team management interface with existing data
    renderTeamMembers();
    renderTaskStatuses();
    
    modal.style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Update profile info when user logs in
function updateProfileInfo() {
    if (authSystem && authSystem.currentUser) {
        const user = authSystem.currentUser;
        const profileNameEl = document.getElementById('profile-name');
        const profileAvatarEl = document.getElementById('profile-avatar');
        
        if (profileNameEl) profileNameEl.textContent = user.name;
        if (profileAvatarEl) profileAvatarEl.textContent = user.name.charAt(0).toUpperCase();
        
        // Load team management interface
        renderTeamMembers();
        renderTaskStatuses();
    }
}

// Team Management Functions
function renderTeamMembers() {
    const container = document.getElementById('team-members-list');
    if (!container) return;
    
    // Ensure teamMembers exists
    if (!appData || !appData.teamMembers) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 12px; padding: 12px;">Loading team members...</div>';
        return;
    }
    
    if (appData.teamMembers.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 12px; padding: 12px;">No team members added yet</div>';
        return;
    }
    
    container.innerHTML = appData.teamMembers.map((member, index) => `
        <div class="team-member-item">
            <span class="member-name">${member}</span>
            ${member.includes('(Me)') ? '' : `<button class="remove-btn" onclick="removeTeamMember(${index})">Remove</button>`}
        </div>
    `).join('');
}

function addTeamMember() {
    const input = document.getElementById('new-member-name');
    const memberName = input.value.trim();
    
    if (!memberName) {
        alert('Please enter a team member name');
        return;
    }
    
    // Ensure teamMembers exists
    if (!appData.teamMembers) {
        appData.teamMembers = [];
    }
    
    if (appData.teamMembers.includes(memberName)) {
        alert('Team member already exists');
        return;
    }
    
    appData.teamMembers.push(memberName);
    input.value = '';
    renderTeamMembers();
    updateAllTeamDropdowns();
    saveDataToStorage();
    showNotification(`Added team member: ${memberName}`);
}

function removeTeamMember(index) {
    if (!appData.teamMembers || !appData.teamMembers[index]) return;
    const memberName = appData.teamMembers[index];
    if (confirm(`Remove ${memberName} from team?`)) {
        appData.teamMembers.splice(index, 1);
        renderTeamMembers();
        updateAllTeamDropdowns();
        saveDataToStorage();
        showNotification(`Removed team member: ${memberName}`);
    }
}

// Task Status Management Functions
function renderTaskStatuses() {
    const container = document.getElementById('task-statuses-list');
    if (!container) return;
    
    // Ensure taskStatuses exists
    if (!appData || !appData.taskStatuses) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 12px; padding: 12px;">Loading task statuses...</div>';
        return;
    }
    
    if (appData.taskStatuses.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 12px; padding: 12px;">No task statuses defined</div>';
        return;
    }
    
    container.innerHTML = appData.taskStatuses.map((status, index) => `
        <div class="status-item">
            <span class="status-name">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
            ${status === 'pending' ? '' : `<button class="remove-btn" onclick="removeTaskStatus(${index})">Remove</button>`}
        </div>
    `).join('');
}

function addTaskStatus() {
    const input = document.getElementById('new-status-name');
    const statusName = input.value.trim().toLowerCase();
    
    if (!statusName) {
        alert('Please enter a status name');
        return;
    }
    
    // Ensure taskStatuses exists
    if (!appData.taskStatuses) {
        appData.taskStatuses = ['pending'];
    }
    
    if (appData.taskStatuses.includes(statusName)) {
        alert('Status already exists');
        return;
    }
    
    appData.taskStatuses.push(statusName);
    input.value = '';
    renderTaskStatuses();
    updateAllStatusDropdowns();
    saveDataToStorage();
    showNotification(`Added status: ${statusName}`);
}

function removeTaskStatus(index) {
    if (!appData.taskStatuses || !appData.taskStatuses[index]) return;
    const statusName = appData.taskStatuses[index];
    if (confirm(`Remove "${statusName}" status? This may affect existing tasks.`)) {
        appData.taskStatuses.splice(index, 1);
        renderTaskStatuses();
        updateAllStatusDropdowns();
        saveDataToStorage();
        showNotification(`Removed status: ${statusName}`);
    }
}

// Update all dropdowns when team/status changes
function updateAllTeamDropdowns() {
    // Update filter dropdown
    const filterPersonSelect = document.getElementById('filter-person');
    if (filterPersonSelect) {
        const teamMembers = appData.teamMembers || [];
        filterPersonSelect.innerHTML = `
            <option value="">All People</option>
            ${teamMembers.map(member => `<option value="${member}">${member}</option>`).join('')}
        `;
    }
}

function updateAllStatusDropdowns() {
    const taskStatuses = appData.taskStatuses || ['pending'];
    
    // Update task status select in modal
    const taskStatusSelect = document.getElementById('task-status-select');
    if (taskStatusSelect) {
        const currentValue = taskStatusSelect.value;
        taskStatusSelect.innerHTML = taskStatuses.map(status => 
            `<option value="${status}" ${currentValue === status ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`
        ).join('');
    }
    
    // Update filter status dropdown
    const filterStatusSelect = document.getElementById('filter-status');
    if (filterStatusSelect) {
        const currentValue = filterStatusSelect.value;
        filterStatusSelect.innerHTML = `
            <option value="">All Statuses</option>
            ${taskStatuses.map(status => `<option value="${status}" ${currentValue === status ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`).join('')}
        `;
    }
    
    // Force re-render of tasks to update inline dropdowns
    renderTasks(true);
}

// Gmail Configuration - Secrets should be set via environment variables
const GMAIL_CONFIG = {
    client_id: '629809071861-nulh6u2fb1bcrm3emcmdbl0ecgj5fv3n.apps.googleusercontent.com',
    client_secret: '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',
    redirect_uri: 'https://dashboard-flask-api.onrender.com/oauth/gmail/callback',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent'
};

// Email Connection Functions
function openEmailConnectionModal() {
    const modal = document.getElementById('emailConnectionModal');
    modal.style.display = 'block';
    
    // Load and display connected accounts
    loadConnectedAccounts();
}

function closeEmailConnectionModal() {
    const modal = document.getElementById('emailConnectionModal');
    modal.style.display = 'none';
    
    // Clean up Firebase listener
    if (window.connectionsListener) {
        window.connectionsListener.off();
        window.connectionsListener = null;
    }
}

function loadConnectedAccounts() {
    const gmailConnections = document.getElementById('gmail-connections');
    const outlookConnections = document.getElementById('outlook-connections');
    
    // Clear existing connections
    gmailConnections.innerHTML = '<div class="loading">Loading connections...</div>';
    outlookConnections.innerHTML = '<div class="loading">Loading connections...</div>';
    
    // Get current user email
    const currentUser = authSystem.currentUser;
    if (!currentUser || !currentUser.email) {
        gmailConnections.innerHTML = '<div class="no-connections">Please login to view connections</div>';
        outlookConnections.innerHTML = '<div class="no-connections">Please login to view connections</div>';
        return;
    }
    
    // Use user ID for Firebase access
    const userId = currentUser.id;
    
    // Access Firebase directly
    const firebaseUrl = 'https://dashboard-app-fcd42-default-rtdb.firebaseio.com';
    
    // Fetch user data from Firebase
    fetch(`${firebaseUrl}/users/${userId}.json`)
        .then(response => response.json())
        .then(userData => {
            console.log('User data from Firebase:', userData);
            
            // Clear loading states
            gmailConnections.innerHTML = '';
            outlookConnections.innerHTML = '';
            
            // Handle Gmail connections
            if (userData && userData.gmailTokens && userData.gmailTokens.connected) {
                // Check if connection is active (has refresh token for getting new access tokens)
                const hasRefreshToken = userData.gmailTokens.refresh_token;
                const isActive = hasRefreshToken && userData.gmailTokens.connected;
                
                const gmailConnection = createConnectionItem({
                    email: userData.email || currentUser.email,
                    provider: 'gmail',
                    connected: true,
                    active: isActive,
                    connectedAt: userData.gmailTokens.created_at,
                    refreshToken: userData.gmailTokens.refresh_token
                });
                gmailConnections.appendChild(gmailConnection);
                
                // Update connect button
                const connectBtn = document.getElementById('gmail-connect-btn');
                if (connectBtn) {
                    connectBtn.innerHTML = '<span class="connect-icon">✓</span>Connected';
                    connectBtn.style.background = '#22c55e';
                    connectBtn.disabled = true;
                }
            } else {
                gmailConnections.innerHTML = '<div class="no-connections">No Gmail accounts connected</div>';
                
                // Reset connect button
                const connectBtn = document.getElementById('gmail-connect-btn');
                if (connectBtn) {
                    connectBtn.innerHTML = '<span class="connect-icon">🔗</span>Connect';
                    connectBtn.style.background = '#3b82f6';
                    connectBtn.disabled = false;
                }
            }
            
            // Handle Outlook connections (always show as coming soon for now)
            outlookConnections.innerHTML = '<div class="no-connections">Outlook integration coming soon</div>';
            
        })
        .catch(error => {
            console.error('Error loading connections from Firebase:', error);
            gmailConnections.innerHTML = '<div class="error">Failed to load Gmail connections</div>';
            outlookConnections.innerHTML = '<div class="error">Failed to load Outlook connections</div>';
        });
}

function createConnectionItem(connection) {
    const item = document.createElement('div');
    item.className = 'connection-item';
    
    const connectedDate = connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString() : 'Unknown';
    const statusText = connection.active ? 'Active' : 'Inactive';
    const statusClass = connection.active ? 'connected' : 'disconnected';
    
    item.innerHTML = `
        <div class="connection-info">
            <div class="connection-status ${statusClass}"></div>
            <div>
                <div class="connection-email">${connection.email}</div>
                <div class="connection-date">Connected on ${connectedDate}</div>
                <div class="connection-status-text ${statusClass}">${statusText}</div>
            </div>
        </div>
        <div class="connection-actions">
            <button class="connection-btn" onclick="refreshGmailToken('${connection.email}', '${connection.refreshToken}')" title="Refresh Token">
                🔄
            </button>
            <button class="connection-btn disconnect" onclick="disconnectGmail('${connection.email}')" title="Disconnect">
                ❌
            </button>
        </div>
    `;
    
    return item;
}

function refreshGmailToken(email, refreshToken) {
    if (!refreshToken) {
        console.error('No refresh token available');
        alert('No refresh token available. Please reconnect your Gmail account.');
        return;
    }
    
    // Call the API to refresh the token
    fetch('https://dashboard-flask-api.onrender.com/oauth/gmail/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refresh_token: refreshToken,
            userEmail: email
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.tokens) {
            console.log('Token refreshed successfully');
            // Reload the connections to show updated status
            loadConnectedAccounts();
        } else {
            console.error('Failed to refresh token:', data);
            alert('Failed to refresh token. Please try reconnecting your Gmail account.');
        }
    })
    .catch(error => {
        console.error('Error refreshing token:', error);
        alert('Error refreshing token. Please try again.');
    });
}

function disconnectGmail(email) {
    if (!confirm('Are you sure you want to disconnect your Gmail account?')) {
        return;
    }
    
    const userId = authSystem.currentUser.id;
    const firebaseUrl = 'https://dashboard-app-fcd42-default-rtdb.firebaseio.com';
    
    // Remove Gmail tokens from Firebase
    fetch(`${firebaseUrl}/users/${userId}/gmailTokens.json`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            console.log('Gmail account disconnected successfully');
            // Reload the connections to show updated status
            loadConnectedAccounts();
        } else {
            console.error('Failed to disconnect Gmail account');
            alert('Failed to disconnect Gmail account. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error disconnecting Gmail account:', error);
        alert('Error disconnecting Gmail account. Please try again.');
    });
}

function refreshConnection(provider) {
    if (provider === 'gmail') {
        // This function is deprecated, use refreshGmailToken instead
        showNotification('Refreshing Gmail connection...');
        // You could trigger a token refresh here
    }
}

function disconnectAccount(provider) {
    if (provider === 'gmail') {
        if (confirm('Are you sure you want to disconnect Gmail? This will stop automatic transaction detection.')) {
            disconnectGmail();
        }
    }
}

function disconnectGmail() {
    // Remove Gmail tokens from user data
    if (authSystem.currentUser) {
        delete authSystem.currentUser.gmailTokens;
        
        // Update Firebase
        const userId = authSystem.currentUser.id;
        fetch(`${FIREBASE_URL}/users/${userId}.json`)
            .then(response => response.json())
            .then(userData => {
                delete userData.gmailTokens;
                
                return fetch(`${FIREBASE_URL}/users/${userId}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
            })
            .then(() => {
                // Update localStorage
                localStorage.setItem('dashboardUser', JSON.stringify(authSystem.currentUser));
                
                // Stop email monitoring
                stopEmailMonitoring();
                
                // Refresh the modal
                loadConnectedAccounts();
                
                showNotification('Gmail disconnected successfully');
            })
            .catch(error => {
                console.error('Error disconnecting Gmail:', error);
                showNotification('Failed to disconnect Gmail');
            });
    }
}

function connectGmail() {
    // Check if user is already connected
    if (authSystem.currentUser && authSystem.currentUser.gmailTokens) {
        showNotification('Gmail is already connected!');
        return;
    }
    
    // Generate OAuth URL
    const authUrl = generateGmailAuthUrl();
    
    // Open OAuth window
    const authWindow = window.open(authUrl, 'gmail-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    // Listen for auth completion
    const authInterval = setInterval(() => {
        try {
            if (authWindow.closed) {
                clearInterval(authInterval);
                // Refresh user data from Firebase to check for new tokens
                refreshUserDataFromFirebase();
            }
        } catch (error) {
            // Handle cross-origin errors
        }
    }, 1000);
}

function connectOutlook() {
    showNotification('Outlook integration coming soon!');
}

// Refresh user data from Firebase
async function refreshUserDataFromFirebase() {
    try {
        if (!authSystem.currentUser) return;
        
        const userId = authSystem.currentUser.id;
        const response = await fetch(`${FIREBASE_URL}/users/${userId}.json`);
        
        if (response.ok) {
            const userData = await response.json();
            
            if (userData) {
                // Update current user with fresh data from Firebase
                authSystem.currentUser = {
                    ...authSystem.currentUser,
                    ...userData
                };
                
                // Update localStorage
                localStorage.setItem('dashboardUser', JSON.stringify(authSystem.currentUser));
                
                // Check if Gmail was just connected
                if (userData.gmailTokens && userData.gmailTokens.connected) {
                    showNotification('Gmail connected successfully!');
                    startEmailMonitoring();
                    
                    // Refresh the modal if it's open
                    const modal = document.getElementById('emailConnectionModal');
                    if (modal.style.display === 'block') {
                        loadConnectedAccounts();
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error refreshing user data:', error);
    }
}

function generateGmailAuthUrl() {
    const params = new URLSearchParams({
        client_id: GMAIL_CONFIG.client_id,
        redirect_uri: GMAIL_CONFIG.redirect_uri,
        scope: GMAIL_CONFIG.scope,
        response_type: GMAIL_CONFIG.response_type,
        access_type: GMAIL_CONFIG.access_type,
        prompt: GMAIL_CONFIG.prompt,
        state: authSystem.currentUser.email // Pass user email as state
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// OAuth status checking removed - tokens are stored directly in Firebase

// OAuth callback handling
function checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    const authError = urlParams.get('auth_error');
    
    if (authSuccess === 'gmail_connected') {
        // Gmail was connected successfully
        // Refresh user data from Firebase to get new tokens
        setTimeout(() => {
            refreshUserDataFromFirebase();
        }, 1000);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
        // Authentication failed
        let errorMessage = 'Gmail authentication failed';
        
        switch (authError) {
            case 'access_denied':
                errorMessage = 'Gmail access was denied';
                break;
            case 'no_code':
                errorMessage = 'No authorization code received';
                break;
            case 'token_exchange_failed':
                errorMessage = 'Failed to exchange tokens';
                break;
            case 'callback_failed':
                errorMessage = 'OAuth callback failed';
                break;
        }
        
        showNotification(errorMessage);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Gmail API Functions
async function exchangeGmailCode(authCode) {
    try {
        // Use your API to exchange the code for tokens
        const response = await fetch('https://dashboard-flask-api.onrender.com/oauth/gmail/exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: authCode,
                userEmail: authSystem.currentUser.email
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || result.error) {
            throw new Error(result.error || 'Token exchange failed');
        }
        
        // Store tokens in user data
        await storeGmailTokens(result.tokens);
        
        // Start email monitoring
        startEmailMonitoring();
        
        return result.tokens;
    } catch (error) {
        console.error('Error exchanging Gmail code:', error);
        throw error;
    }
}

async function storeGmailTokens(tokens) {
    try {
        // Get current user data
        const userEmail = authSystem.currentUser.email.replace(/[.#$[\]]/g, '_');
        
        // Get user from Firebase
        const response = await fetch(`${FIREBASE_URL}/users/${userEmail}.json`);
        const userData = await response.json();
        
        // Add Gmail tokens
        userData.gmailTokens = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in,
            token_type: tokens.token_type,
            scope: tokens.scope,
            created_at: new Date().toISOString()
        };
        
        // Save back to Firebase
        await fetch(`${FIREBASE_URL}/users/${userId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        // Update current user
        authSystem.currentUser.gmailTokens = userData.gmailTokens;
        
        // Update local storage
        localStorage.setItem('dashboardUser', JSON.stringify(authSystem.currentUser));
        
        alert('Gmail connected successfully!');
    } catch (error) {
        console.error('Error storing Gmail tokens:', error);
        throw error;
    }
}

async function refreshGmailToken() {
    try {
        const gmailTokens = authSystem.currentUser.gmailTokens;
        
        if (!gmailTokens || !gmailTokens.refresh_token) {
            throw new Error('No refresh token available');
        }
        
        // Use your API to refresh the token
        const response = await fetch('https://dashboard-flask-api.onrender.com/oauth/gmail/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh_token: gmailTokens.refresh_token,
                userEmail: authSystem.currentUser.email
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || result.error) {
            throw new Error(result.error || 'Token refresh failed');
        }
        
        // Update tokens (preserve refresh_token if not provided)
        const updatedTokens = {
            ...gmailTokens,
            access_token: result.tokens.access_token,
            expires_in: result.tokens.expires_in,
            token_type: result.tokens.token_type,
            scope: result.tokens.scope,
            created_at: new Date().toISOString()
        };
        
        if (result.tokens.refresh_token) {
            updatedTokens.refresh_token = result.tokens.refresh_token;
        }
        
        // Store updated tokens
        await storeGmailTokens(updatedTokens);
        
        return updatedTokens;
    } catch (error) {
        console.error('Error refreshing Gmail token:', error);
        throw error;
    }
}

// Gmail API Functions (using your API)
async function makeGmailApiCall(endpoint, method = 'GET', body = null) {
    try {
        if (!authSystem.currentUser || !authSystem.currentUser.gmailTokens) {
            throw new Error('No Gmail access token available');
        }
        
        const requestBody = {
            userEmail: authSystem.currentUser.email,
            endpoint: endpoint,
            method: method,
            ...body
        };
        
        const response = await fetch('https://dashboard-flask-api.onrender.com/gmail/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (!response.ok || result.error) {
            if (response.status === 401 || result.error === 'Token expired') {
                // Token expired, try to refresh
                await refreshGmailToken();
                
                // Retry the request
                return await makeGmailApiCall(endpoint, method, body);
            }
            
            throw new Error(result.error || 'Gmail API call failed');
        }
        
        return result.data;
    } catch (error) {
        console.error('Gmail API call failed:', error);
        throw error;
    }
}

async function searchGmailEmails(query = '', maxResults = 50) {
    try {
        const searchQuery = query || 'transaction OR payment OR purchase OR charge OR debit OR receipt OR invoice OR bank OR card';
        
        const response = await makeGmailApiCall('/users/me/messages', 'GET', {
            q: searchQuery,
            maxResults: maxResults
        });
        
        return response.messages || [];
    } catch (error) {
        console.error('Error searching Gmail emails:', error);
        return [];
    }
}

async function getGmailEmail(messageId) {
    try {
        const response = await makeGmailApiCall(`/users/me/messages/${messageId}`, 'GET', {
            format: 'full'
        });
        return response;
    } catch (error) {
        console.error('Error getting Gmail email:', error);
        return null;
    }
}

// Alternative: Use your API to get transactions directly
async function getGmailTransactions(lastCheck = null) {
    try {
        if (!authSystem.currentUser || !authSystem.currentUser.gmailTokens) {
            throw new Error('No Gmail access token available');
        }
        
        const response = await fetch('https://dashboard-flask-api.onrender.com/gmail/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userEmail: authSystem.currentUser.email,
                lastCheck: lastCheck
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || result.error) {
            throw new Error(result.error || 'Failed to get Gmail transactions');
        }
        
        return result.transactions || [];
    } catch (error) {
        console.error('Error getting Gmail transactions:', error);
        return [];
    }
}

async function extractTransactionFromEmail(email) {
    try {
        const payload = email.payload;
        const headers = payload.headers;
        
        // Get basic email info
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Get email body
        let body = '';
        if (payload.parts) {
            // Multi-part email
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
                    if (part.body.data) {
                        body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                }
            }
        } else if (payload.body.data) {
            // Single-part email
            body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        
        // Extract transaction data using regex patterns
        const transaction = extractTransactionData(subject, body, from, date);
        
        if (transaction) {
            transaction.emailId = email.id;
            transaction.emailSubject = subject;
            transaction.emailFrom = from;
            transaction.emailDate = date;
        }
        
        return transaction;
    } catch (error) {
        console.error('Error extracting transaction from email:', error);
        return null;
    }
}

function extractTransactionData(subject, body, from, date) {
    const text = `${subject} ${body}`.toLowerCase();
    
    // Amount patterns
    const amountPatterns = [
        /\$([0-9,]+\.\d{2})/g,
        /\$([0-9,]+)/g,
        /([0-9,]+\.\d{2})\s*(?:usd|dollars?)/g,
        /amount:?\s*\$?([0-9,]+\.?\d{0,2})/g,
        /charged?\s*\$?([0-9,]+\.?\d{0,2})/g,
        /paid?\s*\$?([0-9,]+\.?\d{0,2})/g
    ];
    
    // Find amount
    let amount = null;
    for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            const amountStr = matches[0].replace(/[^0-9.,]/g, '');
            amount = parseFloat(amountStr.replace(/,/g, ''));
            if (!isNaN(amount) && amount > 0) {
                break;
            }
        }
    }
    
    if (!amount) return null;
    
    // Merchant patterns
    const merchantPatterns = [
        /(?:at|from|to)\s+([a-zA-Z0-9\s&.-]+?)\s+(?:on|for|was|has)/g,
        /merchant:?\s*([a-zA-Z0-9\s&.-]+)/g,
        /purchase\s+(?:at|from)\s+([a-zA-Z0-9\s&.-]+)/g
    ];
    
    let merchant = 'Unknown';
    for (const pattern of merchantPatterns) {
        const matches = text.match(pattern);
        if (matches && matches[1]) {
            merchant = matches[1].trim();
            break;
        }
    }
    
    // Determine transaction type
    const isCredit = /(?:received|refund|deposit|credit|cashback)/i.test(text);
    const type = isCredit ? 'credit' : 'debit';
    
    // Extract card info
    const cardPattern = /\*{4}(\d{4})|ending\s+in\s+(\d{4})|card\s+ending\s+(\d{4})/i;
    const cardMatch = text.match(cardPattern);
    const account = cardMatch ? `****${cardMatch[1] || cardMatch[2] || cardMatch[3]}` : 'Unknown';
    
    // Parse date
    const transactionDate = date ? new Date(date).toISOString() : new Date().toISOString();
    
    return {
        id: `gmail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: amount,
        currency: 'USD',
        date: transactionDate,
        merchant: merchant,
        type: type,
        account: account,
        category: categorizeTransaction(merchant, text),
        description: subject,
        source: 'gmail',
        processed: true,
        verified: false
    };
}

function categorizeTransaction(merchant, text) {
    const categories = {
        'shopping': ['amazon', 'walmart', 'target', 'ebay', 'etsy', 'shopping'],
        'food': ['restaurant', 'mcdonald', 'starbucks', 'pizza', 'food', 'dining'],
        'gas': ['shell', 'exxon', 'bp', 'chevron', 'gas', 'fuel'],
        'entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'movie', 'music'],
        'utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'utility'],
        'healthcare': ['pharmacy', 'doctor', 'hospital', 'medical', 'health'],
        'transport': ['uber', 'lyft', 'taxi', 'bus', 'train', 'transport']
    };
    
    const combinedText = `${merchant} ${text}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => combinedText.includes(keyword))) {
            return category;
        }
    }
    
    return 'other';
}

// Email monitoring functions
let emailMonitoringInterval = null;

function startEmailMonitoring() {
    if (emailMonitoringInterval) {
        clearInterval(emailMonitoringInterval);
    }
    
    // Check emails immediately
    checkNewEmails();
    
    // Set up interval to check every 5 minutes
    emailMonitoringInterval = setInterval(checkNewEmails, 5 * 60 * 1000);
}

function stopEmailMonitoring() {
    if (emailMonitoringInterval) {
        clearInterval(emailMonitoringInterval);
        emailMonitoringInterval = null;
    }
}

async function checkNewEmails() {
    try {
        if (!authSystem.currentUser || !authSystem.currentUser.gmailTokens) {
            return;
        }
        
        // Get the last check timestamp
        const lastCheck = authSystem.currentUser.lastEmailCheck || null;
        
        // Use your API to get processed transactions
        const newTransactions = await getGmailTransactions(lastCheck);
        
        if (!newTransactions.length) {
            return;
        }
        
        // Filter out transactions we already have
        const filteredTransactions = newTransactions.filter(transaction => {
            return !appData.transactions.find(t => t.emailId === transaction.emailId);
        });
        
        // Add new transactions to app data
        if (filteredTransactions.length > 0) {
            appData.transactions = [...filteredTransactions, ...appData.transactions];
            await saveDataToStorage();
            
            // Update UI
            renderTransactions();
            
            // Show notification
            showNotification(`Found ${filteredTransactions.length} new transaction(s) from Gmail`);
        }
        
        // Update last check timestamp
        authSystem.currentUser.lastEmailCheck = new Date().toISOString();
        
        // Update user data in Firebase
        const userId = authSystem.currentUser.id;
        const response = await fetch(`${FIREBASE_URL}/users/${userId}.json`);
        const userData = await response.json();
        userData.lastEmailCheck = authSystem.currentUser.lastEmailCheck;
        
        await fetch(`${FIREBASE_URL}/users/${userId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        // Update localStorage
        localStorage.setItem('dashboardUser', JSON.stringify(authSystem.currentUser));
        
    } catch (error) {
        console.error('Error checking new emails:', error);
    }
}

function showNotification(message, type = 'success') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'email-notification';
    notification.textContent = message;
    
    // Define colors for different types
    const colors = {
        success: '#10b981',
        warning: '#f59e0b', 
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 40px;
        right: 20px;
        background: ${colors[type] || colors.success};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
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

// Dynamic status colors and labels
function getStatusConfig() {
    const defaultColors = ['#64748b', '#3b82f6', '#a855f7', '#fbbf24', '#f97316', '#22c55e', '#ef4444', '#06b6d4', '#84cc16', '#f59e0b'];
    const config = {};
    
    if (appData.taskStatuses) {
        appData.taskStatuses.forEach((status, index) => {
            config[status] = {
                label: status.charAt(0).toUpperCase() + status.slice(1),
                color: defaultColors[index % defaultColors.length]
            };
        });
    }
    
    return config;
}

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
    
    // Wait for authentication to complete before checking user
    // The init() method in AuthSystem handles user loading and UI updates
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
    
    // Initialize Firebase real-time listeners instead of polling
    initializeFirebaseListeners();
    
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
        if (!authSystem || !authSystem.currentUser) {
            return;
        }
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
        taskStatuses: ['pending', 'programming', 'discussion', 'pretest', 'test', 'live'], // Default statuses with "pending" first
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
    if (!appData.teamMembers) appData.teamMembers = [];
    if (!appData.taskStatuses) appData.taskStatuses = ['pending', 'programming', 'discussion', 'pretest', 'test', 'live'];
    
    // Ensure current user is in team members if not already
    if (authSystem && authSystem.currentUser && authSystem.currentUser.name) {
        const userEntry = `${authSystem.currentUser.name} (Me)`;
        if (!appData.teamMembers.includes(userEntry)) {
            appData.teamMembers.unshift(userEntry);
        }
    }
    
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
        if (!authSystem || !authSystem.currentUser) {
            return;
        }
        const userFile = authSystem.getUserFilePath();
        const response = await fetch(`${FIREBASE_URL}/${userFile}`);
        if (response.ok) {
            const firebaseData = await response.json();
            if (firebaseData) {
                const quickNotesElement = document.getElementById('quick-notes');
                const isTypingNotes = quickNotesElement && (
                    document.activeElement === quickNotesElement ||
                    quickNotesElement.matches(':focus')
                );
                const currentQuickNotes = (isTypingNotes || isPasting) ? appData.quickNotes : null;
                appData = firebaseData;
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

// Firebase change detection variables
let firebaseListener = null;
let currentUserFile = null;

// Initialize Firebase polling every 5 seconds
function initializeFirebaseListeners() {
    if (!authSystem || !authSystem.currentUser) {
        console.log('No authenticated user - skipping Firebase polling');
        return;
    }
    
    const userFile = authSystem.getUserFilePath();
    
    // If we already have monitoring for this user, don't create another
    if (firebaseListener && currentUserFile === userFile) {
        return;
    }
    
    // Clean up existing monitoring
    cleanupFirebaseListeners();
    
    console.log('Setting up Firebase polling for:', userFile);
    currentUserFile = userFile;
    
    // Function to refresh data
    async function refreshData() {
        try {
            if (!authSystem || !authSystem.currentUser) {
                return;
            }
            
            const response = await fetch(`${FIREBASE_URL}/${userFile}`);
            if (response.ok) {
                const firebaseData = await response.json();
                if (firebaseData) {
                    // Preserve quick notes if user is currently typing
                    const quickNotesElement = document.getElementById('quick-notes');
                    const isTypingNotes = quickNotesElement && (
                        document.activeElement === quickNotesElement ||
                        quickNotesElement.matches(':focus')
                    );
                    const currentQuickNotes = (isTypingNotes || isPasting) ? appData.quickNotes : null;
                    
                    appData = firebaseData;
                    
                    if ((isTypingNotes || isPasting) && currentQuickNotes !== null) {
                        appData.quickNotes = currentQuickNotes;
                    }
                    
                    renderTasks();
                    updateAllDisplays();
                }
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }
    
    // Load data immediately
    refreshData();
    
    // Poll every 5 seconds
    firebaseListener = setInterval(refreshData, 5000);
    
    console.log('🚀 Firebase polling initialized - checking every 5 seconds');
}

// Clean up Firebase listeners when user logs out
function cleanupFirebaseListeners() {
    if (firebaseListener) {
        console.log('🧹 Cleaning up Firebase polling');
        clearInterval(firebaseListener);
        firebaseListener = null;
    }
    
    currentUserFile = null;
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
            await authSystem.createUserDataFile(authSystem.currentUser.id);
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
            assignees: [authSystem.currentUser ? `${authSystem.currentUser.name} (Me)` : 'Harsha (Me)'],
            status: 'pending',
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

function toggleTask(dateKey, taskId, checkboxElement = null) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            // If trying to complete the main task, check if all subtasks are completed
            if (!task.completed && task.subtasks && task.subtasks.length > 0) {
                const pendingSubtasks = task.subtasks.filter(s => !s.completed);
                if (pendingSubtasks.length > 0) {
                    alert(`Cannot complete this task yet. Please complete all ${pendingSubtasks.length} pending subtasks first.`);
                    
                    // Uncheck the checkbox directly if element is provided
                    if (checkboxElement) {
                        checkboxElement.checked = false;
                    }
                    
                    return;
                }
            }
            
            // Toggle the task completion status
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

// Multiple Assignee Functions
function toggleAssigneeDropdown(dateKey, taskId, buttonElement) {
    const dropdownId = `assign-dropdown-${dateKey}-${taskId}`;
    const dropdown = document.getElementById(dropdownId);
    
    // Close all other dropdowns first and remove their open classes
    document.querySelectorAll('.assign-dropdown').forEach(dd => {
        if (dd.id !== dropdownId) {
            dd.style.display = 'none';
            const container = dd.closest('.task-assign-multi');
            const taskItem = dd.closest('.task-item');
            if (container) {
                container.classList.remove('dropdown-open');
            }
            if (taskItem) {
                taskItem.classList.remove('dropdown-active');
            }
        }
    });
    
    // Toggle current dropdown
    if (dropdown) {
        const container = dropdown.closest('.task-assign-multi');
        const taskItem = dropdown.closest('.task-item');
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
            if (container) {
                container.classList.remove('dropdown-open');
            }
            if (taskItem) {
                taskItem.classList.remove('dropdown-active');
            }
        } else {
            dropdown.style.display = 'block';
            if (container) {
                container.classList.add('dropdown-open');
            }
            if (taskItem) {
                taskItem.classList.add('dropdown-active');
            }
        }
    }
}

// Drag control functions - now work on task text elements
function disableTaskDrag(element) {
    const taskText = element.closest('.task-item').querySelector('.task-text');
    if (taskText) {
        taskText.draggable = false;
        taskText.style.cursor = 'default';
    }
}

function enableTaskDrag(element) {
    const taskText = element.closest('.task-item').querySelector('.task-text');
    if (taskText) {
        taskText.draggable = true;
        taskText.style.cursor = 'grab';
    }
}

// Safe checkbox handler that extracts data from attributes
function handleAssigneeCheckbox(checkbox) {
    const member = checkbox.dataset.member;
    const dateKey = checkbox.dataset.dateKey;
    const taskId = parseInt(checkbox.dataset.taskId);
    const isChecked = checkbox.checked;
    
    updateTaskAssignees(dateKey, taskId, member, isChecked);
}

function updateTaskAssignees(dateKey, taskId, member, isChecked) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            // Initialize assignees array if it doesn't exist or is the old single assignee
            if (!task.assignees || !Array.isArray(task.assignees)) {
                // Migrate from old single assignee to new multiple assignees
                task.assignees = task.assignee ? [task.assignee] : [];
                delete task.assignee; // Remove old property
            }
            
            if (isChecked) {
                // Add member if not already in array
                if (!task.assignees.includes(member)) {
                    task.assignees.push(member);
                }
            } else {
                // Remove member from array
                task.assignees = task.assignees.filter(m => m !== member);
            }
            
            renderTasks();
            saveDataToStorage();
        }
    }
}

// Legacy function for compatibility - now handles single assignment
function assignTask(dateKey, taskId, assignee) {
    if (appData.tasks[dateKey]) {
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            // Convert to new multiple assignee format
            task.assignees = [assignee];
            delete task.assignee; // Remove old property
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
            document.getElementById('task-title-input').value = task.text;
            document.getElementById('task-note-content').value = task.note || '';
            
            // Populate status dropdown with dynamic options
            const statusSelect = document.getElementById('task-status-select');
            const currentStatus = task.status || 'pending';
            statusSelect.innerHTML = (appData.taskStatuses || ['pending']).map(status => 
                `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`
            ).join('');
            
            // Populate issues, subtasks, and appreciation
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
    
    // Render subtasks
    const subtasksList = document.getElementById('subtasks-list');
    const subtasks = task.subtasks || [];
    subtasksList.innerHTML = subtasks.map((subtask, index) => `
        <div class="subtask-item">
            <div class="subtask-checkbox ${subtask.completed ? 'checked' : ''}" 
                 onclick="toggleSubtask(${index})"></div>
            <span class="subtask-text ${subtask.completed ? 'completed' : ''}">${subtask.text}</span>
            <button class="feedback-remove" onclick="removeSubtask(${index})">×</button>
        </div>
    `).join('');
    
    // Update subtask count
    const pendingCount = subtasks.filter(s => !s.completed).length;
    const completedCount = subtasks.filter(s => s.completed).length;
    document.getElementById('subtask-count').textContent = `(${pendingCount} pending, ${completedCount} completed)`;
    
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

function addSubtask() {
    const input = document.getElementById('new-subtask-input');
    const subtaskText = input.value.trim();
    if (subtaskText && currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            if (!task.subtasks) task.subtasks = [];
            task.subtasks.push({
                text: subtaskText,
                completed: false,
                createdAt: new Date().toISOString()
            });
            input.value = '';
            renderModalFeedback(task);
            renderTasks(); // Update task list to show new counts
            saveDataToStorage();
        }
    }
}

function toggleSubtask(index) {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[index]) {
            task.subtasks[index].completed = !task.subtasks[index].completed;
            task.subtasks[index].completedAt = task.subtasks[index].completed ? new Date().toISOString() : null;
            renderModalFeedback(task);
            renderTasks(); // Update task list to show new counts
            saveDataToStorage();
        }
    }
}

function removeSubtask(index) {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task && task.subtasks) {
            task.subtasks.splice(index, 1);
            renderModalFeedback(task);
            renderTasks(); // Update task list to show new counts
            saveDataToStorage();
        }
    }
}

function closeTaskNoteModal() {
    document.getElementById('taskNoteModal').style.display = 'none';
    currentTaskForNote = null;
    
    // Clear inputs
    document.getElementById('new-issue-input').value = '';
    document.getElementById('new-subtask-input').value = '';
    document.getElementById('new-appreciation-input').value = '';
    document.getElementById('task-title-input').value = '';
    
}

function saveTaskNote() {
    if (currentTaskForNote) {
        const { dateKey, taskId } = currentTaskForNote;
        const task = appData.tasks[dateKey].find(t => t.id === taskId);
        if (task) {
            // Update task name if changed
            const newTaskName = document.getElementById('task-title-input').value.trim();
            if (newTaskName && newTaskName !== task.text) {
                task.text = newTaskName;
            }
            
            task.note = document.getElementById('task-note-content').value;
            task.status = document.getElementById('task-status-select').value;
            task.noteUpdatedAt = new Date().toISOString();
            
            saveDataToStorage();
            renderTasks();
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
                <span>👤 ${result.task.assignees && result.task.assignees.length > 0 ? (result.task.assignees.length === 1 ? result.task.assignees[0] : `${result.task.assignees.length} members`) : (result.task.assignee || 'Unassigned')} | 📊 ${result.task.status ? result.task.status.charAt(0).toUpperCase() + result.task.status.slice(1) : 'Pending'}</span>
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

let lastTasksRender = '';
let lastTasksData = null;

function renderTasks(forceUpdate = false) {
    const dateKey = getDateKey(todoViewDate);
    let currentTasks = [];
    
    // Get tasks for current date
    const todayTasks = appData.tasks[dateKey] || [];
    
    // Get uncompleted tasks from previous dates only
    Object.keys(appData.tasks).forEach(key => {
        // Skip current date - we'll add those separately
        if (key !== dateKey) {
            const taskDate = new Date(key);
            const today = new Date(dateKey);
            
            // Only add if the task date is before today
            if (taskDate < today) {
                const previousTasks = appData.tasks[key] || [];
                // Add only uncompleted tasks from previous dates
                const uncompletedPreviousTasks = previousTasks.filter(task => !task.completed);
                currentTasks = currentTasks.concat(uncompletedPreviousTasks.map(task => ({
                    ...task,
                    fromPreviousDate: true,
                    originalDate: key
                })));
            }
        }
    });
    
    // Add today's tasks (both completed and uncompleted)
    currentTasks = currentTasks.concat(todayTasks);
    
    // Sort tasks: incomplete tasks first, then completed tasks at the bottom
    currentTasks.sort((a, b) => {
        // If one is completed and the other isn't, sort by completion status
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1; // Completed tasks go to bottom (1), incomplete stay at top (-1)
        }
        // If both have same completion status, maintain original order (stable sort)
        return 0;
    });
    
    const container = document.getElementById('tasks-container');
    
    // Apply filters if any are active
    if (Object.keys(activeFilters).length > 0) {
        currentTasks = applyTaskFilters(currentTasks, dateKey);
    }
    
    // Create a hash of the task data to check for changes
    const dataHash = JSON.stringify({
        dateKey,
        tasks: currentTasks.map(t => ({ 
            id: t.id, 
            text: t.text, 
            completed: t.completed, 
            priority: t.priority,
            assignees: t.assignees || [t.assignee] || [],
            status: t.status,
            note: t.note,
            noteUpdatedAt: t.noteUpdatedAt,
            issues: t.issues,
            subtasks: t.subtasks,
            appreciation: t.appreciation,
            fromPreviousDate: t.fromPreviousDate,
            originalDate: t.originalDate
        })),
        filters: activeFilters
    });
    
    // Only update if data has changed or forcing update
    if (!forceUpdate && dataHash === lastTasksRender) {
        return;
    }
    
    // Store the current data hash
    lastTasksRender = dataHash;
    lastTasksData = currentTasks;
    
    
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
        container.innerHTML = currentTasks.map(task => {
            const taskDateKey = task.originalDate || dateKey;
            const isFromPrevious = task.fromPreviousDate;
            return `
            <div class="task-item ${isFromPrevious ? 'previous-date-task' : ''}">
                <div class="task-content">
                    <div class="task-left">
                        <div class="task-main">
                            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                                   onchange="toggleTask('${taskDateKey}', ${task.id}, this)">
                            <span class="task-text ${task.completed ? 'completed' : ''}" 
                                  draggable="true" 
                                  ondragstart="dragTask(event, '${taskDateKey}', ${task.id})" 
                                  onclick="openTaskNote('${taskDateKey}', ${task.id})" 
                                  title="Drag to move task or click to add/edit notes and feedback">${task.text}${isFromPrevious ? ` <small style="color: rgba(255,255,255,0.5);">(from ${new Date(task.originalDate).toLocaleDateString()})</small>` : ''}</span>
                        </div>
                        <div class="task-meta">
                            <div class="task-meta-left">
                                <select class="task-status" onchange="changeTaskStatus('${taskDateKey}', ${task.id}, this.value)">
                                    ${(appData.taskStatuses || ['pending']).map(status => 
                                        `<option value="${status}" ${task.status === status ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`
                                    ).join('')}
                                </select>
                                <div class="task-assign-multi" 
                                     onmouseenter="disableTaskDrag(this)" 
                                     onmouseleave="enableTaskDrag(this)"
                                     onmousedown="event.stopPropagation()" 
                                     ondragstart="event.preventDefault(); event.stopPropagation();">
                                    <button class="assign-dropdown-btn" onclick="toggleAssigneeDropdown('${taskDateKey}', ${task.id}, this); event.stopPropagation();">
                                        ${task.assignees && task.assignees.length > 0 ? 
                                            task.assignees[0] + (task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : '')
                                            : 'Assign to...'}
                                        <span class="dropdown-arrow">▼</span>
                                    </button>
                                    <div class="assign-dropdown" id="assign-dropdown-${taskDateKey}-${task.id}" style="display: none;" 
                                         onmouseenter="disableTaskDrag(this)" 
                                         onmouseleave="enableTaskDrag(this)"
                                         onmousedown="event.stopPropagation()" 
                                         ondragstart="event.preventDefault(); event.stopPropagation();">
                                        ${(appData.teamMembers || ['Harsha (Me)']).map(member => `
                                            <label class="assign-option" onmousedown="event.stopPropagation()">
                                                <input type="checkbox" value="${member}" 
                                                    data-member="${member}" 
                                                    data-date-key="${taskDateKey}" 
                                                    data-task-id="${task.id}"
                                                    ${task.assignees && task.assignees.includes(member) ? 'checked' : ''} 
                                                    onchange="handleAssigneeCheckbox(this)"
                                                    onmousedown="event.stopPropagation()">
                                                <span class="assign-label">${member}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="task-meta-right">
                                <div class="task-counts">
                                    ${(task.subtasks?.length || 0) > 0 ? `<span class="count-badge subtask-count">✅ ${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length}</span>` : ''}
                                    ${(task.issues?.length || 0) > 0 ? `<span class="count-badge issues-count">🚨 ${task.issues.length}</span>` : ''}
                                    ${(task.appreciation?.length || 0) > 0 ? `<span class="count-badge appreciation-count">👏 ${task.appreciation.length}</span>` : ''}
                                </div>
                                <button class="task-action-btn" onclick="deleteTask('${taskDateKey}', ${task.id})" title="Delete Task">🗑️</button>
                            </div>
                        </div>
                        ${task.note ? `<div class="task-note">"${task.note.substring(0, 60)}${task.note.length > 60 ? '...' : ''}"</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');
        
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
    if (filterPersonSelect) {
        const teamMembers = (appData && appData.teamMembers) || [];
        filterPersonSelect.innerHTML = `
            <option value="">All People</option>
            ${teamMembers.map(member => `<option value="${member}">${member}</option>`).join('')}
        `;
    }
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
let lastTransactionsData = null;
let lastTransactionsRender = '';

async function renderTransactions(forceUpdate = false) {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    // Skip if transactions section is not visible and not forcing update
    if (container.style.display === 'none' && !forceUpdate) {
        return;
    }
    
    try {
        // Get current user
        const currentUser = authSystem.currentUser;
        if (!currentUser || !currentUser.email) {
            container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">Please login to view transactions</div>';
            return;
        }
        
        // Use user ID for Firebase access
        const userId = currentUser.id;
        const firebaseUrl = 'https://dashboard-app-fcd42-default-rtdb.firebaseio.com';
        
        // Fetch user transactions from user-specific transactions.json file
        const response = await fetch(`${firebaseUrl}/${userId}/transactions.json`);
        
        let transactions = [];
        if (response.ok) {
            const transactionData = await response.json();
            
            if (transactionData) {
                // Handle both encrypted and legacy unencrypted transactions
                transactions = await decryptTransactionsForUI(transactionData);
            }
        }
        
        // Sort transactions by date (most recent first)
        transactions.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date || 0);
            const dateB = new Date(b.timestamp || b.date || 0);
            return dateB - dateA;
        });
        
        // Filter out read transactions and get recent transactions (limit to 10)
        const unreadTransactions = transactions.filter(t => !t.read);
        const recentTransactions = unreadTransactions.slice(0, 10);
        
        // Create a hash of the transaction data to check for changes
        const dataHash = JSON.stringify(recentTransactions.map(t => ({ 
            id: t.id, 
            amount: t.amount, 
            type: t.type, 
            timestamp: t.timestamp || t.date,
            description: t.merchant || t.description || t.emailSubject
        })));
        
        // Only update if data has changed
        if (!forceUpdate && dataHash === lastTransactionsRender) {
            return;
        }
        
        // Store the current data hash
        lastTransactionsRender = dataHash;
        lastTransactionsData = recentTransactions;
        
        if (recentTransactions.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">No recent transactions</div>';
            return;
        }
        
        container.innerHTML = recentTransactions.map(transaction => {
            // Use new transaction structure from ML extraction
            const timestamp = transaction.timestamp || transaction.date || new Date().toISOString();
            const timeAgo = getTimeAgo(timestamp);
            
            // Format date for display - only show if valid
            let dateDisplay = '';
            if (transaction.date && transaction.date !== 'Invalid Date' && transaction.date.match(/\d{2}-\d{2}-\d{2}/)) {
                dateDisplay = transaction.date;
            } else if (timestamp && timestamp !== 'Invalid Date') {
                try {
                    const date = new Date(timestamp);
                    if (!isNaN(date.getTime())) {
                        dateDisplay = date.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: '2-digit'
                        });
                    }
                } catch (e) {
                    // Don't show invalid dates
                }
            }
            
            // Use credit_or_debit from new structure
            const creditOrDebit = transaction.credit_or_debit || 'debit';
            const isCredit = creditOrDebit === 'credit';
            const sign = isCredit ? '+' : '-';
            const colorClass = isCredit ? 'credited' : 'debited';
            
            // Format amount safely
            const amount = transaction.amount || 0;
            const amountDisplay = `${sign}₹${Math.abs(amount).toLocaleString()}`;
            
            // Get merchant name (not description)
            const merchant = transaction.merchant || 'Unknown';
            
            // Get account info - use to_account for credits, account_number for debits
            const accountInfo = isCredit ? 
                (transaction.to_account || transaction.account_number) : 
                (transaction.from_account || transaction.account_number);
            const accountDisplay = accountInfo ? `A/c ${accountInfo}` : 'Unknown Account';
            
            // Get mode (UPI, NEFT, etc.)
            const mode = transaction.mode || 'Unknown';
            
            // Get source info
            const source = transaction.email_from ? 'Auto-detected' : 'Manual';
            
            return `
                <div class="transaction-item" onclick="showTransactionDetails('${transaction.id}')">
                    <div class="transaction-main">
                        <div class="transaction-amount ${colorClass}">${amountDisplay}</div>
                        <div class="transaction-details">
                            <div class="transaction-merchant">${merchant}</div>
                            <div class="transaction-meta">
                                <span class="transaction-account">${accountDisplay}</span>
                                <span class="transaction-mode">• ${mode}</span>
                                <span class="transaction-source">• ${source}</span>
                            </div>
                        </div>
                    </div>
                    <div class="transaction-time">
                        ${dateDisplay ? `<div style="font-size: 11px; color: rgba(255,255,255,0.5);">${dateDisplay}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">Error loading transactions</div>';
    }
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

async function toggleTransactions() {
    const container = document.getElementById('transactions-list');
    const arrow = document.getElementById('transactions-arrow');
    
    if (container.style.display === 'none') {
        // Require Touch ID authentication before showing transactions
        if (window.electronAPI && window.electronAPI.biometric) {
            try {
                container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">🔐 Touch ID authentication required...</div>';
                
                const authResult = await window.electronAPI.biometric.authenticate('Access recent transactions');
                
                if (authResult.success) {
                    container.style.display = 'block';
                    arrow.classList.add('expanded');
                    arrow.textContent = '▲';
                    
                    // Load transactions after successful authentication
                    await renderTransactions(true);
                } else {
                    container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">❌ Authentication failed</div>';
                    setTimeout(() => {
                        container.style.display = 'none';
                        container.innerHTML = '';
                    }, 2000);
                }
            } catch (error) {
                console.error('Touch ID authentication error:', error);
                container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px; font-size: 12px;">❌ Authentication not available</div>';
                setTimeout(() => {
                    container.style.display = 'none';
                    container.innerHTML = '';
                }, 2000);
            }
        } else {
            // Fallback for non-Electron environments
            container.style.display = 'block';
            arrow.classList.add('expanded');
            arrow.textContent = '▲';
            await renderTransactions(true);
        }
    } else {
        container.style.display = 'none';
        arrow.classList.remove('expanded');
        arrow.textContent = '▼';
    }
}

async function showTransactionDetails(transactionId) {
    // Get transactions from Firebase
    let transaction = null;
    
    try {
        const currentUser = authSystem.currentUser;
        if (currentUser && currentUser.id) {
            const firebaseUrl = 'https://dashboard-app-fcd42-default-rtdb.firebaseio.com';
            const response = await fetch(`${firebaseUrl}/${currentUser.id}/transactions.json`);
            
            if (response.ok) {
                const transactions = await response.json();
                if (Array.isArray(transactions)) {
                    transaction = transactions.find(t => t.id === transactionId);
                }
            }
        }
        
        // Fallback to local transactions
        if (!transaction) {
            transaction = appData.transactions.find(t => t.id === transactionId);
        }
    } catch (error) {
        console.error('Error loading transaction details:', error);
        transaction = appData.transactions.find(t => t.id === transactionId);
    }
    
    if (!transaction) return;
    
    currentTransactionId = transactionId;
    
    // Use new transaction structure
    const creditOrDebit = transaction.credit_or_debit || 'debit';
    const isCredit = creditOrDebit === 'credit';
    const sign = isCredit ? '+' : '-';
    const amount = transaction.amount || 0;
    const amountDisplay = `${sign}₹${Math.abs(amount).toLocaleString()}`;
    const colorClass = isCredit ? 'credited' : 'debited';
    
    // Get all available data with new format
    const merchant = transaction.merchant || 'Unknown Merchant';
    const description = transaction.description || 'Transaction processed';
    const accountInfo = isCredit ? 
        (transaction.to_account || transaction.account_number || 'Unknown Account') :
        (transaction.from_account || transaction.account_number || 'Unknown Account');
    const mode = transaction.mode || 'Unknown';
    const date = transaction.date || new Date().toISOString();
    const reference = transaction.reference_number || transaction.id || 'N/A';
    const emailFrom = transaction.email_from || 'Manual Entry';
    const category = transaction.category || 'other';
    const currency = transaction.currency || 'INR';
    
    const detailsHtml = `
        <div class="transaction-amount-large ${colorClass}">
            ${amountDisplay}
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Type:</span>
            <span class="transaction-detail-value">${creditOrDebit.charAt(0).toUpperCase() + creditOrDebit.slice(1)}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Merchant:</span>
            <span class="transaction-detail-value">${merchant}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Account:</span>
            <span class="transaction-detail-value">${accountInfo}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Payment Mode:</span>
            <span class="transaction-detail-value">${mode.toUpperCase()}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Category:</span>
            <span class="transaction-detail-value">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Currency:</span>
            <span class="transaction-detail-value">${currency}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Date:</span>
            <span class="transaction-detail-value">${date}</span>
        </div>
        
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Reference:</span>
            <span class="transaction-detail-value">${reference}</span>
        </div>
        
        
        ${transaction.description && transaction.description !== 'Transaction processed' ? `
        <div class="transaction-detail-row">
            <span class="transaction-detail-label">Description:</span>
            <span class="transaction-detail-value" style="font-size: 12px; color: rgba(255, 255, 255, 0.7);">${transaction.description}</span>
        </div>
        ` : ''}
    `;
    
    document.getElementById('transaction-details-content').innerHTML = detailsHtml;
    document.getElementById('transactionModal').style.display = 'block';
}

async function markTransactionAsRead() {
    if (!currentTransactionId) return;
    
    try {
        // Mark as read in local appData
        const transactionIndex = appData.transactions.findIndex(t => t.id === currentTransactionId);
        if (transactionIndex !== -1) {
            appData.transactions[transactionIndex].read = true;
            saveDataToStorage();
        }
        
        // Mark as read in Firebase if user is authenticated
        if (authSystem.currentUser && authSystem.currentUser.id) {
            const response = await fetch(`${FIREBASE_URL}/${authSystem.currentUser.id}/transactions.json`);
            if (response.ok) {
                const transactions = await response.json();
                if (Array.isArray(transactions)) {
                    const fbTransactionIndex = transactions.findIndex(t => t.id === currentTransactionId);
                    if (fbTransactionIndex !== -1) {
                        transactions[fbTransactionIndex].read = true;
                        // Update the entire transactions array
                        await fetch(`${FIREBASE_URL}/${authSystem.currentUser.id}/transactions.json`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(transactions)
                        });
                    }
                }
            }
        }
        
        closeTransactionModal();
        renderTransactions();
    } catch (error) {
        console.error('Error marking transaction as read:', error);
        // Still close modal even if update fails
        closeTransactionModal();
    }
}

function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
    currentTransactionId = null;
}

// Credit Card Management
// AES-256 Encryption using Web Crypto API
class SecureCardEncryption {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // 96 bits for GCM
    }

    // Generate a secure encryption key from user-specific data
    async generateKey(userSeed) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(userSeed),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Derive AES-256 key
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('dashboard-cards-salt-2024'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt card data
    async encrypt(plaintext, userKey) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                { name: this.algorithm, iv: iv },
                userKey,
                data
            );
            
            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encrypted), iv.length);
            
            // Return as base64
            return btoa(String.fromCharCode(...result));
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt card data');
        }
    }

    // Decrypt card data
    async decrypt(encryptedData, userKey) {
        try {
            // Decode from base64
            const data = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );
            
            // Extract IV and encrypted data
            const iv = data.slice(0, this.ivLength);
            const encrypted = data.slice(this.ivLength);
            
            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                { name: this.algorithm, iv: iv },
                userKey,
                encrypted
            );
            
            // Return as string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt card data');
        }
    }
}

// Initialize encryption system
const cardEncryption = new SecureCardEncryption();
let userEncryptionKey = null;

// Initialize encryption key when user logs in
async function initializeCardEncryption(userId) {
    try {
        // Use consistent seed for same user (no timestamp for key consistency)
        const userSeed = `${userId}-dashboard-encryption-key-v1`;
        userEncryptionKey = await cardEncryption.generateKey(userSeed);
        console.log('🔐 Card encryption key initialized');
    } catch (error) {
        console.error('Failed to initialize card encryption:', error);
    }
}

// Modern secure encrypt function
async function secureEncrypt(text) {
    if (!userEncryptionKey) {
        throw new Error('Encryption key not initialized');
    }
    return await cardEncryption.encrypt(text, userEncryptionKey);
}

// Modern secure decrypt function
async function secureDecrypt(encryptedText) {
    if (!userEncryptionKey) {
        throw new Error('Decryption key not initialized');
    }
    return await cardEncryption.decrypt(encryptedText, userEncryptionKey);
}

// Legacy functions for backward compatibility (will be replaced)
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

// Transaction decryption functions for ML integration
async function decryptTransactionsForUI(transactionData) {
    const transactions = [];
    
    if (!transactionData) return transactions;
    
    // Handle both object (Firebase structure) and array formats
    const transactionEntries = Array.isArray(transactionData) 
        ? transactionData.map((item, index) => [index.toString(), item])
        : Object.entries(transactionData);
    
    for (const [firebaseKey, transaction] of transactionEntries) {
        try {
            if (transaction && typeof transaction === 'object') {
                if (transaction.encrypted_transaction) {
                    // This is an encrypted transaction from ML system
                    try {
                        const decryptedData = JSON.parse(await secureDecrypt(transaction.encrypted_transaction));
                        transactions.push({
                            ...decryptedData,
                            firebase_key: firebaseKey,
                            encrypted: true,
                            timestamp: transaction.timestamp,
                            ml_processed: true
                        });
                    } catch (decryptError) {
                        console.warn(`Failed to decrypt transaction ${firebaseKey}:`, decryptError);
                        // Add placeholder for failed decryption
                        transactions.push({
                            firebase_key: firebaseKey,
                            id: firebaseKey,
                            amount: 0,
                            merchant: 'Encrypted Transaction',
                            description: 'Decryption failed',
                            type: 'unknown',
                            timestamp: transaction.timestamp || new Date().toISOString(),
                            encrypted: true,
                            decryption_error: true,
                            amount_preview: transaction.amount_preview || 'N/A',
                            merchant_preview: transaction.merchant_preview || 'Unknown'
                        });
                    }
                } else {
                    // Legacy unencrypted transaction
                    transactions.push({
                        ...transaction,
                        firebase_key: firebaseKey,
                        encrypted: false,
                        ml_processed: false
                    });
                }
            }
        } catch (error) {
            console.error(`Error processing transaction ${firebaseKey}:`, error);
        }
    }
    
    return transactions;
}

// Enhanced transaction encryption for ML data
async function encryptTransactionForStorage(transactionData) {
    if (!userEncryptionKey) {
        throw new Error('Encryption key not initialized');
    }
    
    const jsonData = JSON.stringify(transactionData);
    return await secureEncrypt(jsonData);
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

async function showCreditCards() {
    try {
        // Require Touch ID authentication to access credit cards
        console.log('🔐 Requesting Touch ID authentication for credit card access...');
        
        const authResult = await window.electronAPI.biometric.authenticate('Access saved credit cards');
        
        if (!authResult.success) {
            alert(`Authentication failed: ${authResult.error || 'Unknown error'}`);
            return;
        }
        
        console.log('✅ Touch ID authentication successful');
        
        document.getElementById('creditCardsModal').style.display = 'block';
        await renderCreditCards();
        
    } catch (error) {
        console.error('Error accessing credit cards:', error);
        alert('Failed to access credit cards. Please try again.');
    }
}

async function renderCreditCards() {
    const container = document.getElementById('credit-cards-list');
    const creditCards = appData.creditCards || [];
    
    if (creditCards.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px;">No saved credit cards</div>';
        return;
    }
    
    // Render cards with masked numbers only
    const cardPromises = creditCards.map(async card => {
        let cardNumber;
        
        try {
            // Handle both new AES-256 and legacy encryption
            if (card.isSecurelyEncrypted) {
                // For display purposes, we'll show a generic masked number
                cardNumber = '****';
            } else {
                // Legacy cards can still be decrypted for masking
                cardNumber = simpleDecrypt(card.encryptedNumber);
            }
        } catch (error) {
            console.error('Error decrypting for display:', error);
            cardNumber = '****';
        }
        
        const maskedNumber = card.isSecurelyEncrypted ? '**** **** **** ****' : maskCardNumber(cardNumber);
        
        return `
            <div class="credit-card-item">
                <div class="card-info">
                    <div class="card-name">${card.name}</div>
                    <div class="card-number">${maskedNumber}</div>
                    ${card.isSecurelyEncrypted ? '<div class="security-badge">🔐 AES-256 Encrypted</div>' : '<div class="security-badge">⚠️ Legacy Encryption</div>'}
                </div>
                <div class="card-actions">
                    <button class="card-action-btn" onclick="showCardDetails(${card.id})">🔐 View</button>
                    <button class="card-action-btn delete" onclick="deleteCard(${card.id})">Delete</button>
                </div>
            </div>
        `;
    });
    
    try {
        const cardHtmlArray = await Promise.all(cardPromises);
        container.innerHTML = cardHtmlArray.join('');
    } catch (error) {
        console.error('Error rendering credit cards:', error);
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.5); padding: 20px;">Error loading credit cards</div>';
    }
}

function showAddCardModal() {
    document.getElementById('addCardModal').style.display = 'block';
    // Clear form
    document.getElementById('card-name').value = '';
    document.getElementById('card-number').value = '';
    document.getElementById('card-expiry').value = '';
    document.getElementById('card-cvv').value = '';
}

async function saveNewCard() {
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
    
    // Encrypt card data with AES-256
    let encryptedNumber, encryptedExpiry, encryptedCVV;
    
    try {
        // Use secure AES-256 encryption
        encryptedNumber = await secureEncrypt(number);
        encryptedExpiry = await secureEncrypt(expiry);
        encryptedCVV = await secureEncrypt(cvv);
    } catch (error) {
        console.error('Encryption failed:', error);
        alert('Failed to encrypt card data. Please ensure you are logged in and try again.');
        return;
    }
    
    const newCard = {
        id: Date.now(),
        name: name,
        encryptedNumber: encryptedNumber,
        encryptedExpiry: encryptedExpiry,
        encryptedCVV: encryptedCVV,
        isSecurelyEncrypted: true, // Flag to indicate AES-256 encryption
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

async function showCardDetails(cardId) {
    const card = appData.creditCards.find(c => c.id === cardId);
    if (!card) return;
    
    try {
        // Require Touch ID authentication to view card details
        console.log('🔐 Requesting Touch ID authentication for card access...');
        
        const authResult = await window.electronAPI.biometric.authenticate('Access credit card details');
        
        if (!authResult.success) {
            alert(`Authentication failed: ${authResult.error || 'Unknown error'}`);
            return;
        }
        
        console.log('✅ Touch ID authentication successful');
        
        // Decrypt card data using AES-256
        let cardNumber, expiry, cvv;
        
        try {
            // Try modern AES-256 decryption first
            if (card.encryptedNumber && card.isSecurelyEncrypted) {
                cardNumber = await secureDecrypt(card.encryptedNumber);
                expiry = await secureDecrypt(card.encryptedExpiry);
                cvv = await secureDecrypt(card.encryptedCVV);
            } else {
                // Fallback to legacy decryption for existing cards
                cardNumber = simpleDecrypt(card.encryptedNumber);
                expiry = simpleDecrypt(card.encryptedExpiry);
                cvv = simpleDecrypt(card.encryptedCVV);
            }
        } catch (decryptError) {
            console.error('Decryption failed:', decryptError);
            alert('Failed to decrypt card data. Please try again.');
            return;
        }
        
        // Show card details in a secure modal
        showSecureCardModal(card.name, cardNumber, expiry, cvv, card.addedDate);
        
    } catch (error) {
        console.error('Error showing card details:', error);
        alert('Failed to access card details. Please try again.');
    }
}

// Secure card details modal
function showSecureCardModal(name, cardNumber, expiry, cvv, addedDate) {
    const modal = document.createElement('div');
    modal.className = 'secure-card-modal';
    modal.innerHTML = `
        <div class="secure-card-overlay" onclick="closeSecureCardModal()"></div>
        <div class="secure-card-content">
            <div class="secure-card-header">
                <h3>🔐 Secure Card Details</h3>
                <button class="secure-card-close" onclick="closeSecureCardModal()">×</button>
            </div>
            <div class="secure-card-body">
                <div class="secure-card-field">
                    <label>Card Name:</label>
                    <span>${name}</span>
                </div>
                <div class="secure-card-field">
                    <label>Card Number:</label>
                    <span class="card-number-secure">${formatCardNumber(cardNumber)}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${cardNumber}')">Copy</button>
                </div>
                <div class="secure-card-field">
                    <label>Expiry Date:</label>
                    <span>${expiry}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${expiry}')">Copy</button>
                </div>
                <div class="secure-card-field">
                    <label>CVV:</label>
                    <span>${cvv}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${cvv}')">Copy</button>
                </div>
                <div class="secure-card-field">
                    <label>Added:</label>
                    <span>${new Date(addedDate).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="secure-card-footer">
                <p>⚠️ This window will auto-close in 30 seconds for security</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-close after 30 seconds for security
    setTimeout(() => {
        if (document.body.contains(modal)) {
            closeSecureCardModal();
        }
    }, 30000);
}

function closeSecureCardModal() {
    const modal = document.querySelector('.secure-card-modal');
    if (modal) {
        modal.remove();
    }
}

// Copy to clipboard function
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Show temporary notification
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = '✅ Copied to clipboard';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(46, 125, 50, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        alert('Failed to copy to clipboard');
    }
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

function searchQuickLinks() {
    const searchTerm = document.getElementById('search-links-input').value.toLowerCase().trim();
    const linkElements = document.querySelectorAll('.quick-link');
    
    if (searchTerm === '') {
        showAllQuickLinks();
        return;
    }
    
    linkElements.forEach(linkElement => {
        const linkText = linkElement.textContent.toLowerCase();
        const linkContent = linkElement.querySelector('.link-content span:last-child');
        const linkName = linkContent ? linkContent.textContent.toLowerCase() : '';
        
        if (linkName.includes(searchTerm) || linkText.includes(searchTerm)) {
            linkElement.classList.remove('hidden');
        } else {
            linkElement.classList.add('hidden');
        }
    });
}

function showAllQuickLinks() {
    const linkElements = document.querySelectorAll('.quick-link');
    linkElements.forEach(linkElement => {
        linkElement.classList.remove('hidden');
    });
}

function handleQuickLinksSearch(event) {
    // Clear search on Escape key
    if (event.key === 'Escape') {
        document.getElementById('search-links-input').value = '';
        showAllQuickLinks();
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

// Drag and Drop Functions
let draggedTask = null;

function dragTask(event, dateKey, taskId) {
    // Store the task data for dropping
    draggedTask = {
        dateKey: dateKey,
        taskId: taskId,
        task: appData.tasks[dateKey].find(t => t.id === taskId)
    };
    
    // Set drag effect
    event.dataTransfer.effectAllowed = "copy";
    
    // Add visual feedback to the task being dragged
    event.target.style.opacity = "0.5";
    
    // Reset opacity when drag ends (for cancelled drags)
    setTimeout(() => {
        if (event.target) {
            event.target.addEventListener('dragend', () => {
                event.target.style.opacity = "";
            });
        }
    }, 0);
    
    console.log('Dragging task:', draggedTask);
}

function allowDrop(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
}

function dragEnter(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    dropZone.classList.add('drag-over');
}

function dragLeave(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    if (!dropZone.contains(event.relatedTarget)) {
        dropZone.classList.remove('drag-over');
    }
}

function dropToImportant(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over');
    
    if (!draggedTask) {
        console.error('No task data available for drop');
        return;
    }
    
    try {
        // Create important feed item
        const importantItem = {
            id: Date.now(),
            originalTaskId: draggedTask.taskId,
            originalDate: draggedTask.dateKey,
            text: draggedTask.task.text,
            assignees: draggedTask.task.assignees || [draggedTask.task.assignee] || [],
            status: draggedTask.task.status,
            addedAt: new Date().toISOString(),
            completed: draggedTask.task.completed
        };
        
        // Add to important feed
        if (!appData.importantFeed) {
            appData.importantFeed = [];
        }
        
        // Check if task is already in important feed
        const exists = appData.importantFeed.some(item => 
            item.originalTaskId === draggedTask.taskId && 
            item.originalDate === draggedTask.dateKey
        );
        
        if (exists) {
            showNotification('Task is already in Important Feed', 'warning');
            return;
        }
        
        appData.importantFeed.unshift(importantItem);
        
        // Save to storage
        saveDataToStorage();
        
        // Update UI
        renderImportantFeed();
        
        // Show success notification
        showNotification('Task added to Important Feed!', 'success');
        
        console.log('Task added to important feed:', importantItem);
        
    } catch (error) {
        console.error('Error adding task to important feed:', error);
        showNotification('Error adding task to Important Feed', 'error');
    } finally {
        // Reset drag state
        draggedTask = null;
        
        // Reset any visual feedback on dragged elements
        const taskElements = document.querySelectorAll('.task-item');
        taskElements.forEach(el => {
            el.style.opacity = "";
        });
    }
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

function toggleImportantFeed() {
    const container = document.getElementById('important-feed');
    const arrow = document.getElementById('important-arrow');
    
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

function clearImportantFeed() {
    if (appData.importantFeed.length === 0) {
        alert('Important Feed is already empty!');
        return;
    }
    
    if (confirm(`Are you sure you want to clear all ${appData.importantFeed.length} important items?`)) {
        appData.importantFeed = [];
        renderImportantFeed();
        saveDataToStorage();
        alert('Important Feed cleared successfully!');
    }
}

function exportImportantFeed() {
    if (appData.importantFeed.length === 0) {
        alert('Important Feed is empty. Nothing to export.');
        return;
    }
    
    const exportData = {
        exportDate: new Date().toISOString(),
        totalItems: appData.importantFeed.length,
        importantItems: appData.importantFeed
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `important-feed-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Exported ${appData.importantFeed.length} important items successfully!`);
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
    const modals = ['linkModal', 'taskNoteModal', 'filterModal', 'trashInstructionsModal', 'profileModal', 'emailConnectionModal'];
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
    
    // Close assignee dropdowns when clicking outside
    if (!event.target.closest('.task-assign-multi')) {
        document.querySelectorAll('.assign-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
            const container = dropdown.closest('.task-assign-multi');
            const taskItem = dropdown.closest('.task-item');
            if (container) {
                container.classList.remove('dropdown-open');
            }
            if (taskItem) {
                taskItem.classList.remove('dropdown-active');
            }
        });
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
        const modals = ['linkModal', 'taskNoteModal', 'filterModal', 'trashInstructionsModal', 'profileModal', 'emailConnectionModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
        
        // Close profile dropdown
        closeProfileDropdown();
        
        // Close email options
        closeEmailOptions();
        
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
        updateUIFromLoadedData();
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
            assignees: [authSystem.currentUser ? `${authSystem.currentUser.name} (Me)` : 'Harsha (Me)'],
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