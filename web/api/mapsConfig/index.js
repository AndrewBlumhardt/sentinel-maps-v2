module.exports = async function (context, req) {
  const key = process.env.AZURE_MAPS_KEY;

  if (!key) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "AZURE_MAPS_KEY is not set in the Static Web App configuration."
      }
    };
    return;
  }

  // This returns the key to the browser. Treat subscription keys as not truly secret in production.
  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: {
      subscriptionKey: key
    }
  };
};
