module.exports = async function (context, req) {
  context.log("Health check endpoint called");
  
  // Test if we can load the Azure SDK
  let sdkStatus = "not loaded";
  try {
    const { DefaultAzureCredential } = require("@azure/identity");
    const { LogsQueryClient } = require("@azure/monitor-query");
    sdkStatus = "loaded successfully";
  } catch (error) {
    sdkStatus = `failed to load: ${error.message}`;
  }
  
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      env: {
        hasMapsKey: !!process.env.AZURE_MAPS_KEY,
        hasTenantId: !!process.env.AZURE_TENANT_ID,
        hasClientId: !!process.env.AZURE_CLIENT_ID,
        hasClientSecret: !!process.env.AZURE_CLIENT_SECRET
      },
      azureSdk: sdkStatus
    }
  };
};
