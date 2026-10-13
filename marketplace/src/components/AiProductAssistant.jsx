import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mic, Sparkles, Square, Wand2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import "../styles/ai-assistant.css";

const VOICE_ERRORS = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser settings and try again.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser settings and try again.",
  "no-speech": "No speech was detected. Try again, closer to the microphone.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice input needs an internet connection.",
};

export default function AiProductAssistant({ onDraft }) {
  const [language, setLanguage] = useState("en-IN");
  const [instruction, setInstruction] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser. Please type instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    const startingText = instruction.trim();
    let finalText = "";

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += ` ${result[0].transcript}`;
        else interimText += ` ${result[0].transcript}`;
      }
      setInstruction([startingText, finalText.trim(), interimText.trim()].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      setError(VOICE_ERRORS[event.error] || `Voice input error: ${event.error}`);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current?.stop();
    recognitionRef.current = recognition;
    setError("");
    setApplied(false);
    setListening(true);
    recognition.start();
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      startVoice();
    }
  }

  async function generateDraft() {
    if (!instruction.trim()) {
      setError("Speak or type the product details first.");
      return;
    }
    setLoading(true);
    setError("");
    setApplied(false);
    try {
      // Uses the shared Axios client: token from memory, same-origin proxy, automatic refresh.
      const { data } = await api.post("/products/ai-draft", { instruction: instruction.trim() });
      if (!data?.draft) throw new Error("The assistant did not return a draft. Please try again.");
      onDraft(data.draft);
      setApplied(true);
    } catch (err) {
      setError(err.response ? getErrorMessage(err) : err.message || "Could not generate a draft.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-card" aria-labelledby="ai-title">
      <div className="ai-card__head">
        <span className="ai-card__icon" aria-hidden="true"><Sparkles size={20} /></span>
        <div>
          <h2 id="ai-title">AI product assistant</h2>
          <p>Say or type the product details and the form below fills in for you. Review everything before saving.</p>
        </div>
      </div>

      <div className="ai-card__body">
        <div className="ai-card__main">
          <label htmlFor="ai-instruction">Product details</label>
          <div className={`ai-card__textwrap${listening ? " ai-card__textwrap--live" : ""}`}>
            <textarea
              id="ai-instruction"
              className="input"
              rows={4}
              maxLength={3000}
              value={instruction}
              onChange={(e) => { setInstruction(e.target.value); setApplied(false); }}
              placeholder="Add milk, price 100 rupees, stock 10, pack size 250 grams."
              disabled={loading}
            />
            {listening && (
              <span className="ai-card__live" role="status">
                <span className="ai-card__dot" aria-hidden="true" /> Listening…
              </span>
            )}
          </div>
        </div>

        <div className="ai-card__side">
          <div className="ai-card__lang">
            <label htmlFor="ai-language">Speech language</label>
            <select id="ai-language" className="input" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={listening || loading}>
              <option value="en-IN">English (India)</option>
              <option value="ta-IN">Tamil (India)</option>
            </select>
          </div>
          <button type="button" className={`btn btn--secondary btn--block${listening ? " ai-card__stop" : ""}`} onClick={toggleVoice} disabled={loading} aria-pressed={listening}>
            {listening ? <Square size={16} /> : <Mic size={18} />} {listening ? "Stop speaking" : "Speak"}
          </button>
          <button type="button" className="btn btn--primary btn--block" onClick={generateDraft} disabled={loading || listening || !instruction.trim()}>
            {loading ? <Loader2 size={18} className="spin" /> : <Wand2 size={18} />} {loading ? "Generating…" : "Generate draft"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error ai-card__msg" role="alert">
          <AlertCircle size={18} aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
      {applied && !error && (
        <div className="alert ai-card__ok ai-card__msg" role="status">
          <CheckCircle2 size={18} aria-hidden="true" /> <span>Draft added to the form below. Check the details, then save.</span>
        </div>
      )}
    </section>
  );
}