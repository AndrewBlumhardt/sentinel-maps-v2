const { ManagedIdentityCredential, DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, req) {
  context.log("Auth test endpoint called");
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: Try ManagedIdentityCredential directly
  try {
    context.log("Testing ManagedIdentityCredential...");
    const managedCred = new ManagedIdentityCredential();
    const token = await managedCred.getToken("https://api.loganalytics.io/.default");
    results.tests.push({
      name: "ManagedIdentityCredential",
      status: "success",
      hasToken: !!token.token,
      tokenExpiry: token.expiresOnTimestamp
    });
  } catch (error) {
    results.tests.push({
      name: "ManagedIdentityCredential",
      status: "failed",
      error: error.message,
      code: error.code
    });
  }
  
  // Test 2: Try DefaultAzureCredential
  try {
    context.log("Testing DefaultAzureCredential...");
    const defaultCred = new DefaultAzureCredential();
    const token = await defaultCred.getToken("https://api.loganalytics.io/.default");
    results.tests.push({
      name: "DefaultAzureCredential",
      status: "success",
      hasToken: !!token.token,
      tokenExpiry: token.expiresOnTimestamp
    });
  } catch (error) {
    results.tests.push({
      name: "DefaultAzureCredential",
      status: "failed",
      error: error.message,
      code: error.code
    });
  }
  
  // Test 3: Check environment variables that might be needed
  results.environment = {
    MSI_ENDPOINT: process.env.MSI_ENDPOINT || "not set",
    MSI_SECRET: process.env.MSI_SECRET ? "set (hidden)" : "not set",
    IDENTITY_ENDPOINT: process.env.IDENTITY_ENDPOINT || "not set",
    IDENTITY_HEADER: process.env.IDENTITY_HEADER ? "set (hidden)" : "not set",
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID || "not set"
  };
  
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: results
  };
};
