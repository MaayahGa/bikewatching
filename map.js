// Import Mapbox GL as ESM
import mapboxgl from "https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm";

// Import D3 for JSON + SVG overlays
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Bluebikes data URLs
const INPUT_BLUEBIKES_CSV_URL = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";
const TRAFFIC_CSV_URL = "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";

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

// Performance optimization: Pre-sorted trip buckets
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

// -------- Helper Functions (Global) --------

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) {
    return tripsByMinute.flat();
  }

  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// -------- Map Load Event --------

map.on("load", async () => {
  console.log("Map fully loaded, now adding data…");

  // --- Bike Lane Layers ---
  const bikeLaneStyle = {
    'line-color': '#32D400',
    'line-width': 4,
    'line-opacity': 0.6
  };

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

  // --- SVG Overlay ---
  let svg = d3.select("#map").select("svg");
  if (svg.empty()) {
    svg = d3.select("#map").append("svg");
  }

  // --- Load Station Data ---
  let jsonData;
  try {
    jsonData = await d3.json(INPUT_BLUEBIKES_CSV_URL);
    console.log("Loaded Bluebikes JSON:", jsonData);
  } catch (err) {
    console.error("Error loading Bluebikes data:", err);
    return;
  }

  // --- Load Traffic Data with Date Parsing ---
  let trips;
  try {
    trips = await d3.csv(TRAFFIC_CSV_URL, (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      
      // Add to time buckets for performance
      let startedMinutes = minutesSinceMidnight(trip.started_at);
      let endedMinutes = minutesSinceMidnight(trip.ended_at);
      departuresByMinute[startedMinutes].push(trip);
      arrivalsByMinute[endedMinutes].push(trip);
      
      return trip;
    });
    console.log("Loaded traffic data:", trips.length, "trips");
  } catch (err) {
    console.error("Error loading traffic data:", err);
    return;
  }

  // --- Compute Initial Station Traffic ---
  const stations = computeStationTraffic(jsonData.data.stations);
  console.log("Stations with traffic data:", stations);
  console.log("Sample station traffic:", stations[0].totalTraffic, "departures:", stations[0].departures, "arrivals:", stations[0].arrivals);

  // --- Create Scales ---
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

  const stationFlow = d3
    .scaleQuantize()
    .domain([0, 1])
    .range([0, 0.5, 1]);
  
  // Color interpolator for traffic flow
  const colorScale = d3.interpolateRgb("darkorange", "steelblue");

  // --- Create Circles ---
  const circles = svg
    .selectAll("circle")
    .data(stations, (d) => d.short_name)
    .enter()
    .append("circle")
    .attr("r", d => radiusScale(d.totalTraffic))
    .attr("fill", "steelblue")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("opacity", 0.6)
    .style('--departure-ratio', (d) => {
      const ratio = d.totalTraffic > 0 ? stationFlow(d.departures / d.totalTraffic) : 0.5;
      if (Math.random() < 0.01) { // Log 1% of stations for debugging
        console.log("Station:", d.name, "Departures:", d.departures, "Total:", d.totalTraffic, "Ratio:", ratio);
      }
      return ratio;
    })
    .each(function (d) {
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

  // --- Position Update Function ---
  function updatePositions() {
    circles
      .attr("cx", d => getCoords(d).cx)
      .attr("cy", d => getCoords(d).cy);
  }

  updatePositions();

  map.on("move", updatePositions);
  map.on("zoom", updatePositions);
  map.on("resize", updatePositions);
  map.on("moveend", updatePositions);

  // --- Time Filter Controls ---
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  function updateScatterPlot(timeFilter) {
    const filteredStations = computeStationTraffic(stations, timeFilter);

    // Adjust scale range based on filter
    timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

    circles
      .data(filteredStations, (d) => d.short_name)
      .join('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) =>
        stationFlow(d.departures / d.totalTraffic)
      )
      .select('title')
      .text((d) => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
  }

  function updateTimeDisplay() {
    let timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTimeLabel.style.display = 'block';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});