/* CoolMap Global — optional map layers (earthquakes, cyclones) */

// ---------- Earthquakes (USGS) ----------
// Feed: M4.5+ earthquakes from the past 24 hours, worldwide.
// Docs: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
export async function loadEarthquakes(map) {
  const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
  const res = await fetch(url);
  if (!res.ok) throw new Error("USGS unavailable");
  const j = await res.json();

  const group = L.layerGroup();

  j.features.forEach((f) => {
    const [lon, lat, depth] = f.geometry.coordinates;
    const mag = f.properties.mag;
    const place = f.properties.place || "Unknown location";
    const radius = Math.max(5, mag * 3.5);
    const color = mag >= 6 ? "#ff2d55" : mag >= 5 ? "#ff5a5f" : "#ff9f43";
    const when = new Date(f.properties.time).toLocaleString();

    L.circleMarker([lat, lon], {
      radius,
      color,
      fillColor: color,
      fillOpacity: 0.35,
      weight: 2,
    })
      .bindPopup(
        `<b>M${mag.toFixed(1)} earthquake</b><br>` +
        `${place}<br>` +
        `<small>Depth: ${depth.toFixed(0)} km<br>${when}</small>`
      )
      .addTo(group);
  });

  group.addTo(map);
  return group;
}

// ---------- Cyclones (NOAA NHC) ----------
// Feed: active tropical systems tracked by NOAA's National Hurricane Center.
// Coverage: Atlantic + Eastern/Central Pacific only.
// Docs: https://www.nhc.noaa.gov/CurrentStorms.json
export async function loadCyclones(map) {
  const url = "https://www.nhc.noaa.gov/CurrentStorms.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error("NOAA NHC unavailable");
  const j = await res.json();
  const storms = j.activeStorms || [];

  const group = L.layerGroup();
  let count = 0;

  storms.forEach((s) => {
    // NHC uses various fields; handle what's present
    const lat = Number(s.latitudeNumeric ?? s.latitude ?? s.lat);
    const lon = Number(s.longitudeNumeric ?? s.longitude ?? s.lon);
    if (!isFinite(lat) || !isFinite(lon)) return;

    const name = s.name || s.binNumber || "Unnamed storm";
    const classification = s.classification || s.stormType || "Tropical";
    const pressure = s.pressure || "—";
    const winds = s.intensity || s.windSpeed || "—";

    L.circleMarker([lat, lon], {
      radius: 14,
      color: "#b366ff",
      fillColor: "#b366ff",
      fillOpacity: 0.35,
      weight: 3,
      dashArray: "4 4",
    })
      .bindPopup(
        `<b>🌀 ${name}</b><br>` +
        `Type: ${classification}<br>` +
        `Pressure: ${pressure} mb<br>` +
        `Winds: ${winds} kt<br>` +
        `<small>Source: NOAA NHC · Atlantic + Pacific only</small>`
      )
      .addTo(group);

    count++;
  });

  group.addTo(map);
  return { group, count };
}