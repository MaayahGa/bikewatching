// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// SET YOUR ACCESS TOKEN (replace with your real token)
mapboxgl.accessToken = 'pk.eyJ1IjoibWFheWFoZ2EiLCJhIjoiY21oenFucW9tMG84NTJpb2luYjlpMXl0OSJ9.Mm1cffTJrSzhXFpxOBLOSA';

// Create the map
const map = new mapboxgl.Map({
  container: 'map', // the id of the div in index.html
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027], // Boston/Cambridge area (lon, lat)
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});
