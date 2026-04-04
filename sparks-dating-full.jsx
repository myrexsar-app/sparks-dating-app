import { useState, useRef } from "react";

const C = {
  bg: "#080810", surface: "#10101c", card: "#16162a", cardHover: "#1e1e35",
  border: "#ffffff10", borderMid: "#ffffff1a", accent: "#c026d3",
  accentDim: "#c026d318", gold: "#f5c518", purple: "#8b5cf6",
  purpleDim: "#8b5cf618", green: "#10b981",
  text: "#f0eaf8", muted: "#7a7590",
};

const PROFILES = [
  { id:1, name:"Sophia", age:26, city:"New York", match:94, bio:"Loves hiking and coffee.", emoji:"🌸", color:"#ff6b9d", verified:true, interests:["Hiking","Coffee","Travel"] },
  { id:2, name:"Maya", age:24, city:"Los Angeles", match:88, bio:"Artist and foodie.", emoji:"🌙", color:"#8b5cf6", verified:true, interests:["Art","Food","Music"] },
  { id:3, name:"Lior", age:28, city:"Miami", match:91, bio:"Surfer by day, chef by night.", emoji:"🌊", color:"#3b82f6", verified:false, interests:["Surfing","Cooking","Travel"] },
  { id:4, name:"Noa", age:23, city:"Chicago", match:85, bio:"Dog mom and big dreamer.", emoji:"✨", color:"#10b981", verified:true, interests:["Dogs","Yoga","Hiking"] },
];

const PLANS = [
  { name:"Free", price:0, color:"#7a7590", features:["5 swipes/day","Basic matching"], cta:"Current plan" },
  { name:"Pro", price:9.99, color:"#c026d3", popular:true, features:["Unlimited swipes","See who liked you","Smart match","1 Super Like/day"], cta:"Get Pro" },
  { name:"VIP", price:24.99, color:"#f5c518", features:["Everything in Pro","Priority discovery","Video dates","Incognito mode"], cta:"Get VIP" },
];

export default function App() {
  const [page, setPage] = useState("Discover");
  const [profiles, setProfiles] = useState(PROFILES);
  const [liked, setLiked] = useState([]);
  const [swipeDir, setSwipeDir] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [matchPopup, setMatchPopup] = useState(null);
  const [activePlan, setActivePlan] = useState("Pro");
  const [legal, setLegal] = useState(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [chatWith, setChatWith] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMsg, setNewMsg] = useState("");
  const dragStart = useRef(null);

  const current = profiles[0];

  const handleSwipe = (dir) => {
    if (!current) return;
    setSwipeDir(dir);
    setTimeout(() => {
      if (dir === "right") {
        setLiked(function(p) { return [...p, current]; });
        if (Math.random() > 0.5) setMatchPopup(current);
      }
      setProfiles(function(p) { return p.slice(1); });
      setSwipeDir(null);
      setDragX(0);
    }, 340);
  };

  const onMouseDown = function(e) { dragStart.current = e.clientX; setDragging(true); };
  const onMouseMove = function(e) { if (!dragging) return; setDragX(e.clientX - dragStart.current); };
  const onMouseUp = function() {
    if (dragX > 90) handleSwipe("right");
    else if (dragX < -90) handleSwipe("left");
    else setDragX(0);
    setDragging(false);
    dragStart.current = null;
  };

  const tx = swipeDir === "right" ? "translateX(130%) rotate(22deg)" : swipeDir === "left" ? "translateX(-130%) rotate(-22deg)" : "translateX(" + dragX + "px) rotate(" + (dragX * 0.04) + "deg)";
  const cardStyle = {
    transform: tx,
    transition: swipeDir ? "transform 0.34s ease" : dragging ? "none" : "transform 0.18s",
    cursor: dragging ? "grabbing" : "grab",
  };

  const sendMsg = function() {
    if (!newMsg.trim() || !chatWith) return;
    var chatId = chatWith.id;
    var txt = newMsg.trim();
    setMessages(function(prev) {
      var existing = prev[chatId] || [];
      var updated = {};
      Object.keys(prev).forEach(function(k) { updated[k] = prev[k]; });
      updated[chatId] = [...existing, { from: "me", text: txt }];
      return updated;
    });
    setNewMsg("");
  };

  if (!ageConfirmed) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui" }}>
        <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:400, width:"100%", textAlign:"center", border:"1px solid " + C.borderMid }}>
          <div style={{ fontSize:48 }}>💜</div>
          <h2 style={{ color:C.text, margin:"12px 0 8px" }}>Welcome to VyndLove</h2>
          <p style={{ color:C.muted, marginBottom:24 }}>You must be 18 or older to use this app. COPPA compliant.</p>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={function() { setAgeConfirmed(true); }} style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700 }}>I am 18+</button>
            <button onClick={function() { alert("You must be 18+ to use this app."); }} style={{ flex:1, background:"transparent", color:C.muted, border:"1px solid " + C.border, borderRadius:12, padding:"13px 0", cursor:"pointer" }}>Under 18</button>
          </div>
        </div>
      </div>
    );
  }

  var legalTitle = "";
  if (legal === "privacy") legalTitle = "Privacy Policy";
  else if (legal === "terms") legalTitle = "Terms of Service";
  else if (legal === "cookies") legalTitle = "Cookie Policy";
  else if (legal === "safety") legalTitle = "Safety Guide";

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui" }}>

      {legal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:32, maxWidth:560, width:"100%", border:"1px solid " + C.borderMid, maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ margin:0, color:C.text }}>{legalTitle}</h2>
              <button onClick={function() { setLegal(null); }} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>X</button>
            </div>
            <div style={{ color:C.muted, lineHeight:1.8, fontSize:14 }}>
              {legal === "privacy" && <div><p>1. Data We Collect: Name, age, photos. No data from under 18. COPPA compliant.</p><p>2. Your Rights: Access, correct, delete your data. GDPR and CCPA compliant.</p><p>3. Contact: privacy@vyndlove.com</p></div>}
              {legal === "terms" && <div><p>1. Eligibility: Must be 18+.</p><p>2. No fake profiles, harassment, or illegal content.</p><p>3. Subscriptions auto-renew. Cancel anytime. 7-day refund.</p><p>4. Governing Law: New York, USA.</p></div>}
              {legal === "cookies" && <div><p>Essential cookies required for login. Analytics are anonymous. No advertising cookies.</p></div>}
              {legal === "safety" && <div><p>Before meeting: video chat first, tell someone where you are going.</p><p>First dates: meet in public, arrange own transport.</p><p>Emergency: 911. RAINN: 1-800-656-4673. Crisis Text: HOME to 741741.</p></div>}
            </div>
            <button onClick={function() { setLegal(null); }} style={{ marginTop:20, background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", cursor:"pointer", fontWeight:700 }}>Close</button>
          </div>
        </div>
      )}

      {matchPopup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:340, width:"100%", textAlign:"center", border:"2px solid " + C.accent }}>
            <div style={{ fontSize:52 }}>💜</div>
            <h2 style={{ color:C.accent, margin:"10px 0 6px" }}>It is a Match!</h2>
            <p style={{ color:C.muted }}>You and {matchPopup.name} liked each other!</p>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={function() { setChatWith(matchPopup); setMatchPopup(null); setPage("Chat"); }} style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700 }}>Message</button>
              <button onClick={function() { setMatchPopup(null); }} style={{ flex:1, background:"transparent", color:C.muted, border:"1px solid " + C.border, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>Keep Swiping</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background:C.surface, borderBottom:"1px solid " + C.border, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontWeight:900, fontSize:22, color:C.accent }}>💜 VyndLove</span>
        <nav style={{ display:"flex", gap:2 }}>
          {["Discover","Matches","Chat","Pricing","Settings"].map(function(n) {
            return (
              <button key={n} onClick={function() { setPage(n); }} style={{ background: page === n ? C.accentDim : "transparent", color: page === n ? C.accent : C.muted, border:"none", borderRadius:8, padding:"7px 12px", cursor:"pointer", fontWeight:600, fontSize:13 }}>{n}</button>
            );
          })}
        </nav>
      </div>

      {page === "Discover" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 24px", gap:20 }}>
          <h1 style={{ margin:0, fontSize:28, fontWeight:900, color:C.text }}>Find Your Match 💜</h1>
          {current ? (
            <div style={{ position:"relative", width:"100%", maxWidth:380 }}>
              {profiles[1] && <div style={{ position:"absolute", top:10, left:10, right:10, bottom:-10, background:C.cardHover, borderRadius:24, zIndex:0 }} />}
              <div style={Object.assign({}, cardStyle, { position:"relative", zIndex:1, background:C.card, borderRadius:24, border:"1px solid " + C.borderMid, overflow:"hidden" })}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
                <div style={{ position:"absolute", top:18, left:18, zIndex:10, opacity: Math.min(Math.max(dragX/80,0),1), transform:"rotate(-12deg)", background:"#10b981", color:"#fff", borderRadius:8, padding:"5px 12px", fontWeight:900, border:"3px solid #10b981" }}>LIKE</div>
                <div style={{ position:"absolute", top:18, right:18, zIndex:10, opacity: Math.min(Math.max(-dragX/80,0),1), transform:"rotate(12deg)", background:C.accent, color:"#fff", borderRadius:8, padding:"5px 12px", fontWeight:900, border:"3px solid " + C.accent }}>NOPE</div>
                <div style={{ height:280, background:"linear-gradient(160deg," + current.color + "22," + current.color + "08)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <div style={{ width:120, height:120, borderRadius:"50%", background:"linear-gradient(135deg," + current.color + "," + current.color + "66)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:56 }}>{current.emoji}</div>
                  {current.verified && <div style={{ position:"absolute", top:12, left:12, background:"#3b82f620", border:"1px solid #3b82f6", borderRadius:20, padding:"3px 10px", fontSize:11, color:"#3b82f6" }}>Verified</div>}
                  <div style={{ position:"absolute", top:12, right:12, background:"#10b98120", border:"1px solid #10b981", borderRadius:20, padding:"3px 10px", fontSize:11, color:"#10b981" }}>{current.match}% match</div>
                </div>
                <div style={{ padding:"18px 20px" }}>
                  <h2 style={{ margin:"0 0 4px", fontSize:22, color:C.text }}>{current.name}, <span style={{ color:C.muted, fontWeight:400 }}>{current.age}</span></h2>
                  <p style={{ margin:"0 0 12px", color:C.muted, fontSize:13 }}>{current.city}</p>
                  <p style={{ margin:"0 0 12px", color:"#ccc", fontSize:14, lineHeight:1.6 }}>{current.bio}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {current.interests.map(function(i) {
                      return <span key={i} style={{ background:C.purpleDim, color:C.purple, borderRadius:20, padding:"3px 10px", fontSize:12 }}>{i}</span>;
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"center", gap:18, marginTop:20 }}>
                <button onClick={function() { handleSwipe("left"); }} style={{ width:60, height:60, borderRadius:"50%", background:C.card, border:"2px solid " + C.accent, color:C.accent, fontSize:18, cursor:"pointer" }}>Pass</button>
                <button onClick={function() { handleSwipe("right"); }} style={{ width:60, height:60, borderRadius:"50%", background:C.card, border:"2px solid #10b981", color:"#10b981", fontSize:18, cursor:"pointer" }}>Like</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:60 }}>
              <h2 style={{ color:C.accent }}>You have seen everyone!</h2>
              <button onClick={function() { setProfiles(PROFILES); }} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"12px 24px", cursor:"pointer", fontWeight:700 }}>Reset</button>
            </div>
          )}
        </div>
      )}

      {page === "Matches" && (
        <div style={{ maxWidth:700, margin:"0 auto", padding:"36px 24px" }}>
          <h1 style={{ margin:"0 0 20px", color:C.text }}>Your Matches 💜</h1>
          {liked.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, background:C.card, borderRadius:20 }}>
              <p style={{ color:C.muted }}>No matches yet. Go swipe!</p>
              <button onClick={function() { setPage("Discover"); }} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontWeight:700 }}>Start Swiping</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16 }}>
              {liked.map(function(p) {
                return (
                  <div key={p.id} style={{ background:C.card, borderRadius:20, overflow:"hidden", border:"1px solid " + C.border }}>
                    <div style={{ height:100, background:"linear-gradient(135deg," + p.color + "30," + p.color + "08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>{p.emoji}</div>
                    <div style={{ padding:14 }}>
                      <div style={{ fontWeight:700, color:C.text }}>{p.name}, {p.age}</div>
                      <div style={{ color:C.muted, fontSize:12, marginBottom:10 }}>{p.city}</div>
                      <button onClick={function() { setChatWith(p); setPage("Chat"); }} style={{ width:"100%", background:C.accentDim, color:C.accent, border:"1px solid " + C.accent, borderRadius:8, padding:"7px 0", cursor:"pointer", fontSize:12, fontWeight:600 }}>Message</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {page === "Chat" && (
        <div style={{ display:"flex", height:"calc(100vh - 60px)" }}>
          <div style={{ width:220, borderRight:"1px solid " + C.border, overflowY:"auto" }}>
            <div style={{ padding:"16px 16px 8px", color:C.muted, fontSize:13, fontWeight:700 }}>Conversations</div>
            {liked.length === 0 && <div style={{ padding:"16px", color:C.muted, fontSize:13 }}>No matches yet</div>}
            {liked.map(function(p) {
              return (
                <div key={p.id} onClick={function() { setChatWith(p); }} style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"center", cursor:"pointer", background: chatWith && chatWith.id === p.id ? C.accentDim : "transparent" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg," + p.color + "," + p.color + "66)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{p.emoji}</div>
                  <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{p.name}</div>
                </div>
              );
            })}
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
            {chatWith ? (
              <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
                <div style={{ padding:"14px 20px", borderBottom:"1px solid " + C.border, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg," + chatWith.color + "," + chatWith.color + "66)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{chatWith.emoji}</div>
                  <div>
                    <div style={{ fontWeight:700, color:C.text }}>{chatWith.name}</div>
                    <div style={{ color:C.green, fontSize:12 }}>Online</div>
                  </div>
                </div>
                <div style={{ background:"#c026d312", padding:"8px 20px", fontSize:12, color:"#c026d3" }}>
                  Never share personal info with someone you have not met in person.
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:20 }}>
                  {(messages[chatWith.id] || []).map(function(m, i) {
                    return (
                      <div key={i} style={{ display:"flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start", marginBottom:10 }}>
                        <div style={{ maxWidth:"65%", background: m.from === "me" ? C.accent : C.card, border: m.from === "me" ? "none" : "1px solid " + C.border, borderRadius:"18px", padding:"10px 14px" }}>
                          <p style={{ margin:0, fontSize:14, color:C.text }}>{m.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding:"12px 16px", borderTop:"1px solid " + C.border, display:"flex", gap:10 }}>
                  <input
                    value={newMsg}
                    onChange={function(e) { setNewMsg(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === "Enter") sendMsg(); }}
                    placeholder={"Message " + chatWith.name}
                    style={{ flex:1, background:C.card, border:"1px solid " + C.borderMid, borderRadius:24, padding:"10px 18px", color:C.text, fontSize:14, outline:"none" }}
                  />
                  <button onClick={sendMsg} style={{ background:C.accent, border:"none", borderRadius:24, padding:"10px 20px", cursor:"pointer", color:"#fff", fontWeight:700 }}>Send</button>
                </div>
              </div>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted }}>Select a conversation</div>
            )}
          </div>
        </div>
      )}

      {page === "Pricing" && (
        <div style={{ maxWidth:860, margin:"0 auto", padding:"40px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <h1 style={{ margin:"0 0 8px", fontSize:32, fontWeight:900, color:C.text }}>Find Your Perfect Match</h1>
            <p style={{ color:C.muted }}>Cancel anytime. Secure checkout. No hidden fees.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:20, marginBottom:36 }}>
            {PLANS.map(function(plan) {
              return (
                <div key={plan.name} onClick={function() { setActivePlan(plan.name); }} style={{ background:C.card, borderRadius:24, padding:26, border:"2px solid " + (activePlan === plan.name ? plan.color : C.border), cursor:"pointer", position:"relative", transition:"all 0.2s" }}>
                  {plan.popular && <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:C.accent, color:"#fff", borderRadius:20, padding:"3px 14px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>MOST POPULAR</div>}
                  <h2 style={{ color:plan.color, margin:"0 0 8px" }}>{plan.name}</h2>
                  <div style={{ marginBottom:18 }}>
                    {plan.price === 0
                      ? <span style={{ fontSize:28, fontWeight:900, color:C.text }}>Free</span>
                      : <span><span style={{ fontSize:28, fontWeight:900, color:C.text }}>${plan.price}</span><span style={{ color:C.muted }}>/mo</span></span>
                    }
                  </div>
                  {plan.features.map(function(f) {
                    return (
                      <div key={f} style={{ display:"flex", gap:8, fontSize:13, marginBottom:8 }}>
                        <span style={{ color:plan.color }}>✓</span>
                        <span style={{ color:"#ccc" }}>{f}</span>
                      </div>
                    );
                  })}
                  <button style={{ width:"100%", marginTop:16, background: activePlan === plan.name ? plan.color : "transparent", color: activePlan === plan.name ? "#fff" : plan.color, border:"2px solid " + plan.color, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700 }}>{plan.cta}</button>
                </div>
              );
            })}
          </div>
          <div style={{ background:C.card, borderRadius:20, padding:24, border:"1px solid " + C.border }}>
            <h3 style={{ margin:"0 0 14px", color:C.text }}>Legal</h3>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[["Privacy Policy","privacy"],["Terms of Service","terms"],["Cookie Policy","cookies"],["Safety Guide","safety"]].map(function(item) {
                return <button key={item[1]} onClick={function() { setLegal(item[1]); }} style={{ background:"transparent", color:C.accent, border:"1px solid " + C.border, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13 }}>{item[0]}</button>;
              })}
            </div>
            <p style={{ color:C.muted, fontSize:12, marginTop:14 }}>GDPR, CCPA, COPPA Compliant. Payments by Stripe. 2025 VyndLove Inc.</p>
          </div>
        </div>
      )}

      {page === "Settings" && (
        <div style={{ maxWidth:640, margin:"0 auto", padding:"36px 24px" }}>
          <h1 style={{ margin:"0 0 24px", color:C.text }}>Settings</h1>
          {[["Display Name","Alex Johnson"],["Email","alex@email.com"],["Location","New York, NY"]].map(function(item) {
            return (
              <div key={item[0]} style={{ background:C.card, borderRadius:12, padding:"16px 18px", border:"1px solid " + C.border, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:12, color:C.muted }}>{item[0]}</div>
                  <div style={{ color:C.text }}>{item[1]}</div>
                </div>
                <button style={{ background:"transparent", color:C.accent, border:"1px solid " + C.accent, borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>Edit</button>
              </div>
            );
          })}
          <div style={{ marginTop:20, display:"flex", gap:10, flexWrap:"wrap" }}>
            {[["Privacy","privacy"],["Terms","terms"],["Safety","safety"]].map(function(item) {
              return <button key={item[1]} onClick={function() { setLegal(item[1]); }} style={{ background:"transparent", color:C.accent, border:"1px solid " + C.accent, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13 }}>{item[0]}</button>;
            })}
          </div>
          <div style={{ marginTop:16, background:C.card, borderRadius:12, padding:"16px 18px", border:"1px solid " + C.border }}>
            <div style={{ fontWeight:600, marginBottom:8, color:C.text }}>Emergency Resources</div>
            <div style={{ color:C.muted, fontSize:13, lineHeight:1.8 }}>911 | RAINN: 1-800-656-4673 | Crisis Text: HOME to 741741</div>
          </div>
          <button style={{ marginTop:16, width:"100%", background:"transparent", color:"#ef4444", border:"1px solid #ef444440", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700 }}>Delete Account</button>
        </div>
      )}

      <div style={{ textAlign:"center", padding:"24px", color:C.muted, fontSize:12, borderTop:"1px solid " + C.border, marginTop:40 }}>
        VyndLove Inc. New York, NY.
        <br />2025 VyndLove Inc. All rights reserved. GDPR. CCPA. COPPA.
      </div>
    </div>
  );
}
