// Configuration - use config.js if available, otherwise use defaults
const config = window.SecureBankConfig || {
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    },
    adminCredentials: {
        email: 'admin@securebank.com',
        password: 'AdminSecure2024!',
        mfa: '123456'
    },
    app: {
        debug: false
    },
    demo: {
        enabled: true
    }
}

// Initialize Supabase client (will be undefined if credentials are not set)
let supabase = null
if (config.supabase.url !== 'YOUR_SUPABASE_URL' && config.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY') {
    try {
        // Wait for Supabase to load
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(config.supabase.url, config.supabase.anonKey)
            console.log('Supabase client initialized successfully')
        } else {
            console.log('Supabase library not loaded - running in demo mode')
        }
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error)
    }
} else {
    console.log('Supabase not configured - running in demo mode')
}

// Demo credentials for admin, user, business, and support
const DEMO_CREDENTIALS = {
    admin: {
        email: 'admin@securebank.com',
        password: 'AdminSecure2024!',
        mfa: '123456'
    },
    user: {
        email: 'user@securebank.com',
        password: 'UserSecure2024!',
        mfa: '654321'
    },
    business: {
        email: 'business@securebank.com',
        password: 'BusinessSecure2024!',
        mfa: '246810'
    },
    support: {
        email: 'support@securebank.com',
        password: 'SupportSecure2024!',
        mfa: '789012'
    }
}

// Global state
let currentUser = null
let dashboardData = {
    customers: [],
    transactions: [],
    fraudAlerts: [],
    systemMetrics: {}
}

// DOM Elements
const loginForm = document.getElementById('loginForm')
const adminDashboard = document.getElementById('adminDashboard')
const logoutBtn = document.getElementById('logoutBtn')
const navItems = document.querySelectorAll('.dashboard-nav li')

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Supabase to load, then initialize
    setTimeout(() => {
        initializeApp()
        setupEventListeners()
        loadDashboardData()
    }, 100)
})

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('secureBankAdmin')
    if (savedUser) {
        currentUser = JSON.parse(savedUser)
        showDashboard()
    } else {
        showLogin()
    }
}

function setupEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin)
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout)
    
    // Navigation items
    navItems.forEach(item => {
        item.addEventListener('click', () => switchSection(item.dataset.section))
    })
}

async function handleLogin(e) {
    e.preventDefault()
    
    const formData = new FormData(loginForm)
    const email = formData.get('username')
    const password = formData.get('password')
    const mfa = formData.get('mfa')
    
    // Show loading state
    const submitBtn = loginForm.querySelector('.login-btn')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<div class="loading"></div> Authenticating...'
    submitBtn.disabled = true
    
    try {
        // Simulate authentication delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Check admin credentials
        if (email === DEMO_CREDENTIALS.admin.email && 
            password === DEMO_CREDENTIALS.admin.password && 
            mfa === DEMO_CREDENTIALS.admin.mfa) {
            
            // Create admin user session
            currentUser = {
                id: 'admin_001',
                email: email,
                name: 'Admin User',
                role: 'administrator',
                loginTime: new Date().toISOString()
            }
            
            // Save to localStorage
            localStorage.setItem('secureBankAdmin', JSON.stringify(currentUser))
            
            // Log login event to Supabase
            await logSystemEvent('admin_login', {
                user_id: currentUser.id,
                email: currentUser.email,
                timestamp: new Date().toISOString()
            })
            
            showDashboard()
            
        // Check support credentials
        } else if (email === DEMO_CREDENTIALS.support.email && 
                   password === DEMO_CREDENTIALS.support.password && 
                   mfa === DEMO_CREDENTIALS.support.mfa) {
            
            // Redirect to support dashboard
            window.location.href = 'support-dashboard.html'
            return
            
        // Check user credentials
        } else if (email === DEMO_CREDENTIALS.user.email && 
                   password === DEMO_CREDENTIALS.user.password && 
                   mfa === DEMO_CREDENTIALS.user.mfa) {
            
            // Redirect to customer dashboard
            window.location.href = 'customer-dashboard.html'
            
        // Check business credentials
        } else if (email === DEMO_CREDENTIALS.business.email && 
                   password === DEMO_CREDENTIALS.business.password && 
                   mfa === DEMO_CREDENTIALS.business.mfa) {
            
            // Redirect to business dashboard
            window.location.href = 'business-dashboard.html'
            
        } else {
            throw new Error('Invalid credentials')
        }
    } catch (error) {
        alert('Invalid credentials. Please check and try again.')
        console.error('Login error:', error)
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText
        submitBtn.disabled = false
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Log logout event
        logSystemEvent('admin_logout', {
            user_id: currentUser.id,
            timestamp: new Date().toISOString()
        })
        
        // Clear session
        localStorage.removeItem('secureBankAdmin')
        currentUser = null
        showLogin()
    }
}

function showLogin() {
    document.querySelector('.login-container').style.display = 'flex'
    adminDashboard.style.display = 'none'
    loginForm.reset()
}

function showDashboard() {
    document.querySelector('.login-container').style.display = 'none'
    adminDashboard.style.display = 'block'
    loadDashboardData()
}

function switchSection(sectionName) {
    // Update navigation
    navItems.forEach(item => {
        item.classList.remove('active')
        if (item.dataset.section === sectionName) {
            item.classList.add('active')
        }
    })
    
    // Show corresponding section
    const sections = document.querySelectorAll('.dashboard-section')
    sections.forEach(section => {
        section.classList.remove('active')
        if (section.id === sectionName) {
            section.classList.add('active')
        }
    })
    
    // Load section-specific data
    loadSectionData(sectionName)
}

async function loadDashboardData() {
    try {
        // Load all dashboard data from Supabase
        await Promise.all([
            loadCustomers(),
            loadTransactions(),
            loadFraudAlerts(),
            loadSystemMetrics()
        ])
        
        // Update UI with real data
        updateOverviewMetrics()
        updateRecentActivity()
        
    } catch (error) {
        console.error('Error loading dashboard data:', error)
        // Fall back to demo data if Supabase is not configured
        loadDemoData()
    }
}

async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'customers':
            await loadCustomers()
            updateCustomersUI()
            break
        case 'transactions':
            await loadTransactions()
            updateTransactionsUI()
            break
        case 'fraud':
            await loadFraudAlerts()
            updateFraudUI()
            break
        case 'system':
            await loadSystemMetrics()
            updateSystemUI()
            break
    }
}

// Supabase Data Loading Functions
async function loadCustomers() {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
        
        if (error) throw error
        dashboardData.customers = data || []
    } catch (error) {
        console.error('Error loading customers:', error)
        // Use demo data
        dashboardData.customers = getDemoCustomers()
    }
}

async function loadTransactions() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, customers(*)')
            .order('created_at', { ascending: false })
            .limit(100)
        
        if (error) throw error
        dashboardData.transactions = data || []
    } catch (error) {
        console.error('Error loading transactions:', error)
        // Use demo data
        dashboardData.transactions = getDemoTransactions()
    }
}

async function loadFraudAlerts() {
    try {
        const { data, error } = await supabase
            .from('fraud_alerts')
            .select('*, customers(*)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        dashboardData.fraudAlerts = data || []
    } catch (error) {
        console.error('Error loading fraud alerts:', error)
        // Use demo data
        dashboardData.fraudAlerts = getDemoFraudAlerts()
    }
}

async function loadSystemMetrics() {
    try {
        const { data, error } = await supabase
            .from('system_metrics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
        
        if (error) throw error
        dashboardData.systemMetrics = data?.[0] || {}
    } catch (error) {
        console.error('Error loading system metrics:', error)
        // Use demo data
        dashboardData.systemMetrics = getDemoSystemMetrics()
    }
}

async function logSystemEvent(eventType, eventData) {
    try {
        const { error } = await supabase
            .from('system_logs')
            .insert([{
                event_type: eventType,
                event_data: eventData,
                created_at: new Date().toISOString()
            }])
        
        if (error) throw error
    } catch (error) {
        console.error('Error logging system event:', error)
    }
}

// Demo Data Functions (fallback when Supabase is not configured)
function getDemoCustomers() {
    return [
        {
            id: '1',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@email.com',
            account_number: '****5678',
            balance: 45230.50,
            status: 'active',
            created_at: '2024-01-15T10:30:00Z'
        },
        {
            id: '2',
            name: 'Michael Chen',
            email: 'michael.chen@email.com',
            account_number: '****9012',
            balance: 78945.20,
            status: 'active',
            created_at: '2024-01-14T14:20:00Z'
        },
        {
            id: '3',
            name: 'Emily Rodriguez',
            email: 'emily.rodriguez@email.com',
            account_number: '****3456',
            balance: 12340.75,
            status: 'suspended',
            created_at: '2024-01-13T09:15:00Z'
        },
        {
            id: '4',
            name: 'David Thompson',
            email: 'david.thompson@email.com',
            account_number: '****7890',
            balance: 156780.90,
            status: 'active',
            created_at: '2024-01-12T16:45:00Z'
        }
    ]
}

function getDemoTransactions() {
    return [
        {
            id: 'TXN-2024-001',
            customer_id: '1',
            customer_name: 'Sarah Johnson',
            type: 'Wire Transfer',
            amount: 5000.00,
            status: 'completed',
            created_at: '2024-01-20T10:23:00Z'
        },
        {
            id: 'TXN-2024-002',
            customer_id: '2',
            customer_name: 'Michael Chen',
            type: 'ATM Withdrawal',
            amount: 500.00,
            status: 'completed',
            created_at: '2024-01-20T10:18:00Z'
        },
        {
            id: 'TXN-2024-003',
            customer_id: '3',
            customer_name: 'Emily Rodriguez',
            type: 'Online Purchase',
            amount: 127.50,
            status: 'pending',
            created_at: '2024-01-20T10:15:00Z'
        },
        {
            id: 'TXN-2024-004',
            customer_id: '4',
            customer_name: 'David Thompson',
            type: 'Deposit',
            amount: 2500.00,
            status: 'completed',
            created_at: '2024-01-20T10:12:00Z'
        }
    ]
}

function getDemoFraudAlerts() {
    return [
        {
            id: '1',
            customer_id: '1',
            customer_name: 'Sarah Johnson',
            alert_type: 'high_risk',
            title: 'High Risk Transaction',
            description: 'Multiple large withdrawals detected',
            risk_level: 'high',
            amount: 15000.00,
            location: 'International',
            status: 'active',
            created_at: '2024-01-20T09:45:00Z'
        },
        {
            id: '2',
            customer_id: '2',
            customer_name: 'Michael Chen',
            alert_type: 'unusual_pattern',
            title: 'Unusual Spending Pattern',
            description: 'Atypical purchasing behavior detected',
            risk_level: 'medium',
            amount: 2500.00,
            location: 'Local',
            status: 'active',
            created_at: '2024-01-20T08:30:00Z'
        }
    ]
}

function getDemoSystemMetrics() {
    return {
        database_performance: 99.8,
        api_response_time: 45,
        memory_usage: 67,
        storage_usage: 78,
        cpu_usage: 23,
        active_connections: 1247
    }
}

function loadDemoData() {
    dashboardData.customers = getDemoCustomers()
    dashboardData.transactions = getDemoTransactions()
    dashboardData.fraudAlerts = getDemoFraudAlerts()
    dashboardData.systemMetrics = getDemoSystemMetrics()
    
    updateOverviewMetrics()
    updateRecentActivity()
}

// UI Update Functions
function updateOverviewMetrics() {
    const totalCustomers = dashboardData.customers.length
    const totalAssets = dashboardData.customers.reduce((sum, customer) => sum + customer.balance, 0)
    const dailyTransactions = dashboardData.transactions.filter(t => 
        new Date(t.created_at).toDateString() === new Date().toDateString()
    ).length
    const fraudAlerts = dashboardData.fraudAlerts.filter(a => a.status === 'active').length
    
    // Update metric values in DOM
    const metricValues = document.querySelectorAll('.metric-value')
    if (metricValues[0]) metricValues[0].textContent = totalCustomers.toLocaleString()
    if (metricValues[1]) metricValues[1].textContent = `$${(totalAssets / 1000000).toFixed(1)}M`
    if (metricValues[2]) metricValues[2].textContent = dailyTransactions.toLocaleString()
    if (metricValues[3]) metricValues[3].textContent = fraudAlerts.toString()
}

function updateRecentActivity() {
    // This would update the recent activity section with real data
    console.log('Updating recent activity with:', dashboardData.transactions.slice(0, 3))
}

function updateCustomersUI() {
    const customersGrid = document.querySelector('.customers-grid')
    if (!customersGrid) return
    
    customersGrid.innerHTML = dashboardData.customers.map(customer => `
        <div class="customer-card">
            <div class="customer-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="customer-info">
                <h4>${customer.name}</h4>
                <p>Account: ${customer.account_number}</p>
                <p>Balance: $${customer.balance.toLocaleString()}</p>
                <span class="status ${customer.status}">${customer.status}</span>
            </div>
            <div class="customer-actions">
                <button class="btn-sm" onclick="viewCustomer('${customer.id}')">View</button>
                <button class="btn-sm" onclick="editCustomer('${customer.id}')">Edit</button>
            </div>
        </div>
    `).join('')
}

function updateTransactionsUI() {
    const tbody = document.querySelector('.transactions-table tbody')
    if (!tbody) return
    
    tbody.innerHTML = dashboardData.transactions.map(transaction => `
        <tr>
            <td>${transaction.id}</td>
            <td>${transaction.customer_name}</td>
            <td>${transaction.type}</td>
            <td>$${transaction.amount.toLocaleString()}</td>
            <td><span class="status ${transaction.status}">${transaction.status}</span></td>
            <td>${new Date(transaction.created_at).toLocaleTimeString()}</td>
            <td><button class="btn-sm" onclick="viewTransaction('${transaction.id}')">View Details</button></td>
        </tr>
    `).join('')
}

function updateFraudUI() {
    const fraudAlerts = document.querySelector('.fraud-alerts')
    if (!fraudAlerts) return
    
    fraudAlerts.innerHTML = dashboardData.fraudAlerts.map(alert => `
        <div class="alert-card ${alert.risk_level}">
            <div class="alert-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.description} for account ${alert.customer_name}</p>
                <div class="alert-details">
                    <span>Amount: $${alert.amount.toLocaleString()}</span>
                    <span>Location: ${alert.location}</span>
                    <span>Time: ${new Date(alert.created_at).toLocaleTimeString()}</span>
                </div>
            </div>
            <div class="alert-actions">
                <button class="btn-danger" onclick="blockTransaction('${alert.id}')">Block</button>
                <button class="btn-warning" onclick="investigateAlert('${alert.id}')">Investigate</button>
                <button class="btn-success" onclick="approveAlert('${alert.id}')">Approve</button>
            </div>
        </div>
    `).join('')
}

function updateSystemUI() {
    const systemMetrics = document.querySelector('.system-metrics')
    if (!systemMetrics) return
    
    const metrics = dashboardData.systemMetrics
    const metricCards = systemMetrics.querySelectorAll('.metric-card')
    
    if (metricCards[0]) {
        metricCards[0].querySelector('.metric-value').textContent = `${metrics.database_performance}%`
    }
    if (metricCards[1]) {
        metricCards[1].querySelector('.metric-value').textContent = `${metrics.api_response_time}ms`
    }
    if (metricCards[2]) {
        metricCards[2].querySelector('.metric-value').textContent = `${metrics.memory_usage}%`
    }
    if (metricCards[3]) {
        metricCards[3].querySelector('.metric-value').textContent = `${metrics.storage_usage}%`
    }
}

// Action Functions
function viewCustomer(customerId) {
    const customer = dashboardData.customers.find(c => c.id === customerId)
    if (customer) {
        alert(`Customer Details:\nName: ${customer.name}\nEmail: ${customer.email}\nAccount: ${customer.account_number}\nBalance: $${customer.balance.toLocaleString()}\nStatus: ${customer.status}`)
    }
}

function editCustomer(customerId) {
    const customer = dashboardData.customers.find(c => c.id === customerId)
    if (customer) {
        alert(`Edit functionality for ${customer.name} would open here`)
    }
}

function viewTransaction(transactionId) {
    const transaction = dashboardData.transactions.find(t => t.id === transactionId)
    if (transaction) {
        alert(`Transaction Details:\nID: ${transaction.id}\nCustomer: ${transaction.customer_name}\nType: ${transaction.type}\nAmount: $${transaction.amount.toLocaleString()}\nStatus: ${transaction.status}\nTime: ${new Date(transaction.created_at).toLocaleString()}`)
    }
}

function blockTransaction(alertId) {
    if (confirm('Are you sure you want to block this transaction?')) {
        alert('Transaction blocked successfully')
        // Here you would update the database
    }
}

function investigateAlert(alertId) {
    alert('Alert marked for investigation')
    // Here you would update the database
}

function approveAlert(alertId) {
    if (confirm('Are you sure you want to approve this transaction?')) {
        alert('Transaction approved successfully')
        // Here you would update the database
    }
}

// Real-time updates (if Supabase is configured)
function setupRealtimeUpdates() {
    if (!supabase) return
    
    // Subscribe to customer changes
    supabase
        .channel('customers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, 
            payload => {
                console.log('Customer change:', payload)
                loadCustomers()
                updateCustomersUI()
            })
        .subscribe()
    
    // Subscribe to transaction changes
    supabase
        .channel('transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
            payload => {
                console.log('Transaction change:', payload)
                loadTransactions()
                updateTransactionsUI()
                updateOverviewMetrics()
            })
        .subscribe()
    
    // Subscribe to fraud alert changes
    supabase
        .channel('fraud_alerts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fraud_alerts' }, 
            payload => {
                console.log('Fraud alert change:', payload)
                loadFraudAlerts()
                updateFraudUI()
                updateOverviewMetrics()
            })
        .subscribe()
}

// Initialize real-time updates when dashboard is shown
document.addEventListener('DOMContentLoaded', function() {
    if (currentUser) {
        setupRealtimeUpdates()
    }
})

// Demo tab switching function
function switchDemo(demoType) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.demo-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback if event is not available
        document.querySelectorAll('.tab-btn').forEach((btn) => {
            if (btn.textContent.includes(demoType.replace('demo', 'Demo'))) {
                btn.classList.add('active');
            }
        });
    }
    
    const contentElement = document.getElementById(demoType + '-content');
    if (contentElement) {
        contentElement.classList.add('active');
    }
}
