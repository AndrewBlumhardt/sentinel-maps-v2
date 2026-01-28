# App Registration Setup for Log Analytics Access (Free Tier)

> **Note**: If you have **Standard tier** Static Web App, use **Managed Identity** instead (simpler, no secrets to manage). See [THREAT_INTEL_SETUP.md](THREAT_INTEL_SETUP.md) for Managed Identity setup.

This guide is for **Free tier** Static Web Apps that don't support Managed Identity. You'll use an **App Registration** with a service principal to authenticate.

## Step 1: Create App Registration

### Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (or **Microsoft Entra ID**)
3. Click **App registrations** → **New registration**
4. Fill in:
   - **Name**: `sentinel-maps-api`
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank (not needed for API access)
5. Click **Register**

### Using Azure CLI

```bash
# Create the app registration
az ad app create --display-name "sentinel-maps-api"

# Get the application ID (you'll need this)
az ad app list --display-name "sentinel-maps-api" --query "[0].appId" -o tsv
```

## Step 2: Create Client Secret

### Using Azure Portal

1. In your new App Registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `sentinel-maps-swa-key`
4. Choose expiration: **24 months** (or your preferred duration)
5. Click **Add**
6. **⚠️ IMMEDIATELY COPY THE SECRET VALUE** - you can't view it again!

### Using Azure CLI

```bash
# Create a client secret (save the output!)
az ad app credential reset --id <app-id-from-step-1> --display-name "sentinel-maps-swa-key" --years 2
```

**Save these values somewhere secure:**
- `appId` → This is your **AZURE_CLIENT_ID**
- `password` → This is your **AZURE_CLIENT_SECRET**
- `tenant` → This is your **AZURE_TENANT_ID**

## Step 3: Grant Log Analytics Reader Permission

Now give your service principal permission to read from the Log Analytics workspace.

### Using Azure Portal

1. Go to your **Log Analytics workspace** (`sentinelmaps`)
2. Click **Access control (IAM)**
3. Click **Add** → **Add role assignment**
4. Select role: **Log Analytics Reader**
5. Click **Next**
6. Click **Select members**
7. Search for: `sentinel-maps-api`
8. Select it and click **Select**
9. Click **Review + assign**

### Using Azure CLI

```bash
# Get your app's object ID (different from app ID)
APP_OBJECT_ID=$(az ad sp list --display-name "sentinel-maps-api" --query "[0].id" -o tsv)

# If the service principal doesn't exist yet, create it
if [ -z "$APP_OBJECT_ID" ]; then
  APP_ID=$(az ad app list --display-name "sentinel-maps-api" --query "[0].appId" -o tsv)
  az ad sp create --id $APP_ID
  APP_OBJECT_ID=$(az ad sp list --display-name "sentinel-maps-api" --query "[0].id" -o tsv)
fi

# Assign Log Analytics Reader role
az role assignment create \
  --role "Log Analytics Reader" \
  --assignee $APP_OBJECT_ID \
  --scope /subscriptions/338ca753-a1a6-498e-ab21-0937a2d279b0/resourcegroups/sentinel-maps-v2/providers/microsoft.operationalinsights/workspaces/sentinelmaps
```

## Step 4: Configure Static Web App Environment Variables

You need to add the credentials to your Static Web App configuration.

### Using Azure Portal

1. Go to your **Static Web App** in Azure Portal
2. Click **Configuration** (under Settings)
3. Click **Add** to add these three application settings:

| Name | Value |
|------|-------|
| `AZURE_TENANT_ID` | Your tenant ID (from step 2) |
| `AZURE_CLIENT_ID` | Your app ID (from step 2) |
| `AZURE_CLIENT_SECRET` | Your client secret (from step 2) |

4. Click **Save**

### Using Azure CLI

```bash
# Get your Static Web App name
SWA_NAME="<your-static-web-app-name>"

# Set the environment variables
az staticwebapp appsettings set \
  --name $SWA_NAME \
  --resource-group sentinel-maps-v2 \
  --setting-names \
    AZURE_TENANT_ID="<your-tenant-id>" \
    AZURE_CLIENT_ID="<your-app-id>" \
    AZURE_CLIENT_SECRET="<your-client-secret>"
```

### For Local Development

Create a file `api/local.settings.json` (this is gitignored):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_TENANT_ID": "your-tenant-id-here",
    "AZURE_CLIENT_ID": "your-app-id-here",
    "AZURE_CLIENT_SECRET": "your-client-secret-here",
    "AZURE_MAPS_KEY": "your-azure-maps-key-here"
  }
}
```

## Step 5: Verify Configuration

### Test Locally

```bash
cd api
npm install
func start
```

Then test the endpoint:
```bash
curl http://localhost:7071/api/threatIntel
```

### Test After Deployment

After pushing to GitHub and Azure deploys:
```bash
curl https://<your-swa-url>/api/threatIntel
```

## Security Best Practices

1. **Rotate secrets regularly** - Set calendar reminder to rotate every 12-24 months
2. **Use Key Vault (optional)** - For production, consider storing secrets in Azure Key Vault
3. **Least privilege** - The service principal only has Log Analytics Reader (read-only)
4. **Monitor usage** - Check Azure AD sign-in logs periodically

## Troubleshooting

### "AADSTS7000215: Invalid client secret"
- Client secret expired or incorrect
- Create a new secret in App Registration → Certificates & secrets
- Update `AZURE_CLIENT_SECRET` in Static Web App configuration

### "Failed to fetch threat intel: 403"
- Service principal doesn't have Log Analytics Reader role
- Re-run the role assignment command from Step 3

### "Azure credentials not configured"
- Environment variables not set in Static Web App
- Check Configuration section in Azure Portal
- Verify variable names match exactly (case-sensitive)

### Local development not working
- Make sure `api/local.settings.json` exists with all credentials
- This file is in `.gitignore` - never commit it!

## Summary

**What you created:**
- App Registration: `sentinel-maps-api`
- Service Principal: Automatically created with the app
- Client Secret: Valid for 2 years (renewable)

**Permissions granted:**
- Log Analytics Reader on workspace `sentinelmaps`

**Environment variables required:**
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID` 
- `AZURE_CLIENT_SECRET`
- `AZURE_MAPS_KEY` (already exists)

Now your API can authenticate to Azure Log Analytics without needing a Standard tier Static Web App!
