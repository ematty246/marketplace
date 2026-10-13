import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  ShoppingBasket,
  MapPin,
  LocateFixed,
  LoaderCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "../../context/CartContext.jsx";
import { useShopProducts } from "../../hooks/useShopProducts";
import { friendlyError, normalizeOrder, placeOrder } from "../../services/customerApi";
import { formatPaise } from "../../utils/money";
import { noticeFrom } from "./CartPage.jsx";

export default function CheckoutPage() {
  const { items, totalPaise, hasUnavailable, clear, syncWithProducts } = useCart();
  const { products, loading, error, reload } = useShopProducts();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [formError, setFormError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
const [phoneError, setPhoneError] = useState("");
  const [notice, setNotice] = useState([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false); // blocks double submits even before state updates
  const OPENCAGE_KEY = import.meta.env.VITE_OPENCAGE_API_KEY;

const [suggestions, setSuggestions] = useState([]);
const [suggestionsOpen, setSuggestionsOpen] = useState(false);
const [searchingAddress, setSearchingAddress] = useState(false);
const [locating, setLocating] = useState(false);
const [locationError, setLocationError] = useState("");

const suggestionBox = useRef(null);
const selectedSuggestion = useRef(false);

const formatAddress = (result) => {
  const c = result?.components || {};

  return [
    c.house_number,
    c.road,
    c.neighbourhood || c.suburb,
    c.village || c.town || c.city || c.county,
    c.state,
    c.postcode,
    c.country,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ") || result?.formatted || "";
};

// Search for suggestions after the user pauses typing.
useEffect(() => {
  const query = address.trim();

  if (selectedSuggestion.current || query.length < 3 || !OPENCAGE_KEY) {
    setSuggestions([]);
    setSuggestionsOpen(false);
    setSearchingAddress(false);
    return;
  }

  const controller = new AbortController();

  const timer = setTimeout(async () => {
    setSearchingAddress(true);

    try {
      const params = new URLSearchParams({
        key: OPENCAGE_KEY,
        q: query,
        limit: "5",
        countrycode: "in",
        language: "en",
        no_annotations: "1",
      });

      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?${params}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error("Address lookup failed. Check your OpenCage API key.");
      }

      const data = await response.json();

      const results = (data.results || [])
        .map((result, index) => ({
          id: `${result.geometry?.lat}-${result.geometry?.lng}-${index}`,
          label: formatAddress(result),
        }))
        .filter((result) => result.label);

      setSuggestions(results);
      setSuggestionsOpen(results.length > 0);
      setLocationError("");
    } catch (error) {
      if (error.name !== "AbortError") {
        setSuggestions([]);
        setSuggestionsOpen(false);
        setLocationError(
          "Address suggestions are unavailable. You can still enter your address manually."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setSearchingAddress(false);
      }
    }
  }, 350);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}, [address]);

// Close suggestions when clicking outside the address field.
useEffect(() => {
  const handleOutsideClick = (event) => {
    if (
      suggestionBox.current &&
      !suggestionBox.current.contains(event.target)
    ) {
      setSuggestionsOpen(false);
    }
  };

  document.addEventListener("mousedown", handleOutsideClick);

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
  };
}, []);

const chooseSuggestion = (suggestion) => {
  selectedSuggestion.current = true;
  setAddress(suggestion.label.slice(0, 500));
  setAddressError("");
  setLocationError("");
  setSuggestions([]);
  setSuggestionsOpen(false);
};

const handleAddressChange = (value) => {
  selectedSuggestion.current = false;
  setAddress(value);
  setAddressError("");
  setLocationError("");
};

// Use browser GPS, then convert coordinates into a readable address.
const useCurrentLocation = () => {
  setLocationError("");

  if (!OPENCAGE_KEY) {
    setLocationError("Configure VITE_OPENCAGE_API_KEY in your frontend .env file.");
    return;
  }

  if (!navigator.geolocation) {
    setLocationError("Your browser does not support location detection.");
    return;
  }

  setLocating(true);

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const params = new URLSearchParams({
          key: OPENCAGE_KEY,
          q: `${coords.latitude},${coords.longitude}`,
          limit: "1",
          language: "en",
          no_annotations: "1",
        });

        const response = await fetch(
          `https://api.opencagedata.com/geocode/v1/json?${params}`
        );

        if (!response.ok) {
          throw new Error("Could not look up your current address.");
        }

        const data = await response.json();
        const result = data.results?.[0];
        const resolved = result ? formatAddress(result) : "";

        if (!resolved) {
          throw new Error("No address was found for your current location.");
        }

        selectedSuggestion.current = true;
        setAddress(resolved.slice(0, 500));
        setAddressError("");
        setSuggestions([]);
        setSuggestionsOpen(false);
      } catch (error) {
        setLocationError(error.message || "Could not retrieve your address.");
      } finally {
        setLocating(false);
      }
    },
    (error) => {
      setLocating(false);

      setLocationError(
        error.code === 1
          ? "Location permission denied. Allow location access or type your address."
          : "Could not determine your location. Please type your address."
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    }
  );
};

  useEffect(() => {
    document.title = "Checkout · Pure Pail Marketplace";
  }, []);

  useEffect(() => {
    if (!loading && !error) setNotice(noticeFrom(syncWithProducts(products)));
  }, [products, loading, error, syncWithProducts]);

  if (items.length === 0) {
    return (
      <div className="shop-container shop-section">
        <div className="empty">
          <ShoppingBasket size={40} aria-hidden="true" />
          <h3>Your cart is empty</h3>
          <Link to="/shop" className="btn btn--primary">Continue shopping</Link>
        </div>
      </div>
    );
  }

 const submit = async (e) => {
  e.preventDefault();

  if (lock.current) return;

  const text = address.trim();
  const phone = phoneNumber.trim();

  if (!/^\d{10}$/.test(phone)) {
    setPhoneError("Enter a valid 10-digit phone number.");
    return;
  }

  if (text.length < 10) {
    setAddressError(
      "Enter your full delivery address (house, street, area, city, PIN code)."
    );
    return;
  }

  if (text.length > 500) {
    setAddressError("Address must be 500 characters or fewer.");
    return;
  }

  setPhoneError("");
  setAddressError("");
  setFormError("");

  lock.current = true;
  setBusy(true);

  try {
    const raw = await placeOrder({
      phone_number: phone,
      shipping_address: text,
      payment_method: "COD",
      items: items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
      })),
    });

    const order = normalizeOrder(raw);
    clear();
    toast.success("Order placed.");

    navigate(
      order.id != null ? `/orders/${order.id}` : "/orders",
      { replace: true, state: { order: raw } }
    );
  } catch (err) {
    const msg = friendlyError(err);
    setFormError(msg);
    toast.error(msg);

    if ([400, 409].includes(err.response?.status)) {
      const fresh = await reload();
      if (fresh) setNotice(noticeFrom(syncWithProducts(fresh)));
    }
  } finally {
    lock.current = false;
    setBusy(false);
  }
};
  return (
    <div className="shop-container shop-section">
      <h1 className="page__title">Checkout</h1>
      {error && <div className="alert alert--error" role="alert"><AlertTriangle size={18} /> <span>{error} Prices and stock could not be re-checked.</span></div>}
      {notice.map((n) => <div key={n} className="alert alert--info" role="status"><AlertTriangle size={18} /> <span>{n}</span></div>)}

      <form className="shop-cart-layout" onSubmit={submit} noValidate>
        <div className="shop-checkout-main">
          <section className="card">
            <h2 className="card__title">Delivery address</h2>
          <div className="field" ref={suggestionBox}>
<div className="field">
  <label htmlFor="phoneNumber">
    Customer phone number *
  </label>

  <input
    id="phoneNumber"
    type="tel"
    className="input"
    value={phoneNumber}
    onChange={(e) => {
      setPhoneNumber(e.target.value);
      setPhoneError("");
    }}
    placeholder="Enter your contact number"
    autoComplete="tel"
    maxLength={25}
    required
    aria-invalid={!!phoneError}
  />

  {phoneError && (
    <p className="field__error" role="alert">
      {phoneError}
    </p>
  )}
</div>

  <label htmlFor="address">Where should we deliver?</label>

  <div className="address-input-wrap">
    <textarea
      id="address"
      className="input"
      rows={4}
      maxLength={500}
      value={address}
      onChange={(e) => handleAddressChange(e.target.value)}
      onFocus={() => {
        if (suggestions.length > 0) setSuggestionsOpen(true);
      }}
      placeholder="Type your street, area, city or PIN code..."
      autoComplete="street-address"
      aria-invalid={!!addressError}
      aria-expanded={suggestionsOpen}
      aria-controls="address-suggestions"
    />

    {suggestionsOpen && suggestions.length > 0 && (
      <ul
        id="address-suggestions"
        className="address-suggestions"
        role="listbox"
      >
        {suggestions.map((suggestion) => (
          <li key={suggestion.id} role="presentation">
            <button
              type="button"
              className="address-suggestion"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
            >
              <MapPin size={17} aria-hidden="true" />
              <span>{suggestion.label}</span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>

  <div className="address-tools">
    <button
      type="button"
      className="btn btn--secondary"
      onClick={useCurrentLocation}
      disabled={locating || busy}
    >
      {locating ? (
        <LoaderCircle size={17} className="address-spinner" />
      ) : (
        <LocateFixed size={17} />
      )}

      {locating ? "Finding location..." : "Use my current location"}
    </button>

    {searchingAddress && (
      <span className="address-status">
        <LoaderCircle size={15} className="address-spinner" />
        Searching addresses...
      </span>
    )}
  </div>

  <p className="field__hint">
    Enter at least 3 characters to see suggestions. Verify your
    house number, area and PIN code before placing the order.
  </p>

  {locationError && (
    <p className="field__error" role="alert">
      {locationError}
    </p>
  )}

  {addressError && (
    <p className="field__error" id="address-err" role="alert">
      {addressError}
    </p>
  )}
</div>
          </section>
          <section className="card">
            <h2 className="card__title">Payment method</h2>
            <div className="shop-pay" aria-label="Cash on Delivery selected">
              <Banknote size={22} aria-hidden="true" />
              <div><strong>Cash on Delivery</strong><span>Pay in cash when your order arrives.</span></div>
              <span className="badge badge--ok">Selected</span>
            </div>
          </section>
        </div>

        <aside className="shop-summary card" aria-label="Order summary">
          <h2 className="card__title">Order summary</h2>
          <ul className="shop-summary__items">
            {items.map((i) => (
              <li key={i.productId} className={i.unavailable ? "shop-line--off" : ""}>
                <span>{i.name} × {i.quantity}</span>
                <span>{i.unavailable ? "Unavailable" : formatPaise(i.pricePaise * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl><div className="shop-summary__total"><dt>Total payable</dt><dd>{formatPaise(totalPaise)}</dd></div></dl>
          {formError && <div className="alert alert--error" role="alert"><AlertCircle size={18} /> <span>{formError}</span></div>}
          {hasUnavailable && <p className="field__error">Remove unavailable items in your <Link to="/cart">cart</Link> to continue.</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy || loading || hasUnavailable}>
            {busy ? "Placing order…" : "Place order"}
          </button>
          <Link to="/cart" className="btn btn--secondary btn--block">Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}
