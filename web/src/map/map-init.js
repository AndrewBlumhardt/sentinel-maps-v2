export function createMap({ containerId, subscriptionKey }) {
  return new atlas.Map(containerId, {
    center: [-20, 25],
    zoom: 2,
    style: "road",
    authOptions: {
      authType: "subscriptionKey",
      subscriptionKey
    }
  });
}
