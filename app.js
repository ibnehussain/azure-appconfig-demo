const express = require('express');
const { AppConfigurationClient } = require('@azure/app-configuration');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3001; // Changed to 3001 for backend

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Use DefaultAzureCredential which will automatically use:
// - Environment variables (for local development)
// - Managed Identity (when deployed to Azure)
const credential = new DefaultAzureCredential();

// Key Vault URL (replace with yours)
const keyVaultUrl = "https://honeywellvault.vault.azure.net/";

// Create Secret Client
const secretClient = new SecretClient(keyVaultUrl, credential);

// JWT Secret (in production, this should come from Key Vault)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock user database (in production, use a real database)
const users = [
    {
        id: 1,
        username: 'demo@ltimindtree.com',
        password: '$2b$10$rOzWbkQ9p5Fy8.QqZ6m7CeHPFZGVN1wR8PjHgF5nC2QxGkY7mKfO2', // 'password123'
        name: 'Demo User'
    }
];

// Helper function to get App Configuration client
async function getAppConfigClient() {
    try {
        const connectionString = await secretClient.getSecret("AppConfigConnectionString");
        return new AppConfigurationClient(connectionString.value);
    } catch (error) {
        console.error('Error getting App Config client:', error);
        throw error;
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'azure-appconfig-demo-backend'
    });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find user
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                name: user.name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Get all configuration settings
app.get('/api/config', authenticateToken, async (req, res) => {
    try {
        const client = await getAppConfigClient();

        // Fetch settings from Azure App Configuration
        const promoText = await client.getConfigurationSetting({ key: "PromoBanner/Text" });
        const promoColor = await client.getConfigurationSetting({ key: "PromoBanner/Color" });
        const newCheckoutEnabled = await client.getConfigurationSetting({ key: "Feature/NewCheckout" });

        res.json({
            success: true,
            config: {
                promoBanner: {
                    text: promoText.value,
                    color: promoColor.value
                },
                features: {
                    newCheckout: newCheckoutEnabled.value === "true"
                }
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load configuration',
            details: error.message 
        });
    }
});

// Get specific configuration setting
app.get('/api/config/:key', authenticateToken, async (req, res) => {
    try {
        const client = await getAppConfigClient();
        const { key } = req.params;
        
        const setting = await client.getConfigurationSetting({ key });
        
        res.json({
            success: true,
            key: setting.key,
            value: setting.value,
            lastModified: setting.lastModified
        });
    } catch (error) {
        console.error('Error loading setting:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load configuration setting',
            details: error.message 
        });
    }
});

// Legacy web interface (for backward compatibility)
app.get('/', async (req, res) => {
    try {
        const client = await getAppConfigClient();

        // Fetch settings from Azure App Configuration
        const promoText = await client.getConfigurationSetting({ key: "PromoBanner/Text" });
        const promoColor = await client.getConfigurationSetting({ key: "PromoBanner/Color" });
        const newCheckoutEnabled = await client.getConfigurationSetting({ key: "Feature/NewCheckout" });

        // Render the page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Azure App Config + Key Vault Demo</title>
                <style>
                    .banner {
                        background-color: ${promoColor.value};
                        color: white;
                        padding: 20px;
                        text-align: center;
                        font-size: 24px;
                        margin-bottom: 20px;
                    }
                    .api-info {
                        background-color: #f0f0f0;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="banner">${promoText.value}</div>
                <h1>Welcome to our LTI Mindtree Store!</h1>
                <p>New Checkout Feature: ${newCheckoutEnabled.value === "true" ? "🟢 Enabled" : "🔴 Disabled"}</p>
                <p><small>Configuration securely stored in Key Vault</small></p>
                
                <div class="api-info">
                    <h3>🔗 API Endpoints Available:</h3>
                    <ul>
                        <li><strong>POST</strong> /api/auth/login - User authentication</li>
                        <li><strong>GET</strong> /api/auth/profile - Get user profile (requires auth)</li>
                        <li><strong>GET</strong> /api/config - Get all configuration settings (requires auth)</li>
                        <li><strong>GET</strong> /api/config/:key - Get specific setting (requires auth)</li>
                        <li><strong>GET</strong> /api/health - Health check</li>
                    </ul>
                    <p><strong>Demo Credentials:</strong> demo@ltimindtree.com / password123</p>
                    <p><strong>Frontend URL:</strong> <a href="http://localhost:3000">http://localhost:3000</a></p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.send(`<h1>Error loading settings</h1><p>${error.message}</p>`);
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
});

app.listen(port, () => {
    console.log(`🚀 Backend API running at http://localhost:${port}`);
    console.log(`📋 API Documentation available at http://localhost:${port}`);
    console.log(`🔒 Authentication required for /api/config endpoints`);
});

module.exports = app;