const { DefaultAzureCredential } = require("@azure/identity");

module.exports = async function (context, req) {
  context.log("authTest function invoked");
  
  try {
    context.log("Creating credential...");
    const credential = new DefaultAzureCredential();
    
    context.log("Getting token for Log Analytics...");
    const token = await credential.getToken("https://api.loganalytics.io/.default");
    
    context.log("Token acquired successfully");
    
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        message: "Managed Identity authentication successful",
        tokenExpiresOn: token.expiresOnTimestamp,
        identityInfo: "Token acquired for https://api.loganalytics.io"
      }
    };
  } catch (error) {
    context.log.error("Error:", error);
    context.log.error("Stack:", error.stack);
    
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack
      }
    };
  }
};
