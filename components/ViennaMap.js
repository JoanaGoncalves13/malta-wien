"use client";

import { useEffect, useRef, useState } from "react";
import { VIENNA_CENTER, googleMapsLink } from "@/lib/geo";
import { useLang } from "@/lib/i18n/LanguageProvider";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// carregar Leaflet uma vez
let leafletPromise = null;
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Could not load the map"));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

function markerIcon(L, color) {
  return L.divIcon({
    className: "pin",
    html: `<span class="pin-dot" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function ViennaMap(props) {
  const { t } = useLang();
  const {
    markers = [],
    height = 360,
    onPick = null,
    picked = null,
    showLocate = true,
  } = props;
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const meRef = useRef(null);
  const pickRef = useRef(null);
  const LRef = useRef(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  // arranque
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !boxRef.current || mapRef.current) return;
        LRef.current = L;
        const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView(
          [VIENNA_CENTER.lat, VIENNA_CENTER.lng],
          13
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        if (onPick) {
          map.on("click", (e) => onPick(e.latlng.lat, e.latlng.lng));
        }
        // corrigir tamanho depois de montar
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // desenhar marcadores
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    const pts = markers.filter((m) => m.lat != null && m.lng != null);
    for (const m of pts) {
      const marker = L.marker([m.lat, m.lng], {
        icon: markerIcon(L, m.color || "#d81e2c"),
      });
      if (m.title) {
        const gmaps = googleMapsLink(m.lat, m.lng);
        marker.bindPopup(
          `<strong>${m.title}</strong>${m.subtitle ? `<br>${m.subtitle}` : ""}` +
          `<br><a href="${gmaps}" target="_blank" rel="noopener noreferrer">${t("vie.openInMaps")} ↗</a>`
        );
      }
      marker.addTo(layer);
    }

    if (pts.length > 1) {
      const bounds = L.latLngBounds(pts.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 15);
    }
  }, [markers]);

  // marcador do ponto escolhido (modo de marcação)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (pickRef.current) {
      map.removeLayer(pickRef.current);
      pickRef.current = null;
    }
    if (picked) {
      pickRef.current = L.marker([picked.lat, picked.lng], {
        icon: markerIcon(L, "#0f7457"),
      }).addTo(map);
      map.setView([picked.lat, picked.lng], 15);
    }
  }, [picked]);

  function locateMe() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !navigator.geolocation) {
      setError("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (meRef.current) map.removeLayer(meRef.current);
        meRef.current = L.circleMarker([latitude, longitude], {
          radius: 9,
          color: "#2f6fdb",
          fillColor: "#2f6fdb",
          fillOpacity: 0.9,
          weight: 3,
        })
          .addTo(map)
          .bindPopup(t("vie.youHere"))
          .openPopup();
        map.setView([latitude, longitude], 15);
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Check the permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="map-wrap">
      <div ref={boxRef} className="map" style={{ height }} />
      {error && <p className="error small map-error">{error}</p>}
      <div className="map-actions">
        {showLocate && (
          <button type="button" className="btn btn-small" onClick={locateMe} disabled={locating}>
            {locating ? t("vie.locating") : "📍 " + t("vie.myLocation")}
          </button>
        )}
        {onPick && <span className="muted small">{t("vie.pin")}</span>}
      </div>
    </div>
  );
}
