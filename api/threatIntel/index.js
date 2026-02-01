const http = require('http');
const https = require('https');

// Custom function to get MSI token for Azure Static Web Apps
async function getManagedIdentityToken(resource) {
  return new Promise((resolve, reject) => {
    const msiEndpoint = process.env.MSI_ENDPOINT || process.env.IDENTITY_ENDPOINT;
    if (!msiEndpoint) {
      return reject(new Error("MSI_ENDPOINT not available"));
    }
    
    const url = new URL(msiEndpoint);
    url.searchParams.set('resource', resource);
    url.searchParams.set('api-version', '2019-08-01');
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {}
    };
    
    // Add secret header if available
    if (process.env.MSI_SECRET) {
      options.headers['Secret'] = process.env.MSI_SECRET;
    }
    if (process.env.IDENTITY_HEADER) {
      options.headers['X-IDENTITY-HEADER'] = process.env.IDENTITY_HEADER;
    }
    
    // MSI endpoint uses HTTP (not HTTPS)
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Log the raw response for debugging
          console.log(`MSI Response Status: ${res.statusCode}`);
          console.log(`MSI Response Data: ${data}`);
          
          if (res.statusCode !== 200) {
            return reject(new Error(`MSI endpoint returned ${res.statusCode}: ${data}`));
          }
          
          if (!data || data.trim() === '') {
            return reject(new Error('MSI endpoint returned empty response'));
          }
          
          const json = JSON.parse(data);
          if (json.access_token) {
            resolve(json.access_token);
          } else {
            reject(new Error(`No access_token in MSI response: ${JSON.stringify(json)}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse MSI response: ${err.message}. Raw data: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('MSI token request timeout'));
    });
    req.end();
  });
}

// Query Log Analytics using REST API
async function queryLogAnalytics(accessToken, workspaceId, query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, timespan: 'P30D' });
    
    const options = {
      hostname: 'api.loganalytics.io',
      path: `/v1/workspaces/${workspaceId}/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(new Error(`Failed to parse Log Analytics response: ${err.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Log Analytics query timeout'));
    });
    req.write(body);
    req.end();
  });
}

module.exports = async function (context, req) {
  context.log("threatIntel function invoked");
  
  try {
    const workspaceId = "7e65e430-26bf-456e-9b41-4fa4226a45f2";
    
    context.log("Getting Managed Identity token...");
    const token = await getManagedIdentityToken('https://api.loganalytics.io');
    context.log("Token acquired successfully");
    
    const kqlQuery = `ThreatIntelIndicators
| extend Description = Data.description
| extend Type = parse_json(tostring(Data.indicator_types))[0]
| extend Label = parse_json(tostring(Data.labels))[0]
| summarize arg_max(TimeGenerated, *) by ObservableValue
| where Pattern contains "network"
| project ObservableValue, SourceSystem, Type, Label, Confidence, Description, Created, IsActive`;

    context.log(`Querying workspace: ${workspaceId}`);
    const result = await queryLogAnalytics(token, workspaceId, kqlQuery);
    context.log(`Query completed successfully`);

    if (result.tables && result.tables.length > 0) {
      const table = result.tables[0];
      
      // Transform to simpler format
      const indicators = table.rows.map(row => {
        const obj = {};
        table.columns.forEach((col, idx) => {
          obj[col.name] = row[idx];
        });
        return obj;
      });

      context.res = {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300" // Cache for 5 minutes
        },
        body: {
          indicators: indicators,
          count: indicators.length
        }
      };
    } else {
      context.res = {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300"
        },
        body: {
          indicators: [],
          count: 0,
          message: "No data returned from query"
        }
      };
    }
  } catch (error) {
    context.log.error("Error querying threat intel:", error);
    context.log.error("Error stack:", error.stack);
    context.log.error("Error code:", error.code);
    
    // Provide more detailed error info
    let errorDetails = {
      error: "Failed to query threat intelligence data",
      message: error.message,
      errorCode: error.code || "UNKNOWN",
      timestamp: new Date().toISOString()
    };
    
    // Check for authentication errors
    if (error.message?.includes("authentication") || error.message?.includes("credential") || error.message?.includes("MSI")) {
      errorDetails.hint = "Managed Identity authentication failed. Check Azure Portal -> Static Web App -> Identity -> Azure role assignments";
    }
    
    if (error.message?.includes("WorkspaceNotFound")) {
      errorDetails.hint = "Workspace ID may be incorrect or inaccessible";
    }
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: errorDetails
    };
  }
};
