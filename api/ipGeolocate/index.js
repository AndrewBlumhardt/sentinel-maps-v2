const https = require('https');

/**
 * Azure Function to geolocate IP addresses using Azure Maps Geolocation API
 * Accepts batches of IPs and returns their coordinates
 */
module.exports = async function (context, req) {
  const mapsKey = process.env.AZURE_MAPS_KEY;
  
  if (!mapsKey) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "AZURE_MAPS_KEY not configured" }
    };
    return;
  }

  const ipAddresses = req.body?.ipAddresses;
  
  if (!ipAddresses || !Array.isArray(ipAddresses)) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "ipAddresses array required in request body" }
    };
    return;
  }

  try {
    // Process IPs in parallel (with reasonable concurrency limit)
    const batchSize = 50;
    const results = [];
    
    for (let i = 0; i < ipAddresses.length; i += batchSize) {
      const batch = ipAddresses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(ip => geolocateIP(ip, mapsKey))
      );
      results.push(...batchResults);
    }

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600" // Cache for 1 hour
      },
      body: { locations: results }
    };
  } catch (error) {
    context.log.error("Error geolocating IPs:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Failed to geolocate IP addresses",
        message: error.message
      }
    };
  }
};

/**
 * Geolocate a single IP using Azure Maps Geolocation API
 */
async function geolocateIP(ipAddress, subscriptionKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'atlas.microsoft.com',
      path: `/geolocation/ip/json?api-version=1.0&ip=${encodeURIComponent(ipAddress)}&subscription-key=${subscriptionKey}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          if (response.statusCode === 200) {
            const result = JSON.parse(data);
            
            // Azure Maps Geolocation returns country-level location
            // We'll use a country centroid approach similar to threat actors
            resolve({
              ip: ipAddress,
              countryCode: result.countryRegion?.isoCode || null,
              countryName: result.countryRegion?.name || null,
              // Note: Azure Maps Geolocation doesn't provide exact coordinates
              // We'll handle coordinate lookup on the frontend
              success: true
            });
          } else {
            resolve({
              ip: ipAddress,
              countryCode: null,
              countryName: null,
              success: false,
              error: `HTTP ${response.statusCode}`
            });
          }
        } catch (err) {
          resolve({
            ip: ipAddress,
            countryCode: null,
            countryName: null,
            success: false,
            error: err.message
          });
        }
      });
    });

    request.on('error', (err) => {
      resolve({
        ip: ipAddress,
        countryCode: null,
        countryName: null,
        success: false,
        error: err.message
      });
    });

    request.setTimeout(5000, () => {
      request.destroy();
      resolve({
        ip: ipAddress,
        countryCode: null,
        countryName: null,
        success: false,
        error: 'Timeout'
      });
    });

    request.end();
  });
}
