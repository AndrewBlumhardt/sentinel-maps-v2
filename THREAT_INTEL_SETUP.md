# Threat Intelligence IP Overlay - Setup Guide

## Overview
This implementation adds a new map overlay that:
1. Queries Azure Log Analytics for threat intelligence indicators
2. Geolocates IP addresses using Azure Maps Geolocation API
3. Displays them as bubbles on the map, aggregated by country

## Components Created

### Backend (API Functions)

#### 1. `/api/threatIntel` - Query Log Analytics
- **File**: `api/threatIntel/index.js`
- **Purpose**: Queries your Azure Log Analytics workspace using the KQL query you provided
- **Returns**: Array of threat intelligence indicators with IP addresses
- **Auth**: Uses `DefaultAzureCredential` (Managed Identity or Azure CLI)

#### 2. `/api/ipGeolocate` - Geolocate IPs
- **File**: `api/ipGeolocate/index.js`
- **Purpose**: Batch geolocates IP addresses using Azure Maps Geolocation API
- **Returns**: Country codes for each IP
- **Processes**: Up to 50 IPs in parallel batches

### Frontend

#### 3. Threat Intel Overlay
- **File**: `web/src/overlays/threatIntelOverlay.js`
- **Features**:
  - Fetches threat intel data from API
  - Geolocates all unique IPs
  - Aggregates by country
  - Displays as scaled bubbles (size = count of IPs)
  - Interactive popups showing IP details

#### 4. UI Toggle Control
- **File**: `web/src/ui/threatIntelToggle.js`
- **Location**: Below the Threat Actors toggle (top-left)
- **Features**: On/Off button with loading states

## Setup Steps

### 1. Install Dependencies

\`\`\`bash
cd api
npm install
\`\`\`

This installs:
- `@azure/identity` - Azure authentication
- `@azure/monitor-query` - Log Analytics queries

### 2. Configure Authentication

The API supports **two authentication methods**:

#### ✅ Option A: Managed Identity (Recommended - Standard Tier)

If you have upgraded to **Standard tier** and enabled Managed Identity:

1. **Enable Managed Identity** (if not already done):
   - In Azure Portal → Your Static Web App → **Identity**
   - Set **Status** to **On**
   - Click **Save**

2. **Grant Log Analytics Reader role**:
   ```bash
   # Get your Managed Identity principal ID
   PRINCIPAL_ID=$(az staticwebapp show \
     --name <your-swa-name> \
     --resource-group sentinel-maps-v2 \
     --query identity.principalId -o tsv)
   
   # Grant Log Analytics Reader role
   az role assignment create \
     --role "Log Analytics Reader" \
     --assignee $PRINCIPAL_ID \
     --scope /subscriptions/338ca753-a1a6-498e-ab21-0937a2d279b0/resourcegroups/sentinel-maps-v2/providers/microsoft.operationalinsights/workspaces/sentinelmaps
   ```

3. **That's it!** No environment variables needed. The API automatically uses Managed Identity.

#### Option B: Service Principal (Free Tier)

If you're on **Free tier** (no Managed Identity support):

**📖 See detailed guide: [APP_REGISTRATION_SETUP.md](APP_REGISTRATION_SETUP.md)**

Quick summary: Create App Registration, generate client secret, add environment variables to Static Web App.

### 3. Environment Variables

Ensure `AZURE_MAPS_KEY` is set in your Static Web App configuration (already exists for the maps).

### 4. Deploy

Push to your repository - Azure Static Web Apps will automatically deploy:
- API functions in `api/`
- Frontend code in `web/`

## Usage

1. **Open the app** - Map loads normally
2. **Click "Threat Intel IPs" button** (below Threat Actors toggle)
3. **Wait for loading** - Fetches data from Log Analytics and geolocates IPs
4. **View bubbles** - Larger bubbles = more threat IPs from that country
5. **Hover over bubbles** - See details: IP addresses, descriptions, types

## Data Flow

\`\`\`
┌─────────────────┐
│   Browser       │
└────────┬────────┘
         │
         │ 1. Click "On"
         ▼
┌──────────────────────────────┐
│ threatIntelOverlay.js        │
│ - fetch("/api/threatIntel")  │
└────────┬─────────────────────┘
         │
         │ 2. Query KQL
         ▼
┌─────────────────────────────────────┐
│ /api/threatIntel                     │
│ - LogsQueryClient.queryWorkspace()   │
│ - Returns IP addresses from Sentinel │
└────────┬────────────────────────────┘
         │
         │ 3. Return indicators
         ▼
┌──────────────────────────────────────┐
│ threatIntelOverlay.js                 │
│ - Extract unique IPs                  │
│ - fetch("/api/ipGeolocate", {IPs})   │
└────────┬─────────────────────────────┘
         │
         │ 4. Geolocate IPs
         ▼
┌───────────────────────────────────────┐
│ /api/ipGeolocate                       │
│ - Azure Maps Geolocation API          │
│ - Returns country codes for each IP   │
└────────┬──────────────────────────────┘
         │
         │ 5. Return locations
         ▼
┌─────────────────────────────────────┐
│ threatIntelOverlay.js                │
│ - Aggregate by country               │
│ - Map to country centroids          │
│ - Create bubble layer               │
└─────────────────────────────────────┘
\`\`\`

## Performance Notes

- **Caching**: 
  - Threat intel data cached for 5 minutes
  - IP geolocation cached for 1 hour
  
- **Batch Processing**: 
  - IPs geolocated in batches of 50
  - Parallel processing for speed
  
- **Country Aggregation**: 
  - Reduces map clutter
  - One bubble per country (not one per IP)

## Customization

### Adjust Query Time Range
In `api/threatIntel/index.js`:
\`\`\`javascript
{ duration: "P30D" } // Change from 30 days to desired range
// Examples: "P7D" (7 days), "P90D" (90 days), "PT24H" (24 hours)
\`\`\`

### Change Bubble Colors
In `web/src/overlays/threatIntelOverlay.js`:
\`\`\`javascript
color: [
  "interpolate",
  ["linear"],
  ["get", "count"],
  1, "#ff6b6b",      // Low count color
  maxCount / 2, "#ee5a24",  // Medium count color
  maxCount, "#c23616"       // High count color
]
\`\`\`

### Modify KQL Query
In `api/threatIntel/index.js`, update the `kqlQuery` variable to change what data is fetched.

## Troubleshooting

### "Failed to fetch threat intel: 403"
- **Standard tier**: Check Managed Identity has Log Analytics Reader role
- **Free tier**: Check service principal has Log Analytics Reader role
- Verify workspace ID is correct: `7e65e430-26bf-456e-9b41-4fa4226a45f2`

### "No threat intelligence indicators found"
- Check KQL query returns data in Log Analytics
- Verify time range includes data

### "Failed to geolocate IPs"
- Verify AZURE_MAPS_KEY is set
- Check IP addresses are valid format

### Bubbles not appearing
- Check browser console for errors
- Verify country codes exist in COUNTRY_CENTROIDS map
- Open Network tab to inspect API responses

## Next Steps

Potential enhancements:
1. **Real-time updates** - Add auto-refresh every N minutes
2. **Filtering** - Filter by confidence level, type, or label
3. **Detailed view** - Click bubble to see full list of IPs
4. **Export** - Download threat intel data as CSV
5. **Alerts** - Highlight high-confidence threats differently
