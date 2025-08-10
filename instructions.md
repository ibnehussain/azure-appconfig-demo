# Azure App Configuration + Key Vault + App Service Lab

## Prerequisites

1. **Fork the repository:**
   - GitHub Repo: [https://github.com/ibnehussain/azure-appconfig-demo.git](https://github.com/ibnehussain/azure-appconfig-demo.git)
2. **Admin access** to create Managed Identity in Azure.

---

## Lab Instructions

### Step 1: Create an Azure App Configuration Store
1. Go to the **Azure Portal**.
2. Search for **App Configuration** → Click **Create**.
3. Fill in details:
   - **Resource Group**
   - **Name**
   - **Location**
4. Click **Create**.
5. Once created, go to **Configuration Explorer** and add these key-value pairs:

| Key                  | Value                             |
|----------------------|-----------------------------------|
| `PromoBanner/Text`   | `Summer Sale - 50% Off!`           |
| `PromoBanner/Color`  | `blue` *(or any CSS color like `#FF5733`)* |
| `Feature/NewCheckout`| `true`                            |

---

### Step 2: Set Up Azure Key Vault
1. **Create a Key Vault:**
   - Go to Azure Portal.
   - Search for **Key Vault** → **Create**.
   - Fill in:
     - **Name**
     - **Resource Group**
     - **Region**
   - Click **Review + create** → **Create**.
   
2. **Add App Configuration connection string as a secret:**
   - Go to your new **Key Vault** → **Secrets** → **Generate/Import**.
   - **Name:** `AppConfigConnectionString`
   - **Value:** Paste your App Configuration connection string.
   - Click **Create**.

---

### Step 3: Deploy Azure App Service
- Create an **Azure Web App** with stack set to **Node 20 LTS**.

---

### Step 4: Configure Azure App Service (Enable Managed Identity)
1. Go to your App Service → **Identity**.
2. Turn on **System assigned** identity → **Save**.

---

### Step 5: Grant Key Vault Access to Identity
1. Go to your Key Vault → **Access control (IAM)**.
2. Click **Add role assignment**.
3. Select role: **Key Vault Secrets User**.
4. Assign access to: **Managed identity**.
5. Select your **App Service's identity**.
6. Click **Review + assign**.

---

### Step 6: Update `app.js` to use Key Vault
```javascript
// Key Vault URL (replace with yours)
const keyVaultUrl = "https://YOUR-KEYVAULT-NAME.vault.azure.net";
