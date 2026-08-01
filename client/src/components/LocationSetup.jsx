import { useState } from "react";

const RADIUS_OPTIONS = [500, 1000, 2000, 5000, 10000, 20000];

function formatRadius(m) {
  return m >= 1000 ? `${m / 1000} km` : `${m} m`;
}

export default function LocationSetup({ onLocationReady }) {
  const [status, setStatus] = useState("idle"); // idle | requesting | denied
  const [radius, setRadius] = useState(2000);
  const [radiusIndex, setRadiusIndex] = useState(2);

  const [errorDetail, setErrorDetail] = useState("");

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("denied");
      setErrorDetail("This browser doesn't support geolocation at all.");
      return;
    }
    setStatus("requesting");
    setErrorDetail("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("granted");
        onLocationReady({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radius,
        });
      },
      (err) => {
        setStatus("denied");
        // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const messages = {
          1: "Permission denied. Click the site-info icon next to the URL bar and allow Location for this site.",
          2: "Position unavailable — your device/browser couldn't determine a location (no GPS/Wi-Fi positioning found). This is common in VMs or remote desktops.",
          3: "Timed out waiting for a location fix. Try again, or check your OS-level location services are on.",
        };
        setErrorDetail(
          messages[err.code] || `Unknown error (code ${err.code}): ${err.message}`
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="card stack">
      <div className="radar">
        <div className="radar-ring" />
        <div className="radar-ring" />
        <div className="radar-ring" />
        <div className="radar-core" />
      </div>

      <div style={{ textAlign: "center" }}>
        <h2 className="room-title" style={{ marginBottom: 6 }}>
          Who's around?
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Share your location to find people and open rooms nearby. Your
          exact coordinates are never shown to anyone — only distance.
        </p>
      </div>

      <div className="slider-row">
        <label className="section-label" style={{ margin: 0 }}>
          Search radius
        </label>
        <input
          type="range"
          min={0}
          max={RADIUS_OPTIONS.length - 1}
          step={1}
          value={radiusIndex}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setRadiusIndex(idx);
            setRadius(RADIUS_OPTIONS[idx]);
          }}
        />
        <span className="slider-value">{formatRadius(radius)}</span>
      </div>

      <button className="btn btn-primary" onClick={requestLocation}>
        {status === "requesting" ? "Locating…" : "Turn on location"}
      </button>

      {status === "denied" && (
        <div className="error-banner">
          {errorDetail ||
            "Couldn't get your location. Check your browser's location permission for this site and try again."}
        </div>
      )}

      {status === "denied" && (
        <button
          className="btn btn-ghost"
          onClick={() =>
            onLocationReady({
              lat: 22.8456,
              lng: 89.5403,
              radius,
            })
          }
        >
          Skip — use a test location instead
        </button>
      )}
    </div>
  );
}

export { RADIUS_OPTIONS, formatRadius };
