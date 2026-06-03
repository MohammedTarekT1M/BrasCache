let allLocations = [];
let userLatitude = null;
let userLongitude = null;
let compassHeading = 0;
let currentFoundCache = null;

async function showLocations() {
  try {
    const locations = await fetchLocations();
    allLocations = locations;

    console.log("Locations from API:", locations);

    renderLocations();
  } catch (error) {
    console.error("Er is iets fout gegaan bij het weergeven van de locaties:", error);
  }
}

function renderLocations() {
  const list = document.getElementById("locationsList");
  list.innerHTML = "";

  const radarLocations = [];

  allLocations.forEach(location => {
    const name = location.name || location.naam || "Geen naam";
    const lat = Number(location.latitude || location.lat);
    const lon = Number(location.longitude || location.lon || location.lng);

    let distanceText = "Afstand: locatie nog niet beschikbaar";
    let bearingText = "Koers: locatie nog niet beschikbaar";

    if (userLatitude !== null && userLongitude !== null) {
  const distanceKm = calculateDistance(userLatitude, userLongitude, lat, lon);
  const distanceMeters = distanceKm * 1000;
  const bearing = calculateBearing(userLatitude, userLongitude, lat, lon);

  if (distanceMeters <= 5) {
    markCacheAsFound(location);
    currentFoundCache = location;
    enablePhotoButton(location);
  }

  if (distanceMeters < 1000) {
    distanceText = `Afstand: ${distanceMeters.toFixed(0)} meter`;
  } else {
    distanceText = `Afstand: ${distanceKm.toFixed(2)} km`;
  }

  bearingText = `Koers: ${bearing.toFixed(0)}°`;

  radarLocations.push({
    name: name,
    distance: distanceKm,
    bearing: bearing,
    found: isCacheFound(location)
  });
}

    const item = document.createElement("li");

    const foundText = isCacheFound(location) ? "Status: gevonden ✅" : "Status: nog niet gevonden";

item.innerHTML = `
  <strong>${name}</strong><br>
  Latitude: ${lat}<br>
  Longitude: ${lon}<br>
  ${distanceText}<br>
  ${bearingText}<br>
  ${foundText}
`;

    list.appendChild(item);
  });

  drawRadar(radarLocations);
}

function startWatchingLocation() {
  const userLocationElement = document.getElementById("userLocation");

  if (!navigator.geolocation) {
    userLocationElement.textContent = "Geolocation wordt niet ondersteund door deze browser.";
    return;
  }

  navigator.geolocation.watchPosition(
    position => {
      userLatitude = position.coords.latitude;
      userLongitude = position.coords.longitude;

      userLocationElement.innerHTML = `
        Latitude: ${userLatitude}<br>
        Longitude: ${userLongitude}
      `;

      console.log("User location:", userLatitude, userLongitude);

      renderLocations();
    },
    error => {
      console.error("GPS fout:", error);
      userLocationElement.textContent = "Kon jouw locatie niet ophalen.";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const radLat1 = lat1 * (Math.PI / 180);
  const radLat2 = lat2 * (Math.PI / 180);
  const diffLon = (lon2 - lon1) * (Math.PI / 180);

  const y = Math.sin(diffLon) * Math.cos(radLat2);
  const x =
    Math.cos(radLat1) * Math.sin(radLat2) -
    Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(diffLon);

  const angleRad = Math.atan2(y, x);
  const bearingDegrees = (angleRad * 180 / Math.PI + 360) % 360;

  return bearingDegrees;
}

function drawRadar(locations) {
  const canvas = document.getElementById("radarCanvas");
  const ctx = canvas.getContext("2d");

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  const zoom = 5000;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Radar buitenlijn
  ctx.beginPath();
  ctx.arc(centerX, centerY, 160, 0, Math.PI * 2);
  ctx.stroke();

  // Binnenste cirkels
  ctx.beginPath();
  ctx.arc(centerX, centerY, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Kruislijnen
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(canvas.width, centerY);
  ctx.stroke();

  // Noord, Oost, Zuid, West
  ctx.fillText("N", centerX - 5, 15);
  ctx.fillText("O", canvas.width - 20, centerY + 5);
  ctx.fillText("Z", centerX - 5, canvas.height - 10);
  ctx.fillText("W", 10, centerY + 5);

  locations.forEach(location => {
    const relativeBearing = location.bearing - compassHeading;
    const drawAngle = (relativeBearing - 90) * (Math.PI / 180);

    let dotX = centerX + location.distance * zoom * Math.cos(drawAngle);
    let dotY = centerY + location.distance * zoom * Math.sin(drawAngle);

    // Zorg dat stippen niet buiten de radar vallen
    const dx = dotX - centerX;
    const dy = dotY - centerY;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 150;

    if (distanceFromCenter > maxRadius) {
      const scale = maxRadius / distanceFromCenter;
      dotX = centerX + dx * scale;
      dotY = centerY + dy * scale;
    }

    // Cache stip
    ctx.beginPath();
    ctx.arc(dotX, dotY, location.found ? 8 : 5, 0, Math.PI * 2);
    ctx.fill();

    // Naam
    ctx.fillText(location.name, dotX + 8, dotY);
  });

  // Jijzelf in het midden
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
  ctx.fill();
}

function startCompass() {
  const compassElement = document.getElementById("compassHeading");

  window.addEventListener("deviceorientation", event => {
    let heading = null;

    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }

    if (heading !== null) {
      compassHeading = heading;

      compassElement.textContent = `Kompas: ${compassHeading.toFixed(0)}°`;

      renderLocations();
    }
  });
}

function setupCompassButton() {
  const button = document.getElementById("compassButton");

  button.addEventListener("click", async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();

        if (permission === "granted") {
          startCompass();
          button.textContent = "Kompas gestart";
          button.disabled = true;
        } else {
          document.getElementById("compassHeading").textContent =
            "Kompas toestemming geweigerd.";
        }
      } catch (error) {
        console.error("Kompas permission fout:", error);
      }
    } else {
      startCompass();
      button.textContent = "Kompas gestart";
      button.disabled = true;
    }
  });
}

function getLocationId(location) {
  return location.id || location.ID || location.name || location.naam;
}

function isCacheFound(location) {
  const id = getLocationId(location);
  return localStorage.getItem(`found-cache-${id}`) === "true";
}

function markCacheAsFound(location) {
  const id = getLocationId(location);
  localStorage.setItem(`found-cache-${id}`, "true");
}

function enablePhotoButton(location) {
  const photoButton = document.getElementById("photoButton");
  const photoInfo = document.getElementById("photoInfo");

  const name = location.name || location.naam || "deze cache";

  photoButton.disabled = false;
  photoInfo.textContent = `Je bent dicht bij ${name}. Je kunt nu een foto maken.`;
}

function setupPhotoFeature() {
  const photoButton = document.getElementById("photoButton");
  const photoInput = document.getElementById("photoInput");

  photoButton.addEventListener("click", () => {
    photoInput.click();
  });

  photoInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file || !currentFoundCache) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const cacheId = getLocationId(currentFoundCache);
      const imageData = reader.result;

      localStorage.setItem(`photo-cache-${cacheId}`, imageData);

      showCachePhoto(currentFoundCache);
    };

    reader.readAsDataURL(file);
  });
}

function showCachePhoto(location) {
  const cacheId = getLocationId(location);
  const imageData = localStorage.getItem(`photo-cache-${cacheId}`);
  const preview = document.getElementById("photoPreview");

  if (!imageData) {
    preview.innerHTML = "";
    return;
  }

  preview.innerHTML = `
    <p>Foto opgeslagen:</p>
    <img src="${imageData}" alt="Foto van cache" style="max-width: 100%; border-radius: 12px;">
  `;
}

showLocations();
startWatchingLocation();
setupCompassButton();
setupPhotoFeature();