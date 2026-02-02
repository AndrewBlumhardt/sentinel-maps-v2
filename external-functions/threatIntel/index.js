const { DefaultAzureCredential } = require("@azure/identity");
const { LogsQueryClient } = require("@azure/monitor-query");

module.exports = async function (context, req) {
  context.log("threatIntel function invoked (standalone Function App with MI)");
  
  try {
    const workspaceId = "7e65e430-26bf-456e-9b41-4fa4226a45f2";
    
    // Use DefaultAzureCredential - works properly in standalone Function Apps
    context.log("Creating credential and client...");
    const credential = new DefaultAzureCredential();
    const logsQueryClient = new LogsQueryClient(credential);
    
    const kqlQuery = `ThreatIntelIndicators
| extend Description = Data.description
| extend Type = parse_json(tostring(Data.indicator_types))[0]
| extend Label = parse_json(tostring(Data.labels))[0]
| summarize arg_max(TimeGenerated, *) by ObservableValue
| where Pattern contains "network"
| project ObservableValue, SourceSystem, Type, Label, Confidence, Description, Created, IsActive`;

    context.log(`Querying workspace: ${workspaceId}`);
    const result = await logsQueryClient.queryWorkspace(
      workspaceId,
      kqlQuery,
      { duration: "P30D" }
    );

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

      context.log(`Query successful, returning ${indicators.length} indicators`);
      
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
      context.log.error("Query returned non-zero status:", result.status);
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: {
          error: "Query failed",
          details: result.partialError || "Unknown error"
        }
      };
    }
  } catch (error) {
    context.log.error("Error querying threat intel:", error);
    context.log.error("Error stack:", error.stack);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Failed to query threat intelligence data",
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};
