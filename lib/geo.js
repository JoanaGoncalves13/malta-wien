// Centro aproximado de Viena, para o mapa arrancar
export const VIENNA_CENTER = { lat: 48.2082, lng: 16.3738 };

// Tenta tirar latitude/longitude de um link do Google Maps.
// Aceita formatos comuns: @48.20,16.37 ; !3dLAT!4dLNG ; q=48.2,16.3 ; ll=...
export function parseGoogleMapsUrl(url) {
  if (!url) return null;
  const text = String(url);

  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,          // .../@48.2082,16.3738,15z
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,      // ...!3d48.2!4d16.3
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,     // ...?q=48.2,16.3
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,    // ...?ll=48.2,16.3
    /[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/, // "48.2082, 16.3738" solto
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

// Link do Google Maps a partir de coordenadas (para abrir direções, etc.)
export function googleMapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
