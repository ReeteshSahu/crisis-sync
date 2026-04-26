import { useState, useEffect, useRef } from "react";
import {
  collection, onSnapshot, query, orderBy,
  addDoc, serverTimestamp, doc, updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// ─── Emergency metadata ───────────────────────────────────────────────────────
const emergencyData = {
  fire: {
    title: "🔥 Fire Emergency",
    color: "#ff4b2b",
    btnGradient: "linear-gradient(45deg, #ff416c, #ff4b2b)",
    mapIcon: "🔥",
    contacts: [
      { label: "Fire Brigade", number: "101" },
      { label: "National Emergency", number: "112" },
    ],
  },
  medical: {
    title: "🏥 Medical Emergency",
    color: "#00c853",
    btnGradient: "linear-gradient(45deg, #00c853, #64dd17)",
    mapIcon: "🏥",
    contacts: [
      { label: "Ambulance", number: "102" },
      { label: "Emergency", number: "108" },
      { label: "National Emergency", number: "112" },
    ],
  },
  security: {
    title: "🚓 Security Alert",
    color: "#2979ff",
    btnGradient: "linear-gradient(45deg, #2979ff, #00b0ff)",
    mapIcon: "🚓",
    contacts: [
      { label: "Police", number: "100" },
      { label: "National Emergency", number: "112" },
    ],
  },
};

// ─── Pulsing dot ─────────────────────────────────────────────────────────────
function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10, marginRight: 8, verticalAlign: "middle" }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: color, animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite", opacity: 0.6 }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: color }} />
    </span>
  );
}

// ─── Google Map ───────────────────────────────────────────────────────────────
function MapView({ userLocation, emergencies }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!userLocation || !window.google || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 15,
      center: userLocation,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1a2433" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1a2433" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c3e50" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
      mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    new window.google.maps.Marker({
      position: userLocation, map: mapInstanceRef.current, title: "Your Location",
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 },
      zIndex: 999,
    });
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    emergencies.forEach((e) => {
      if (!e.lat || !e.lng) return;
      const meta = emergencyData[e.type];
      const isActive = e.status === "Active";
      const marker = new window.google.maps.Marker({
        position: { lat: e.lat, lng: e.lng },
        map: mapInstanceRef.current,
        title: `${meta.title} — ${e.status}`,
        label: { text: meta.mapIcon, fontSize: "20px" },
        opacity: isActive ? 1 : 0.5,
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="color:#000;padding:6px;min-width:140px"><strong>${meta.title}</strong><br/><span style="color:${isActive ? "red" : "green"};font-weight:bold">${e.status}</span><br/><small>${e.createdAt?.seconds ? new Date(e.createdAt.seconds * 1000).toLocaleTimeString() : "..."}</small></div>`,
      });
      marker.addListener("click", () => infoWindow.open(mapInstanceRef.current, marker));
      markersRef.current.push(marker);
    });
  }, [emergencies]);

  return (
    <div style={{ borderRadius: 15, overflow: "hidden", margin: "16px 0", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
      {!userLocation ? (
        <div style={{ height: 260, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14, flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 28 }}>📍</span>Getting your location...
        </div>
      ) : (
        <div ref={mapRef} style={{ height: 260, width: "100%" }} />
      )}
    </div>
  );
}

// ─── Gemini AI Guidance Panel ─────────────────────────────────────────────────
function AIGuidance({ emergencyType, emergencyId }) {
  const [userInput, setUserInput] = useState("");
  const [guidance, setGuidance] = useState("");
  const [loading, setLoading] = useState(false);
  const meta = emergencyData[emergencyType];
async function generateGuidance(prompt) {
  setLoading(true);
  setGuidance("");
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an emergency response AI assistant.
Emergency type: ${emergencyType.toUpperCase()}
User situation: ${prompt}
Give clear, concise, numbered action steps. Max 6 steps. End with one reassurance line.`
            }]
          }]
        })
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response");
    setGuidance(text.replace(/\*\*(.*?)\*\*/g, '$1'));
  } catch (err) {
    setGuidance("⚠️ AI guidance unavailable. Call emergency services immediately.");
    console.error("Gemini error:", err);
  }
  setLoading(false);
}

  const lastCallRef = useRef(0);

async function handleAsk() {
  if (!userInput.trim()) return;
  
  const now = Date.now();
  if (now - lastCallRef.current < 10000) {
    alert("Please wait a few seconds before asking again.");
    return;
  }
  
  lastCallRef.current = now;
  await generateGuidance(userInput);
  setUserInput("");
}

  // Speak guidance aloud using Web Speech API
  function speakGuidance() {
    if (!guidance || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(guidance.replace(/[*#]/g, ""));
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: `1px solid ${meta.color}44` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: meta.color, fontSize: 15 }}>🤖 Gemini AI Guidance</h3>
        {guidance && (
          <button
            onClick={speakGuidance}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}
          >
            🔊 Speak
          </button>
        )}
      </div>

      {/* AI Response */}
      <div style={{ minHeight: 60, fontSize: 13, lineHeight: 1.7, color: "#ddd", whiteSpace: "pre-wrap" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#aaa" }}>
            <span style={{ animation: "ping 1s infinite", display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
            Gemini is analyzing your emergency...
          </div>
        ) : guidance ? (
          guidance
        ) : null}
      </div>

      {/* User can ask follow-up questions */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Describe your situation or ask a question..."
          style={{
            flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #444",
            background: "rgba(255,255,255,0.07)", color: "white", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          style={{
            padding: "9px 16px", borderRadius: 8, border: "none",
            background: meta.btnGradient ?? meta.color,
            color: "white", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold", fontSize: 13, opacity: loading ? 0.6 : 1,
          }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

// ─── Emergency Card ───────────────────────────────────────────────────────────
function EmergencyCard({ item, onResolve }) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const meta = emergencyData[item.type];
  const isActive = item.status === "Active";
  const createdSec = item.createdAt?.seconds ?? null;
  const resolvedSec = item.resolvedAt?.seconds ?? null;

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!createdSec) return;
    if (isActive) {
      timerRef.current = setInterval(() => setElapsed(Math.floor(Date.now() / 1000 - createdSec)), 1000);
      setElapsed(Math.floor(Date.now() / 1000 - createdSec));
    } else {
      if (resolvedSec) setElapsed(resolvedSec - createdSec);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, createdSec, resolvedSec]);

  const formatTS = (ts) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleTimeString() : "...";

  return (
    <div className="card" style={{ borderLeft: `4px solid ${meta.color}`, animation: "slideDown 0.35s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0, color: meta.color, display: "flex", alignItems: "center" }}>
          {isActive && <PulsingDot color={meta.color} />}
          {meta.title}
        </h2>
        <span style={{
          padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: "bold",
          background: isActive ? "rgba(255,75,43,0.15)" : "rgba(0,200,83,0.15)",
          color: isActive ? "#ff6b6b" : "lightgreen",
          border: `1px solid ${isActive ? "#ff4b2b" : "#00c853"}`,
        }}>
          {isActive ? "🔴 ACTIVE" : "✅ RESOLVED"}
        </span>
      </div>

      {/* Timer + timestamps */}
      <p style={{ fontSize: 17, fontWeight: "bold", margin: "12px 0 6px" }}>
        ⏱ {isActive ? "Ongoing" : "Total"} Time: {elapsed} sec
      </p>
      <p style={{ color: "#ccc", margin: "3px 0", fontSize: 13 }}>⏰ Started: {formatTS(item.createdAt)}</p>
      {item.resolvedAt && <p style={{ color: "#ccc", margin: "3px 0", fontSize: 13 }}>✅ Resolved: {formatTS(item.resolvedAt)}</p>}

      {/* Gemini AI Guidance */}
      <AIGuidance emergencyType={item.type} emergencyId={item.id} />

      {/* Contacts */}
      <h3 style={{ marginTop: 16, marginBottom: 6 }}>Emergency Contacts</h3>
      {meta.contacts.map((c, i) => (
        <p key={i} style={{ margin: "5px 0" }}>
          📞 {c.label}: <a className="contact-link" href={`tel:${c.number}`}>{c.number}</a>
        </p>
      ))}

      <p style={{ margin: "12px 0 4px", color: "#aaa", fontSize: 13 }}>📢 Alert sent to emergency services</p>

      {isActive && (
        <button className="resolve-btn" onClick={() => onResolve(item.id)}>
          ✅ Mark as Resolved
        </button>
      )}
    </div>
  );
}

// ─── Voice Trigger ────────────────────────────────────────────────────────────
function VoiceTrigger({ onTrigger }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser. Use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const said = event.results[0][0].transcript.toLowerCase();
      setTranscript(said);
      if (said.includes("fire")) onTrigger("fire");
      else if (said.includes("medical") || said.includes("ambulance") || said.includes("help")) onTrigger("medical");
      else if (said.includes("security") || said.includes("police") || said.includes("intruder")) onTrigger("security");
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    setListening(true);
    setTranscript("");
  }

  return (
    <div style={{ textAlign: "center", marginTop: 14 }}>
      <button
        onClick={startListening}
        disabled={listening}
        style={{
          padding: "10px 20px", borderRadius: 10, border: "none", cursor: listening ? "not-allowed" : "pointer",
          background: listening ? "rgba(255,75,43,0.3)" : "rgba(255,255,255,0.1)",
          color: "white", fontWeight: "bold", fontSize: 14,
          transition: "background 0.3s",
          boxShadow: listening ? "0 0 15px rgba(255,75,43,0.5)" : "none",
        }}
      >
        {listening ? "🎙️ Listening... Say 'Fire', 'Medical' or 'Security'" : "🎙️ Voice Trigger"}
      </button>
      {transcript && (
        <p style={{ color: "#aaa", fontSize: 12, marginTop: 6 }}>Heard: "{transcript}"</p>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function CrisisSyncAI() {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("Location error:", err),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "emergencies"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmergencies(docs);
      setSelectedId((prev) => {
        if (!prev && docs.length > 0) return docs[0].id;
        if (docs.length > 0 && docs[0].status === "Active" && docs[0].id !== prev) return docs[0].id;
        return prev;
      });
    });
    return () => unsub();
  }, []);

  async function triggerEmergency(type) {
    try {
      const ref = await addDoc(collection(db, "emergencies"), {
        type, status: "Active",
        createdAt: serverTimestamp(), resolvedAt: null,
        lat: userLocation?.lat ?? null, lng: userLocation?.lng ?? null,
      });
      setSelectedId(ref.id);
    } catch (err) {
      console.error("Error adding emergency:", err);
    }
  }

  async function resolveEmergency(id) {
    try {
      await updateDoc(doc(db, "emergencies", id), { status: "Resolved", resolvedAt: serverTimestamp() });
    } catch (err) {
      console.error("Error resolving:", err);
    }
  }

  const selectedEmergency = emergencies.find((e) => e.id === selectedId) ?? null;
  const total = emergencies.length;
  const activeCount = emergencies.filter((e) => e.status === "Active").length;
  const resolvedList = emergencies.filter((e) => e.status === "Resolved");
  const avgTime = resolvedList.length > 0
    ? (resolvedList.reduce((sum, e) => {
        if (e.createdAt?.seconds && e.resolvedAt?.seconds) return sum + (e.resolvedAt.seconds - e.createdAt.seconds);
        return sum;
      }, 0) / resolvedList.length).toFixed(1)
    : 0;

  return (
    <div style={{ minHeight: "100vh", margin: 0, fontFamily: "'Segoe UI', sans-serif", background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", color: "white" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border-radius: 15px; padding: 20px; margin: 16px 0; box-shadow: 0 0 20px rgba(0,0,0,0.5); transition: transform 0.3s; }
        .card:hover { transform: translateY(-4px); }
        .emergency-btn { padding: 14px 22px; font-size: 16px; border: none; border-radius: 10px; cursor: pointer; color: white; font-weight: bold; transition: transform 0.3s, box-shadow 0.3s; }
        .emergency-btn:hover { transform: scale(1.1); box-shadow: 0 0 18px rgba(255,255,255,0.4); }
        .resolve-btn { background: #111; color: white; margin-top: 14px; border: 1px solid #555; padding: 10px 18px; font-size: 14px; border-radius: 10px; cursor: pointer; transition: background 0.2s, transform 0.2s; }
        .resolve-btn:hover { background: #222; transform: scale(1.04); }
        .contact-link { color: #ffd54f; text-decoration: none; font-weight: bold; }
        .contact-link:hover { text-decoration: underline; }
        .history-row { padding: 10px; border-radius: 10px; margin-bottom: 6px; cursor: pointer; border: 1px solid transparent; transition: background 0.2s, border-color 0.2s; }
        .history-row:hover { background: rgba(255,255,255,0.07); }
        .right-panel::-webkit-scrollbar { width: 6px; }
        .right-panel::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
        input::placeholder { color: #666; }
        @media (max-width: 768px) { .main-layout { flex-direction: column !important; } .right-panel { position: static !important; max-height: none !important; } }
      `}</style>

      <div className="main-layout" style={{ display: "flex", gap: 20, padding: 20 }}>

        {/* ── LEFT PANEL ─────────────────────────── */}
        <div style={{ flex: 2 }}>
          <h1 style={{ fontSize: 40, marginBottom: 5 }}>🚨 CrisisSync AI</h1>
          <p style={{ color: "#ccc", marginBottom: 24 }}>Powered by Google Gemini + Firebase</p>

          {/* Trigger buttons + voice */}
          <div className="card">
            <h2 style={{ animation: "fadeIn 0.5s ease-in-out", marginTop: 0 }}>Select Emergency</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(emergencyData).map(([type, meta]) => (
                <button key={type} className="emergency-btn" style={{ background: meta.btnGradient }} onClick={() => triggerEmergency(type)}>
                  {meta.title}
                </button>
              ))}
            </div>
            <VoiceTrigger onTrigger={triggerEmergency} />
            {activeCount > 0 && (
              <p style={{ textAlign: "center", marginTop: 12, color: "#ff6b6b", fontWeight: "bold", marginBottom: 0 }}>
                ⚠️ {activeCount} active emergency{activeCount > 1 ? "s" : ""} — check activity log
              </p>
            )}
          </div>

          {/* Map */}
          <MapView userLocation={userLocation} emergencies={emergencies} />

          {/* Selected emergency */}
          {selectedEmergency ? (
            <EmergencyCard key={selectedEmergency.id} item={selectedEmergency} onResolve={resolveEmergency} />
          ) : (
            <div className="card">
              <h2 style={{ margin: 0, color: "#aaa" }}>Status: No Emergency</h2>
              <p style={{ color: "#666", marginBottom: 0 }}>Trigger an emergency above or use voice command.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ────────────────────────── */}
        <div className="right-panel" style={{ flex: 1, position: "sticky", top: 20, background: "rgba(255,255,255,0.05)", borderRadius: 15, padding: 20, maxHeight: "88vh", overflowY: "auto", backdropFilter: "blur(10px)", boxShadow: "0 0 20px rgba(0,0,0,0.5)", alignSelf: "flex-start" }}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>📊 Activity Log</h3>
          <p style={{ color: "#aaa", fontSize: 12, marginTop: 0, marginBottom: 14 }}>Click any item to view it</p>

          {emergencies.length === 0 ? (
            <p style={{ color: "#666" }}>No emergencies yet</p>
          ) : (
            emergencies.map((item) => {
              const meta = emergencyData[item.type];
              const isActive = item.status === "Active";
              const isSelected = item.id === selectedId;
              return (
                <div key={item.id} className="history-row" onClick={() => setSelectedId(item.id)}
                  style={{ borderColor: isSelected ? meta.color + "88" : "transparent", background: isSelected ? `${meta.color}15` : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center" }}>
                      {isActive && <PulsingDot color={meta.color} />}
                      <strong style={{ color: meta.color, fontSize: 13 }}>{item.type.toUpperCase()}</strong>
                    </span>
                    <span style={{ fontSize: 10, fontWeight: "bold", padding: "2px 8px", borderRadius: 12, background: isActive ? "rgba(255,75,43,0.15)" : "rgba(0,200,83,0.15)", color: isActive ? "#ff6b6b" : "lightgreen", border: `1px solid ${isActive ? "#ff4b2b55" : "#00c85355"}` }}>
                      {isActive ? "ACTIVE" : "RESOLVED"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "#bbb", fontSize: 11 }}>
                    ⏰ {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString() : "..."}
                  </p>
                  {item.resolvedAt && <p style={{ margin: "2px 0 0", color: "#888", fontSize: 11 }}>✅ {new Date(item.resolvedAt.seconds * 1000).toLocaleTimeString()}</p>}
                  {isSelected && <p style={{ margin: "5px 0 0", fontSize: 10, color: meta.color, fontWeight: "bold" }}>👁 Viewing now</p>}
                </div>
              );
            })
          )}

          <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "16px 0" }} />
          <h3 style={{ marginBottom: 10 }}>📈 System Analytics</h3>
          <p style={{ margin: "6px 0" }}>Total Emergencies: <strong>{total}</strong></p>
          <p style={{ margin: "6px 0" }}>Active Now: <strong style={{ color: activeCount > 0 ? "#ff6b6b" : "lightgreen" }}>{activeCount}</strong></p>
          <p style={{ margin: "6px 0" }}>Resolved: <strong style={{ color: "lightgreen" }}>{resolvedList.length}</strong></p>
          <p style={{ margin: "6px 0" }}>Avg Response Time: <strong>{avgTime} sec</strong></p>
        </div>

      </div>
    </div>
  );
}