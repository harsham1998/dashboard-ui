#!/usr/bin/env node

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes (allows iPhone access)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to the dashboard data file
const os = require('os');
const DATA_FILE_PATH = path.join(os.homedir(), 'Documents', 'DashboardElectron', 'dashboard-data.json');

// Utility function to read data
async function readData() {
    try {
        // Check if built app data file exists
        await fs.access(DATA_FILE_PATH);
        const data = await fs.readFile(DATA_FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`⚠️  Built app data file not found: ${DATA_FILE_PATH}`);
        console.log('📝 Creating default data file...');
        
        // Create default data
        const defaultData = {
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
        
        // Try to create the file
        try {
            await saveData(defaultData);
            console.log(`✅ Created data file: ${DATA_FILE_PATH}`);
        } catch (saveError) {
            console.error(`❌ Could not create data file: ${saveError.message}`);
        }
        
        return defaultData;
    }
}

// Utility function to save data
async function saveData(data) {
    try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
        console.log(`✅ Data saved successfully to ${DATA_FILE_PATH}`);
    } catch (error) {
        console.error(`❌ Error saving data: ${error.message}`);
        throw error;
    }
}

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'Dashboard API Server Running',
        version: '1.0.0',
        endpoints: {
            'GET /tasks': 'Get all tasks',
            'POST /tasks': 'Add new task',
            'GET /tasks/:date': 'Get tasks for specific date',
            'POST /siri/add-task': 'Add task via Siri (text or query param)',
            'GET /siri/addTransaction': 'Add transaction via Siri (message param)',
            'GET /transactions': 'Get recent transactions'
        },
        time: new Date().toISOString()
    });
});

// Get all tasks
app.get('/tasks', async (req, res) => {
    try {
        const data = await readData();
        res.json({ success: true, tasks: data.tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get tasks for specific date
app.get('/tasks/:date', async (req, res) => {
    try {
        const data = await readData();
        const date = req.params.date;
        const tasks = data.tasks[date] || [];
        res.json({ success: true, date, tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new task
app.post('/tasks', async (req, res) => {
    try {
        const { text, date, assignedTo = 'Harsha (Me)' } = req.body;
        
        if (!text) {
            return res.status(400).json({ success: false, error: 'Task text is required' });
        }
        
        const taskDate = date || new Date().toISOString().split('T')[0];
        const data = await readData();
        
        if (!data.tasks[taskDate]) {
            data.tasks[taskDate] = [];
        }
        
        const newTask = {
            id: Date.now(),
            text: text.trim(),
            completed: false,
            assignee: assignedTo,
            status: 'pending',
            note: '',
            issues: [],
            appreciation: [],
            createdAt: new Date().toISOString()
        };
        
        data.tasks[taskDate].push(newTask);
        await saveData(data);
        
        res.json({ 
            success: true, 
            message: 'Task added successfully',
            task: newTask,
            date: taskDate
        });
        
        console.log(`✅ Task added: "${text}" for ${taskDate}`);
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Siri-specific endpoint (supports both GET and POST)
app.all('/siri/add-task', async (req, res) => {
    try {
        // Get task text from query param or request body
        const taskText = req.query.text || req.body.text || req.query.task || req.body.task;
        
        if (!taskText) {
            return res.status(400).json({ 
                success: false, 
                error: 'Task text is required. Use ?text=your_task or POST with {"text": "your_task"}' 
            });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const data = await readData();
        
        if (!data.tasks[today]) {
            data.tasks[today] = [];
        }
        
        const newTask = {
            id: Date.now(),
            text: taskText.trim(),
            completed: false,
            assignee: 'Harsha (Me)',
            status: 'pending',
            note: '',
            issues: [],
            appreciation: [],
            createdAt: new Date().toISOString()
        };
        
        data.tasks[today].push(newTask);
        await saveData(data);
        
        res.json({ 
            success: true, 
            message: `Task added via Siri: "${taskText}"`,
            task: newTask,
            date: today
        });
        
        console.log(`🎤 Siri task added: "${taskText}" for ${today}`);
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Transaction parsing function
function parseTransactionMessage(message) {
    const msg = message.toLowerCase();
    
    // Check if message contains transaction keywords
    const transactionKeywords = [
        'transaction', 'payment', 'transfer', 'credited', 'debited', 
        'upi', 'imps', 'neft', 'rtgs', 'atm', 'card', 'account', 'balance',
        'sent', 'received', 'withdraw', 'deposit', 'successful', 'failed'
    ];
    
    const hasTransactionKeyword = transactionKeywords.some(keyword => msg.includes(keyword));
    if (!hasTransactionKeyword) {
        return null; // Not a transaction message
    }
    
    // Extract amount
    const amountMatch = msg.match(/(?:rs\.?\s*|₹\s*|inr\s*)?(\d+(?:,\d+)*(?:\.\d{2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    // Determine transaction type
    let type = 'debited';
    if (msg.includes('credited') || msg.includes('received') || msg.includes('deposit')) {
        type = 'credited';
    } else if (msg.includes('debited') || msg.includes('sent') || msg.includes('withdraw') || msg.includes('payment')) {
        type = 'debited';
    }
    
    // Extract bank
    const banks = ['hdfc', 'sbi', 'icici', 'axis', 'kotak', 'pnb', 'bob', 'canara', 'union', 'indian', 'boi', 'central', 'syndicate', 'uco', 'vijaya', 'dena', 'corporation', 'allahabad', 'ubi', 'obc', 'andhra', 'karur', 'federal', 'south indian', 'city union', 'dhanlaxmi', 'karnataka', 'maharashtra', 'rajasthan', 'uttar bihar', 'west bengal', 'punjab', 'tamil nadu', 'telangana', 'kerala', 'paytm', 'phonepe', 'googlepay', 'amazon pay', 'mobikwik', 'freecharge', 'airtel'];
    let bank = 'Unknown';
    for (const b of banks) {
        if (msg.includes(b)) {
            bank = b.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            break;
        }
    }
    
    // Extract mode
    let mode = 'Unknown';
    if (msg.includes('upi')) mode = 'UPI';
    else if (msg.includes('card') || msg.includes('debit') || msg.includes('credit')) mode = 'Card';
    else if (msg.includes('imps')) mode = 'IMPS';
    else if (msg.includes('neft')) mode = 'NEFT';
    else if (msg.includes('rtgs')) mode = 'RTGS';
    else if (msg.includes('atm')) mode = 'ATM';
    else if (msg.includes('transfer')) mode = 'Bank Transfer';
    else if (msg.includes('cash')) mode = 'Cash';
    
    // Extract balance
    const balanceMatch = msg.match(/(?:balance|bal|available)\s*(?:is|:)?\s*(?:rs\.?\s*|₹\s*|inr\s*)?(\d+(?:,\d+)*(?:\.\d{2})?)/i);
    const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null;
    
    // Extract description/merchant
    let description = '';
    const toMatch = msg.match(/(?:to|from)\s+([a-zA-Z0-9\s@._-]+?)(?:\s+(?:rs|₹|inr|is|for|on|at)|\s*$)/i);
    if (toMatch) {
        description = toMatch[1].trim();
    } else {
        // Look for merchant/service names
        const merchants = ['amazon', 'flipkart', 'zomato', 'swiggy', 'uber', 'ola', 'paytm', 'phonepe', 'google', 'netflix', 'spotify', 'jio', 'airtel', 'vodafone', 'bsnl', 'irctc', 'makemytrip', 'booking', 'myntra', 'ajio', 'nykaa', 'bigbasket', 'grofers', 'dunzo', 'zepto', 'blinkit'];
        for (const merchant of merchants) {
            if (msg.includes(merchant)) {
                description = merchant.charAt(0).toUpperCase() + merchant.slice(1);
                break;
            }
        }
    }
    
    return {
        amount,
        type,
        bank,
        mode,
        balance,
        description: description || 'Transaction',
        rawMessage: message
    };
}

// Add transaction endpoint
app.get('/siri/addTransaction', async (req, res) => {
    try {
        const message = req.query.message;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message parameter is required'
            });
        }
        
        // Parse the transaction message
        const transactionData = parseTransactionMessage(message);
        
        if (!transactionData) {
            return res.json({
                success: false,
                message: 'Message does not contain transaction information',
                ignored: true
            });
        }
        
        // Load existing data
        const data = await readData();
        
        // Ensure transactions array exists
        if (!data.transactions) {
            data.transactions = [];
        }
        
        // Create transaction object
        const transaction = {
            id: Date.now(),
            ...transactionData,
            timestamp: new Date().toISOString()
        };
        
        // Add to transactions array (keep only last 50 transactions)
        data.transactions.unshift(transaction);
        if (data.transactions.length > 50) {
            data.transactions = data.transactions.slice(0, 50);
        }
        
        // Save data
        await saveData(data);
        
        res.json({
            success: true,
            message: 'Transaction added successfully',
            transaction
        });
        
        console.log(`💳 Transaction added: ${transaction.type} ₹${transaction.amount} via ${transaction.mode}`);
        
    } catch (error) {
        console.error('Transaction processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Get recent transactions endpoint
app.get('/transactions', async (req, res) => {
    try {
        const data = await readData();
        const limit = parseInt(req.query.limit) || 5;
        const transactions = (data.transactions || []).slice(0, limit);
        
        res.json({
            success: true,
            transactions,
            count: transactions.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Dashboard API Server Started!');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://YOUR_MAC_IP:${PORT}`);
    console.log(`📁 Data file: ${DATA_FILE_PATH}`);
    console.log('');
    console.log('📱 Endpoints:');
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   POST http://localhost:${PORT}/siri/add-task`);
    console.log(`   GET  http://localhost:${PORT}/tasks`);
    console.log('');
    console.log('🎤 Siri Usage:');
    console.log(`   http://localhost:${PORT}/siri/add-task?text=Buy%20groceries`);
    console.log('');
    console.log('💡 To get your Mac IP for iPhone: ipconfig getifaddr en0');
    console.log('✅ Server ready for Siri shortcuts!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔴 Shutting down Dashboard API Server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔴 Shutting down Dashboard API Server...');
    process.exit(0);
});