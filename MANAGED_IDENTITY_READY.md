# 🎉 Managed Identity Configuration Complete!

Since you've upgraded to Standard tier and enabled Managed Identity, your setup is now **much simpler** - no secrets to manage!

## ✅ What You've Done

1. ✅ Upgraded Static Web App to Standard tier
2. ✅ Enabled Managed Identity
3. ✅ Granted Log Analytics Reader access to workspace

## 🔍 Verify Your Setup

Run this to confirm your Managed Identity has the correct permissions:

```powershell
# Get your Static Web App's identity
$swaName = "<your-swa-name>"  # Replace with your SWA name
$rgName = "sentinel-maps-v2"

$principalId = az staticwebapp show `
  --name $swaName `
  --resource-group $rgName `
  --query identity.principalId -o tsv

Write-Host "Managed Identity Principal ID: $principalId"

# Check role assignments
az role assignment list `
  --assignee $principalId `
  --scope /subscriptions/338ca753-a1a6-498e-ab21-0937a2d279b0/resourcegroups/sentinel-maps-v2/providers/microsoft.operationalinsights/workspaces/sentinelmaps `
  --query "[].{Role:roleDefinitionName, Scope:scope}" -o table
```

You should see "Log Analytics Reader" in the output.

## 🚀 Deploy & Test

### 1. Install Dependencies (if you haven't already)

```powershell
cd api
npm install
```

### 2. Push to GitHub

The code is now using `DefaultAzureCredential` which automatically detects and uses your Managed Identity:

```powershell
git add .
git commit -m "Add threat intelligence IP visualization with Managed Identity"
git push
```

### 3. Wait for Deployment

Azure Static Web Apps will automatically build and deploy. Monitor in:
- GitHub Actions tab
- Or Azure Portal → Your Static Web App → Deployment History

### 4. Test the API

Once deployed, test your endpoint:

```powershell
$swaUrl = "https://<your-swa-url>.azurestaticapps.net"
Invoke-RestMethod -Uri "$swaUrl/api/threatIntel" -Method Get
```

You should see threat intelligence indicators returned!

## 🧪 Local Development

For local testing, use Azure CLI authentication:

```powershell
# Login with your Azure account
az login

# Start the function locally
cd api
npm install
func start

# Test locally
Invoke-RestMethod -Uri "http://localhost:7071/api/threatIntel" -Method Get
```

## 🎯 How It Works Now

```
Azure Static Web App (Standard Tier)
├── Managed Identity (System-assigned)
│   └── Automatically authenticated by Azure
├── No secrets in configuration
└── Permissions:
    └── Log Analytics Reader on workspace 'sentinelmaps'

When API runs:
1. DefaultAzureCredential detects Managed Identity
2. Automatically gets token from Azure
3. Queries Log Analytics workspace
4. Returns threat intel data
```

## 🔐 Benefits vs Service Principal

| Feature | Managed Identity | Service Principal |
|---------|------------------|-------------------|
| Secret management | ✅ None | ❌ Client secret expires |
| Configuration | ✅ Zero env vars | ❌ 3 env vars needed |
| Security | ✅ Azure-managed | ⚠️ Manual rotation |
| Cost | Standard tier ($9/mo) | Free tier |
| Setup complexity | ✅ Simple | ⚠️ Multiple steps |

## 🎨 Next Steps

1. **Test the UI**: Open your app and click "Threat Intel IPs" button
2. **Monitor usage**: Check Azure Portal → Log Analytics workspace → Usage
3. **Set up alerts** (optional): Get notified when new threat IPs appear
4. **Customize visualization**: Adjust colors, popup content, etc.

## 💡 Optional: Remove Service Principal (if you created one)

Since you're now using Managed Identity, if you previously created an App Registration for service principal authentication, you can remove it:

```powershell
# List and delete the app registration
az ad app delete --id $(az ad app list --display-name "sentinel-maps-api" --query "[0].appId" -o tsv)
```

And remove these environment variables from your Static Web App (if they exist):
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

## 📚 Documentation

- [THREAT_INTEL_SETUP.md](THREAT_INTEL_SETUP.md) - Main setup guide
- [APP_REGISTRATION_SETUP.md](APP_REGISTRATION_SETUP.md) - Service principal setup (for Free tier users)

---

**You're all set!** The API will now automatically use your Managed Identity to query Azure Log Analytics. 🚀
