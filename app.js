const express = require('express');
const { AppConfigurationClient } = require('@azure/app-configuration');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const port = process.env.PORT || 3000;

// Use DefaultAzureCredential which will automatically use:
// - Environment variables (for local development)
// - Managed Identity (when deployed to Azure)
const credential = new DefaultAzureCredential();

// Key Vault URL (replace with yours)
const keyVaultUrl = "https://bmwkeyvault001.vault.azure.net/";

// Create Secret Client
const secretClient = new SecretClient(keyVaultUrl, credential);

app.get('/', async (req, res) => {
    try {
        // First get the connection string from Key Vault
        const connectionString = await secretClient.getSecret("AppConfigConnectionString");
        
        // Then connect to App Configuration
        const client = new AppConfigurationClient(connectionString.value);

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
                </style>
            </head>
            <body>
                <div class="banner">${promoText.value}</div>
                <h1>Welcome to our BMW Store!</h1>
                <p>New Checkout Feature: ${newCheckoutEnabled.value === "true" ? "🟢 Enabled" : "🔴 Disabled"}</p>
                <p><small>Configuration securely stored in Key Vault</small></p>
            </body>
            </html>
        `);
    } catch (error) {
        res.send(`<h1>Error loading settings</h1><p>${error.message}</p>`);
    }
});

app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});
