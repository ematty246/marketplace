import "./OrderMap.css";

const valid = (lat, lng) =>
  lat != null && lng != null && lat !== "" && lng !== "" &&
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
  Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;

// A normal Google Maps share link cannot be shown in an iframe, so pull its search text out
// of the link (if there is one) and rebuild it as an embeddable URL.
function queryFromMapsUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.searchParams.get("q") || u.searchParams.get("query") || "";
  } catch {
    return "";
  }
}

const embed = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;

// In-page Google map for an order's delivery location.
export default function OrderMap({ lat, lng, address, mapsUrl, orderNumber }) {
  const title = `Delivery location for order ${orderNumber}`;
  let q = "";
  let caption = "";

  if (valid(lat, lng)) {
    q = `${Number(lat)},${Number(lng)}`;
    caption = `Pinned at ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  } else if (queryFromMapsUrl(mapsUrl)) {
    q = queryFromMapsUrl(mapsUrl);
    caption = "Location from the saved Google Maps link";
  } else if (address && address.trim()) {
    q = address.trim();
    caption = "Approximate location found from the delivery address";
  }

  if (!q) {
    return (
      <div className="order-map">
        <div className="order-map__empty">No location available for this order.</div>
      </div>
    );
  }

  return (
    <div className="order-map">
      <iframe title={title} src={embed(q)} loading="lazy" sandbox="allow-scripts allow-same-origin" />
      <p className="order-map__caption">{caption}</p>
    </div>
  );
}