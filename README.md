# Azure App Configuration + Key Vault + App Service Demo

A Node.js Express application demonstrating how to securely load dynamic configuration from **Azure App Configuration**, with secrets managed by **Azure Key Vault** and deployed to **Azure App Service** using **Managed Identity** — no hardcoded credentials.

---

## Architecture

```
Azure App Service (Node.js)
  └── Managed Identity
        └── Azure Key Vault  ← stores App Configuration connection string
              └── Azure App Configuration  ← stores feature flags & settings
```

---

## Features

- Fetches the App Configuration connection string securely from Key Vault at runtime
- Reads key-value pairs (`PromoBanner/Text`, `PromoBanner/Color`, `Feature/NewCheckout`) from App Configuration
- Renders a dynamic promotional banner with color and text driven by configuration
- Toggles a "New Checkout" feature flag on/off without redeploying

---

## Prerequisites

- An Azure subscription with permissions to create resources
- [Node.js 20 LTS](https://nodejs.org/) installed locally
- Azure CLI (`az`) for local testing with `DefaultAzureCredential`

---

## Local Setup

```bash
# Install dependencies
npm install

# For local development, log in with Azure CLI so DefaultAzureCredential works
az login

# Set the Key Vault URL in app.js, then start the app
npm start
```

The app will be available at `http://localhost:3000`.

---

## Azure Deployment

### Step 1: Create an App Configuration Store

1. In the Azure Portal, search for **App Configuration** → **Create**.
2. Fill in **Resource Group**, **Name**, and **Location**, then click **Create**.
3. Open **Configuration Explorer** and add the following key-value pairs:

| Key                   | Value                          |
|-----------------------|--------------------------------|
| `PromoBanner/Text`    | `Summer Sale - 50% Off!`       |
| `PromoBanner/Color`   | `blue` (or any CSS color)      |
| `Feature/NewCheckout` | `true`                         |

### Step 2: Create a Key Vault and Store the Connection String

1. Search for **Key Vault** → **Create**. Provide **Name**, **Resource Group**, and **Region**.
2. Go to **Secrets** → **Generate/Import**.
   - **Name:** `AppConfigConnectionString`
   - **Value:** Paste the connection string from your App Configuration store.

### Step 3: Create an App Service

- Create an **Azure Web App** with runtime stack **Node 20 LTS**.

### Step 4: Enable Managed Identity

1. Go to your App Service → **Identity**.
2. Turn on **System assigned** identity → **Save**.

### Step 5: Grant Key Vault Access

1. Go to your Key Vault → **Access control (IAM)** → **Add role assignment**.
2. Role: **Key Vault Secrets User**.
3. Assign access to **Managed identity** → select your App Service identity.
4. Click **Review + assign**.

### Step 6: Configure app.js

Update the Key Vault URL in `app.js`:

```javascript
const keyVaultUrl = "https://YOUR-KEYVAULT-NAME.vault.azure.net/";
```

### Step 7: Deploy to App Service

Deploy using the Azure CLI, VS Code extension, or GitHub Actions. The app will use Managed Identity automatically — no secrets in code or environment variables.

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server |
| `@azure/app-configuration` | Read key-values from App Configuration |
| `@azure/keyvault-secrets` | Retrieve secrets from Key Vault |
| `@azure/identity` | `DefaultAzureCredential` for passwordless auth |

---

## Security Notes

- No connection strings or secrets are stored in code or environment variables.
- `DefaultAzureCredential` uses Managed Identity on Azure and Azure CLI credentials locally.
- Access is scoped to the minimum required role (**Key Vault Secrets User**).

