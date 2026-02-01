const { DefaultAzureCredential } = require("@azure/identity");
const { LogsQueryClient } = require("@azure/monitor-query");

module.exports = async function (context, req) {
  context.log("threatIntel function invoked");
  
  try {
    const workspaceId = "7e65e430-26bf-456e-9b41-4fa4226a45f2";
    
    context.log("Creating credential with DefaultAzureCredential");
    // DefaultAzureCredential automatically uses:
    // 1. Managed Identity (if enabled - Standard tier SWA)
    // 2. Service Principal from env vars (if AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET set)
    // 3. Azure CLI (for local development)
    const credential = new DefaultAzureCredential();
    
    context.log("Creating LogsQueryClient");
    const logsQueryClient = new LogsQueryClient(credential);

    const kqlQuery = `ThreatIntelIndicators
| extend Description = Data.description
| extend Type = parse_json(tostring(Data.indicator_types))[0]
| extend Label = parse_json(tostring(Data.labels))[0]
| summarize arg_max(TimeGenerated, *) by ObservableValue
| where Pattern contains "network"
| project ObservableValue, SourceSystem, Type, Label, Confidence, Description, Created, IsActive`;

    context.log(`Querying workspace: ${workspaceId}`);
    context.log(`Query: ${kqlQuery.substring(0, 100)}...`);
    
    // Query logs from the past 30 days
    const result = await logsQueryClient.queryWorkspace(
      workspaceId,
      kqlQuery,
      { duration: "P30D" }
    );
    
    context.log(`Query completed with status: ${result.status}`);

    if (result.status === 0) { // Success
      const table = result.tables[0];
      
      // Transform to simpler format
      const indicators = table.rows.map(row => {
        const obj = {};
        table.columnDescriptors.forEach((col, idx) => {
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
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: {
          error: "Query failed",
          details: result.partialError || "Unknown error"
        }log.error("Error stack:", error.stack);
    context.log.error("Error code:", error.code);
    
    // Provide more detailed error info
    let errorDetails = {
      error: "Failed to query threat intelligence data",
      message: error.message,
      errorCode: error.code || "UNKNOWN",
      timestamp: new Date().toISOString()
    };
    
    // Check for authentication errors
    if (error.message?.includes("authentication") || error.message?.includes("credential")) {
      errorDetails.hint = "Managed Identity may not have Log Analytics Reader role. Check Azure Portal -> Static Web App -> Identity -> Azure role assignments";
    }
    
    if (error.code === "WorkspaceNotFound") {
      errorDetails.hint = "Workspace ID may be incorrect or inaccessible";
    }
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: errorDetailstatus: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Failed to query threat intelligence data",
        message: error.message
      }
    };
  }
};
