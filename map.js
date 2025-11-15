// Import Mapbox GL as ESM
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

// Set your token
mapboxgl.accessToken = 'pk.eyJ1IjoibWFheWFoZ2EiLCJhIjoiY21oenFucW9tMG84NTJpb2luYjlpMXl0OSJ9.Mm1cffTJrSzhXFpxOBLOSA';

// Create the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// Wait until the map fully loads
map.on("load", async () => {

  console.log("Map fully loaded, now adding data…");

  // --- Shared line style for both Boston + Cambridge ---
  const bikeLaneStyle = {
    'line-color': '#32D400',
    'line-width': 4,
    'line-opacity': 0.6
  };

  // --- Boston bike lanes ---
  map.addSource("boston_route", {
    type: "geojson",
    data: "https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson",
  });

  map.addLayer({
    id: "boston-bike-lanes",
    type: "line",
    source: "boston_route",
    paint: bikeLaneStyle
  });

  // --- Cambridge bike lanes ---
  map.addSource("cambridge_route", {
    type: "geojson",
    data: "https://data.cambridgema.gov/resource/7j4p-74t9.geojson"
  });

  map.addLayer({
    id: "cambridge-bike-lanes",
    type: "line",
    source: "cambridge_route",
    paint: bikeLaneStyle
  });

});
