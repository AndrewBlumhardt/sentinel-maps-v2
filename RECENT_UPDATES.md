# Recent Updates Summary (February 2026)

## ✅ Completed Setup

### Infrastructure
1. **Upgraded Static Web App** to Standard tier
2. **Enabled Managed Identity** (System-assigned)
3. **Granted Permissions**: Log Analytics Reader role on Sentinel workspace
   - Workspace ID: `7e65e430-26bf-456e-9b41-4fa4226a45f2`
   - Subscription: `338ca753-a1a6-498e-ab21-0937a2d279b0`

### Features Added
1. **Threat Intelligence IP Overlay**
   - API: `/api/threatIntel` - Queries Azure Log Analytics with KQL
   - API: `/api/ipGeolocate` - Geolocates IPs using Azure Maps
   - UI: "Threat Intel IPs" toggle button (below "Threat Map")
   - Visualization: Country-level bubble overlay with IP threat data

### Recent Bug Fixes
1. **Accessibility Fix** (Feb 1, 2026)
   - Fixed aria-hidden focus warning in panel manager
   - Focus now properly moves when panel closes
   - Resolves WCAG compliance issue

## 🎯 How to Use

### View Threat Intelligence IPs
1. Open the app
2. Click **"Threat Intel IPs"** toggle (top-left, below Threat Map)
3. Wait for data to load from Azure Log Analytics
4. Hover over red bubbles to see threat IP details

### View Threat Actors (TSV Data)
1. Click **"☰ Threat Map"** button (top-left)
2. Toggle **"Threat Actors"** to **On**
3. Click on countries to see actor details in left panel

## 🔧 Technical Details

### Authentication Flow
- Uses **DefaultAzureCredential** in Azure Functions
- Automatically detects Managed Identity (production)
- Falls back to Azure CLI (local development)
- No environment variables needed for production

### Data Flow
```
Browser → /api/threatIntel → Azure Log Analytics (KQL)
           ↓
      IP Addresses
           ↓
Browser → /api/ipGeolocate → Azure Maps Geolocation
           ↓
      Country Codes
           ↓
    Aggregate by Country → Display Bubbles on Map
```

### APIs
- **`GET /api/threatIntel`**: Returns threat intelligence indicators from Log Analytics
- **`POST /api/ipGeolocate`**: Accepts `{ipAddresses: []}`, returns country codes

## 📚 Documentation Files
- [THREAT_INTEL_SETUP.md](THREAT_INTEL_SETUP.md) - Main setup guide
- [MANAGED_IDENTITY_READY.md](MANAGED_IDENTITY_READY.md) - Managed Identity verification
- [APP_REGISTRATION_SETUP.md](APP_REGISTRATION_SETUP.md) - Free tier alternative

## 🐛 Known Issues & Solutions

### No Data Showing
- **Check**: Managed Identity has Log Analytics Reader role
- **Check**: Workspace contains data matching the KQL query
- **Test API**: `curl https://your-swa.azurestaticapps.net/api/threatIntel`

### Accessibility Warning (FIXED)
- ✅ Panel focus management now properly handles aria-hidden

### Local Development
```powershell
# Login first
az login

# Install dependencies
cd api
npm install

# Run locally
func start
```

## 🔄 Next Deployment

To deploy your changes:
```powershell
git add .
git commit -m "Fix panel accessibility and improve focus management"
git push
```

Azure Static Web Apps will automatically build and deploy.
