import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Mic, MicOff, Send, X, LoaderCircle, Volume2,
  ShoppingCart, MessageCircle, Store, Package, UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getProducts } from "../services/customerApi";
import { sendAssistantMessage } from "../services/voiceAssistantApi";
import "./MicButton.css";

const SpeechRecognition = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;
const LANGUAGE = "en-IN";
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const copy = {
  welcome: "Hello! I can help you find products, manage your cart, and open your customer account and orders.",
  fallback: "Sorry, I couldn't complete that. Please try again.",
  unavailable: "That product is unavailable or there isn't enough stock.",
  added: "I've updated your cart.",
  capped: "I added only the quantity currently available in stock.",
  removed: "I've removed that product from your cart.",
  cleared: "I've emptied your cart.",
  qtyUpdated: "I've updated the quantity in your cart.",
  unsupported: "Voice recognition isn't supported in this browser. You can type your request below.",
  thinking: "Thinking…",
  listening: "Listening… Speak now, then pause.",
  placeholder: "Try ‘add 2 milk packets to my cart’…",
  assistantDown: "The assistant is unavailable. Check that Flask and the AI proxy are running.",
};

export default function MicButton() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => [
    { id: makeId(), role: "assistant", text: copy.welcome },
  ]);
  const [products, setProducts] = useState([]);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const { items, add, setQty, remove, clear, count } = useCart();
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const refreshProducts = useCallback(async () => {
    const fresh = await getProducts();
    setProducts(fresh);
    return fresh;
  }, []);

  useEffect(() => {
    refreshProducts().catch(() => {});
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [refreshProducts]);

  const say = useCallback((text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const append = (role, text) => setMessages((previous) => [
    ...previous,
    { id: makeId(), role, text },
  ]);

  const processMessage = async (providedText) => {
    const message = (providedText ?? draft).trim();
    if (!message || busy) return;
    setDraft("");
    append("user", message);
    setBusy(true);

    try {
      // The server validates product IDs and stock; the cart snapshot is only context.
      const result = await sendAssistantMessage({
        message,
        language: LANGUAGE,
        cart: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          name: item.name,
        })),
        page: location.pathname,
      });
      let response = String(result?.reply || copy.fallback);
      const action = result?.action && typeof result.action === "object"
        ? result.action
        : { type: "none" };
      const productId = Number(action.product_id);
      const quantity = Number(action.quantity);

      // Only known client actions are allowed. AI output is never treated as executable code.
      if (action.type === "add_to_cart") {
        const fresh = await refreshProducts().catch(() => products);
        const product = fresh.find((item) => Number(item.id) === productId);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || product.is_available !== true || Number(product.stock_quantity) < 1) {
          response += ` ${copy.unavailable}`;
        } else {
          const outcome = add(product, quantity);
          if (!outcome?.ok) response += ` ${copy.unavailable}`;
          else if (outcome.capped) response += ` ${copy.capped}`;
          else if (!response.trim()) response = copy.added;
          toast.success("Cart updated");
        }
      } else if (action.type === "set_cart_quantity") {
        const current = items.find((item) => Number(item.productId) === productId);
        if (!current || !Number.isInteger(quantity) || quantity < 1) {
          response += " I couldn't find that item in your cart or the quantity was invalid.";
        } else {
          const fresh = await refreshProducts().catch(() => products);
          const product = fresh.find((item) => Number(item.id) === productId);
          if (!product || product.is_available !== true || Number(product.stock_quantity) < 1) {
            response += ` ${copy.unavailable}`;
          } else {
            const safeQuantity = Math.min(quantity, Number(product.stock_quantity));
            setQty(productId, safeQuantity);
            response += quantity > Number(product.stock_quantity) ? ` ${copy.capped}` : ` ${copy.qtyUpdated}`;
          }
        }
      } else if (action.type === "remove_from_cart") {
        if (!items.some((item) => Number(item.productId) === productId)) {
          response += " That product isn't in your cart.";
        } else {
          remove(productId);
          response += ` ${copy.removed}`;
        }
      } else if (action.type === "clear_cart") {
        clear();
        response += ` ${copy.cleared}`;
      } else if (action.type === "go_to_cart") {
        navigate("/cart");
      } else if (action.type === "go_to_checkout") {
        response += " I'll open checkout for you to review. Please check your address, phone number, items, and total, then submit the order yourself.";
        navigate("/checkout");
      } else if (action.type === "show_products") {
        navigate("/shop");
      } else if (action.type === "search_products") {
        const query = String(action.query || "").trim().slice(0, 100);
        navigate(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
      } else if (action.type === "show_orders") {
        if (status === "customer") navigate("/orders");
        else {
          navigate("/customer/login", { state: { from: "/orders" } });
          response = "Please sign in to view your orders. Opening customer login.";
        }
      } else if (action.type === "show_account") {
        if (status === "customer") navigate("/account");
        else {
          navigate("/customer/login", { state: { from: "/account" } });
          response = "Please sign in to view your account. Opening customer login.";
        }
      } else if (action.type === "go_to_login") {
        navigate("/customer/login", { state: { from: location.pathname } });
      } else if (action.type === "go_to_register") {
        navigate("/customer/register");
      }

      append("assistant", response.trim() || copy.fallback);
      say(response.trim() || copy.fallback);
    } catch (error) {
      const messageText = error?.response?.data?.error || copy.assistantDown;
      append("assistant", messageText);
      say(messageText);
    } finally {
      setBusy(false);
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      append("assistant", copy.unsupported);
      return;
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    const recognition = new SpeechRecognition();
    recognition.lang = LANGUAGE;
    recognition.continuous = false;
    recognition.interimResults = true;
    transcriptRef.current = "";
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += part;
        else interimText += part;
      }
      if (finalText.trim()) transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim();
      setDraft(`${transcriptRef.current}${interimText ? ` ${interimText}` : ""}`.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error(`Voice input: ${event.error}`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      const captured = transcriptRef.current.trim();
      if (captured) processMessage(captured);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setListening(false); }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { setListening(false); }
  };

  return (
    <>
      <button type="button" className="mic-fab" onClick={() => setOpen(true)} aria-label="Open voice shopping assistant" title="Voice shopping assistant">
        <Mic size={25} aria-hidden="true" /><span className="mic-fab__label">Ask Pure Pail</span>
      </button>

      {open && (
        <section className="voice-assistant" role="dialog" aria-modal="false" aria-label="Pure Pail voice shopping assistant">
          <header className="voice-assistant__head">
            <div className="voice-assistant__brand">
              <span className="voice-assistant__brand-icon"><MessageCircle size={20} /></span>
              <div><strong>Pure Pail Assistant</strong><small>{status === "customer" ? "Customer account connected" : "Shop by speaking or typing"}</small></div>
            </div>
            <button className="voice-assistant__close" type="button" onClick={() => { stopListening(); setOpen(false); }} aria-label="Close assistant"><X size={20} /></button>
          </header>

          <div className="voice-assistant__tools">
            <span className="voice-assistant__language">English (India)</span>
            <button type="button" className="voice-assistant__cart" onClick={() => navigate("/cart")}><ShoppingCart size={16} /> Cart ({count})</button>
          </div>
          <div className="voice-assistant__quicklinks">
            <button type="button" onClick={() => navigate("/shop")}><Store size={14} /> Products</button>
            <button type="button" onClick={() => navigate(status === "customer" ? "/orders" : "/customer/login", status === "customer" ? undefined : { state: { from: "/orders" } })}><Package size={14} /> Orders</button>
            <button type="button" onClick={() => navigate(status === "customer" ? "/account" : "/customer/login", status === "customer" ? undefined : { state: { from: "/account" } })}><UserRound size={14} /> Account</button>
          </div>

          <div className="voice-assistant__messages" aria-live="polite">
            {messages.map((item) => (
              <div key={item.id} className={`voice-message voice-message--${item.role}`}>
                <p>{item.text}</p>
                {item.role === "assistant" && <button type="button" className="voice-message__speak" title="Read response aloud" onClick={() => say(item.text)}><Volume2 size={14} /></button>}
              </div>
            ))}
            {busy && <div className="voice-assistant__working"><LoaderCircle className="voice-spin" size={16} /> {copy.thinking}</div>}
          </div>

          {listening && <div className="voice-assistant__listening"><span /> {copy.listening}</div>}
          <form className="voice-assistant__composer" onSubmit={(event) => { event.preventDefault(); processMessage(); }}>
            <button type="button" className={`voice-assistant__mic ${listening ? "is-listening" : ""}`} onClick={listening ? stopListening : startListening} disabled={busy} aria-label={listening ? "Stop recording" : "Speak"}>
              {listening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={copy.placeholder} aria-label="Message the shopping assistant" maxLength={1000} />
            <button type="submit" className="voice-assistant__send" disabled={busy || !draft.trim()} aria-label="Send message"><Send size={18} /></button>
          </form>
          <p className="voice-assistant__hint">English-only assistant. It can navigate customer pages and update your cart. Review checkout and submit orders yourself.</p>
        </section>
      )}
    </>
  );
}
