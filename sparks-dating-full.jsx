// ============================================================
//  VyndLove - Intent-Driven Dating App v5 (Production Blockers Fixed)
//  Stack: React + Firebase (Auth, Firestore) + Stripe
//  Encoding: UTF-8 throughout — no Latin-1 artifacts
// ============================================================
//
//  QA CHECKLIST (v5 — Pre-Submission):
//  [ ] User can sign up (email + password)
//  [ ] User can log in
//  [ ] User can create profile (name, age, city, gender, 4+ photos, 3 prompts)
//  [ ] User can browse profiles in Discover feed, Best Match, and Standouts
//  [ ] User can like a photo or prompt
//  [ ] User can match (mutual like creates match)
//  [ ] User can chat in real-time after matching
//  [ ] User can report a user from profile view
//  [ ] User can report a user from chat header
//  [ ] User can block a user from profile view
//  [ ] User can block a user from chat header (chat closes / hides)
//  [ ] User can open Privacy Policy (pre-login + in Settings + Pricing)
//  [ ] User can open Terms of Service (pre-login + in Settings + Pricing)
//  [ ] User can open Safety Guide
//  [ ] User can contact support via support@vyndlove.com
//  [ ] User can delete account with type-DELETE confirmation flow
//  [ ] After deletion: profile, matches, messages, likes removed from Firestore
//  [ ] No broken encoding characters anywhere (Â, ð, corrupted arrows)
//  [ ] No payment flow breaks mobile compliance (IS_MOBILE_BUILD guard active)
//  [ ] Empty states shown for: no likes, no matches, no chats, no profiles, no standouts
//  [ ] Emergency Resources displayed cleanly with separate lines
//  [ ] Profanity warning modal shown instead of silent block
//  [ ] Blocked users do not appear in Discover, Likes, Matches, or Chat
// ============================================================

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, deleteUser,
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
  pro:   "https://buy.stripe.com/28EcN51TZdnI1rKgIGgbm00",
  elite: "https://buy.stripe.com/cNi6oHaqv1F02vObomgbm01",
};

const SUPPORT_EMAIL  = "support@vyndlove.com";
const IS_MOBILE_BUILD = false; // set true on native builds to hide Stripe

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

// ============================================================
//  CONSTANTS
// ============================================================
const MAX_FREE_LIKES_DAY      = 10;
const MAX_PRIORITY_LIKES_WEEK = 1;
const MAX_YOUR_TURN           = 5;
const MIN_PHOTOS              = 4;

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
  "I get along best with people who...",
  "My ideal first date is...",
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
  red: "#ef4444", text: "#f0eaf8", muted: "#7a7590", elite: "#f59e0b",
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
    name: "Elite", price: 24.99, color: "#f59e0b", id: "elite",
    features: ["Everything in Pro", "Priority ranking", "Boosted visibility", "Unlimited priority likes"],
    cta: "Get Elite",
  },
];

const inp = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.borderMid}`, borderRadius: 10,
  padding: "12px 14px", color: C.text, fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box", ...extra,
});

function matchId(a, b)    { return [a, b].sort().join("_"); }
function getWeek()        { const d = new Date(); return `${d.getFullYear()}-W${Math.ceil(d.getDate()/7)}`; }
function hasProfanity(t)  { return PROFANITY.some(w => t.toLowerCase().includes(w)); }
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - (ts?.toDate ? ts.toDate().getTime() : ts);
  if (diff < 60000)   return "just now";
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

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
  const [step,            setStep]           = useState(0);
  const [setupName,       setSetupName]      = useState("");
  const [setupAge,        setSetupAge]       = useState("");
  const [setupCity,       setSetupCity]      = useState("");
  const [setupBio,        setSetupBio]       = useState("");
  const [setupGender,     setSetupGender]    = useState("");
  const [setupLookingFor, setSetupLookingFor]= useState("everyone");
  const [setupInterests,  setSetupInterests] = useState([]);
  const [setupPhotos,     setSetupPhotos]    = useState(["","","","","",""]);
  const [setupPrompts,    setSetupPrompts]   = useState([
    { q: PROMPT_OPTIONS[0], a: "" },
    { q: PROMPT_OPTIONS[1], a: "" },
    { q: PROMPT_OPTIONS[2], a: "" },
  ]);

  // ── Navigation
  const [page,        setPage]        = useState("Discover");
  const [discoverTab, setDiscoverTab] = useState("feed");

  // ── Discover
  const [profiles,    setProfiles]    = useState([]);
  const [compatible,  setCompatible]  = useState(null);
  const [standouts,   setStandouts]   = useState([]);
  const [viewProfile, setViewProfile] = useState(null);

  // ── Likes received (Pro)
  const [likesReceived, setLikesReceived] = useState([]);

  // ── Like flow
  const [likeTarget,   setLikeTarget]   = useState(null);
  const [likeComment,  setLikeComment]  = useState("");
  const [likeError,    setLikeError]    = useState("");
  const [likeSending,  setLikeSending]  = useState(false);
  const [likesUsed,    setLikesUsed]    = useState(0);
  const [priorityUsed, setPriorityUsed] = useState(0);

  // ── Matches & chat
  const [matches,   setMatches]  = useState([]);
  const [chatWith,  setChatWith] = useState(null);
  const [messages,  setMessages] = useState([]);
  const [newMsg,    setNewMsg]   = useState("");
  const [yourTurn,  setYourTurn] = useState(0);
  const messagesEndRef = useRef(null);

  // ── UI modals
  const [matchPopup,      setMatchPopup]      = useState(null);
  const [showPaywall,     setShowPaywall]      = useState(false);
  const [legal,           setLegal]            = useState(null);
  const [reportTarget,    setReportTarget]     = useState(null);
  const [reportReason,    setReportReason]     = useState("");
  const [reportSent,      setReportSent]       = useState(false);
  const [feedbackTarget,  setFeedbackTarget]   = useState(null);
  const [showCancelModal, setShowCancelModal]  = useState(false);
  const [cancelStatus,    setCancelStatus]     = useState(null);
  const [cancelDate,      setCancelDate]       = useState(null);

  // ── v4/v5 compliance state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount,   setDeletingAccount]   = useState(false);
  const [showContact,       setShowContact]        = useState(false);
  const [profanityWarning,  setProfanityWarning]   = useState(false);
  const [showPreLoginLegal, setShowPreLoginLegal]  = useState(null); // "privacy" | "terms"
  const [loadError,         setLoadError]          = useState(null);
  // v5: block confirmation modal (used from chat + profile)
  const [blockConfirmTarget, setBlockConfirmTarget] = useState(null); // { id, name, fromChat? }

  // ── Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
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
          setLoadError(null);
        } catch (e) {
          setLoadError("Failed to load your profile. Please check your connection.");
        }
      }
      setLoading(false);
    });
  }, []);

  // ── Load profiles
  useEffect(() => {
    if (!user || !userProfile) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const blocked = userProfile.blockedUsers || [];
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.id !== user.uid && !blocked.includes(p.id));
        setProfiles(all);
        const curated = all.filter(p =>
          (p.photos||[]).filter(Boolean).length >= MIN_PHOTOS &&
          (p.prompts||[]).filter(pr => pr.a).length >= 3
        );
        setStandouts(curated.slice(0, 10));
        loadCompatible(user.uid, all);
      } catch (e) {
        setLoadError("Failed to load profiles. Tap to retry.");
      }
    })();
  }, [user, userProfile]);

  // ── Load matches (real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "matches"), where("users", "array-contains", user.uid));
    return onSnapshot(q, snap => {
      const ms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(ms);
      const yt = ms.filter(m => m.lastMessageFrom && m.lastMessageFrom !== user.uid).length;
      setYourTurn(yt);
    }, () => setLoadError("Connection issue. Some data may be stale."));
  }, [user]);

  // ── Load chat messages
  useEffect(() => {
    if (!chatWith || !user) return;
    const mid = matchId(user.uid, chatWith.userId);
    const q = query(collection(db, "chats", mid, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
    });
    updateDoc(doc(db, "matches", mid), { [`unread_${user.uid}`]: 0 }).catch(() => {});
    return unsub;
  }, [chatWith, user]);

  // ── Load likes received (Pro/Elite only)
  useEffect(() => {
    if (!user || !userProfile) return;
    const isPrem = userProfile.plan === "pro" || userProfile.plan === "elite";
    if (!isPrem) return;
    (async () => {
      const snap = await getDocs(query(
        collection(db, "likes"),
        where("to", "==", user.uid)
      ));
      const rawLikes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const byUser = {};
      rawLikes.forEach(l => {
        if (!byUser[l.from] || l.createdAt > byUser[l.from].createdAt) byUser[l.from] = l;
      });
      setLikesReceived(Object.values(byUser));
    })();
  }, [user, userProfile]);

  // ── Most Compatible
  const loadCompatible = async (uid, allProfiles) => {
    const compDoc = await getDoc(doc(db, "compatible", uid));
    if (compDoc.exists()) {
      const d = compDoc.data();
      if (d.expiresAt && d.expiresAt.toDate() > new Date()) {
        const found = allProfiles.find(p => p.id === d.profileId);
        if (found) { setCompatible(found); return; }
      }
    }
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
    if (setupPrompts.some(p => !p.a.trim())) return;
    const validPhotos = setupPhotos.filter(Boolean);
    if (validPhotos.length < MIN_PHOTOS) return;
    const data = {
      name: setupName, age: parseInt(setupAge), city: setupCity,
      bio: setupBio, gender: setupGender, lookingFor: setupLookingFor,
      interests: setupInterests,
      photos: validPhotos,
      prompts: setupPrompts,
      plan: "free",
      verified: false,
      likesUsedToday: 0, lastLikeDate: new Date().toDateString(),
      priorityLikesUsedThisWeek: 0, lastPriorityWeek: getWeek(),
      blockedUsers: [], reportedUsers: [],
      lastActive: serverTimestamp(),
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
    const isPrem = userProfile?.plan === "pro" || userProfile?.plan === "elite";

    if (!isPriority) {
      if (!isPrem) {
        const today = new Date().toDateString();
        let used = likesUsed;
        if (userProfile?.lastLikeDate !== today) { used = 0; setLikesUsed(0); }
        if (used >= MAX_FREE_LIKES_DAY) { setShowPaywall(true); setLikeSending(false); setLikeTarget(null); return; }
      }
    } else {
      if (userProfile?.plan !== "elite") {
        const week = getWeek();
        let pu = priorityUsed;
        if (userProfile?.lastPriorityWeek !== week) { pu = 0; setPriorityUsed(0); }
        if (pu >= MAX_PRIORITY_LIKES_WEEK) { setShowPaywall(true); setLikeSending(false); setLikeTarget(null); return; }
      }
    }

    if (yourTurn >= MAX_YOUR_TURN && !isPriority) {
      setLikeError("Reply to your waiting conversations first 💬");
      setLikeSending(false);
      return;
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

    const theirLikes = await getDocs(query(
      collection(db, "likes"),
      where("from", "==", profileId),
      where("to",   "==", user.uid)
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

    const today = new Date().toDateString();
    const week  = getWeek();
    const updates = { lastLikeDate: today, lastActive: serverTimestamp() };
    if (!isPrem && !isPriority) {
      const newCount = (userProfile?.lastLikeDate !== today ? 0 : likesUsed) + 1;
      setLikesUsed(newCount);
      updates.likesUsedToday = newCount;
    }
    if (isPriority && userProfile?.plan !== "elite") {
      const newPu = (userProfile?.lastPriorityWeek !== week ? 0 : priorityUsed) + 1;
      setPriorityUsed(newPu);
      updates.priorityLikesUsedThisWeek = newPu;
      updates.lastPriorityWeek = week;
    }
    await updateDoc(doc(db, "users", user.uid), updates);
    setLikeTarget(null); setLikeComment(""); setLikeError(""); setLikeSending(false);
  };

  // ── Send message (v4: warn on profanity instead of silently block)
  const sendMsg = async () => {
    if (!newMsg.trim() || !chatWith || !user) return;
    if (hasProfanity(newMsg)) { setProfanityWarning(true); return; }
    const mid = matchId(user.uid, chatWith.userId);
    await addDoc(collection(db, "chats", mid, "messages"), {
      text: newMsg.trim(), from: user.uid, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "matches", mid), {
      lastMessage: newMsg.trim(),
      lastMessageFrom: user.uid,
      [`unread_${chatWith.userId}`]: increment(1),
      [`unread_${user.uid}`]: 0,
      lastActivity: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", user.uid), { lastActive: serverTimestamp() });
    setNewMsg("");
  };

  // ── Block user (from profile view)
  const blockUser = async (targetId) => {
    const updated = [...(userProfile?.blockedUsers || []), targetId];
    await updateDoc(doc(db, "users", user.uid), { blockedUsers: updated });
    // also store report in DB for safety team
    await addDoc(collection(db, "blocks"), {
      from: user.uid, to: targetId, createdAt: serverTimestamp(),
    }).catch(() => {});
    setUserProfile(p => ({ ...p, blockedUsers: updated }));
    setProfiles(p => p.filter(x => x.id !== targetId));
    setMatches(ms => ms.filter(m => !m.users.includes(targetId)));
    setViewProfile(null);
    setBlockConfirmTarget(null);
  };

  // ── Block user from chat (closes chat, removes from lists)
  const blockUserFromChat = async (targetId) => {
    await blockUser(targetId);
    setChatWith(null); // close chat with blocked user
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

  // ── Delete account (v4 — Step 1)
  const deleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      // 1. Delete all matches + their messages
      const matchSnap = await getDocs(query(collection(db, "matches"), where("users", "array-contains", user.uid)));
      for (const m of matchSnap.docs) {
        const msgSnap = await getDocs(collection(db, "chats", m.id, "messages"));
        for (const msg of msgSnap.docs) await deleteDoc(doc(db, "chats", m.id, "messages", msg.id));
        await deleteDoc(doc(db, "matches", m.id));
      }
      // 2. Delete likes
      const likeSent = await getDocs(query(collection(db, "likes"), where("from", "==", user.uid)));
      const likeRec  = await getDocs(query(collection(db, "likes"), where("to",   "==", user.uid)));
      for (const l of [...likeSent.docs, ...likeRec.docs]) await deleteDoc(doc(db, "likes", l.id));
      // 3. Delete compatible
      await deleteDoc(doc(db, "compatible", user.uid)).catch(() => {});
      // 4. Delete user profile
      await deleteDoc(doc(db, "users", user.uid));
      // 5. Delete Firebase Auth user
      await deleteUser(user);
      setUser(null); setUserProfile(null); setShowDeleteAccount(false);
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        alert("Please sign out and sign back in before deleting your account.");
      }
      setDeletingAccount(false);
    }
  };

  // ── Derived
  const isPremium  = userProfile?.plan === "pro" || userProfile?.plan === "elite";
  const isElite    = userProfile?.plan === "elite";
  const likesLeft  = isPremium ? "∞" : Math.max(0, MAX_FREE_LIKES_DAY - likesUsed);
  const priorityLeft = isElite ? "∞" : Math.max(0, MAX_PRIORITY_LIKES_WEEK - priorityUsed);

  const legalText = {
    privacy: (
      <>
        <h3 style={{ color:C.text }}>Privacy Policy</h3>
        <p><strong>Last updated: January 2025</strong></p>
        <p>VyndLove ("we", "our", or "us") is committed to protecting your privacy. This policy explains how we collect, use, and share your personal data.</p>
        <p><strong>1. Data We Collect</strong><br/>Name, age, city, photos, interests, prompts, and email address. We do not collect data from anyone under 18. We are COPPA compliant.</p>
        <p><strong>2. How We Use Your Data</strong><br/>To provide matching services, display your profile to compatible users, and improve the app experience. We do not sell your data to third parties.</p>
        <p><strong>3. Data Retention</strong><br/>Your data is stored until you delete your account. You can delete your account at any time from Settings → Delete Account.</p>
        <p><strong>4. Your Rights (GDPR / CCPA)</strong><br/>You have the right to access, correct, or delete your personal data. Contact us at privacy@vyndlove.com.</p>
        <p><strong>5. Cookies</strong><br/>We use essential cookies only. No advertising or tracking cookies.</p>
        <p><strong>6. Contact</strong><br/>privacy@vyndlove.com · VyndLove Inc., New York, NY</p>
      </>
    ),
    terms: (
      <>
        <h3 style={{ color:C.text }}>Terms of Service</h3>
        <p><strong>Last updated: January 2025</strong></p>
        <p><strong>1. Eligibility</strong><br/>You must be 18 years of age or older to use VyndLove. By creating an account you confirm that you are at least 18 years old and legally able to form a binding contract. Users under 18 are strictly prohibited and will have their accounts terminated.</p>
        <p><strong>2. Acceptable Behavior</strong><br/>You agree to treat all other users with respect. You will not harass, threaten, stalk, or demean any user. You will engage honestly and authentically with matches and conversations.</p>
        <p><strong>3. Prohibited Conduct</strong><br/>The following are strictly prohibited: fake or misleading profiles; impersonation of any person or entity; nudity, sexually explicit content, or graphic violence; hate speech based on race, gender, religion, nationality, disability, or sexual orientation; spam, scams, or solicitation; sharing another user's private information without consent; any illegal activity. Violations result in immediate account termination and may be reported to law enforcement.</p>
        <p><strong>4. Subscription Terms</strong><br/>Pro ($9.99/mo) and Elite ($24.99/mo) plans are billed monthly and auto-renew unless cancelled. You may cancel at any time in Settings before the next billing date. Cancellation takes effect at the end of the current billing period. We offer a 7-day refund on first-time purchases if requested via {SUPPORT_EMAIL}.</p>
        <p><strong>5. Cancellation &amp; Termination</strong><br/>You may cancel your subscription or delete your account at any time in Settings. VyndLove reserves the right to suspend or terminate any account that violates these Terms, with or without notice. Upon deletion, all profile data, matches, and messages are permanently removed from our servers.</p>
        <p><strong>6. User Content</strong><br/>You retain ownership of all photos, text, and other content you upload. By posting content, you grant VyndLove a non-exclusive, royalty-free license to display it within the app to other users for the purpose of providing matching services. We do not sell or license your content to third parties.</p>
        <p><strong>7. Disclaimer &amp; Limitation of Liability</strong><br/>VyndLove is provided "as is" without warranties of any kind. We are not responsible for the conduct of any user, online or offline. We do not guarantee that you will find a match. In no event shall VyndLove's liability exceed the amount you paid in subscription fees in the past 12 months.</p>
        <p><strong>8. Safety</strong><br/>Always prioritize your personal safety. Meet new people in public places. Trust your instincts. Use the in-app Report and Block features if you feel unsafe. In an emergency, call 911 (US) or your local emergency number.</p>
        <p><strong>9. Governing Law</strong><br/>These Terms are governed by the laws of the State of New York, USA. Any disputes shall be resolved in the courts of New York County.</p>
        <p><strong>10. Changes to Terms</strong><br/>We may update these Terms from time to time. We will notify users of material changes via email or in-app notification. Continued use of VyndLove after changes constitutes acceptance.</p>
        <p><strong>11. Contact</strong><br/>For questions about these Terms: {SUPPORT_EMAIL}<br/>VyndLove Inc., New York, NY</p>
      </>
    ),
    cookies: <p>We use essential cookies only to keep you signed in. We do not use advertising, tracking, or analytics cookies. No data is shared with ad networks.</p>,
    safety: (
      <>
        <h3 style={{ color:C.text }}>Safety Guide</h3>
        <p><strong>Before meeting someone:</strong> Video chat first. Tell a friend or family member where you're going and who you're meeting.</p>
        <p><strong>First dates:</strong> Meet in a public place. Arrange your own transport. Don't share your home address early on.</p>
        <p><strong>Trust your instincts:</strong> If something feels off, it's okay to leave. Report any suspicious profiles using the ⚑ Report button.</p>
        <p><strong>Emergency:</strong> 911 (US)</p>
        <p><strong>RAINN (sexual assault support):</strong> 1-800-656-4673</p>
        <p><strong>Crisis Text Line:</strong> Text HOME to 741741</p>
        <p><strong>National DV Hotline:</strong> 1-800-799-7233</p>
      </>
    ),
  };

  // ============================================================
  //  SCREENS
  // ============================================================
  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ color:C.accent, fontSize:48, marginBottom:16 }}>💜</div>
        <div style={{ color:C.muted, fontSize:14 }}>Loading…</div>
      </div>
    </div>
  );

  // ── Pre-login legal overlay
  if (showPreLoginLegal) return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui", padding:24 }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <button onClick={() => setShowPreLoginLegal(null)}
          style={{ background:"none", border:"none", color:C.accent, fontSize:15, cursor:"pointer", marginBottom:16 }}>← Back</button>
        <div style={{ background:C.card, borderRadius:20, padding:28, border:`1px solid ${C.borderMid}`, color:C.muted, lineHeight:1.8, fontSize:14 }}>
          {legalText[showPreLoginLegal]}
        </div>
      </div>
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
          <button onClick={() => setAgeConfirmed(true)} style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15 }}>I am 18+ (confirmed)</button>
          <button onClick={() => alert("You must be 18+ to use this app.")} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 0", cursor:"pointer" }}>Under 18</button>
        </div>
        <div style={{ marginTop:20, display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={() => setShowPreLoginLegal("privacy")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>Privacy Policy</button>
          <button onClick={() => setShowPreLoginLegal("terms")}   style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>Terms of Service</button>
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
        {authMode === "signup" && (
          <p style={{ color:C.muted, fontSize:11, textAlign:"center", marginTop:14, marginBottom:0, lineHeight:1.6 }}>
            By creating an account you agree to our{" "}
            <button onClick={() => setShowPreLoginLegal("terms")} style={{ background:"none", border:"none", color:C.accent, fontSize:11, cursor:"pointer", padding:0, textDecoration:"underline" }}>Terms</button>
            {" "}and{" "}
            <button onClick={() => setShowPreLoginLegal("privacy")} style={{ background:"none", border:"none", color:C.accent, fontSize:11, cursor:"pointer", padding:0, textDecoration:"underline" }}>Privacy Policy</button>.
          </p>
        )}
        <div style={{ marginTop:16, display:"flex", gap:16, justifyContent:"center" }}>
          <button onClick={() => setShowPreLoginLegal("privacy")} style={{ background:"none", border:"none", color:C.muted, fontSize:12, cursor:"pointer" }}>Privacy Policy</button>
          <button onClick={() => setShowPreLoginLegal("terms")}   style={{ background:"none", border:"none", color:C.muted, fontSize:12, cursor:"pointer" }}>Terms of Service</button>
        </div>
      </div>
    </div>
  );

  // ── Profile setup wizard
  if (setupMode) {
    const validPhotos = setupPhotos.filter(Boolean);
    const photosOk    = validPhotos.length >= MIN_PHOTOS;
    const canFinish   = setupName && setupAge && setupCity && setupGender && setupPrompts.every(p => p.a.trim()) && photosOk;

    const movePhoto = (idx, dir) => {
      const p = [...setupPhotos];
      const target = idx + dir;
      if (target < 0 || target >= p.length) return;
      [p[idx], p[target]] = [p[target], p[idx]];
      setSetupPhotos(p);
    };

    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui", padding:24 }}>
        <div style={{ maxWidth:520, margin:"0 auto" }}>
          <div style={{ textAlign:"center", padding:"28px 0 20px" }}>
            <div style={{ fontSize:40 }}>💜</div>
            <h2 style={{ color:C.text, margin:"8px 0 4px" }}>Build Your Profile</h2>
            <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:12 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ height:4, width:40, borderRadius:4, background: step>=i ? C.accent : C.border }} />
              ))}
            </div>
          </div>

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

          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ color:C.muted, fontSize:13, margin:0 }}>Photos ({validPhotos.length}/{MIN_PHOTOS} required)</p>
                {photosOk
                  ? <span style={{ color:C.green, fontSize:12, fontWeight:700 }}>✓ Ready</span>
                  : <span style={{ color:C.red, fontSize:12 }}>{MIN_PHOTOS - validPhotos.length} more needed</span>}
              </div>
              {setupPhotos.map((url, i) => (
                <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <button onClick={() => movePhoto(i, -1)} disabled={i===0}
                      style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, width:24, height:22, cursor:"pointer", color:C.muted, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>▲</button>
                    <button onClick={() => movePhoto(i, 1)} disabled={i===setupPhotos.length-1}
                      style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, width:24, height:22, cursor:"pointer", color:C.muted, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>▼</button>
                  </div>
                  <div style={{ flex:1, position:"relative" }}>
                    <input value={url} onChange={e => { const p=[...setupPhotos]; p[i]=e.target.value; setSetupPhotos(p); }}
                      placeholder={`Photo ${i+1}${i < MIN_PHOTOS ? " (required)" : " (optional)"}`}
                      style={{ ...inp(), borderColor: i < MIN_PHOTOS && !url ? `${C.red}60` : C.borderMid }} />
                    {i < MIN_PHOTOS && !url && (
                      <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:C.red, fontSize:10 }}>required</span>
                    )}
                  </div>
                </div>
              ))}
              {!photosOk && (
                <div style={{ background:"#ef444412", borderRadius:10, padding:"10px 14px", border:`1px solid ${C.red}30` }}>
                  <p style={{ color:C.red, fontSize:13, margin:0 }}>⚠️ You need at least {MIN_PHOTOS} photos to proceed. Profiles with more photos get 3× more matches.</p>
                </div>
              )}
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={() => setStep(0)} style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>← Back</button>
                <button onClick={() => { if (photosOk) setStep(2); }}
                  disabled={!photosOk}
                  style={{ flex:2, background: photosOk ? C.accent : C.muted, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor: photosOk ? "pointer" : "not-allowed", fontWeight:700 }}>Next →</button>
              </div>
            </div>
          )}

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
                  <div style={{ textAlign:"right", color: pr.a.length >= 130 ? C.gold : C.muted, fontSize:11, marginTop:4 }}>{pr.a.length}/150</div>
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
  //  FULL PROFILE VIEW
  // ============================================================
  const ProfileView = ({ profile, onClose }) => {
    const photos  = (profile.photos || []).filter(Boolean);
    const prompts = profile.prompts || [];
    return (
      <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:200, overflowY:"auto", fontFamily:"system-ui" }}>
        <div style={{ position:"sticky", top:0, background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, zIndex:10 }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer", lineHeight:1 }}>←</button>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:700, color:C.text }}>{profile.name}, {profile.age}</span>
            {profile.verified && <span style={{ marginLeft:6, background:C.purpleDim, color:C.purple, borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:700 }}>✓ Verified</span>}
          </div>
          <button onClick={() => setReportTarget(profile)}
            style={{ background:"transparent", color:C.muted, border:"none", fontSize:13, cursor:"pointer", padding:"4px 8px" }}>🚩 Report</button>
          <button onClick={() => setBlockConfirmTarget({ id:profile.id, name:profile.name, fromChat:false })}
            style={{ background:"transparent", color:C.red, border:`1px solid ${C.red}40`, borderRadius:8, fontSize:12, cursor:"pointer", padding:"4px 10px" }}>Block</button>
        </div>

        <div style={{ maxWidth:600, margin:"0 auto", padding:"0 0 120px" }}>
          {photos.length === 0 && (
            <div style={{ height:260, background:`linear-gradient(135deg,${C.accent}22,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:80 }}>💜</div>
          )}
          {photos.map((url, i) => (
            <div key={i} style={{ position:"relative", marginBottom:4 }}>
              <img src={url} alt="" style={{ width:"100%", maxHeight:440, objectFit:"cover", display:"block" }}
                onError={e => { e.target.style.display="none"; }} />
              <button onClick={() => { setLikeTarget({ profileId:profile.id, itemType:"photo", itemIndex:i }); setLikeComment(""); setLikeError(""); }}
                style={{ position:"absolute", bottom:14, right:14, background:"rgba(0,0,0,0.72)", border:`2px solid ${C.accent}`, borderRadius:"50%", width:50, height:50, cursor:"pointer", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
                🤍
              </button>
            </div>
          ))}

          <div style={{ padding:"20px 16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <h2 style={{ margin:0, fontSize:26, color:C.text }}>{profile.name}, {profile.age}</h2>
              {profile.verified && <span style={{ background:C.purpleDim, color:C.purple, borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:700 }}>✓ Verified</span>}
            </div>
            <p style={{ margin:"0 0 4px", color:C.muted, fontSize:14 }}>📍 {profile.city}</p>
            {profile.lastActive && <p style={{ margin:"0 0 12px", color:C.muted, fontSize:12 }}>Active {timeAgo(profile.lastActive)}</p>}
            {profile.bio && <p style={{ margin:"0 0 16px", color:"#ccc", lineHeight:1.7, fontSize:15 }}>{profile.bio}</p>}
            {(profile.interests||[]).length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                {profile.interests.map(i => (
                  <span key={i} style={{ background:C.purpleDim, color:C.purple, borderRadius:20, padding:"4px 12px", fontSize:12 }}>{i}</span>
                ))}
              </div>
            )}
          </div>

          {prompts.map((pr, i) => pr.a ? (
            <div key={i} style={{ margin:"0 16px 12px", background:C.card, borderRadius:16, padding:20, border:`1px solid ${C.borderMid}`, position:"relative" }}>
              <p style={{ color:C.accent, fontSize:13, fontWeight:600, margin:"0 0 8px" }}>{pr.q}</p>
              <p style={{ color:C.text, fontSize:15, lineHeight:1.7, margin:0, paddingRight:52 }}>{pr.a}</p>
              <button onClick={() => { setLikeTarget({ profileId:profile.id, itemType:"prompt", itemIndex:i }); setLikeComment(""); setLikeError(""); }}
                style={{ position:"absolute", bottom:14, right:14, background:"transparent", border:`2px solid ${C.accent}`, borderRadius:"50%", width:44, height:44, cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center" }}>
                🤍
              </button>
            </div>
          ) : null)}

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
  //  MINI PROFILE CARD
  // ============================================================
  const ProfileCard = ({ profile, isCompatible, isStandout }) => {
    const photo       = (profile.photos||[]).find(Boolean);
    const firstPrompt = (profile.prompts||[]).find(p => p.a);
    return (
      <div onClick={() => setViewProfile(profile)}
        style={{ background:C.card, borderRadius:20, overflow:"hidden", border:`1px solid ${isCompatible ? C.accent : isStandout ? C.gold : C.border}`, cursor:"pointer", marginBottom:12, position:"relative" }}>
        {isCompatible && <div style={{ position:"absolute", top:12, left:12, zIndex:2, background:C.accent, color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700 }}>💜 Most Compatible</div>}
        {isStandout  && <div style={{ position:"absolute", top:12, left:12, zIndex:2, background:C.gold, color:"#000", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700 }}>⭐ Standout</div>}
        {profile.verified && <div style={{ position:"absolute", top:12, right:12, zIndex:2, background:C.purpleDim, color:C.purple, borderRadius:20, padding:"3px 9px", fontSize:10, fontWeight:700 }}>✓ Verified</div>}
        {photo
          ? <img src={photo} alt={profile.name} style={{ width:"100%", height:280, objectFit:"cover", display:"block" }}
              onError={e => { e.target.style.display="none"; }} />
          : <div style={{ height:200, background:`linear-gradient(135deg,${C.accent}22,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:60 }}>💜</div>
        }
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:17, color:C.text }}>{profile.name}, {profile.age}</div>
              <div style={{ color:C.muted, fontSize:13, marginTop:2 }}>📍 {profile.city}</div>
              {profile.lastActive && <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>Active {timeAgo(profile.lastActive)}</div>}
            </div>
            <button onClick={e => { e.stopPropagation(); setLikeTarget({ profileId:profile.id, itemType:"photo", itemIndex:0 }); setLikeComment(""); setLikeError(""); }}
              style={{ background:C.accentDim, border:`1px solid ${C.accent}`, borderRadius:"50%", width:44, height:44, cursor:"pointer", fontSize:20, flexShrink:0 }}>
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
  const navItems = isPremium
    ? ["Discover","Likes","Matches","Chat","Pricing","Settings"]
    : ["Discover","Matches","Chat","Pricing","Settings"];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui" }}>

      {/* ── Global error banner */}
      {loadError && (
        <div style={{ background:"#ef444418", borderBottom:`1px solid ${C.red}40`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ color:C.red, fontSize:13 }}>⚠️ {loadError}</span>
          <button onClick={() => { setLoadError(null); window.location.reload(); }}
            style={{ background:C.red, color:"#fff", border:"none", borderRadius:6, padding:"4px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>Retry</button>
        </div>
      )}

      {/* ── Like modal */}
      {likeTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
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
            {!SS_MOBILE_BUILD && (
              <>
                <button onClick={() => { window.open(STRIPE_LINKS.pro, "_blank"); setShowPaywall(false); }}
                  style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15, marginBottom:10 }}>
                  Get Pro — $9.99/mo
                </button>
                <button onClick={() => { window.open(STRIPE_LINKS.elite, "_blank"); setShowPaywall(false); }}
                  style={{ width:"100%", background:"transparent", color:C.elite, border:`2px solid ${C.elite}`, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700, marginBottom:20 }}>
                  Get Elite — $24.99/mo ⭐
                </button>
              </>
            )}
            {IS_MOBILE_BUILD && (
              <button onClick={() => { setShowPaywall(false); setPage("Pricing"); }}
                style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"13px 0", cursor:"pointer", fontWeight:700, fontSize:15, marginBottom:20 }}>
                View Plans
              </button>
            )}
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
                {["Harassment","Spam","Fake profile","Inappropriate content","Under 18","Sexual content","Other"].map(r => (
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
              <button onClick={() => submitFeedback(true, null)} style={{ flex:1, background:C.greenDim, color:C.green, border:`1px solid ${C.green}`, borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700 }}>Yes! 🎉</button>
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
                <p style={{ color:C.muted, marginBottom:20 }}>Please try again or contact {SUPPORT_EMAIL}</p>
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

      {/* ── Delete Account modal (v4 Step 1) */}
      {showDeleteAccount && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:800, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:32, maxWidth:400, width:"100%", border:`2px solid ${C.red}` }}>
            <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>⚠️</div>
            <h2 style={{ color:C.red, margin:"0 0 10px", textAlign:"center" }}>Delete Your Account</h2>
            <p style={{ color:C.muted, fontSize:14, lineHeight:1.7, marginBottom:16 }}>
              This will permanently delete your profile, all matches, messages, and likes. <strong style={{ color:C.text }}>This cannot be undone.</strong>
            </p>
            <div style={{ background:"#ef444412", borderRadius:10, padding:"10px 14px", marginBottom:16, border:`1px solid ${C.red}30` }}>
              <p style={{ color:C.red, fontSize:13, margin:0 }}>Type <strong>DELETE</strong> below to confirm:</p>
            </div>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              style={{ ...inp(), borderColor: deleteConfirmText === "DELETE" ? C.red : C.borderMid, marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(""); }}
                style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 0", cursor:"pointer" }}>
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                style={{ flex:1, background: deleteConfirmText === "DELETE" ? C.red : C.muted, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor: deleteConfirmText === "DELETE" ? "pointer" : "not-allowed", fontWeight:700 }}>
                {deletingAccount ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact & Support modal (v4 Step 8) */}
      {showContact && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:750, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:24, padding:32, maxWidth:400, width:"100%", border:`1px solid ${C.borderMid}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, color:C.text }}>Contact & Support</h2>
              <button onClick={() => setShowContact(false)} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ background:C.surface, borderRadius:12, padding:16, marginBottom:16 }}>
              <p style={{ color:C.muted, fontSize:13, margin:"0 0 8px" }}>Email us at:</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color:C.accent, fontWeight:700, fontSize:16, textDecoration:"none" }}>{SUPPORT_EMAIL}</a>
            </div>
            <div style={{ color:C.muted, fontSize:13, lineHeight:1.8 }}>
              <p style={{ margin:"0 0 8px" }}>We typically respond within 24–48 hours.</p>
              <p style={{ margin:"0 0 8px" }}>For account issues, subscription questions, or to report a safety concern, please include:</p>
              <p style={{ margin:"0 0 4px" }}>• Your registered email address</p>
              <p style={{ margin:"0 0 4px" }}>• A brief description of the issue</p>
              <p style={{ margin:0 }}>• Any relevant screenshots</p>
            </div>
            <button onClick={() => setShowContact(false)} style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700, marginTop:20 }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Block confirmation modal (v5) */}
      {blockConfirmTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:800, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:28, maxWidth:380, width:"100%", textAlign:"center", border:`1px solid ${C.red}40` }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🚫</div>
            <h3 style={{ color:C.text, margin:"0 0 8px" }}>Block {blockConfirmTarget.name}?</h3>
            <p style={{ color:C.muted, fontSize:14, lineHeight:1.7, marginBottom:20 }}>
              They will no longer appear in your Discover, Likes, Matches, or Chat.{blockConfirmTarget.fromChat ? " This conversation will be closed." : ""}
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setBlockConfirmTarget(null)}
                style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 0", cursor:"pointer" }}>Cancel</button>
              <button onClick={() => blockConfirmTarget.fromChat ? blockUserFromChat(blockConfirmTarget.id) : blockUser(blockConfirmTarget.id)}
                style={{ flex:1, background:C.red, color:"#fff", border:"none", borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700 }}>Block User</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profanity warning modal (v4 Step 4) */}
      {profanityWarning && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:C.card, borderRadius:20, padding:28, maxWidth:360, width:"100%", textAlign:"center", border:`1px solid ${C.red}40` }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🚫</div>
            <h3 style={{ color:C.text, margin:"0 0 10px" }}>Inappropriate Language</h3>
            <p style={{ color:C.muted, fontSize:14, lineHeight:1.7, marginBottom:20 }}>
              Your message contains content that violates our community guidelines. Please keep conversations respectful.
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setProfanityWarning(false); setNewMsg(""); }}
                style={{ flex:1, background:"transparent", color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 0", cursor:"pointer" }}>Clear Message</button>
              <button onClick={() => setProfanityWarning(false)}
                style={{ flex:1, background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"11px 0", cursor:"pointer", fontWeight:700 }}>Edit Message</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Profile overlay */}
      {viewProfile && <ProfileView profile={viewProfile} onClose={() => setViewProfile(null)} />}

      {/* ── Nav */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 8px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontWeight:900, fontSize:18, color:C.accent }}>💜 VyndLove</span>
        <nav style={{ display:"flex", gap:1 }}>
          {navItems.map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ position:"relative", background: page===n ? C.accentDim : "transparent", color: page===n ? C.accent : C.muted, border:"none", borderRadius:8, padding:"7px 8px", cursor:"pointer", fontWeight:600, fontSize:11 }}>
              {n}
              {n === "Chat" && yourTurn > 0 && (
                <span style={{ position:"absolute", top:3, right:3, background:C.red, color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{yourTurn}</span>
              )}
              {n === "Likes" && likesReceived.length > 0 && (
                <span style={{ position:"absolute", top:3, right:3, background:C.accent, color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{likesReceived.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ===================== DISCOVER ===================== */}
      {page === "Discover" && (
        <div style={{ maxWidth:600, margin:"0 auto", padding:"20px 16px 100px" }}>
          <div style={{ display:"flex", gap:8, marginBottom:20, background:C.surface, borderRadius:12, padding:4 }}>
            {[["feed","Feed"],["compatible","💜 Best Match"],["standouts","⭐ Standouts"]].map(([id,label]) => (
              <button key={id} onClick={() => setDiscoverTab(id)}
                style={{ flex:1, background: discoverTab===id ? (id==="standouts" ? C.goldDim : C.accentDim) : "transparent", color: discoverTab===id ? (id==="standouts" ? C.gold : C.accent) : C.muted, border:"none", borderRadius:9, padding:"8px 0", cursor:"pointer", fontWeight:600, fontSize:12 }}>
                {label}
              </button>
            ))}
          </div>

          {!isPremium && discoverTab !== "standouts" && (
            <div style={{ background:C.accentDim, borderRadius:12, padding:"10px 14px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:C.accent, fontSize:13, fontWeight:600 }}>💜 {likesLeft} likes left today</span>
              <button onClick={() => setPage("Pricing")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>Upgrade</button>
            </div>
          )}

          {yourTurn >= MAX_YOUR_TURN && (
            <div style={{ background:"#ef444418", borderRadius:12, padding:"12px 14px", marginBottom:16, border:`1px solid ${C.red}40` }}>
              <p style={{ color:C.red, fontSize:13, margin:"0 0 8px", fontWeight:600 }}>⚠️ You have {yourTurn} conversations waiting for your reply. Respond before liking more people.</p>
              <button onClick={() => setPage("Chat")} style={{ background:C.red, color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700 }}>Go to Chat</button>
            </div>
          )}

          {discoverTab === "feed" && (
            <>
              {compatible && <ProfileCard profile={compatible} isCompatible />}
              {profiles.length === 0 ? (
                <div style={{ textAlign:"center", padding:60, color:C.muted, background:C.card, borderRadius:20, border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>💜</div>
                  <p style={{ fontWeight:600, color:C.text, marginBottom:8 }}>New users are joining!</p>
                  <p style={{ fontSize:13, marginBottom:20 }}>Check back soon — your next match could be minutes away.</p>
                  <button onClick={() => window.location.reload()} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontWeight:700, fontSize:14 }}>Refresh</button>
                </div>
              ) : (
                profiles.filter(p => p.id !== compatible?.id).map(p => (
                  <ProfileCard key={p.id} profile={p} />
                ))
              )}
            </>
          )}

          {discoverTab === "compatible" && (
            <div>
              <p style={{ color:C.muted, fontSize:13, marginBottom:16 }}>Your best match for today. Refreshes every 24 hours.</p>
              {compatible
                ? <ProfileCard profile={compatible} isCompatible />
                : <div style={{ textAlign:"center", padding:60, color:C.muted, background:C.card, borderRadius:20 }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>💜</div>
                    <p style={{ fontWeight:600, color:C.text, marginBottom:8 }}>New users are joining!</p>
                    <p style={{ fontSize:13 }}>Your Most Compatible match will appear once more people join.</p>
                  </div>
              }
            </div>
          )}

          {discoverTab === "standouts" && (
            <div>
              <div style={{ background:C.goldDim, borderRadius:12, padding:"12px 14px", marginBottom:16, border:`1px solid ${C.gold}40` }}>
                <p style={{ color:C.gold, fontSize:13, margin:"0 0 4px", fontWeight:600 }}>⭐ Standouts are curated profiles with 4+ photos & full prompts.</p>
                <p style={{ color:C.muted, fontSize:12, margin:0 }}>Only Priority Likes allowed here. {priorityLeft} priority like{priorityLeft !== 1 ? "s" : ""} remaining this week.</p>
              </div>
              {standouts.length === 0 ? (
                <div style={{ textAlign:"center", padding:60, color:C.muted, background:C.card, borderRadius:20 }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
                  <p style={{ fontWeight:600, color:C.text, marginBottom:8 }}>More Standouts coming soon!</p>
                  <p style={{ fontSize:13 }}>Standouts are profiles with 4+ photos and all prompts answered. Encourage your matches to complete their profiles!</p>
                </div>
              ) : (
                standouts.map(p => (
                  <div key={p.id} onClick={() => setViewProfile(p)}
                    style={{ background:C.card, borderRadius:20, overflow:"hidden", border:`2px solid ${C.gold}`, cursor:"pointer", marginBottom:12 }}>
                    {(p.photos||[]).find(Boolean) && (
                      <img src={(p.photos||[]).find(Boolean)} alt={p.name} style={{ width:"100%", height:240, objectFit:"cover", display:"block" }}
                        onError={e => { e.target.style.display="none"; }} />
                    )}
                    <div style={{ padding:"14px 16px" }}>
                      <div style={{ fontWeight:700, fontSize:16, color:C.text }}>{p.name}, {p.age}
                        {p.verified && <span style={{ marginLeft:8, color:C.purple, fontSize:12 }}>✓</span>}
                      </div>
                      <div style={{ color:C.muted, fontSize:13, marginTop:2, marginBottom:12 }}>📍 {p.city}</div>
                      <button onClick={e => { e.stopPropagation(); setLikeTarget({ profileId:p.id, itemType:"profile", itemIndex:0, isPriority:true }); setLikeComment(""); setLikeError(""); }}
                        style={{ width:"100%", background:C.goldDim, color:C.gold, border:`1px solid ${C.gold}`, borderRadius:10, padding:"10px 0", cursor:"pointer", fontWeight:700, fontSize:14 }}>
                        ⭐ Priority Like
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== LIKES RECEIVED (Pro/Elite) ===================== */}
      {page === "Likes" && (
        <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 16px 80px" }}>
          <h1 style={{ margin:"0 0 6px", fontSize:22 }}>Who Liked You 💜</h1>
          <p style={{ color:C.muted, fontSize:13, marginBottom:20 }}>People who liked one of your photos or prompts.</p>
          {likesReceived.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, background:C.card, borderRadius:20, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🤍</div>
              <p style={{ fontWeight:600, color:C.text, marginBottom:8 }}>No likes yet!</p>
              <p style={{ color:C.muted, fontSize:13 }}>Keep your profile fresh — likes start rolling in once more people discover you.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14 }}>
              {likesReceived.map(like => {
                const profile = profiles.find(p => p.id === like.from);
                return (
                  <div key={like.id} onClick={() => profile && setViewProfile(profile)}
                    style={{ background:C.card, borderRadius:16, overflow:"hidden", border:`1px solid ${C.accent}`, cursor:"pointer" }}>
                    <div style={{ height:100, background:`linear-gradient(135deg,${C.accent}30,${C.purple}15)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>
                      {profile && (profile.photos||[]).find(Boolean)
                        ? <img src={(profile.photos||[]).find(Boolean)} style={{ width:"100%", height:100, objectFit:"cover" }} alt="" onError={e => { e.target.style.display="none"; }} />
                        : "💜"}
                    </div>
                    <div style={{ padding:"10px 12px" }}>
                      <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{profile?.name || "Someone"}</div>
                      {profile && <div style={{ color:C.muted, fontSize:12 }}>{profile.age} · {profile.city}</div>}
                      {like.comment && <div style={{ color:C.accent, fontSize:12, marginTop:6, fontStyle:"italic" }}>"{like.comment}"</div>}
                      <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>Liked your {like.itemType}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== MATCHES ===================== */}
      {page === "Matches" && (
        <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 16px 80px" }}>
          <h1 style={{ margin:"0 0 20px", fontSize:22 }}>Your Matches 💜</h1>
          {matches.length === 0 ? (
            <div style={{ textAlign:"center", padding:60, background:C.card, borderRadius:20, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💜</div>
              <p style={{ fontWeight:600, color:C.text, marginBottom:8 }}>No matches yet!</p>
              <p style={{ color:C.muted, fontSize:13, marginBottom:20 }}>New users are joining every day. Start liking profiles and your first match could be right around the corner.</p>
              <button onClick={() => setPage("Discover")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 28px", cursor:"pointer", fontWeight:700 }}>Browse Profiles</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14 }}>
              {matches.map(m => {
                const otherId = m.users.find(u => u !== user.uid);
                const unread  = m[`unread_${user.uid}`] || 0;
                const isMyTurn = m.lastMessageFrom && m.lastMessageFrom !== user.uid;
                return (
                  <div key={m.id} style={{ background:C.card, borderRadius:16, overflow:"hidden", border:`1px solid ${isMyTurn ? C.accent : C.border}`, position:"relative" }}>
                    {isMyTurn  && <div style={{ position:"absolute", top:8, right:8, background:C.accent, color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:700, zIndex:1 }}>Your Turn ↩</div>}
                    {unread > 0 && <div style={{ position:"absolute", top:8, left:8, background:C.red, color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, zIndex:1 }}>{unread}</div>}
                    <div style={{ height:90, background:`linear-gradient(135deg,${C.accent}30,${C.purple}10)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>💜</div>
                    <div style={{ padding:12 }}>
                      <div style={{ fontWeight:700, color:C.text, marginBottom:8, fontSize:14 }}>Match!</div>
                      {m.lastActivity && <div style={{ color:C.muted, fontSize:11, marginBottom:6 }}>{timeAgo(m.lastActivity)}</div>}
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
          <div style={{ width:230, borderRight:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
            <div style={{ padding:"14px 14px 8px", color:C.muted, fontSize:12, fontWeight:700, textTransform:"uppercase" }}>Conversations</div>
            {yourTurn > 0 && (
              <div style={{ margin:"0 10px 8px", background:C.accentDim, borderRadius:8, padding:"8px 10px", fontSize:11, color:C.accent, fontWeight:600 }}>
                💜 {yourTurn} conversation{yourTurn>1?"s":""} waiting for you
              </div>
            )}
            {matches.length === 0 && (
              <div style={{ padding:24, textAlign:"center", color:C.muted }}>
                <div style={{ fontSize:28, marginBottom:8 }}>💜</div>
                <p style={{ fontSize:12 }}>No matches yet. Keep swiping!</p>
              </div>
            )}
            {matches.map(m => {
              const otherId  = m.users.find(u => u !== user.uid);
              const isMyTurn = m.lastMessageFrom && m.lastMessageFrom !== user.uid;
              const unread   = m[`unread_${user.uid}`] || 0;
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
                    {m.lastActivity && <div style={{ color:C.muted, fontSize:10, marginTop:2 }}>{timeAgo(m.lastActivity)}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
            {chatWith ? (
              <>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>💜</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, color:C.text }}>{chatWith.name}</div>
                    {(() => {
                      const chatProfile = profiles.find(p => p.id === chatWith.userId);
                      return chatProfile?.lastActive ? <div style={{ color:C.muted, fontSize:11 }}>Active {timeAgo(chatProfile.lastActive)}</div> : null;
                    })()}
                  </div>
                  <button onClick={() => setReportTarget({ id:chatWith.userId, name:chatWith.name })}
                    style={{ background:"transparent", color:C.muted, border:"none", fontSize:12, cursor:"pointer", padding:"4px 8px" }}>🚩 Report</button>
                  <button onClick={() => setBlockConfirmTarget({ id:chatWith.userId, name:chatWith.name, fromChat:true })}
                    style={{ background:"transparent", color:C.red, border:`1px solid ${C.red}40`, borderRadius:8, fontSize:12, cursor:"pointer", padding:"4px 10px" }}>Block</button>
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
                        {m.createdAt && <div style={{ fontSize:10, color: m.from===user.uid ? "rgba(255,255,255,0.5)" : C.muted, marginTop:4, textAlign:"right" }}>{timeAgo(m.createdAt)}</div>}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
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
            <p style={{ color:C.muted }}>Cancel anytime. {IS_MOBILE_BUILD ? "Manage subscriptions in your app store." : "Secure Stripe checkout."}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:18, marginBottom:32 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background:C.card, borderRadius:22, padding:24, border:`2px solid ${plan.id && isPremium && userProfile?.plan===plan.id ? plan.color : C.border}`, position:"relative" }}>
                {plan.popular && <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:C.accent, color:"#fff", borderRadius:20, padding:"3px 14px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>MOST POPULAR</div>}
                <h2 style={{ color:plan.color, margin:"0 0 8px" }}>{plan.name}</h2>
                <div style={{ marginBottom:16 }}>
                  {plan.price === 0
                    ? <span style={{ fontSize:26, fontWeight:900, color:C.text }}>Free</span>
                    : <><span style={{ fontSize:26, fontWeight:900, color:C.text }}>${plan.price}</span><span style={{ color:C.muted }}>/mo</span></>}
                </div>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", gap:8, fontSize:13, marginBottom:8 }}>
                    <span style={{ color:plan.color }}>✓</span>
                    <span style={{ color:"#ccc" }}>{f}</span>
                  </div>
                ))}
                {plan.id && !IS_MOBILE_BUILD && (
                  <button onClick={() => window.open(STRIPE_LINKS[plan.id], "_blank")}
                    style={{ width:"100%", marginTop:14, background:plan.color, color: plan.id==="elite" ? "#000" : "#fff", border:"none", borderRadius:11, padding:"10px 0", cursor:"pointer", fontWeight:700, fontSize:14 }}>
                    {plan.cta}
                  </button>
                )}
                {plan.id && IS_MOBILE_BUILD && (
                  <div style={{ marginTop:14, background:"#ffffff0a", borderRadius:10, padding:"10px 12px", border:`1px solid ${C.border}` }}>
                    <p style={{ color:C.muted, fontSize:12, margin:"0 0 4px", fontWeight:600 }}>Subscriptions temporarily unavailable</p>
                    <p style={{ color:C.muted, fontSize:11, margin:0 }}>In-app purchases will be available in a future update via your device app store.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ background:C.card, borderRadius:18, padding:22, border:`1px solid ${C.border}`, marginBottom:16 }}>
            <h3 style={{ margin:"0 0 12px", color:C.text }}>Legal</h3>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["Privacy Policy","privacy"],["Terms of Service","terms"],["Cookie Policy","cookies"],["Safety Guide","safety"]].map(([label,id]) => (
                <button key={id} onClick={() => setLegal(id)}
                  style={{ background:"transparent", color:C.accent, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", fontSize:13 }}>{label}</button>
              ))}
            </div>
            <p style={{ color:C.muted, fontSize:12, marginTop:12, marginBottom:0 }}>GDPR · CCPA · COPPA Compliant. Payments secured by Stripe. © 2025 VyndLove Inc.</p>
          </div>
          <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted, fontSize:13 }}>Questions? </span>
            <button onClick={() => setShowContact(true)} style={{ background:"none", border:"none", color:C.accent, fontSize:13, cursor:"pointer", textDecoration:"underline" }}>Contact Support</button>
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
                : <div style={{ width:60, height:60, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.purple})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>💜</div>}
              <div>
                <div style={{ fontWeight:700, fontSize:17, color:C.text }}>
                  {userProfile?.name}
                  {userProfile?.verified && <span style={{ marginLeft:8, color:C.purple, fontSize:13 }}>✓ Verified</span>}
                </div>
                <div style={{ color:C.muted, fontSize:13 }}>{userProfile?.age} · {userProfile?.city}</div>
                <div style={{ color: isPremium ? C.elite : C.accent, fontSize:12, marginTop:3, fontWeight:600 }}>
                  {isPremium ? `⭐ ${userProfile?.plan?.toUpperCase()} Member` : "Free Plan"}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:16, fontSize:13, color:C.muted }}>
              <span>💜 {likesLeft} likes left today</span>
              <span>⭐ {priorityLeft} priority like{priorityLeft!=="∞"&&priorityLeft!==1?"s":""} left</span>
            </div>
          </div>

          {isPremium && (
            <div style={{ background:C.purpleDim, borderRadius:12, padding:16, border:`1px solid ${C.purple}`, marginBottom:12 }}>
              <p style={{ color:C.purple, margin:"0 0 10px", fontWeight:600 }}>⭐ Active {userProfile?.plan?.toUpperCase()} subscription</p>
              {userProfile?.cancelAtPeriodEnd
                ? <p style={{ color:C.muted, fontSize:13, margin:0 }}>✓ Cancellation scheduled — access until end of billing period.</p>
                : <button onClick={() => { setShowCancelModal(true); setCancelStatus(null); }} style={{ background:"transparent", color:C.red, border:`1px solid #ef444455`, borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>Cancel Subscription</button>}
            </div>
          )}

          {!isPremium && (
            <div style={{ background:C.accentDim, borderRadius:12, padding:16, border:`1px solid ${C.accent}`, marginBottom:12 }}>
              <p style={{ color:C.accent, margin:"0 0 10px", fontWeight:600 }}>Upgrade for unlimited likes 💜</p>
              <button onClick={() => setPage("Pricing")} style={{ background:C.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>View Plans</button>
            </div>
          )}

          {/* Legal links */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            {[["Privacy","privacy"],["Terms","terms"],["Safety","safety"]].map(([label,id]) => (
              <button key={id} onClick={() => setLegal(id)}
                style={{ background:"transparent", color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"7px 12px", cursor:"pointer", fontSize:13 }}>{label}</button>
            ))}
          </div>

          {/* Contact & Support */}
          <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:6, color:C.text }}>Help & Support</div>
            <p style={{ color:C.muted, fontSize:13, margin:"0 0 10px" }}>Questions, feedback, or issues? We're here to help.</p>
            <button onClick={() => setShowContact(true)}
              style={{ background:C.accentDim, color:C.accent, border:`1px solid ${C.accent}`, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
              Contact Support
            </button>
          </div>

          {/* Emergency resources */}
          <div style={{ background:C.card, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}`, marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:10, color:C.text }}>Emergency Resources</div>
            <div style={{ color:C.muted, fontSize:13, lineHeight:1.0 }}>
              {[
                ["Emergency (US)", "911"],
                ["RAINN – Sexual Assault Support", "1-800-656-4673"],
                ["Crisis Text Line", "Text HOME to 741741"],
                ["National DV Hotline", "1-800-799-7233"],
              ].map(([label, val]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ color:C.muted }}>{label}</span>
                  <span style={{ color:C.text, fontWeight:600, textAlign:"right" }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop:8, fontSize:12, color:C.muted }}>
                If you feel unsafe, please reach out. You are not alone.
              </div>
            </div>
          </div>

          {/* Delete Account (v4 Step 1) */}
          <div style={{ background:"#ef444408", borderRadius:12, padding:"14px 16px", border:`1px solid ${C.red}20`, marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:6, color:C.red }}>Danger Zone</div>
            <p style={{ color:C.muted, fontSize:13, margin:"0 0 10px" }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button onClick={() => { setShowDeleteAccount(true); setDeleteConfirmText(""); }}
              style={{ background:"transparent", color:C.red, border:`1px solid ${C.red}`, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontWeight:700, fontSize:13 }}>
              Delete Account
            </button>
          </div>

          <button onClick={() => signOut(auth)}
            style={{ width:"100%", background:"transparent", color:C.red, border:`1px solid #ef444440`, borderRadius:12, padding:"12px 0", cursor:"pointer", fontWeight:700 }}>
            Log Out
          </button>
        </div>
      )}

      <div style={{ textAlign:"center", padding:20, color:C.muted, fontSize:12, borderTop:`1px solid ${C.border}`, marginTop:40 }}>
        VyndLove Inc. · New York, NY · © 2025 All rights reserved · GDPR · CCPA · COPPA
        <br />
        <button onClick={() => setShowContact(true)} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", marginTop:6, textDecoration:"underline" }}>
          Contact Support
        </button>
        {" · "}
        <button onClick={() => setLegal("privacy")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>Privacy</button>
        {" · "}
        <button onClick={() => setLegal("terms")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", textDecoration:"underline" }}>Terms</button>
      </div>
    </div>
  );
}
