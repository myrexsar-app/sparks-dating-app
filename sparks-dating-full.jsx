// ============================================================
//  VyndLove - Intent-Driven Dating App v2
//  Stack: React + Firebase (Auth, Firestore) + Stripe
// ============================================================

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut,
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query,
  where, getDocs, onSnapshot, orderBy, serverTimestamp, updateDoc,
  increment, deleteDoc, limit,
} from "firebase/firestore";

// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjosalMYChylncn-zHP4IALjlcFmT38aw",
  authDomain: "vyndlove.firebaseapp.com",
  projectId: "vyndlove",
  storageBucket: "vyndlove.firebasestorage.app",
  messagingSenderId: "553756339175",
  appId: "1:553756339175:web:a821e41332e5232b70ab42",
  measurementId: "G-VNL8HY170G",
};

const STRIPE_LINKS = {
  pro: "https://buy.stripe.com/28EcN51TZdnI1rKgIGgbm00",
  vip: "https://buy.stripe.com/cNi6oHaqv1F02vObomgbm01",
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
//  CONSTANTS
// ============================================================
const MAX_FREE_LIKES_DAY = 10;
const MAX_PRIORITY_LIKES_WEEK = 1;
const MAX_YOUR_TURN = 5;
const PROFANITY = ["fuck","shit","bitch","asshole","cunt","dick","pussy","nigger","faggot"];

const PROMPT_OPTIONS = [
  "The way to win me over is...",
  "Together we could...",
  "My perfect weekend...",
  "A green flag I look for...",
  "The most spontaneous thing I've done...",
  "I'm looking for someone who...",
  "My love language is...",
  "Two truths and a lie...",
  "I geek out on...",
  "Change my mind about...",
];

const INTERESTS = [
  "Hiking","Travel","Music","Art","Food","Coffee","Sports","Gaming",
  "Reading","Yoga","Dancing","Cooking","Photography","Movies","Dogs","Fitness",
];

const C = {
  bg: "#080810", surface: "#10101c", card: "#16162a", cardHover: "#1e1e35",
  border: "#ffffff10", borderMid: "#ffffff1a", accent: "#c026d3",
  accentDim: "#c026d318", gold: "#f5c518", goldDim: "#f5c51818",
  purple: "#8b5cf6", purpleDim: "#8b5cf618",
  green: "#10b981", greenDim: "#10b98118",
  red: "#ef4444", text: "#f0eaf8", muted: "#7a7590",
};

const PLANS = [
  {
    name: "Free", price: 0, color: "#7a7590", id: null,
    features: ["10 likes/day", "1 priority like/week", "Basic matching"],
    cta: "Current plan",
  },
  {
    name: "Pro", price: 9.99, color: "#c026d3", popular: true, id: "pro",
    features: ["Unlimited likes", "See who liked you", "Advanced filters", "Most Compatible daily"],
    cta: "Get Pro",
  },
  {
    name: "VIP", price: 24.99, color: "#f5c518", id: "vip",
    features: ["Everything in Pro", "Priority ranking", "Boosted visibility", "Unlimited priority likes"],
    cta: "Get VIP",
  },
];

const inp = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.borderMid}`, borderRadius: 10,
  padding: "12px 14px", color: C.text, fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box", ...extra,
});

function matchId(a, b) { return [a, b].sort().join("_"); }
function getWeek() { const d = new Date(); return `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`; }
function hasProfanity(text) { return PROFANITY.some(w => text.toLowerCase().includes(w)); }

// ============================================================
export default function App() {
  // ── Auth
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [user,         setUser]         = useState(null);
  const [userProfile,  setUserProfile]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [authMode,     setAuthMode]     = useState("login");
  const [authEmail,    setAuthEmail]    = useState("");
  const [authPass,     setAuthPass]     = useState("");
  const [authError,    setAuthError]    = useState("");
  const [setupMode,    setSetupMode]    = useState(false);

  // ── Setup wizard
  const [step,             setStep]             = useState(0);
  const [setupName,        setSetupName]        = useState("");
  const [setupAge,         setSetupAge]         = useState("");
  const [setupCity,        setSetupCity]        = useState("");
  const [setupBio,         setSetupBio]         = useState("");
  const [setupGender,      setSetupGender]      = useState("");
  const [setupLookingFor,  setSetupLookingFor]  = useState("everyone");
  const [setupInterests,   setSetupInterests]   = useState([]);
  const [setupPhotos,      setSetupPhotos]      = useState(["","","",""]);
  const [setupPrompts,     setSetupPrompts]     = useState([
    { q: PROMPT_OPTIONS[0], a: "" },
    { q: PROMPT_OPTIONS[1], a: "" },
    { q: PROMPT_OPTIONS[2], a: "" },
  ]);

  // ── Navigation
  const [page,       setPage]       = useState("Discover");
  const [discoverTab,setDiscoverTab]= useState("feed"); // feed | compatible | standouts

  // ── Discover
  const [profiles,    setProfiles]    = useState([]);
  const [compatible,  setCompatible]  = useState(null);
  const [standouts,   setStandouts]   = useState([]);
  const [viewProfile, setViewProfile] = useState(null); // full profile expanded

  // ── Like flow
  const [likeTarget,   setLikeTarget]   = useState(null); // {profileId, itemType, itemIndex, isPriority}
  const [likeComment,  setLikeComment]  = useState("");
  const [likeError,    setLikeError]    = useState("");
  const [likeSending,  setLikeSending]  = useState(false);
  const [likesUsed,    setLikesUsed]    = useState(0);
  const [priorityUsed, setPriorityUsed] = useState(0);

  // ── Matches & chat
  const [matches,     setMatches]   = useState([]);
  const [chatWith,    setChatWith]  = useState(null);
  const [messages,    setMessages]  = useState([]);
  const [newMsg,      setNewMsg]    = useState("");
  const [yourTurn,    setYourTurn]  = useState(0); // open convos waiting on user

  // ── UI modals
  const [matchPopup,       setMatchPopup]       = useState(null);
  const [showPaywall,      setShowPaywall]       = useState(false);
  const [legal,            setLegal]             = useState(null);
  const [reportTarget,     setReportTarget]      = useState(null);
  const [reportReason,     setReportReason]      = useState("");
  const [reportSent,       setReportSent]        = useState(false);
  const [feedbackTarget,   setFeedbackTarget]    = useState(null);
  const [showCancelModal,  setShowCancelModal]   = useState(false);
  const [cancelStatus,     setCancelStatus]      = useState(null);
  const [cancelDate,       setCancelDate]        = useState(null);

  // ── Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
          setLikesUsed(data.likesUsedToday || 0);
          setPriorityUsed(data.priorityLikesUsedThisWeek || 0);
          setSetupMode(false);
        } else {
          setSetupMode(true);
        }
      }
      setLoading(false);
    });
  }, []);

  // ── Load profiles
  useEffect(() => {
    if (!user || !userProfile) return;
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const blocked = userProfile.blockedUsers || [];
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.id !== user.uid && !blocked.includes(p.id));
      setProfiles(all);
      // Standouts: profiles with most prompts filled + photos
      const curated = all.filter(p => (p.photos||[]).filter(Boolean).length >= 2 && (p.prompts||[]).filter(pr=>pr.a).length >= 2);
      setStandouts(curated.slice(0, 10));
      // Compatible: load or generate
      loadCompatible(u.uid, all);
    })();
  }, [user, userProfile]);

  // ── Load matches
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "matches"), where("users", "array-contains", user.uid));
    return onSnapshot(q, snap => {
      const ms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(ms);
      // Count "your turn" conversations
      const yt = ms.filter(m => m.lastMessageFrom && m.lastMessageFrom !== user.uid).length;
      setYourTurn(yt);
    });
  }, [user]);

  // ── Load chat
  useEffect(() => {
    if (!chatWith || !user) return;
    const mid = matchId(user.uid, chatWith.userId);
    const q = query(collection(db, "chats", mid, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Mark as read
    updateDoc(doc(db, "matches", mid), { [`unread_${user.uid}`]: 0 }).catch(() => {});
    return unsub;
  }, [chatWith, user]);

  // ── Most Compatible logic
  const loadCompatible = async (uid, allProfiles) => {
    const compDoc = await getDoc(doc(db, "compatible", uid));
    if (compDoc.exists()) {
      const d = compDoc.data();
      if (d.expiresAt && d.expiresAt.toDate() > new Date()) {
        const found = allProfiles.find(p => p.id === d.profileId);
        if (found) { setCompatible(found); return; }
      }
    }
    // Generate new one
    if (allProfiles.length > 0) {
      const pick = allProfiles[Math.floor(Math.random() * allProfiles.length)];
      const expires = new Date(); expires.setHours(expires.getHours() + 24);
      await setDoc(doc(db, "compatible", uid), {
        profileId: pick.id, expiresAt: expires, createdAt: serverTimestamp(),
      });
      setCompatible(pick);
    }
  };

  // ── Auth
  const handleAuth = async () => {
    setAuthError("");
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPass);
        setSetupMode(true);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPass);
      }
    } catch (e) {
      setAuthError(e.message.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
    }
  };

  // ── Save profile
  const saveProfile = async () => {
    if (!setupName || !setupAge || !setupCity || !setupGender) return;
    if (setupPrompts.some(p => !p.a)) return;
    const data = {
      name: setupName, age: parseInt(setupAge), city: setupCity,
      bio: setupBio, gender: setupGender, lookingFor: setupLookingFor,
      interests: setupInterests,
      photos: setupPhotos.filter(Boolean),
      prompts: setupPrompts,
      plan: "free",
      likesUsedToday: 0, lastLikeDate: new Date().toDateString(),
      priorityLikesUsedThisWeek: 0, lastPriorityWeek: getWeek(),
      blockedUsers: [], reportedUsers: [],
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", user.uid), data);
    setUserProfile(data);
    setSetupMode(false);
  };

  // ── Send Like
  const sendLike = async (isPriority = false) => {
    if (!likeTarget || !user) return;
    if (hasProfanity(likeComment)) { setLikeError("Please keep it respectful 🙏"); return; }
    setLikeSending(true);
    const isPrem = userProfile?.plan === "pro" || userProfile?.plan === "vip";

    // Check limits
    if (!isPriority) {
      if (!isPrem) {
        const today = new Date().toDateString();
        let used = likesUsed;
        if (userProfile?.lastLikeDate !== today) { used = 0; setLikesUsed(0); }
        if (used >= MAX_FREE_LIKES_DAY) { setShowPaywall(true); setLikeSending(false); setLikeTarget(null); return; }
      }
    } else {
      if (userProfile?.plan !== "vip") {
        const week = getWeek();
        let pu = priorityUsed;
        if (userProfile?.lastPriorityWeek !== week) { pu = 0; setPriorityUsed(0); }
        if (pu >= MAX_PRIORITY_LIKES_WEEK) { setShowPaywall(true); setLikeSending(false); setLikeTarget(null); return; }
      }
    }

    const { profileId, itemType, itemIndex } = likeTarget;
    const likeDocId = `${user.uid}_${profileId}_${itemType}_${itemIndex}`;
    await setDoc(doc(db, "likes", likeDocId), {
      from: user.uid, to: profileId,
      itemType, itemIndex,
      comment: likeComment.trim(),
      isPriority: isPriority || false,
      createdAt: serverTimestamp(),
    });

    // Check mutual
    const theirLikes = await getDocs(query(
      collection(db, "likes"),
      where("from", "==", profileId),
      where("to", "==", user.uid)
    ));
    if (!theirLikes.empty) {
      const mid = matchId(user.uid, profileId);
      await setDoc(doc(db, "matches", mid), {
        users: [user.uid, profileId], createdAt: serverTimestamp(),
        lastMessage: "", lastMessageFrom: null,
        [`unread_${user.uid}`]: 0, [`unread_${profileId}`]: 0,
      });
      const matchedProfile = profiles.find(p => p.id === profileId);
      setMatchPopup(matchedProfile ? { ...matchedProfile, userId: profileId } : null);
    }

    // Update like counters
    const today = new Date().toDateString();
    const week = getWeek();
    const updates = { lastLikeDate: today };
    if (!isPrem && !isPriority) {
      const newCount = (userProfile?.lastLikeDate !== today ? 0 : likesUsed) + 1;
      setLikesUsed(newCount);
      updates.likesUsedToday = newCount;
    }
    if (isPriority && userProfile?.plan !== "vip") {
      const newPu = (userProfile?.lastPriorityWeek !== week ? 0 : priorityUsed) + 1;
      setPriorityUsed(newPu);
      updates.priorityLikesUsedThisWeek = newPu;
      updates.lastPriorityWeek = week;
    }
    await updateDoc(doc(db, "users", user.uid), updates);

    setLikeTarget(null);
    setLikeComment("");
    setLikeError("");
    setLikeSending(false);
  };

  // ── Send message
  const sendMsg = async () => {
    if (!newMsg.trim() || !chatWith || !user) return;
    if (hasProfanity(newMsg)) return;
    const mid = matchId(user.uid, chatWith.userId);
    await addDoc(collection(db, "chats", mid, "messages"), {
      text: newMsg.trim(), from: user.uid, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "matches", mid), {
      lastMessage: newMsg.trim(),
      lastMessageFrom: user.uid,
      [`unread_${chatWith.userId}`]: increment(1),
      [`unread_${user.uid}`]: 0,
    });
    setNewMsg("");
  };

  // ── Block user
  const blockUser = async (targetId) => {
    const updated = [...(userProfile?.blockedUsers || []), targetId];
    await updateDoc(doc(db, "users", user.uid), { blockedUsers: updated });
    setUserProfile(p => ({ ...p, blockedUsers: updated }));
    setProfiles(p => p.filter(x => x.id !== targetId));
    setViewProfile(null);
  };

  // ── Report user
  const submitReport = async () => {
    if (!reportTarget || !reportReason) return;
    await addDoc(collection(db, "reports"), {
      from: user.uid, to: reportTarget.id,
      reason: reportReason, createdAt: serverTimestamp(),
    });
    setReportSent(true);
    setTimeout(() => { setReportTarget(null); setReportSent(false); setReportReason(""); }, 2000);
  };

  // ── Cancel subscription
  const handleCancelSubscription = async () => {
    setCancelStatus("loading");
    try {
      const resp = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await resp.json();
      if (data.success) {
        setCancelStatus("done");
        setCancelDate(new Date(data.cancelAt * 1000).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }));
        await updateDoc(doc(db, "users", user.uid), { cancelAtPeriodEnd: true });
        setUserProfile(p => ({ ...p, cancelAtPeriodEnd: true }));
      } else { setCancelStatus("error"); }
    } catch { setCancelStatus("error"); }
  };

  // ── Feedback
  const submitFeedback = async (met, seeAgain) => {
    if (!feedbackTarget) return;
    await addDoc(collection(db, "feedback"), {
      from: user.uid, matchId: feedbackTarget.matchId,
      met, seeAgain, createdAt: serverTimestamp(),
    });
    setFeedbackTarget(null);
  };

  // ── Derived
  const isPremium = userProfile?.plan === "pro" || userProfile?.plan === "vip";
  const isVip = userProfile?.plan === "vip";
  const likesLeft = isPremium ? "∞" : Math.max(0, MAX_FREE_LIKES_DAY - likesUsed);
  const priorityLeft = isVip ? "∞" : Math.max(0, MAX_PRIORITY_LIKES_WEEK - priorityUsed);

  const legalText = {
    privacy: <><p>1. Data We Collect: Name, age, photos. No data from under 18. COPPA compliant.</p><p>2. Your Rights: Access, correct, delete your data. GDPR and CCPA compliant.</p><p>3. Contact: privacy@vyndlove.com</p></>,
    terms:   <><p>1. Eligibility: Must be 18+.</p><p>2. No fake profiles, harassment, or illegal content.</p><p>3. Subscriptions auto-renew. Cancel anytime. 7-day refund.</p><p>4. Governing Law: New York, USA.</p></>,
    cookies: <p>Essential cookies only. No advertising cookies. Analytics are anonymous.</p>,
    safety:  <><p>Before meeting: video chat first, tell someone where you're going.</p><p>First dates: meet in public, arrange own transport.</p><p>Emergency: 911. RAINN: 1-800-656-4673. Crisis Text: HOME to 741741.</p></>,
  };

  // ============================================================
  //  SCREENS
  // ============================================================
  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.accent, fontSize:48 }}>💜</div>
    </div>
  );

  // ── Age gate
  if (!ageConfirmed) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui" }}>
      <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:400, width:"100%", textAlign:"center", border:`1px solid ${C.borderMid}` }}>
        <div style={{ fontSize:56 }}>💜</div>
        <h2 style={{ color:C.text, margin:"12px 0 8px" }}>Welcome to VyndLove</h2>
        <p style={{ color:C.muted, marginBottom:24 }}>You must be 18 or older to use this app.</p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={() => setAgeConfirmed(true)} style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>I am 18+ ✓</button>
          <button onClick={() => alert("You must be 18+ to use this app.")} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 0", cursor:"pointer" }}>Under 18</button>
        </div>
      </div>
    </div>
  );

  // ── Auth screen
  if (!user) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui" }}>
      <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:400, width:"100%", border:`1px solid ${C.borderMid}` }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48 }}>💜</div>
          <h2 style={{ color:C.text, margin:"8px 0 4px" }}>VyndLove</h2>
          <p style={{ color:C.muted, margin:0 }}>Find someone worth knowing</p>
        </div>
        <div style={{ display:"flex", marginBottom:20, background:C.surface, borderRadius:12, padding:4 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => setAuthMode(m)}
              style={{ flex:1, background: authMode===m ? C.accent : "transparent", color: authMode===m ? "#fff" : C.muted, border:"none", borderRadius:10, padding:"9px 0", cursor:"pointer", fontWeight:600 }}>
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" type="email" style={inp()} />
          <input value={authPass} onChange={e => setAuthPass(e.target.value)} placeholder="Password" type="password"
            onKeyDown={e => e.key==="Enter" && handleAuth()} style={inp()} />
        </div>
        {authError && <p style={{ color:C.red, fontSize:13, marginTop:10, marginBottom:0 }}>{authError}</p>}
        <button onClick={handleAuth} style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:16, marginTop:16 }}>
          {authMode === "login" ? "Log In" : "Create Account"}
        </button>
      </div>
    </div>
  );

  // ── Profile setup wizard
  if (setupMode) {
    const canFinish = setupName && setupAge && setupCity && setupGender && setupPrompts.every(p => p.a.trim());
    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui", padding:24 }}>
        <div style={{ maxWidth:520, margin:"0 auto" }}>
          <div style={{ textAlign:"center", padding:"28px 0 20px" }}>
            <div style={{ fontSize:40 }}>💜</div>
            <h2 style={{ color:C.text, margin:"8px 0 4px" }}>Build Your Profile</h2>
            {/* Progress */}
            <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:12 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ height:4, width:40, borderRadius:4, background: step>=i ? C.accent : C.border }} />
              ))}
            </div>
          </div>

          {/* Step 0: basics */}
          {step === 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <p style={{ color:C.muted, fontSize:13, margin:"0 0 4px" }}>Basic info</p>
              <input value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="First name *" style={inp()} />
              <div style={{ display:"flex", gap:10 }}>
                <input value={setupAge} onChange={e => setSetupAge(e.target.value)} placeholder="Age *" type="number" min={18} max={99} style={inp({ flex:1 })} />
                <input value={setupCity} onChange={e => setSetupCity(e.target.value)} placeholder="City *" style={inp({ flex:2 })} />
              </div>
              <textarea value={setupBio} onChange={e => setSetupBio(e.target.value)} placeholder="Short bio..." rows={3} style={{ ...inp(), resize:"none" }} />
              <div>
                <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>I am *</p>
                <div style={{ display:"flex", gap:8 }}>
                  {["Man","Woman","Non-binary"].map(g => (
                    <button key={g} onClick={() => setSetupGender(g)}
                      style={{ flex:1, background: setupGender===g ? C.accentDim : C.card, border:`1px solid ${setupGender===g ? C.accent : C.border}`, borderRadius:8, padding:"9px 0", cursor:"pointer", color: setupGender===g ? C.accent : C.muted, fontSize:13 }}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>Looking for</p>
                <div style={{ display:"flex", gap:8 }}>
                  {["Men","Women","Everyone"].map(l => (
                    <button key={l} onClick={() => setSetupLookingFor(l.toLowerCase())}
                      style={{ flex:1, background: setupLookingFor===l.toLowerCase() ? C.accentDim : C.card, border:`1px solid ${setupLookingFor===l.toLowerCase() ? C.accent : C.border}`, borderRadius:8, padding:"9px 0", cursor:"pointer", color: setupLookingFor===l.toLowerCase() ? C.accent : C.muted, fontSize:13 }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>Interests</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {INTERESTS.map(i => (
                    <button key={i} onClick={() => setSetupInterests(p => p.includes(i) ? p.filter(x=>x!==i) : [...p,i])}
                      style={{ background: setupInterests.includes(i) ? C.accentDim : C.card, border:`1px solid ${setupInterests.includes(i) ? C.accent : C.border}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", color: setupInterests.includes(i) ? C.accent : C.muted, fontSize:12 }}>{i}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => { if (setupName && setupAge && setupCity && setupGender) setStep(1); }}
                disabled={!setupName||!setupAge||!setupCity||!setupGender}
                style={{ background: (!setupName||!setupAge||!setupCity||!setupGender) ? C.muted : C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15, marginTop:4 }}>
                Next →
              </button>
            </div>
          )}

          {/* Step 1: photos */}
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <p style={{ color:C.muted, fontSize:13, margin:"0 0 4px" }}>Add photos (at least 1, up to 6)</p>
              {setupPhotos.map((url, i) => (
                <input key={i} value={url} onChange={e => { const p=[...setupPhotos]; p[i]=e.target.value; setSetupPhotos(p); }}
                  placeholder={`Photo ${i+1} URL${i < 2 ? " *" : " (optional)"}`} style={inp()} />
              ))}
              {setupPhotos.length < 6 && (
                <button onClick={() => setSetupPhotos(p => [...p, ""])}
                  style={{ background:"transparent", color:C.accent, border:`1px solid ${C.accent}`, borderRadius:10, padding:"10px 0", cursor:"pointer", fontSize:13 }}>
                  + Add another photo
                </button>
              )}
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={() => setStep(0)} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>← Back</button>
                <button onClick={() => setStep(2)}
                  style={{ flex:2, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700 }}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 2: prompts */}
          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <p style={{ color:C.muted, fontSize:13, margin:"0 0 4px" }}>Answer 3 prompts (required) — this is how people get to know you</p>
              {setupPrompts.map((pr, i) => (
                <div key={i} style={{ background:C.surface, borderRadius:12, padding:16, border:`1px solid ${C.borderMid}` }}>
                  <select value={pr.q} onChange={e => { const p=[...setupPrompts]; p[i]={...p[i],q:e.target.value}; setSetupPrompts(p); }}
                    style={{ ...inp({ marginBottom:10, color:C.accent, fontWeight:600 }), background:C.card }}>
                    {PROMPT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <textarea value={pr.a} onChange={e => { if (e.target.value.length<=150) { const p=[...setupPrompts]; p[i]={...p[i],a:e.target.value}; setSetupPrompts(p); } }}
                    placeholder="Your answer (max 150 chars)..." rows={3} style={{ ...inp(), resize:"none" }} />
                  <div style={{ textAlign:"right", color:C.muted, fontSize:11, marginTop:4 }}>{pr.a.length}/150</div>
                </div>
              ))}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep(1)} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>← Back</button>
                <button onClick={saveProfile} disabled={!canFinish}
                  style={{ flex:2, background:canFinish ? C.accent : C.muted, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor: canFinish ? "pointer" : "not-allowed", fontWeight:700 }}>
                  Start Matching 💜
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  //  FULL PROFILE VIEW (expanded)
  // ============================================================
  const ProfileView = ({ profile, onClose }) => {
    const photos = (profile.photos || []).filter(Boolean);
    const prompts = profile.prompts || [];
    return (
      <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:200, overflowY:"auto", fontFamily:"system-ui" }}>
        {/* Header */}
        <div style={{ position:"sticky", top:0, background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, zIndex:10 }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer", lineHeight:1 }}>←</button>
          <div style={{ flex:1, fontWeight:700, color:C.text }}>{profile.name}, {profile.age}</div>
          <button onClick={() => setReportTarget(profile)}
            style={{ background:"transparent", color:C.muted, border:"none", fontSize:13, cursor:"pointer", padding:"4px 8px" }}>⚑ Report</button>
          <button onClick={() => { if (window.confirm(`Block ${profile.name}?`)) blockUser(profile.id); }}
            style={{ background:"transparent", color:C.red, border:`1px solid ${C.red}40`, borderRadius:8, fontSize:12, cursor:"pointer", padding:"4px 10px" }}>Block</button>
        </div>

        <div style={{ maxWidth:600, margin:"0 auto", padding:"0 0 100px" }}>
          {/* Photos with like buttons */}
          {photos.length > 0 && photos.map((url, i) => (
            <div key={i} style={{ position:"relative", marginBottom:4 }}>
              <img src={url} alt="" style={{ width:"100%", maxHeight:400, objectFit:"cover", display:"block" }}
                onError={e => { e.target.style.display="none"; }} />
              <button onClick={() => { setLikeTarget({ profileId:profile.id, itemType:"photo", itemIndex:i }); setLikeComment(""); setLikeError(""); }}
                style={{ position:"absolute", bottom:14, right:14, background:"rgba(0,0,0,0.7)", border:`2px solid ${C.accent}`, borderRadius:"50%", width:48, height:48, cursor:"pointer", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center" }}>
                🤍
              </button>
            </div>
          ))}

          {/* No photo fallback */}
          {photos.length === 0 && (
            <div style={{ height:260, background:`linear-gradient(135deg,${C.accent}22,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:80 }}>💜</div>
          )}

          {/* Profile header info */}
          <div style={{ padding:"20px 16px 0" }}>
            <h2 style={{ margin:"0 0 4px", fontSize:26, color:C.text }}>{profile.name}, {profile.age}</h2>
            <p style={{ margin:"0 0 12px", color:C.muted, fontSize:14 }}>📍 {profile.city}</p>
            {profile.bio && <p style={{ margin:"0 0 16px", color:"#ccc", lineHeight:1.7, fontSize:15 }}>{profile.bio}</p>}
            {(profile.interests||[]).length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                {profile.interests.map(i => (
                  <span key={i} style={{ background:C.purpleDim, color:C.purple, borderRadius:20, padding:"4px 12px", fontSize:12 }}>{i}</span>
                ))}
              </div>
            )}
          </div>

          {/* Prompts with like buttons */}
          {prompts.map((pr, i) => pr.a ? (
            <div key={i} style={{ margin:"0 16px 12px", background:C.card, borderRadius:16, padding:20, border:`1px solid ${C.borderMid}`, position:"relative" }}>
              <p style={{ color:C.accent, fontSize:13, fontWeight:600, margin:"0 0 8px" }}>{pr.q}</p>
              <p style={{ color:C.text, fontSize:15, lineHeight:1.7, margin:0, paddingRight:48 }}>{pr.a}</p>
              <button onClick={() => { setLikeTarget({ profileId:profile.id, itemType:"prompt", itemIndex:i }); setLikeComment(""); setLikeError(""); }}
                style={{ position:"absolute", bottom:14, right:14, background:"transparent", border:`2px solid ${C.accent}`, borderRadius:"50%", width:44, height:44, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
                🤍
              </button>
            </div>
          ) : null)}

          {/* Priority like button */}
          <div style={{ margin:"16px 16px 0" }}>
            <button onClick={() => { setLikeTarget({ profileId:profile.id, itemType:"profile", itemIndex:0, isPriority:true }); setLikeComment(""); setLikeError(""); }}
              style={{ width:"100%", background:C.goldDim, color:C.gold, border:`1px solid ${C.gold}`, borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>
              ⭐ Priority Like — Move to top of their queue ({priorityLeft} left this week)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  //  MINI PROFILE CARD (in feed)
  // ============================================================
  const ProfileCard = ({ profile, isCompatible, isStandout }) => {
    const photo = (profile.photos||[]).find(Boolean);
    const firstPrompt = (profile.prompts||[]).find(p => p.a);
    return (
      <div onClick={() => setViewProfile(profile)}
        style={{ background:C.card, borderRadius:20, overflow:"hidden", border:`1px solid ${isCompatible ? C.accent : isStandout ? C.gold : C.border}`, cursor:"pointer", marginBottom:12, position:"relative" }}>
        {isCompatible && (
          <div style={{ position:"absolute", top:12, left:12, zIndex:2, background:C.accent, color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700 }}>💜 Most Compatible</div>
        )}
        {isStandout && (
          <div style={{ position:"absolute", top:12, left:12, zIndex:2, background:C.gold, color:"#000", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700 }}>⭐ Standout</div>
        )}
        {photo
          ? <img src={photo} alt={profile.name} style={{ width:"100%", height:260, objectFit:"cover", display:"block" }}
              onError={e => { e.target.style.display="none"; }} />
          : <div style={{ height:180, background:`linear-gradient(135deg,${C.accent}22,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:60 }}>💜</div>
        }
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:17, color:C.text }}>{profile.name}, {profile.age}</div>
              <div style={{ color:C.muted, fontSize:13, marginTop:2 }}>📍 {profile.city}</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setLikeTarget({ profileId:profile.id, itemType:"photo", itemIndex:0 }); setLikeComment(""); setLikeError(""); }}
              style={{ background:C.accentDim, border:`1px solid ${C.accent}`, borderRadius:"50%", width:42, height:42, cursor:"pointer", fontSize:20, flexShrink:0 }}>
              🤍
            </button>
          </div>
          {firstPrompt && (
            <div style={{ marginTop:12, background:C.surface, borderRadius:10, padding:"10px 14px" }}>
              <div style={{ color:C.accent, fontSize:11, fontWeight:600, marginBottom:4 }}>{firstPrompt.q}</div>
              <div style={{ color:"#ccc", fontSize:13, lineHeight:1.6 }}>{firstPrompt.a}</div>
            </div>
          )}
          <div style={{ color:C.muted, fontSize:12, marginTop:10 }}>Tap to see full profile →</div>
        </div>
      </div>
    );
  };

  // ============================================================
  //  MAIN APP
  // ============================================================
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui" }}>

      {/* ── Like comment modal */}
      {likeTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:0 }}>
          <div style={{ background:C.card, borderRadius:"24px 24px 0 0", padding:28, width:"100%", maxWidth:520, border:`1px solid ${C.borderMid}` }}>
            <h3 style={{ margin:"0 0 6px", color:C.text }}>
              {likeTarget.isPriority ? "⭐ Priority Like" : likeTarget.itemType === "prompt" ? "💜 Like their answer" : "💜 Like this photo"}
            </h3>
            <p style={{ color:C.muted, fontSize:13, margin:"0 0 14px" }}>Add a comment to stand out (optional)</p>
            <textarea value={likeComment}
              onChange={e => { if (e.target.value.length<=200) setLikeComment(e.target.value); }}
              placeholder="Say something genuine..." rows={3}
              style={{ ...inp(), resize:"none" }} />
            <div style={{ textAlign:"right", color:C.muted, fontSize:11, marginTop:2 }}>{likeComment.length}/200</div>
            {likeError && <p style={{ color:C.red, fontSize:13, margin:"8px 0 0" }}>{likeError}</p>}
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={() => { setLikeTarget(null); setLikeComment(""); setLikeError(""); }}
                style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>Cancel</button>
              <button onClick={() => sendLike(likeTarget.isPriority)} disabled={likeSending}
                style={{ flex:2, background: likeTarget.isPriority ? C.gold : C.accent, color: likeTarget.isPriority ? "#000" : "#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>
                {likeSending ? "Sending…" : likeTarget.isPriority ? "⭐ Send Priority Like" : "Send 💜"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Match popup */}
      {matchPopup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:340, width:"100%", textAlign:"center", border:`2px solid ${C.accent}` }}>
            <div style={{ fontSize:56 }}>💜</div>
            <h2 style={{ color:C.accent, margin:"10px 0 6px" }}>It's a Match!</h2>
            <p style={{ color:C.muted }}>You and {matchPopup.name} liked each other!</p>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={() => { setChatWith({ userId:matchPopup.userId || matchPopup.id, name:matchPopup.name }); setMatchPopup(null); setPage("Chat"); }}
                style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700 }}>Message</button>
              <button onClick={() => setMatchPopup(null)}
                style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>Keep Browsing</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Paywall */}
      {showPaywall && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:550, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:36, maxWidth:380, width:"100%", textAlign:"center", border:`2px solid ${C.accent}` }}>
            <div style={{ fontSize:48 }}>💜</div>
            <h2 style={{ color:C.text, margin:"12px 0 8px" }}>You've used all your free likes!</h2>
            <p style={{ color:C.muted, marginBottom:24 }}>Upgrade to keep connecting with people who interest you.</p>
            <button onClick={() => { window.open(STRIPE_LINKS.pro, "_blank"); setShowPaywall(false); }}
              style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15, marginBottom:10 }}>
              Get Pro — $9.99/mo
            </button>
            <button onClick={() => { window.open(STRIPE_LINKS.vip, "_blank"); setShowPaywall(false); }}
              style={{ width:"100%", background:"transparent", color:C.gold, border:`2px solid ${C.gold}`, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700, marginBottom:20 }}>
              Get VIP — $24.99/mo ⭐
            </button>
            <button onClick={() => setShowPaywall(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>
              Come back tomorrow (free)
            </button>
          </div>
        </div>
      )}

      {/* ── Report modal */}
      {reportTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:28, maxWidth:400, width:"100%" }}>
            {reportSent ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:40 }}>✅</div>
                <p style={{ color:C.green, fontWeight:700, marginTop:12 }}>Report submitted. Thank you.</p>
              </div>
            ) : (
              <>
                <h3 style={{ color:C.text, margin:"0 0 16px" }}>Report {reportTarget.name}</h3>
                {["Fake profile","Inappropriate content","Harassment","Spam","Other"].map(r => (
                  <button key={r} onClick={() => setReportReason(r)}
                    style={{ display:"block", width:"100%", textAlign:"left", background: reportReason===r ? C.accentDim : "transparent", color: reportReason===r ? C.accent : C.muted, border:`1px solid ${reportReason===r ? C.accent : C.border}`, borderRadius:10, padding:"10px 14px", cursor:"pointer", marginBottom:8, fontSize:14 }}>
                    {r}
                  </button>
                ))}
                <div style={{ display:"flex", gap:10, marginTop:8 }}>
                  <button onClick={() => { setReportTarget(null); setReportReason(""); }}
                    style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 0", cursor:"pointer" }}>Cancel</button>
                  <button onClick={submitReport} disabled={!reportReason}
                    style={{ flex:1, background: reportReason ? C.red : C.muted, color:"#fff", border:"none", borderRadius:10, padding:"11px 0", cursor: reportReason ? "pointer" : "not-allowed", fontWeight:700 }}>Submit</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback modal */}
      {feedbackTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:650, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:28, maxWidth:360, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
            <h3 style={{ color:C.text, margin:"0 0 8px" }}>Did you meet up?</h3>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              <button onClick={() => submitFeedback(true, null)} style={{ flex:1, background:C.greenDim, color:C.green, border:`1px solid ${C.green}`, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700 }}>Yes!</button>
              <button onClick={() => submitFeedback(false, null)} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 0", cursor:"pointer" }}>Not yet</button>
            </div>
            <button onClick={() => setFeedbackTarget(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>Skip</button>
          </div>
        </div>
      )}

      {/* ── Legal modal */}
      {legal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:32, maxWidth:560, width:"100%", border:`1px solid ${C.borderMid}`, maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, color:C.text }}>{{ privacy:"Privacy Policy", terms:"Terms of Service", cookies:"Cookie Policy", safety:"Safety Guide" }[legal]}</h2>
              <button onClick={() => setLegal(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ color:C.muted, lineHeight:1.8, fontSize:14 }}>{legalText[legal]}</div>
            <button onClick={() => setLegal(null)} style={{ marginTop:20, background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", cursor:"pointer", fontWeight:700 }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Cancel modal */}
      {showCancelModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:36, maxWidth:400, width:"100%", textAlign:"center", border:`1px solid #ef444440` }}>
            {cancelStatus === "done" ? (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>✓</div>
                <h2 style={{ color:C.green, margin:"0 0 10px" }}>Cancellation Confirmed</h2>
                <p style={{ color:C.muted, marginBottom:24 }}>Your subscription ends on <strong style={{ color:C.text }}>{cancelDate}</strong>.</p>
                <button onClick={() => setShowCancelModal(false)} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:12, padding:"12px 32px", cursor:"pointer", fontWeight:700 }}>Got it</button>
              </>
            ) : cancelStatus === "error" ? (
              <>
                <h2 style={{ color:C.red, margin:"0 0 10px" }}>Something went wrong</h2>
                <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                  <button onClick={() => setShowCancelModal(false)} style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 24px", cursor:"pointer" }}>Close</button>
                  <button onClick={handleCancelSubscription} style={{ background:C.red, color:"#fff", border:"none", borderRadius:12, padding:"11px 24px", cursor:"pointer", fontWeight:700 }}>Try Again</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>😢</div>
                <h2 style={{ color:C.text, margin:"0 0 8px" }}>Cancel your {userProfile?.plan?.toUpperCase()} subscription?</h2>
                <p style={{ color:C.muted, marginBottom:24 }}>You'll keep access until the end of your billing period.</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <button onClick={() => setShowCancelModal(false)} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>Keep My Subscription</button>
                  <button onClick={handleCancelSubscription} disabled={cancelStatus==="loading"}
                    style={{ background:"transparent", color:C.red, border:`1px solid #ef444455`, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:600 }}>
                    {cancelStatus==="loading" ? "Cancelling…" : "Yes, Cancel"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Full Profile View overlay */}
      {viewProfile && <ProfileView profile={viewProfile} onClose={() => setViewProfile(null)} />}

      {/* ── Nav */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 12px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontWeight:900, fontSize:20, color:C.accent }}>💜 VyndLove</span>
        <nav style={{ display:"flex", gap:2 }}>
          {["Discover","Matches","Chat","Pricing","Settings"].map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ position:"relative", background: page===n ? C.accentDim : "transparent", color: page===n ? C.accent : C.muted, border:"none", borderRadius:8, padding:"7px 10px", cursor:"pointer", fontWeight:600, fontSize:12 }}>
              {n}
              {n === "Chat" && yourTurn > 0 && (
                <span style={{ position:"absolute", top:4, right:4, background:C.red, color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{yourTurn}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ===================== DISCOVER ===================== */}
      {page === "Discover" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"20px 16px 100px" }}>
          {/* Sub-tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:20, background:C.surface, borderRadius:12, padding:4 }}>
            {[["feed","Feed"],["compatible","💜 Best Match"],["standouts","⭐ Standouts"]].map(([id,label]) => (
              <button key={id} onClick={() => setDiscoverTab(id)}
                style={{ flex:1, background: discoverTab===id ? (id==="standouts" ? C.goldDim : C.accentDim) : "transparent", color: discoverTab===id ? (id==="standouts" ? C.gold : C.accent) : C.muted, border:"none", borderRadius:9, padding:"8px 0", cursor:"pointer", fontWeight:600, fontSize:12 }}>
                {label}
              </button>
            ))}
          </div>

          {/* Likes remaining */}
          {!isPremium && discoverTab !== "standouts" && (
            <div style={{ background:C.accentDim, borderRadius:12, padding:"10px 14px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:C.accent, fontSize:13, fontWeight:600 }}>💜 {likesLeft} likes left today</span>
              <button onClick={() => setPage("Pricing")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>Get Unlimited</button>
            </div>
          )}

          {/* Your Turn warning */}
          {yourTurn >= MAX_YOUR_TURN && (
            <div style={{ background:"#ef444418", borderRadius:12, padding:"10px 14px", marginBottom:16, border:`1px solid ${C.red}40` }}>
              <p style={{ color:C.red, fontSize:13, margin:0, fontWeight:600 }}>⚠️ You have {yourTurn} conversations waiting for your reply. Respond before liking more people.</p>
              <button onClick={() => setPage("Chat")} style={{ background:C.red, color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700, marginTop:8 }}>Go to Chat</button>
            </div>
          )}

          {/* FEED tab */}
          {discoverTab === "feed" && (
            <>
              {/* Most compatible pinned at top of feed */}
              {compatible && <ProfileCard profile={compatible} isCompatible />}
              {profiles.length === 0 && (
                <div style={{ textAlign:"center", padding:60, color:C.muted }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>💜</div>
                  <p>No profiles yet. Check back soon!</p>
                </div>
              )}
              {profiles.filter(p => p.id !== compatible?.id).map(p => (
                <ProfileCard key={p.id} profile={p} />
              ))}
            </>
          )}

          {/* COMPATIBLE tab */}
          {discoverTab === "compatible" && (
            <div>
              <p style={{ color:C.muted, fontSize:13, marginBottom:16 }}>Your best match for today. Refreshes every 24 hours.</p>
              {compatible
                ? <ProfileCard profile={compatible} isCompatible />
                : <div style={{ textAlign:"center", padding:60, color:C.muted }}><p>Generating your match…</p></div>
              }
            </div>
          )}

          {/* STANDOUTS tab */}
          {discoverTab === "standouts" && (
            <div>
              <div style={{ background:C.goldDim, borderRadius:12, padding:"12px 14px", marginBottom:16, border:`1px solid ${C.gold}40` }}>
                <p style={{ color:C.gold, fontSize:13, margin:0, fontWeight:600 }}>⭐ Standouts are curated profiles. Only Priority Likes allowed here.</p>
                <p style={{ color:C.muted, fontSize:12, margin:"4px 0 0" }}>{priorityLeft} priority like{priorityLeft !== 1 ? "s" : ""} remaining this week</p>
              </div>
              {standouts.length === 0 && (
                <div style={{ textAlign:"center", padding:60, color:C.muted }}><p>No standouts right now. Check back soon.</p></div>
              )}
              {standouts.map(p => (
                <div key={p.id} onClick={() => setViewProfile(p)} style={{ background:C.card, borderRadius:20, overflow:"hidden", border:`2px solid ${C.gold}`, cursor:"pointer", marginBottom:12 }}>
                  {(p.photos||[]).find(Boolean) && (
                    <img src={(p.photos||[]).find(Boolean)} alt={p.name} style={{ width:"100%", height:220, objectFit:"cover", display:"block" }}
                      onError={e => { e.target.style.display="none"; }} />
                  )}
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ fontWeight:700, fontSize:16, color:C.text }}>{p.name}, {p.age}</div>
                    <div style={{ color:C.muted, fontSize:13, marginTop:2, marginBottom:12 }}>📍 {p.city}</div>
                    <button onClick={e => { e.stopPropagation(); setLikeTarget({ profileId:p.id, itemType:"profile", itemIndex:0, isPriority:true }); setLikeComment(""); setLikeError(""); }}
                      style={{ width:"100%", background:C.goldDim, color:C.gold, border:`1px solid ${C.gold}`, borderRadius:10, padding:"10px 0", cursor:"pointer", fontWeight:700, fontSize:14 }}>
                      ⭐ Priority Like
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== MATCHES ===================== */}
      {page === "Matches" && (
        <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 16px 80px" }}>
          <h1 style={{ margin:"0 0 20px", fontSize:22 }}>Your Matches 💜</h1>
          {matches.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, background:C.card, borderRadius:20 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💜</div>
              <p style={{ color:C.muted, marginBottom:16 }}>No matches yet — go connect with people!</p>
              <button onClick={() => setPage("Discover")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", cursor:"pointer", fontWeight:700 }}>Browse Profiles</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14 }}>
              {matches.map(m => {
                const otherId = m.users.find(u => u !== user.uid);
                const unread = m[`unread_${user.uid}`] || 0;
                const isMyTurn = m.lastMessageFrom && m.lastMessageFrom !== user.uid;
                return (
                  <div key={m.id} style={{ background:C.card, borderRadius:16, overflow:"hidden", border:`1px solid ${isMyTurn ? C.accent : C.border}`, position:"relative" }}>
                    {isMyTurn && <div style={{ position:"absolute", top:8, right:8, background:C.accent, color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, zIndex:1 }}>Your Turn</div>}
                    {unread > 0 && <div style={{ position:"absolute", top:8, left:8, background:C.red, color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, zIndex:1 }}>{unread}</div>}
                    <div style={{ height:90, background:`linear-gradient(135deg,${C.accent}30,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>💜</div>
                    <div style={{ padding:12 }}>
                      <div style={{ fontWeight:700, color:C.text, marginBottom:8, fontSize:14 }}>Match!</div>
                      <button onClick={() => { setChatWith({ userId:otherId, name:"Match" }); setPage("Chat"); }}
                        style={{ width:"100%", background:C.accentDim, color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"7px 0", cursor:"pointer", fontSize:12, fontWeight:600 }}>Message</button>
                      <button onClick={() => setFeedbackTarget({ matchId:m.id })}
                        style={{ width:"100%", background:"transparent", color:C.muted, border:"none", padding:"5px 0", cursor:"pointer", fontSize:11, marginTop:4 }}>Did you meet? →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== CHAT ===================== */}
      {page === "Chat" && (
        <div style={{ display:"flex", height:"calc(100vh - 56px)" }}>
          {/* Sidebar */}
          <div style={{ width:220, borderRight:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"14px 14px 8px", color:C.muted, fontSize:12, fontWeight:700, textTransform:"uppercase" }}>Conversations</div>
            {yourTurn > 0 && (
              <div style={{ margin:"0 10px 8px", background:C.accentDim, borderRadius:8, padding:"8px 10px", fontSize:11, color:C.accent, fontWeight:600 }}>
                💜 {yourTurn} conversation{yourTurn>1?"s":""} waiting for you
              </div>
            )}
            {matches.length === 0 && <div style={{ padding:16, color:C.muted, fontSize:13 }}>No matches yet</div>}
            {matches.map(m => {
              const otherId = m.users.find(u => u !== user.uid);
              const isMyTurn = m.lastMessageFrom && m.lastMessageFrom !== user.uid;
              const unread = m[`unread_${user.uid}`] || 0;
              return (
                <div key={m.id} onClick={() => setChatWith({ userId:otherId, name:"Match" })}
                  style={{ padding:"11px 14px", display:"flex", gap:10, alignItems:"center", cursor:"pointer", background: chatWith?.userId===otherId ? C.accentDim : "transparent", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💜</div>
                    {unread > 0 && <div style={{ position:"absolute", top:-2, right:-2, background:C.red, color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{unread}</div>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:C.text }}>Match</div>
                    {isMyTurn && <div style={{ color:C.accent, fontSize:11, fontWeight:600 }}>Your turn ↩</div>}
                    {m.lastMessage && !isMyTurn && <div style={{ color:C.muted, fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.lastMessage}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat area */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
            {chatWith ? (
              <>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💜</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:C.text }}>{chatWith.name}</div>
                  </div>
                  <button onClick={() => setReportTarget({ id:chatWith.userId, name:chatWith.name })}
                    style={{ background:"transparent", color:C.muted, border:"none", fontSize:12, cursor:"pointer" }}>⚑ Report</button>
                </div>
                <div style={{ background:"#c026d312", padding:"6px 16px", fontSize:11, color:"#c026d3" }}>
                  🛡️ Never share personal info before meeting in person.
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign:"center", color:C.muted, padding:40 }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>💜</div>
                      <p style={{ fontSize:14 }}>You matched! Be the first to say something genuine.</p>
                    </div>
                  )}
                  {messages.map(m => (
                    <div key={m.id} style={{ display:"flex", justifyContent: m.from===user.uid ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth:"68%", background: m.from===user.uid ? C.accent : C.card, border: m.from===user.uid ? "none" : `1px solid ${C.border}`, borderRadius:18, padding:"10px 14px" }}>
                        <p style={{ margin:0, fontSize:14, color:C.text }}>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMsg()}
                    placeholder="Write something genuine..."
                    style={{ flex:1, background:C.card, border:`1px solid ${C.borderMid}`, borderRadius:24, padding:"10px 16px", color:C.text, fontSize:14, outline:"none" }} />
                  <button onClick={sendMsg} style={{ background:C.accent, border:"none", borderRadius:24, padding:"10px 20px", cursor:"pointer", color:"#fff", fontWeight:700 }}>Send</button>
                </div>
              </>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, flexDirection:"column", gap:12 }}>
                <div style={{ fontSize:36 }}>💜</div>
                <p style={{ fontSize:14 }}>Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== PRICING ===================== */}
      {page === "Pricing" && (
        <div style={{ maxWidth:860, margin:"0 auto", padding:"36px 16px 80px" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <h1 style={{ margin:"0 0 8px", fontSize:28, fontWeight:900 }}>Choose Your Plan</h1>
            <p style={{ color:C.muted }}>Cancel anytime. Secure Stripe checkout.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:18, marginBottom:32 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background:C.card, borderRadius:22, padding:24, border:`2px solid ${plan.id && isPremium && userProfile?.plan===plan.id ? plan.color : C.border}`, position:"relative" }}>
                {plan.popular && <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:C.accent, color:"#fff", borderRadius:20, padding:"3px 14px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>MOST POPULAR</div>}
                <h2 style={{ color:plan.color, margin:"0 0 8px" }}>{plan.name}</h2>
                <div style={{ marginBottom:16 }}>
                  {plan.price === 0
                    ? <span style={{ fontSize:26, fontWeight:900, color:C.text }}>Free</span>
                    : <><span style={{ fontSize:26, fontWeight:900, color:C.text }}>${plan.price}</span><span style={{ color:C.muted }}>/mo</span></>
                  }
                </div>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", gap:8, fontSize:13, marginBottom:8 }}>
                    <span style={{ color:plan.color }}>✓</span>
                    <span style={{ color:"#ccc" }}>{f}</span>
                  </div>
                ))}
                {plan.id && (
                  <button onClick={() => window.open(STRIPE_LINKS[plan.id], "_blank")}
                    style={{ width:"100%", marginTop:14, background:plan.color, color: plan.id==="vip" ? "#000" : "#fff", border:"none", borderRadius:11, padding:"10px 0", cursor:"pointer", fontWeight:700, fontSize:14 }}>
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ background:C.card, borderRadius:18, padding:22, border:`1px solid ${C.border}` }}>
            <h3 style={{ margin:"0 0 12px", color:C.text }}>Legal</h3>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["Privacy Policy","privacy"],["Terms of Service","terms"],["Cookie Policy","cookies"],["Safety Guide","safety"]].map(([label,id]) => (
                <button key={id} onClick={() => setLegal(id)}
                  style={{ background:"transparent", color:C.accent, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", fontSize:13 }}>{label}</button>
              ))}
            </div>
            <p style={{ color:C.muted, fontSize:12, marginTop:12, marginBottom:0 }}>GDPR · CCPA · COPPA Compliant. Payments secured by Stripe. © 2025 VyndLove Inc.</p>
          </div>
        </div>
      )}

      {/* ===================== SETTINGS ===================== */}
      {page === "Settings" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"28px 16px 80px" }}>
          <h1 style={{ margin:"0 0 20px", fontSize:22 }}>Settings</h1>

          {/* Profile card */}
          <div style={{ background:C.card, borderRadius:16, padding:18, border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
              {(userProfile?.photos||[]).find(Boolean)
                ? <img src={(userProfile.photos||[]).find(Boolean)} style={{ width:60, height:60, borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.accent}` }} alt="you" />
                : <div style={{ width:60, height:60, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>💜</div>
              }
              <div>
                <div style={{ fontWeight:700, fontSize:17, color:C.text }}>{userProfile?.name}</div>
                <div style={{ color:C.muted, fontSize:13 }}>{userProfile?.age} · {userProfile?.city}</div>
                <div style={{ color: isPremium ? C.gold : C.accent, fontSize:12, marginTop:3, fontWeight:600 }}>
                  {isPremium ? `⭐ ${userProfile?.plan?.toUpperCase()} Member` : "Free Plan"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:16, fontSize:13, color:C.muted }}>
              <span>💜 {likesLeft} likes left today</span>
              <span>⭐ {priorityLeft} priority like{priorityLeft!=="∞"&&priorityLeft!==1?"s":""} left</span>
            </div>
          </div>

          {/* Subscription management */}
          {isPremium && (
            <div style={{ background:C.purpleDim, borderRadius:12, padding:16, border:`1px solid ${C.purple}`, marginBottom:12 }}>
              <p style={{ color:C.purple, margin:"0 0 10px", fontWeight:600 }}>⭐ Active {userProfile?.plan?.toUpperCase()} subscription</p>
              {userProfile?.cancelAtPeriodEnd
                ? <p style={{ color:C.muted, fontSize:13, margin:0 }}>✓ Cancellation scheduled — access until end of billing period.</p>
                : <button onClick={() => { setShowCancelModal(true); setCancelStatus(null); }} style={{ background:"transparent", color:C.red, border:`1px solid #ef444455`, borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Cancel Subscription</button>
              }
            </div>
          )}

          {!isPremium && (
            <div style={{ background:C.accentDim, borderRadius:12, padding:16, border:`1px solid ${C.accent}`, marginBottom:12 }}>
              <p style={{ color:C.accent, margin:"0 0 10px", fontWeight:600 }}>Upgrade for unlimited likes 💜</p>
              <button onClick={() => setPage("Pricing")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>View Plans</button>
            </div>
          )}

          {/* Legal */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            {[["Privacy","privacy"],["Terms","terms"],["Safety","safety"]].map(([label,id]) => (
              <button key={id} onClick={() => setLegal(id)}
                style={{ background:"transparent", color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", fontSize:13 }}>{label}</button>
            ))}
          </div>

          {/* Emergency */}
          <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:6, color:C.text }}>Emergency Resources</div>
            <div style={{ color:C.muted, fontSize:13, lineHeight:1.8 }}>911 · RAINN: 1-800-656-4673 · Crisis Text: HOME to 741741</div>
          </div>

          <button onClick={() => signOut(auth)}
            style={{ width:"100%", background:"transparent", color:C.red, border:`1px solid #ef444440`, borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700 }}>
            Log Out
          </button>
        </div>
      )}

      <div style={{ textAlign:"center", padding:20, color:C.muted, fontSize:12, borderTop:`1px solid ${C.border}`, marginTop:40 }}>
        VyndLove Inc. · New York, NY · © 2025 All rights reserved · GDPR · CCPA · COPPA
      </div>
    </div>
  );
}
// ============================================================
//  VyndLove - Full Dating App
//  Stack: React + Firebase (Auth, Firestore) + Stripe Payment Links
// ============================================================
//
//  SETUP INSTRUCTIONS (read bottom of file too):
//  1. Create a Firebase project at https://console.firebase.google.com
//  2. Enable Authentication (Email/Password) and Firestore
//  3. Replace FIREBASE_CONFIG below with your project's config
//  4. Create Stripe Payment Links and replace STRIPE_LINKS below
//  5. npm install firebase   (in your project folder)
// ============================================================

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";

// ============================================================
//  🔧 REPLACE WITH YOUR FIREBASE CONFIG
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjosalMYChylncn-zHP4IALjlcFmT38aw",
  authDomain: "vyndlove.firebaseapp.com",
  projectId: "vyndlove",
  storageBucket: "vyndlove.firebasestorage.app",
  messagingSenderId: "553756339175",
  appId: "1:553756339175:web:a821e41332e5232b70ab42",
  measurementId: "G-VNL8HY170G",
};

// ============================================================
//  💳 REPLACE WITH YOUR STRIPE PAYMENT LINKS
//  (Create them at: dashboard.stripe.com → Payment Links)
// ============================================================
const STRIPE_LINKS = {
  pro: "https://buy.stripe.com/28EcN51TZdnI1rKgIGgbm00",   // $9.99/mo
  vip: "https://buy.stripe.com/cNi6oHaqv1F02vObomgbm01",   // $24.99/mo
};

const STRIPE_PORTAL = "https://billing.stripe.com/p/login/28EcN51TZdnI1rKgIGgbm00";

// ============================================================
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const MAX_FREE_SWIPES = 15;

const C = {
  bg: "#080810", surface: "#10101c", card: "#16162a", cardHover: "#1e1e35",
  border: "#ffffff10", borderMid: "#ffffff1a", accent: "#c026d3",
  accentDim: "#c026d318", gold: "#f5c518", purple: "#8b5cf6",
  purpleDim: "#8b5cf618", green: "#10b981", text: "#f0eaf8", muted: "#7a7590",
};

const PLANS = [
  { name: "Free",  price: 0,     color: "#7a7590", features: ["15 swipes/day", "Basic matching"], cta: "Current plan", id: null },
  { name: "Pro",   price: 9.99,  color: "#c026d3", popular: true, features: ["Unlimited swipes", "See who liked you", "Smart match", "1 Super Like/day"], cta: "Get Pro", id: "pro" },
  { name: "VIP",   price: 24.99, color: "#f5c518", features: ["Everything in Pro", "Priority discovery", "Video dates", "Incognito mode"], cta: "Get VIP", id: "vip" },
];

const INTERESTS = [
  "Hiking","Travel","Music","Art","Food","Coffee","Sports","Gaming",
  "Reading","Yoga","Dancing","Cooking","Photography","Movies","Dogs","Fitness",
];

const inp = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.borderMid}`, borderRadius: 10,
  padding: "12px 14px", color: C.text, fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box", ...extra,
});

// ---- Helpers ----
function matchId(uid1, uid2) { return [uid1, uid2].sort().join("_"); }

// ============================================================
export default function App() {
  // Auth & profile
  const [ageConfirmed, setAgeConfirmed]   = useState(false);
  const [user,         setUser]           = useState(null);
  const [userProfile,  setUserProfile]    = useState(null);
  const [loading,      setLoading]        = useState(true);
  const [authMode,     setAuthMode]       = useState("login");
  const [authEmail,    setAuthEmail]      = useState("");
  const [authPassword, setAuthPassword]   = useState("");
  const [authError,    setAuthError]      = useState("");
  const [setupMode,    setSetupMode]      = useState(false);

  // Profile setup
  const [setupName,       setSetupName]       = useState("");
  const [setupAge,        setSetupAge]        = useState("");
  const [setupCity,       setSetupCity]       = useState("");
  const [setupBio,        setSetupBio]        = useState("");
  const [setupGender,     setSetupGender]     = useState("");
  const [setupLookingFor, setSetupLookingFor] = useState("everyone");
  const [setupInterests,  setSetupInterests]  = useState([]);
  const [setupPhotoUrl,   setSetupPhotoUrl]   = useState("");

  // App
  const [page,        setPage]        = useState("Discover");
  const [profiles,    setProfiles]    = useState([]);
  const [matches,     setMatches]     = useState([]);
  const [swipeDir,    setSwipeDir]    = useState(null);
  const [dragX,       setDragX]       = useState(0);
  const [dragging,    setDragging]    = useState(false);
  const [matchPopup,  setMatchPopup]  = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [chatWith,    setChatWith]    = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [newMsg,      setNewMsg]      = useState("");
  const [legal,       setLegal]       = useState(null);
  const [swipesUsed,  setSwipesUsed]  = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStatus,    setCancelStatus]    = useState(null); // null|'loading'|'done'|'error'
  const [cancelDate,      setCancelDate]      = useState(null);
  const dragStart = useRef(null);

  // ---- Auth listener ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
          setSwipesUsed(data.swipesUsed || 0);
          setSetupMode(false);
        } else {
          setSetupMode(true);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ---- Load discover profiles ----
  useEffect(() => {
    if (!user || !userProfile) return;
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.id !== user.uid);
      setProfiles(results);
    })();
  }, [user, userProfile]);

  // ---- Load matches ----
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "matches"), where("users", "array-contains", user.uid));
    return onSnapshot(q, snap =>
      setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [user]);

  // ---- Load chat ----
  useEffect(() => {
    if (!chatWith || !user) return;
    const mid = matchId(user.uid, chatWith.userId);
    const q = query(collection(db, "chats", mid, "messages"), orderBy("createdAt"));
    return onSnapshot(q, snap =>
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [chatWith, user]);

  // ---- Auth ----
  const handleAuth = async () => {
    setAuthError("");
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        setSetupMode(true);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (e) {
      setAuthError(e.message.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
    }
  };

  // ---- Save profile ----
  const saveProfile = async () => {
    if (!setupName || !setupAge || !setupCity || !setupGender) return;
    const data = {
      name: setupName, age: parseInt(setupAge), city: setupCity,
      bio: setupBio, gender: setupGender, lookingFor: setupLookingFor,
      interests: setupInterests, photoUrl: setupPhotoUrl || null,
      plan: "free", swipesUsed: 0,
      lastSwipeDate: new Date().toDateString(),
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", user.uid), data);
    setUserProfile(data);
    setSetupMode(false);
  };

  // ---- Cancel subscription ----
  const handleCancelSubscription = async () => {
    setCancelStatus("loading");
    try {
      const resp = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await resp.json();
      if (data.success) {
        setCancelStatus("done");
        setCancelDate(new Date(data.cancelAt * 1000).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }));
        await updateDoc(doc(db, "users", user.uid), { cancelAtPeriodEnd: true });
        setUserProfile(p => ({ ...p, cancelAtPeriodEnd: true }));
      } else {
        setCancelStatus("error");
      }
    } catch {
      setCancelStatus("error");
    }
  };

  // ---- Swipe ----
  const handleSwipe = async (dir) => {
    const current = profiles[0];
    if (!current) return;

    const isPremium = userProfile?.plan === "pro" || userProfile?.plan === "vip";
    if (!isPremium) {
      const today = new Date().toDateString();
      let used = swipesUsed;
      if (userProfile?.lastSwipeDate !== today) {
        used = 0;
        setSwipesUsed(0);
        await updateDoc(doc(db, "users", user.uid), { swipesUsed: 0, lastSwipeDate: today });
      }
      if (used >= MAX_FREE_SWIPES) { setShowPaywall(true); return; }
      const next = used + 1;
      setSwipesUsed(next);
      await updateDoc(doc(db, "users", user.uid), {
        swipesUsed: increment(1), lastSwipeDate: today,
      });
    }

    setSwipeDir(dir);
    setTimeout(async () => {
      if (dir === "right") {
        await setDoc(doc(db, "likes", `${user.uid}_${current.id}`), {
          from: user.uid, to: current.id, createdAt: serverTimestamp(),
        });
        const mutual = await getDoc(doc(db, "likes", `${current.id}_${user.uid}`));
        if (mutual.exists()) {
          const mid = matchId(user.uid, current.id);
          await setDoc(doc(db, "matches", mid), {
            users: [user.uid, current.id], createdAt: serverTimestamp(),
          });
          setMatchPopup({ ...current, userId: current.id });
        }
      }
      setProfiles(p => p.slice(1));
      setSwipeDir(null);
      setDragX(0);
    }, 340);
  };

  // ---- Chat send ----
  const sendMsg = async () => {
    if (!newMsg.trim() || !chatWith || !user) return;
    const mid = matchId(user.uid, chatWith.userId);
    await addDoc(collection(db, "chats", mid, "messages"), {
      text: newMsg.trim(), from: user.uid, createdAt: serverTimestamp(),
    });
    setNewMsg("");
  };

  // ---- Drag ----
  const onMouseDown = e => { dragStart.current = e.clientX; setDragging(true); };
  const onMouseMove = e => { if (dragging) setDragX(e.clientX - dragStart.current); };
  const onMouseUp   = () => {
    if (dragX > 90) handleSwipe("right");
    else if (dragX < -90) handleSwipe("left");
    else setDragX(0);
    setDragging(false); dragStart.current = null;
  };

  const isPremium = userProfile?.plan === "pro" || userProfile?.plan === "vip";
  const swipesLeft = Math.max(0, MAX_FREE_SWIPES - swipesUsed);
  const current = profiles[0];

  const legalText = {
    privacy: <><p>1. Data We Collect: Name, age, photos. No data from under 18. COPPA compliant.</p><p>2. Your Rights: Access, correct, delete your data. GDPR and CCPA compliant.</p><p>3. Contact: privacy@vyndlove.com</p></>,
    terms:   <><p>1. Eligibility: Must be 18+.</p><p>2. No fake profiles, harassment, or illegal content.</p><p>3. Subscriptions auto-renew. Cancel anytime. 7-day refund.</p><p>4. Governing Law: New York, USA.</p></>,
    cookies: <p>Essential cookies required for login. Analytics are anonymous. No advertising cookies.</p>,
    safety:  <><p>Before meeting: video chat first, tell someone where you are going.</p><p>First dates: meet in public, arrange own transport.</p><p>Emergency: 911. RAINN: 1-800-656-4673. Crisis Text: HOME to 741741.</p></>,
  };

  const tx = swipeDir === "right"
    ? "translateX(130%) rotate(22deg)"
    : swipeDir === "left"
    ? "translateX(-130%) rotate(-22deg)"
    : `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`;

  // ===================== SCREENS =====================

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.accent, fontSize:48 }}>💜</div>
    </div>
  );

  // Age gate
  if (!ageConfirmed) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui" }}>
      <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:400, width:"100%", textAlign:"center", border:`1px solid ${C.borderMid}` }}>
        <div style={{ fontSize:56 }}>💜</div>
        <h2 style={{ color:C.text, margin:"12px 0 8px" }}>Welcome to VyndLove</h2>
        <p style={{ color:C.muted, marginBottom:24 }}>You must be 18 or older to use this app. COPPA compliant.</p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={() => setAgeConfirmed(true)} style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>I am 18+ ✓</button>
          <button onClick={() => alert("You must be 18+ to use this app.")} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 0", cursor:"pointer" }}>Under 18</button>
        </div>
      </div>
    </div>
  );

  // Auth screen
  if (!user) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui" }}>
      <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:400, width:"100%", border:`1px solid ${C.borderMid}` }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48 }}>💜</div>
          <h2 style={{ color:C.text, margin:"8px 0 4px" }}>VyndLove</h2>
          <p style={{ color:C.muted, margin:0 }}>Find your perfect match</p>
        </div>
        <div style={{ display:"flex", marginBottom:20, background:C.surface, borderRadius:12, padding:4 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => setAuthMode(m)}
              style={{ flex:1, background: authMode===m ? C.accent : "transparent", color: authMode===m ? "#fff" : C.muted, border:"none", borderRadius:10, padding:"9px 0", cursor:"pointer", fontWeight:600 }}>
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" type="email" style={inp()} />
          <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" type="password"
            onKeyDown={e => e.key==="Enter" && handleAuth()} style={inp()} />
        </div>
        {authError && <p style={{ color:"#ef4444", fontSize:13, marginTop:10, marginBottom:0 }}>{authError}</p>}
        <button onClick={handleAuth} style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:16, marginTop:16 }}>
          {authMode === "login" ? "Log In" : "Create Account"}
        </button>
      </div>
    </div>
  );

  // Profile setup
  if (setupMode) return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui", padding:24 }}>
      <div style={{ maxWidth:480, margin:"0 auto" }}>
        <div style={{ textAlign:"center", padding:"32px 0 24px" }}>
          <div style={{ fontSize:48 }}>💜</div>
          <h2 style={{ color:C.text, margin:"8px 0 4px" }}>Set Up Your Profile</h2>
          <p style={{ color:C.muted }}>Tell people about yourself</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="Your first name *" style={inp()} />
          <div style={{ display:"flex", gap:12 }}>
            <input value={setupAge} onChange={e => setSetupAge(e.target.value)} placeholder="Age *" type="number" min={18} max={99} style={inp({ width:"auto", flex:1 })} />
            <input value={setupCity} onChange={e => setSetupCity(e.target.value)} placeholder="City *" style={inp({ flex:2 })} />
          </div>
          <textarea value={setupBio} onChange={e => setSetupBio(e.target.value)} placeholder="About you..." rows={3}
            style={{ ...inp(), resize:"none" }} />
          <div>
            <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>I am *</p>
            <div style={{ display:"flex", gap:8 }}>
              {["Man","Woman","Non-binary"].map(g => (
                <button key={g} onClick={() => setSetupGender(g)}
                  style={{ flex:1, background: setupGender===g ? C.accentDim : C.card, border:`1px solid ${setupGender===g ? C.accent : C.border}`, borderRadius:8, padding:"9px 0", cursor:"pointer", color: setupGender===g ? C.accent : C.muted, fontSize:13 }}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>Looking for</p>
            <div style={{ display:"flex", gap:8 }}>
              {["Men","Women","Everyone"].map(l => (
                <button key={l} onClick={() => setSetupLookingFor(l.toLowerCase())}
                  style={{ flex:1, background: setupLookingFor===l.toLowerCase() ? C.accentDim : C.card, border:`1px solid ${setupLookingFor===l.toLowerCase() ? C.accent : C.border}`, borderRadius:8, padding:"9px 0", cursor:"pointer", color: setupLookingFor===l.toLowerCase() ? C.accent : C.muted, fontSize:13 }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>Interests (pick any)</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {INTERESTS.map(i => (
                <button key={i} onClick={() => setSetupInterests(p => p.includes(i) ? p.filter(x=>x!==i) : [...p,i])}
                  style={{ background: setupInterests.includes(i) ? C.accentDim : C.card, border:`1px solid ${setupInterests.includes(i) ? C.accent : C.border}`, borderRadius:20, padding:"5px 12px", cursor:"pointer", color: setupInterests.includes(i) ? C.accent : C.muted, fontSize:12 }}>{i}</button>
              ))}
            </div>
          </div>
          <input value={setupPhotoUrl} onChange={e => setSetupPhotoUrl(e.target.value)} placeholder="Profile photo URL (optional)" style={inp()} />
          <button onClick={saveProfile} disabled={!setupName||!setupAge||!setupCity||!setupGender}
            style={{ background: (!setupName||!setupAge||!setupCity||!setupGender) ? C.muted : C.accent, color:"#fff", border:"none", borderRadius:12, padding:"14px 0", cursor: (!setupName||!setupAge||!setupCity||!setupGender) ? "not-allowed" : "pointer", fontWeight:700, fontSize:16, marginTop:8 }}>
            Save & Start Matching 💜
          </button>
        </div>
      </div>
    </div>
  );

  // ===================== MAIN APP =====================
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui" }}>

      {/* ---- Cancel Subscription Modal ---- */}
      {showCancelModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:36, maxWidth:400, width:"100%", textAlign:"center", border:`1px solid #ef444440` }}>
            {cancelStatus === "done" ? (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>✓</div>
                <h2 style={{ color:"#10b981", margin:"0 0 10px" }}>Cancellation Confirmed</h2>
                <p style={{ color:C.muted, marginBottom:24 }}>Your subscription will end on <strong style={{ color:C.text }}>{cancelDate}</strong>. You keep full access until then.</p>
                <button onClick={() => setShowCancelModal(false)} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:12, padding:"12px 32px", cursor:"pointer", fontWeight:700, fontSize:15 }}>Got it</button>
              </>
            ) : cancelStatus === "error" ? (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
                <h2 style={{ color:"#ef4444", margin:"0 0 10px" }}>Something went wrong</h2>
                <p style={{ color:C.muted, marginBottom:24 }}>We couldn't cancel your subscription. Please try again or contact support.</p>
                <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                  <button onClick={() => setShowCancelModal(false)} style={{ background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 24px", cursor:"pointer" }}>Close</button>
                  <button onClick={handleCancelSubscription} style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:12, padding:"11px 24px", cursor:"pointer", fontWeight:700 }}>Try Again</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:48, marginBottom:12 }}>😢</div>
                <h2 style={{ color:C.text, margin:"0 0 8px" }}>Cancel your {userProfile?.plan?.toUpperCase()} subscription?</h2>
                <p style={{ color:C.muted, marginBottom:8 }}>You'll keep all {userProfile?.plan?.toUpperCase()} benefits until the end of your current billing period.</p>
                <p style={{ color:C.muted, fontSize:13, marginBottom:28 }}>After that, your account will switch to the Free plan (15 swipes/day).</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <button onClick={() => setShowCancelModal(false)} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>Keep My Subscription</button>
                  <button onClick={handleCancelSubscription} disabled={cancelStatus === "loading"}
                    style={{ background:"transparent", color:"#ef4444", border:"1px solid #ef444455", borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:600, fontSize:14 }}>
                    {cancelStatus === "loading" ? "Cancelling…" : "Yes, Cancel Subscription"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- Paywall ---- */}
      {showPaywall && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:380, width:"100%", textAlign:"center", border:`2px solid ${C.accent}` }}>
            <div style={{ fontSize:52 }}>🔒</div>
            <h2 style={{ color:C.text, margin:"12px 0 8px" }}>You've used all 15 free swipes!</h2>
            <p style={{ color:C.muted, marginBottom:24 }}>Upgrade for unlimited swipes, or come back in 24 hours for free.</p>
            <button onClick={() => window.open(STRIPE_LINKS.pro, "_blank")}
              style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15, marginBottom:10 }}>
              Get Pro — $9.99/mo 💜
            </button>
            <button onClick={() => window.open(STRIPE_LINKS.vip, "_blank")}
              style={{ width:"100%", background:"transparent", color:C.gold, border:`2px solid ${C.gold}`, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700, marginBottom:20 }}>
              Get VIP — $24.99/mo ⭐
            </button>
            <button onClick={() => setShowPaywall(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>
              Come back in 24 hours (free)
            </button>
          </div>
        </div>
      )}

      {/* ---- Match popup ---- */}
      {matchPopup && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:40, maxWidth:340, width:"100%", textAlign:"center", border:`2px solid ${C.accent}` }}>
            <div style={{ fontSize:56 }}>💜</div>
            <h2 style={{ color:C.accent, margin:"10px 0 6px" }}>It's a Match!</h2>
            <p style={{ color:C.muted }}>You and {matchPopup.name} liked each other!</p>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={() => { setChatWith(matchPopup); setMatchPopup(null); setPage("Chat"); }}
                style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700 }}>Message</button>
              <button onClick={() => setMatchPopup(null)}
                style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>Keep Swiping</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Legal modal ---- */}
      {legal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:32, maxWidth:560, width:"100%", border:`1px solid ${C.borderMid}`, maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, color:C.text }}>{{ privacy:"Privacy Policy", terms:"Terms of Service", cookies:"Cookie Policy", safety:"Safety Guide" }[legal]}</h2>
              <button onClick={() => setLegal(null)} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ color:C.muted, lineHeight:1.8, fontSize:14 }}>{legalText[legal]}</div>
            <button onClick={() => setLegal(null)} style={{ marginTop:20, background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"11px 24px", cursor:"pointer", fontWeight:700 }}>Close</button>
          </div>
        </div>
      )}

      {/* ---- Nav ---- */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontWeight:900, fontSize:22, color:C.accent }}>💜 VyndLove</span>
        <nav style={{ display:"flex", gap:2 }}>
          {["Discover","Matches","Chat","Pricing","Settings"].map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ background: page===n ? C.accentDim : "transparent", color: page===n ? C.accent : C.muted, border:"none", borderRadius:8, padding:"7px 12px", cursor:"pointer", fontWeight:600, fontSize:13 }}>{n}</button>
          ))}
        </nav>
      </div>

      {/* ===================== DISCOVER ===================== */}
      {page === "Discover" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 24px", gap:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", maxWidth:380 }}>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900 }}>Find Your Match 💜</h1>
            {!isPremium && (
              <span style={{ background:C.accentDim, color:C.accent, borderRadius:20, padding:"4px 12px", fontSize:13, fontWeight:600 }}>
                {swipesLeft} swipes left
              </span>
            )}
          </div>

          {current ? (
            <div style={{ position:"relative", width:"100%", maxWidth:380 }}>
              {profiles[1] && <div style={{ position:"absolute", top:10, left:10, right:10, bottom:-10, background:C.cardHover, borderRadius:24, zIndex:0 }} />}
              <div
                style={{ position:"relative", zIndex:1, background:C.card, borderRadius:24, border:`1px solid ${C.borderMid}`, overflow:"hidden",
                  transform:tx, transition: swipeDir ? "transform 0.34s ease" : dragging ? "none" : "transform 0.18s",
                  cursor: dragging ? "grabbing" : "grab" }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              >
                <div style={{ position:"absolute", top:18, left:18, zIndex:10, opacity:Math.min(Math.max(dragX/80,0),1), transform:"rotate(-12deg)", background:"#10b981", color:"#fff", borderRadius:8, padding:"5px 14px", fontWeight:900, border:"3px solid #10b981" }}>LIKE ♥</div>
                <div style={{ position:"absolute", top:18, right:18, zIndex:10, opacity:Math.min(Math.max(-dragX/80,0),1), transform:"rotate(12deg)", background:C.accent, color:"#fff", borderRadius:8, padding:"5px 14px", fontWeight:900, border:`3px solid ${C.accent}` }}>NOPE ✕</div>

                <div style={{ height:280, background:`linear-gradient(160deg,${C.accent}22,${C.purple}08)`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  {current.photoUrl
                    ? <img src={current.photoUrl} alt={current.name} style={{ width:130, height:130, borderRadius:"50%", objectFit:"cover", border:`3px solid ${C.accent}` }} />
                    : <div style={{ width:130, height:130, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:60 }}>💜</div>
                  }
                </div>

                <div style={{ padding:"18px 20px" }}>
                  <h2 style={{ margin:"0 0 4px", fontSize:22 }}>{current.name}, <span style={{ color:C.muted, fontWeight:400 }}>{current.age}</span></h2>
                  <p style={{ margin:"0 0 10px", color:C.muted, fontSize:13 }}>📍 {current.city}</p>
                  {current.bio && <p style={{ margin:"0 0 12px", color:"#ccc", fontSize:14, lineHeight:1.6 }}>{current.bio}</p>}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(current.interests||[]).map(i => (
                      <span key={i} style={{ background:C.purpleDim, color:C.purple, borderRadius:20, padding:"3px 10px", fontSize:12 }}>{i}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:22 }}>
                <button onClick={() => handleSwipe("left")} style={{ width:64, height:64, borderRadius:"50%", background:C.card, border:`2px solid ${C.accent}`, color:C.accent, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                <button onClick={() => handleSwipe("right")} style={{ width:64, height:64, borderRadius:"50%", background:C.card, border:"2px solid #10b981", color:"#10b981", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>♥</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:60, background:C.card, borderRadius:20, width:"100%", maxWidth:380 }}>
              <div style={{ fontSize:52 }}>💜</div>
              <h2 style={{ color:C.accent, margin:"12px 0 8px" }}>You've seen everyone!</h2>
              <p style={{ color:C.muted }}>Check back soon for new people.</p>
            </div>
          )}
        </div>
      )}

      {/* ===================== MATCHES ===================== */}
      {page === "Matches" && (
        <div style={{ maxWidth:700, margin:"0 auto", padding:"36px 24px" }}>
          <h1 style={{ margin:"0 0 20px" }}>Your Matches 💜</h1>
          {matches.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, background:C.card, borderRadius:20 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💜</div>
              <p style={{ color:C.muted, marginBottom:16 }}>No matches yet. Go swipe!</p>
              <button onClick={() => setPage("Discover")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", cursor:"pointer", fontWeight:700 }}>Start Swiping</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16 }}>
              {matches.map(m => {
                const otherId = m.users.find(u => u !== user.uid);
                return (
                  <div key={m.id} style={{ background:C.card, borderRadius:20, overflow:"hidden", border:`1px solid ${C.border}` }}>
                    <div style={{ height:100, background:`linear-gradient(135deg,${C.accent}30,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44 }}>💜</div>
                    <div style={{ padding:14 }}>
                      <div style={{ fontWeight:700, color:C.text, marginBottom:10 }}>New Match!</div>
                      <button onClick={() => { setChatWith({ userId: otherId, name:"Match" }); setPage("Chat"); }}
                        style={{ width:"100%", background:C.accentDim, color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"7px 0", cursor:"pointer", fontSize:12, fontWeight:600 }}>Message</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== CHAT ===================== */}
      {page === "Chat" && (
        <div style={{ display:"flex", height:"calc(100vh - 60px)" }}>
          <div style={{ width:220, borderRight:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"16px 16px 8px", color:C.muted, fontSize:13, fontWeight:700 }}>Conversations</div>
            {matches.length === 0 && <div style={{ padding:16, color:C.muted, fontSize:13 }}>No matches yet</div>}
            {matches.map(m => {
              const otherId = m.users.find(u => u !== user.uid);
              return (
                <div key={m.id} onClick={() => setChatWith({ userId: otherId, name:"Match" })}
                  style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"center", cursor:"pointer", background: chatWith?.userId===otherId ? C.accentDim : "transparent", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>💜</div>
                  <div style={{ fontWeight:600, fontSize:14, color:C.text }}>Match</div>
                </div>
              );
            })}
          </div>

          <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
            {chatWith ? (
              <>
                <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>💜</div>
                  <div>
                    <div style={{ fontWeight:700, color:C.text }}>{chatWith.name}</div>
                    <div style={{ color:C.green, fontSize:12 }}>● Online</div>
                  </div>
                </div>
                <div style={{ background:"#c026d312", padding:"8px 20px", fontSize:12, color:"#c026d3" }}>
                  🛡️ Never share personal info with someone you haven't met in person.
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:10 }}>
                  {messages.map(m => (
                    <div key={m.id} style={{ display:"flex", justifyContent: m.from===user.uid ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth:"65%", background: m.from===user.uid ? C.accent : C.card, border: m.from===user.uid ? "none" : `1px solid ${C.border}`, borderRadius:18, padding:"10px 14px" }}>
                        <p style={{ margin:0, fontSize:14, color:C.text }}>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10 }}>
                  <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMsg()}
                    placeholder="Send a message..."
                    style={{ flex:1, background:C.card, border:`1px solid ${C.borderMid}`, borderRadius:24, padding:"10px 18px", color:C.text, fontSize:14, outline:"none" }} />
                  <button onClick={sendMsg} style={{ background:C.accent, border:"none", borderRadius:24, padding:"10px 22px", cursor:"pointer", color:"#fff", fontWeight:700 }}>Send</button>
                </div>
              </>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, flexDirection:"column", gap:12 }}>
                <div style={{ fontSize:40 }}>💜</div>
                <p>Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== PRICING ===================== */}
      {page === "Pricing" && (
        <div style={{ maxWidth:860, margin:"0 auto", padding:"40px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <h1 style={{ margin:"0 0 8px", fontSize:32, fontWeight:900 }}>Choose Your Plan</h1>
            <p style={{ color:C.muted }}>Cancel anytime. Secure Stripe checkout. No hidden fees.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:20, marginBottom:36 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background:C.card, borderRadius:24, padding:26, border:`2px solid ${plan.id && isPremium && userProfile?.plan===plan.id ? plan.color : C.border}`, position:"relative" }}>
                {plan.popular && <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", background:C.accent, color:"#fff", borderRadius:20, padding:"4px 16px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>MOST POPULAR</div>}
                <h2 style={{ color:plan.color, margin:"0 0 8px" }}>{plan.name}</h2>
                <div style={{ marginBottom:18 }}>
                  {plan.price === 0
                    ? <span style={{ fontSize:28, fontWeight:900, color:C.text }}>Free</span>
                    : <><span style={{ fontSize:28, fontWeight:900, color:C.text }}>${plan.price}</span><span style={{ color:C.muted }}>/mo</span></>
                  }
                </div>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", gap:8, fontSize:13, marginBottom:8 }}>
                    <span style={{ color:plan.color }}>✓</span>
                    <span style={{ color:"#ccc" }}>{f}</span>
                  </div>
                ))}
                {plan.id && (
                  <button onClick={() => window.open(STRIPE_LINKS[plan.id], "_blank")}
                    style={{ width:"100%", marginTop:16, background:plan.color, color: plan.id==="vip" ? "#000" : "#fff", border:"none", borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700, fontSize:14 }}>
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ background:C.card, borderRadius:20, padding:24, border:`1px solid ${C.border}` }}>
            <h3 style={{ margin:"0 0 14px", color:C.text }}>Legal</h3>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[["Privacy Policy","privacy"],["Terms of Service","terms"],["Cookie Policy","cookies"],["Safety Guide","safety"]].map(item => (
                <button key={item[1]} onClick={() => setLegal(item[1])}
                  style={{ background:"transparent", color:C.accent, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13 }}>{item[0]}</button>
              ))}
            </div>
            <p style={{ color:C.muted, fontSize:12, marginTop:14, marginBottom:0 }}>GDPR, CCPA, COPPA Compliant. Payments secured by Stripe. © 2025 VyndLove Inc.</p>
          </div>
        </div>
      )}

      {/* ===================== SETTINGS ===================== */}
      {page === "Settings" && (
        <div style={{ maxWidth:640, margin:"0 auto", padding:"36px 24px" }}>
          <h1 style={{ margin:"0 0 24px" }}>Settings</h1>
          <div style={{ background:C.card, borderRadius:16, padding:20, border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
              {userProfile?.photoUrl
                ? <img src={userProfile.photoUrl} style={{ width:64, height:64, borderRadius:"50%", objectFit:"cover", border:`2px solid ${C.accent}` }} alt="you" />
                : <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>💜</div>
              }
              <div>
                <div style={{ fontWeight:700, fontSize:18, color:C.text }}>{userProfile?.name}</div>
                <div style={{ color:C.muted, fontSize:13 }}>{userProfile?.age} · {userProfile?.city}</div>
                <div style={{ color: isPremium ? C.gold : C.accent, fontSize:12, marginTop:4, fontWeight:600 }}>
                  {isPremium ? `⭐ ${userProfile?.plan?.toUpperCase()} Member` : "Free Plan"}
                </div>
              </div>
            </div>
            {userProfile?.bio && <p style={{ color:"#ccc", fontSize:14, margin:"0 0 10px", lineHeight:1.6 }}>{userProfile.bio}</p>}
            {(userProfile?.interests||[]).length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {userProfile.interests.map(i => (
                  <span key={i} style={{ background:C.purpleDim, color:C.purple, borderRadius:20, padding:"3px 10px", fontSize:12 }}>{i}</span>
                ))}
              </div>
            )}
          </div>

          {isPremium && (
            <div style={{ background:C.purpleDim, borderRadius:12, padding:16, border:`1px solid ${C.purple}`, marginBottom:12 }}>
              <p style={{ color:C.purple, margin:"0 0 10px", fontWeight:600 }}>⭐ Active {userProfile?.plan?.toUpperCase()} subscription</p>
              {userProfile?.cancelAtPeriodEnd
                ? <p style={{ color:C.muted, fontSize:13, margin:0 }}>✓ Cancellation scheduled — you keep access until the end of your billing period.</p>
                : <button onClick={() => { setShowCancelModal(true); setCancelStatus(null); }} style={{ background:"transparent", color:"#ef4444", border:"1px solid #ef444455", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Cancel Subscription</button>
              }
            </div>
          )}

          {!isPremium && (
            <div style={{ background:C.accentDim, borderRadius:12, padding:16, border:`1px solid ${C.accent}`, marginBottom:12 }}>
              <p style={{ color:C.accent, margin:"0 0 10px", fontWeight:600 }}>Upgrade to Pro for unlimited swipes 💜</p>
              <button onClick={() => setPage("Pricing")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8, padding:"9px 20px", cursor:"pointer", fontWeight:700, fontSize:13 }}>View Plans</button>
            </div>
          )}

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12 }}>
            {[["Privacy","privacy"],["Terms","terms"],["Safety","safety"]].map(item => (
              <button key={item[1]} onClick={() => setLegal(item[1])}
                style={{ background:"transparent", color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13 }}>{item[0]}</button>
            ))}
          </div>

          <div style={{ background:C.card, borderRadius:12, padding:"16px 18px", border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:8, color:C.text }}>Emergency Resources</div>
            <div style={{ color:C.muted, fontSize:13, lineHeight:1.8 }}>911 | RAINN: 1-800-656-4673 | Crisis Text: HOME to 741741</div>
          </div>

          <button onClick={() => signOut(auth)}
            style={{ width:"100%", background:"transparent", color:"#ef4444", border:"1px solid #ef444440", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700 }}>
            Log Out
          </button>
        </div>
      )}

      <div style={{ textAlign:"center", padding:24, color:C.muted, fontSize:12, borderTop:`1px solid ${C.border}`, marginTop:40 }}>
        VyndLove Inc. New York, NY · © 2025 All rights reserved · GDPR · CCPA · COPPA
      </div>
    </div>
  );
}

// ============================================================
//  📋 SETUP GUIDE
// ============================================================
//
//  STEP 1 — FIREBASE SETUP:
//  1. Go to https://console.firebase.google.com
//  2. Click "Add project" → name it "vyndlove" → Create
//  3. Click the </> icon (Web app) → Register app → Copy the config
//  4. Paste the config into FIREBASE_CONFIG above
//  5. In Firebase console → Authentication → Get started → Email/Password → Enable
//  6. In Firebase console → Firestore Database → Create database → Start in test mode
//
//  STEP 2 — STRIPE PAYMENT LINKS:
//  1. In Stripe dashboard → Products → + Add product
//     • Name: "VyndLove Pro" | Price: $9.99 | Recurring: Monthly → Save
//  2. Add another product:
//     • Name: "VyndLove VIP" | Price: $24.99 | Recurring: Monthly → Save
//  3. For each product → click "Create payment link" → Copy link URL
//  4. Paste links into STRIPE_LINKS above
//
//  STEP 3 — INSTALL & RUN:
//  npm install firebase
//  (then deploy to Vercel as before)
// ============================================================
