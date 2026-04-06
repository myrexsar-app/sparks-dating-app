// ============================================================
//  VyndLove — Hinge-Style Dating App v6.0
//  Stack: React + Firebase (Auth, Firestore) + Stripe
//  Encoding: UTF-8 throughout — no Latin-1 artifacts
// ============================================================
//
//  FEATURES:
//  1. Rich Profile System (6 photos, prompts, preferences)
//  2. Hinge-style Discovery Feed (vertical scroll, like photo/prompt)
//  3. Likes & Matching (Likes You, mutual match, blurred for free)
//  4. Roses (Super Likes) — 1/week free, more for premium
//  5. Chat/Messaging (text, voice notes, GIFs, We Met)
//  6. Filters & Preferences (deal-breakers, distance, active today)
//  7. Standouts Section (popular profiles, requires Rose)
//  8. Most Compatible (daily recommendation)
//  9. Premium VyndLove+ (unlimited likes, see likes, roses, boosts)
//  10. Notifications (likes, matches, messages)
//  11. Dark Mode + Hebrew/English (RTL) support
//  12. Report/Block, Delete Account, Terms, Privacy, Safety
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, deleteUser,
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query,
  where, getDocs, onSnapshot, orderBy, serverTimestamp, updateDoc,
  increment, deleteDoc, limit, Timestamp,
} from "firebase/firestore";

/* ─── Firebase Config ─── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjosalMYChylncn-zHP4IALjlcFmT38aw",
  authDomain: "vyndlove.firebaseapp.com",
  projectId: "vyndlove",
  storageBucket: "vyndlove.firebasestorage.app",
  messagingSenderId: "553756339175",
  appId: "1:553756339175:web:a821e41332e5232b70ab42",
  measurementId: "G-VNL8HY170G",
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

/* ─── Constants ─── */
const IS_MOBILE_BUILD = false;
const SUPPORT_EMAIL = "support@vyndlove.com";
const MAX_FREE_LIKES_DAY = 8;
const MAX_ROSES_FREE_WEEK = 1;
const MAX_ROSES_PREMIUM_WEEK = 5;
const MIN_PHOTOS = 1;
const MAX_PHOTOS = 6;

const STRIPE_LINKS = {
  weekly: "https://buy.stripe.com/test_weekly",
  monthly: "https://buy.stripe.com/test_monthly",
  yearly: "https://buy.stripe.com/test_yearly",
};

/* ─── Prompt Options ─── */
const PROMPT_OPTIONS = [
  "The way to win me over is...",
  "I'm looking for...",
  "A life goal of mine is...",
  "My most irrational fear is...",
  "I geek out on...",
  "My simple pleasures are...",
  "Dating me is like...",
  "A shower thought I had recently...",
  "Two truths and a lie...",
  "The key to my heart is...",
  "My love language is...",
  "The most spontaneous thing I've done is...",
  "I'm convinced that...",
  "Typical Sunday for me is...",
  "Green flags I look for...",
  "I want someone who...",
  "My greatest strength is...",
  "I go crazy for...",
  "One thing I'll never do again...",
  "Best travel story...",
];

/* ─── Interests ─── */
const INTERESTS = [
  "Travel", "Music", "Cooking", "Fitness", "Photography", "Art",
  "Movies", "Reading", "Hiking", "Gaming", "Dancing", "Yoga",
  "Coffee", "Wine", "Dogs", "Cats", "Beach", "Mountains",
  "Tech", "Fashion", "Sports", "Meditation", "Writing", "Comedy",
  "Gardening", "Volunteering", "Languages", "Astronomy", "Theater",
  "Board Games", "Podcasts", "Brunch", "Karaoke", "Cycling",
];

/* ─── i18n ─── */
const LANG = {
  en: {
    appName: "VyndLove",
    tagline: "Designed to be deleted",
    welcome: "Welcome to VyndLove",
    ageGate: "You must be 18 or older to use this app.",
    iAm18: "I am 18+ (confirmed)",
    under18: "Under 18",
    login: "Log In",
    signup: "Sign Up",
    email: "Email",
    password: "Password",
    discover: "Discover",
    likes: "Likes",
    matches: "Matches",
    chat: "Chat",
    profile: "Profile",
    settings: "Settings",
    editProfile: "Edit Profile",
    name: "Name",
    age: "Age",
    city: "City",
    bio: "About me",
    gender: "Gender",
    lookingFor: "Looking for",
    height: "Height",
    education: "Education",
    jobTitle: "Job title",
    company: "Company",
    religion: "Religion",
    kids: "Kids",
    drinking: "Drinking",
    smoking: "Smoking",
    photos: "Photos",
    prompts: "Prompts",
    save: "Save",
    cancel: "Cancel",
    skip: "Skip",
    like: "Like",
    rose: "Rose",
    comment: "Add a comment...",
    send: "Send",
    match: "It's a Match!",
    matchDesc: "You and {name} liked each other",
    startChat: "Say something nice...",
    sendMessage: "Send",
    likesYou: "Likes You",
    standouts: "Standouts",
    mostCompatible: "Most Compatible",
    premium: "VyndLove+",
    boost: "Boost",
    filters: "Filters",
    ageRange: "Age range",
    distance: "Distance",
    activeToday: "Active today",
    dealbreakers: "Deal-breakers",
    report: "Report",
    block: "Block",
    deleteAccount: "Delete Account",
    logout: "Log Out",
    darkMode: "Dark Mode",
    language: "Language",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    safety: "Safety Guide",
    weMet: "We Met",
    weMetQ: "Did you meet {name} in person?",
    yes: "Yes",
    no: "No",
    noMoreProfiles: "No more profiles to show",
    noLikes: "No one has liked you yet",
    noMatches: "No matches yet",
    noMessages: "Start a conversation!",
    typeDELETE: 'Type DELETE to confirm',
    rosesSent: "Rose sent!",
    likesSent: "Like sent!",
    upgradeToSee: "Upgrade to see who likes you",
    freeRoses: "1 free Rose/week",
    premiumRoses: "5 Roses/week",
    unlimitedLikes: "Unlimited likes",
    seeWhoLikes: "See who likes you",
    readReceipts: "Read receipts",
    advancedFilters: "Advanced filters",
    boostDesc: "Be seen by more people for 30 min",
    man: "Man",
    woman: "Woman",
    nonBinary: "Non-binary",
    everyone: "Everyone",
    men: "Men",
    women: "Women",
    notifications: "Notifications",
    emergency: "Emergency Resources",
    support: "Contact Support",
  },
  he: {
    appName: "VyndLove",
    tagline: "\u05E2\u05D5\u05E6\u05D1 \u05DC\u05D4\u05D9\u05DE\u05D7\u05E7",
    welcome: "\u05D1\u05E8\u05D5\u05DB\u05D9\u05DD \u05D4\u05D1\u05D0\u05D9\u05DD \u05DC-VyndLove",
    ageGate: "\u05E2\u05DC\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05DF/\u05D1\u05EA 18 \u05DC\u05E4\u05D7\u05D5\u05EA \u05DB\u05D3\u05D9 \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4.",
    iAm18: "\u05D0\u05E0\u05D9 \u05D1\u05DF/\u05D1\u05EA 18+ (\u05DE\u05D0\u05D5\u05E9\u05E8)",
    under18: "\u05DE\u05EA\u05D7\u05EA \u05DC-18",
    login: "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA",
    signup: "\u05D4\u05E8\u05E9\u05DE\u05D4",
    email: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
    password: "\u05E1\u05D9\u05E1\u05DE\u05D4",
    discover: "\u05D2\u05DC\u05D4",
    likes: "\u05DC\u05D9\u05D9\u05E7\u05D9\u05DD",
    matches: "\u05D4\u05EA\u05D0\u05DE\u05D5\u05EA",
    chat: "\u05E6\u05F3\u05D0\u05D8",
    profile: "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC",
    settings: "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA",
    editProfile: "\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC",
    name: "\u05E9\u05DD",
    age: "\u05D2\u05D9\u05DC",
    city: "\u05E2\u05D9\u05E8",
    bio: "\u05E7\u05E6\u05EA \u05E2\u05DC\u05D9",
    gender: "\u05DE\u05D2\u05D3\u05E8",
    lookingFor: "\u05DE\u05D7\u05E4\u05E9/\u05EA",
    height: "\u05D2\u05D5\u05D1\u05D4",
    education: "\u05D4\u05E9\u05DB\u05DC\u05D4",
    jobTitle: "\u05EA\u05E4\u05E7\u05D9\u05D3",
    company: "\u05D7\u05D1\u05E8\u05D4",
    religion: "\u05D3\u05EA",
    kids: "\u05D9\u05DC\u05D3\u05D9\u05DD",
    drinking: "\u05E9\u05EA\u05D9\u05D9\u05D4",
    smoking: "\u05E2\u05D9\u05E9\u05D5\u05DF",
    photos: "\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA",
    prompts: "\u05E9\u05D0\u05DC\u05D5\u05EA",
    save: "\u05E9\u05DE\u05D5\u05E8",
    cancel: "\u05D1\u05D9\u05D8\u05D5\u05DC",
    skip: "\u05D3\u05DC\u05D2",
    like: "\u05DC\u05D9\u05D9\u05E7",
    rose: "\u05D5\u05E8\u05D3",
    comment: "\u05D4\u05D5\u05E1\u05E3 \u05EA\u05D2\u05D5\u05D1\u05D4...",
    send: "\u05E9\u05DC\u05D7",
    match: "\u05D9\u05E9 \u05D4\u05EA\u05D0\u05DE\u05D4!",
    matchDesc: "\u05D0\u05EA\u05D4 \u05D5-{name} \u05E2\u05E9\u05D9\u05EA\u05DD \u05DC\u05D9\u05D9\u05E7 \u05D0\u05D7\u05D3 \u05DC\u05E9\u05E0\u05D9",
    startChat: "\u05EA\u05D2\u05D9\u05D3 \u05DE\u05E9\u05D4\u05D5 \u05E0\u05D7\u05DE\u05D3...",
    sendMessage: "\u05E9\u05DC\u05D7",
    likesYou: "\u05E2\u05E9\u05D5 \u05DC\u05DA \u05DC\u05D9\u05D9\u05E7",
    standouts: "\u05D1\u05D5\u05DC\u05D8\u05D9\u05DD",
    mostCompatible: "\u05D4\u05DB\u05D9 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D9\u05DD",
    premium: "VyndLove+",
    boost: "\u05D1\u05D5\u05E1\u05D8",
    filters: "\u05E1\u05D9\u05E0\u05D5\u05DF",
    ageRange: "\u05D8\u05D5\u05D5\u05D7 \u05D2\u05D9\u05DC\u05D0\u05D9\u05DD",
    distance: "\u05DE\u05E8\u05D7\u05E7",
    activeToday: "\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u05D4\u05D9\u05D5\u05DD",
    dealbreakers: "\u05E7\u05D5 \u05D0\u05D3\u05D5\u05DD",
    report: "\u05D3\u05D9\u05D5\u05D5\u05D7",
    block: "\u05D7\u05E1\u05D9\u05DE\u05D4",
    deleteAccount: "\u05DE\u05D7\u05D9\u05E7\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF",
    logout: "\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA",
    darkMode: "\u05DE\u05E6\u05D1 \u05D7\u05E9\u05D5\u05DA",
    language: "\u05E9\u05E4\u05D4",
    terms: "\u05EA\u05E0\u05D0\u05D9 \u05E9\u05D9\u05DE\u05D5\u05E9",
    privacy: "\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D5\u05EA",
    safety: "\u05DE\u05D3\u05E8\u05D9\u05DA \u05D1\u05D8\u05D9\u05D7\u05D5\u05EA",
    weMet: "\u05E0\u05E4\u05D2\u05E9\u05E0\u05D5",
    weMetQ: "\u05E0\u05E4\u05D2\u05E9\u05EA \u05E2\u05DD {name} \u05D1\u05D0\u05DE\u05EA?",
    yes: "\u05DB\u05DF",
    no: "\u05DC\u05D0",
    noMoreProfiles: "\u05D0\u05D9\u05DF \u05E2\u05D5\u05D3 \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC\u05D9\u05DD \u05DC\u05D4\u05E6\u05D9\u05D2",
    noLikes: "\u05D0\u05E3 \u05D0\u05D7\u05D3 \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E2\u05E9\u05D4 \u05DC\u05DA \u05DC\u05D9\u05D9\u05E7",
    noMatches: "\u05D0\u05D9\u05DF \u05D4\u05EA\u05D0\u05DE\u05D5\u05EA \u05E2\u05D3\u05D9\u05D9\u05DF",
    noMessages: "\u05D4\u05EA\u05D7\u05DC \u05E9\u05D9\u05D7\u05D4!",
    typeDELETE: '\u05D4\u05E7\u05DC\u05D3 DELETE \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8',
    rosesSent: "\u05D4\u05D5\u05E8\u05D3 \u05E0\u05E9\u05DC\u05D7!",
    likesSent: "\u05DC\u05D9\u05D9\u05E7 \u05E0\u05E9\u05DC\u05D7!",
    upgradeToSee: "\u05E9\u05D3\u05E8\u05D2 \u05DC-VyndLove+ \u05DC\u05E8\u05D0\u05D5\u05EA \u05DE\u05D9 \u05E2\u05E9\u05D4 \u05DC\u05DA \u05DC\u05D9\u05D9\u05E7",
    freeRoses: "\u05D5\u05E8\u05D3 \u05D0\u05D7\u05D3 \u05D7\u05D9\u05E0\u05DE\u05D9 \u05D1\u05E9\u05D1\u05D5\u05E2",
    premiumRoses: "5 \u05D5\u05E8\u05D3\u05D9\u05DD \u05D1\u05E9\u05D1\u05D5\u05E2",
    unlimitedLikes: "\u05DC\u05D9\u05D9\u05E7\u05D9\u05DD \u05DC\u05DC\u05D0 \u05D4\u05D2\u05D1\u05DC\u05D4",
    seeWhoLikes: "\u05E8\u05D0\u05D4 \u05DE\u05D9 \u05E2\u05E9\u05D4 \u05DC\u05DA \u05DC\u05D9\u05D9\u05E7",
    readReceipts: "\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9 \u05E7\u05E8\u05D9\u05D0\u05D4",
    advancedFilters: "\u05E1\u05D9\u05E0\u05D5\u05DF \u05DE\u05EA\u05E7\u05D3\u05DD",
    boostDesc: "\u05D4\u05D9\u05E8\u05D0\u05D4 \u05DC\u05D9\u05D5\u05EA\u05E8 \u05D0\u05E0\u05E9\u05D9\u05DD \u05DC-30 \u05D3\u05E7\u05D5\u05EA",
    man: "\u05D2\u05D1\u05E8",
    woman: "\u05D0\u05D9\u05E9\u05D4",
    nonBinary: "\u05E0\u05D5\u05DF-\u05D1\u05D9\u05E0\u05D0\u05E8\u05D9",
    everyone: "\u05DB\u05D5\u05DC\u05DD",
    men: "\u05D2\u05D1\u05E8\u05D9\u05DD",
    women: "\u05E0\u05E9\u05D9\u05DD",
    notifications: "\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA",
    emergency: "\u05DE\u05E9\u05D0\u05D1\u05D9 \u05D7\u05D9\u05E8\u05D5\u05DD",
    support: "\u05E4\u05E0\u05D9\u05D9\u05D4 \u05DC\u05EA\u05DE\u05D9\u05DB\u05D4",
  },
};

/* ─── Plans ─── */
const PLANS = [
  { id: "weekly", label: "1 Week", price: "$9.99", pricePer: "$9.99/wk" },
  { id: "monthly", label: "1 Month", price: "$19.99", pricePer: "$4.99/wk", popular: true },
  { id: "yearly", label: "1 Year", price: "$99.99", pricePer: "$1.92/wk", best: true },
];

/* ─── Profanity filter ─── */
const PROFANITY = /\b(fuck|shit|ass|bitch|dick|pussy|cock|cunt|nigger|faggot|retard)\b/i;

/* ─── Styles ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  --bg: #0a0a0c;
  --bg-card: #141418;
  --bg-elevated: #1c1c22;
  --bg-input: #222228;
  --text: #f5f5f7;
  --text-secondary: #8e8e93;
  --text-muted: #636366;
  --accent: #e8455a;
  --accent-gradient: linear-gradient(135deg, #e8455a 0%, #f77062 50%, #fe8c4c 100%);
  --rose-color: #c850c0;
  --rose-gradient: linear-gradient(135deg, #9b59b6 0%, #c850c0 50%, #e040a0 100%);
  --match-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success: #34c759;
  --warning: #ff9f0a;
  --danger: #ff453a;
  --border: rgba(255,255,255,0.08);
  --shadow: 0 2px 20px rgba(0,0,0,0.4);
  --radius: 16px;
  --radius-sm: 10px;
  --radius-full: 9999px;
  --nav-height: 64px;
  --header-height: 56px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

[data-theme="light"] {
  --bg: #f2f2f7;
  --bg-card: #ffffff;
  --bg-elevated: #f8f8fa;
  --bg-input: #e8e8ed;
  --text: #1c1c1e;
  --text-secondary: #636366;
  --text-muted: #aeaeb2;
  --border: rgba(0,0,0,0.08);
  --shadow: 0 2px 20px rgba(0,0,0,0.08);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 16px; -webkit-text-size-adjust: 100%; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

[dir="rtl"] { text-align: right; }

#root {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  background: var(--bg);
}

/* ─── Animations ─── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes heartBeat {
  0% { transform: scale(1); }
  15% { transform: scale(1.3); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
  60% { transform: scale(1); }
}
@keyframes roseFloat {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-120px) rotate(20deg); opacity: 0; }
}
@keyframes matchReveal {
  0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
  60% { transform: scale(1.1) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

.fade-in { animation: fadeIn 0.4s ease-out; }
.slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.scale-in { animation: scaleIn 0.3s ease-out; }

/* ─── Buttons ─── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 28px; border-radius: var(--radius-full);
  font-size: 15px; font-weight: 600; cursor: pointer;
  border: none; transition: all 0.2s ease;
  font-family: inherit;
}
.btn:active { transform: scale(0.96); }
.btn-primary {
  background: var(--accent-gradient); color: #fff;
  box-shadow: 0 4px 16px rgba(232,69,90,0.3);
}
.btn-primary:hover { box-shadow: 0 6px 24px rgba(232,69,90,0.4); }
.btn-secondary {
  background: var(--bg-elevated); color: var(--text);
  border: 1px solid var(--border);
}
.btn-rose {
  background: var(--rose-gradient); color: #fff;
  box-shadow: 0 4px 16px rgba(200,80,192,0.3);
}
.btn-ghost {
  background: transparent; color: var(--text-secondary);
  padding: 10px 16px;
}
.btn-danger { background: var(--danger); color: #fff; }
.btn-small { padding: 8px 16px; font-size: 13px; }
.btn-icon {
  width: 48px; height: 48px; padding: 0;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.btn-icon-sm { width: 36px; height: 36px; }

/* ─── Header ─── */
.header {
  position: sticky; top: 0; z-index: 100;
  height: var(--header-height);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.header-title {
  font-size: 20px; font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.header-logo {
  font-size: 24px; font-weight: 800; letter-spacing: -0.5px;
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ─── Bottom Nav ─── */
.bottom-nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px; z-index: 100;
  height: calc(var(--nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  display: flex; align-items: center; justify-content: space-around;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 12px; cursor: pointer; position: relative;
  color: var(--text-muted); transition: color 0.2s;
  background: none; border: none; font-family: inherit;
}
.nav-item.active { color: var(--accent); }
.nav-item svg { width: 24px; height: 24px; }
.nav-label { font-size: 10px; font-weight: 500; }
.nav-badge {
  position: absolute; top: 4px; right: 8px;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--accent); color: #fff;
  border-radius: 9px; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

/* ─── Screens ─── */
.screen {
  padding-bottom: calc(var(--nav-height) + var(--safe-bottom) + 16px);
  min-height: 100vh; min-height: 100dvh;
}
.screen-scroll {
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}

/* ─── Profile Card (Discovery) ─── */
.profile-card {
  margin: 8px; border-radius: var(--radius);
  background: var(--bg-card); overflow: hidden;
  box-shadow: var(--shadow);
  animation: fadeIn 0.4s ease-out;
}
.profile-card-photo {
  position: relative; width: 100%; aspect-ratio: 3/4;
  overflow: hidden; background: var(--bg-elevated);
}
.profile-card-photo img {
  width: 100%; height: 100%; object-fit: cover;
}
.profile-card-photo-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 60px 16px 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
}
.profile-card-name {
  font-size: 26px; font-weight: 700; color: #fff;
}
.profile-card-info {
  font-size: 14px; color: rgba(255,255,255,0.8);
  display: flex; align-items: center; gap: 8px; margin-top: 4px;
}
.profile-card-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--radius-full);
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  font-size: 12px; color: #fff; font-weight: 500;
}

/* ─── Prompt Card ─── */
.prompt-card {
  margin: 0 8px; padding: 20px;
  background: var(--bg-card); border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.prompt-card-question {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.prompt-card-answer {
  font-size: 18px; font-weight: 500; line-height: 1.4;
}

/* ─── Action Bar (Like/Skip/Rose) ─── */
.action-bar {
  display: flex; align-items: center; justify-content: center; gap: 20px;
  padding: 16px 8px;
}
.action-btn {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: none; transition: all 0.2s;
  font-size: 24px;
}
.action-btn:active { transform: scale(0.9); }
.action-btn-skip {
  background: var(--bg-elevated); border: 2px solid var(--text-muted);
  color: var(--text-muted);
}
.action-btn-like {
  background: var(--accent-gradient); color: #fff;
  width: 64px; height: 64px; font-size: 28px;
  box-shadow: 0 4px 20px rgba(232,69,90,0.4);
}
.action-btn-rose {
  background: var(--rose-gradient); color: #fff;
  box-shadow: 0 4px 16px rgba(200,80,192,0.3);
}
.action-btn-comment {
  background: var(--bg-elevated); border: 2px solid var(--accent);
  color: var(--accent);
}

/* ─── Comment Overlay ─── */
.comment-overlay {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 430px; z-index: 200;
  padding: 16px; padding-bottom: calc(16px + var(--safe-bottom));
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  border-radius: var(--radius) var(--radius) 0 0;
  animation: slideUp 0.3s ease-out;
}
.comment-input-row {
  display: flex; gap: 8px; align-items: flex-end;
}
.comment-input {
  flex: 1; padding: 12px 16px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius-full); color: var(--text);
  font-size: 15px; font-family: inherit; resize: none;
  outline: none; min-height: 44px; max-height: 100px;
}
.comment-input:focus { border-color: var(--accent); }

/* ─── Likes You Grid ─── */
.likes-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 8px; padding: 8px;
}
.likes-card {
  position: relative; border-radius: var(--radius);
  overflow: hidden; aspect-ratio: 3/4;
  background: var(--bg-elevated);
}
.likes-card img {
  width: 100%; height: 100%; object-fit: cover;
}
.likes-card-blurred img {
  filter: blur(20px); transform: scale(1.1);
}
.likes-card-info {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 40px 10px 10px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
}
.likes-card-name {
  font-size: 16px; font-weight: 600; color: #fff;
}
.likes-card-prompt {
  font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 2px;
}
.likes-card-rose {
  position: absolute; top: 10px; right: 10px;
  font-size: 20px;
}
.likes-card-upgrade {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);
  color: #fff; gap: 8px; cursor: pointer;
}

/* ─── Match Modal ─── */
.match-modal-overlay {
  position: fixed; inset: 0; z-index: 300;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(20px);
}
.match-modal {
  text-align: center; padding: 32px;
  animation: matchReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.match-modal-photos {
  display: flex; justify-content: center; gap: -20px; margin-bottom: 24px;
}
.match-modal-photo {
  width: 120px; height: 120px; border-radius: 50%;
  border: 4px solid var(--accent); object-fit: cover;
  box-shadow: 0 8px 32px rgba(232,69,90,0.3);
}
.match-modal-photo:last-child { margin-left: -20px; }
.match-modal-title {
  font-size: 32px; font-weight: 800;
  background: var(--accent-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 8px;
}
.match-modal-desc {
  font-size: 16px; color: var(--text-secondary); margin-bottom: 32px;
}

/* ─── Chat ─── */
.chat-list { padding: 8px; }
.chat-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: var(--radius-sm);
  cursor: pointer; transition: background 0.15s;
}
.chat-item:hover { background: var(--bg-elevated); }
.chat-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  object-fit: cover; flex-shrink: 0;
}
.chat-info { flex: 1; min-width: 0; }
.chat-name { font-size: 16px; font-weight: 600; }
.chat-preview {
  font-size: 14px; color: var(--text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.chat-meta { text-align: right; flex-shrink: 0; }
.chat-time { font-size: 12px; color: var(--text-muted); }
.chat-unread {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); margin: 4px 0 0 auto;
}

/* ─── Messages ─── */
.messages-container {
  flex: 1; overflow-y: auto; padding: 16px 8px;
  display: flex; flex-direction: column; gap: 4px;
}
.message-row { display: flex; max-width: 80%; }
.message-row.sent { align-self: flex-end; }
.message-row.received { align-self: flex-start; }
.message-bubble {
  padding: 10px 14px; border-radius: 18px;
  font-size: 15px; line-height: 1.4; word-wrap: break-word;
}
.message-row.sent .message-bubble {
  background: var(--accent-gradient); color: #fff;
  border-bottom-right-radius: 4px;
}
.message-row.received .message-bubble {
  background: var(--bg-elevated); color: var(--text);
  border-bottom-left-radius: 4px;
}
.message-time {
  font-size: 11px; color: var(--text-muted);
  margin-top: 2px; padding: 0 4px;
}
.message-read { font-size: 11px; color: var(--accent); }

.message-input-bar {
  display: flex; gap: 8px; align-items: flex-end;
  padding: 8px 12px; padding-bottom: calc(8px + var(--safe-bottom));
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}
.message-input {
  flex: 1; padding: 10px 16px;
  background: var(--bg-input); border: none;
  border-radius: var(--radius-full); color: var(--text);
  font-size: 15px; font-family: inherit;
  outline: none; resize: none; min-height: 40px; max-height: 100px;
}
.message-send-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--accent-gradient); color: #fff;
  border: none; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: opacity 0.2s; flex-shrink: 0;
}
.message-send-btn:disabled { opacity: 0.4; }

/* ─── Profile View ─── */
.profile-section {
  padding: 16px; border-bottom: 1px solid var(--border);
}
.profile-section-title {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 12px;
}
.profile-photo-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.profile-photo-slot {
  aspect-ratio: 3/4; border-radius: var(--radius-sm);
  overflow: hidden; background: var(--bg-elevated);
  position: relative; cursor: pointer;
  border: 2px dashed var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 28px;
}
.profile-photo-slot img {
  width: 100%; height: 100%; object-fit: cover;
}
.profile-photo-slot.has-photo { border: none; }

/* ─── Settings ─── */
.settings-group {
  margin: 8px 0; background: var(--bg-card);
  border-radius: var(--radius); overflow: hidden;
}
.settings-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; cursor: pointer;
  border-bottom: 1px solid var(--border);
  background: none; border-left: none; border-right: none; border-top: none;
  width: 100%; font-family: inherit; font-size: 15px;
  color: var(--text); text-align: start;
}
.settings-item:last-child { border-bottom: none; }
.settings-item-label { display: flex; align-items: center; gap: 12px; }
.settings-item-value { color: var(--text-secondary); font-size: 14px; }

/* ─── Toggle ─── */
.toggle {
  width: 52px; height: 32px; border-radius: 16px;
  background: var(--bg-input); position: relative;
  cursor: pointer; transition: background 0.2s;
  border: none;
}
.toggle.active { background: var(--accent); }
.toggle-knob {
  width: 28px; height: 28px; border-radius: 50%;
  background: #fff; position: absolute; top: 2px; left: 2px;
  transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.toggle.active .toggle-knob { transform: translateX(20px); }

/* ─── Range Slider ─── */
.range-slider {
  -webkit-appearance: none; width: 100%; height: 4px;
  border-radius: 2px; background: var(--bg-input);
  outline: none;
}
.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 24px; height: 24px;
  border-radius: 50%; background: var(--accent);
  cursor: pointer; box-shadow: 0 2px 8px rgba(232,69,90,0.3);
}

/* ─── Modal ─── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 250;
  display: flex; align-items: flex-end; justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
}
.modal-content {
  width: 100%; max-width: 430px; max-height: 85vh;
  background: var(--bg-card); border-radius: var(--radius) var(--radius) 0 0;
  overflow-y: auto; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--bg-card); z-index: 10;
}
.modal-title { font-size: 18px; font-weight: 700; }
.modal-body { padding: 16px; }

/* ─── Input ─── */
.input-group { margin-bottom: 16px; }
.input-label {
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  margin-bottom: 6px; display: block;
}
.input-field {
  width: 100%; padding: 12px 16px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text);
  font-size: 15px; font-family: inherit; outline: none;
}
.input-field:focus { border-color: var(--accent); }
.input-field::placeholder { color: var(--text-muted); }
select.input-field { cursor: pointer; }
textarea.input-field { resize: vertical; min-height: 80px; }

/* ─── Tags ─── */
.tag-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.tag {
  padding: 8px 14px; border-radius: var(--radius-full);
  font-size: 13px; font-weight: 500; cursor: pointer;
  border: 1px solid var(--border); background: var(--bg-input);
  color: var(--text-secondary); transition: all 0.2s;
}
.tag.selected {
  background: var(--accent); color: #fff; border-color: var(--accent);
}

/* ─── Standouts ─── */
.standout-card {
  position: relative; border-radius: var(--radius);
  overflow: hidden; margin: 8px;
}
.standout-badge {
  position: absolute; top: 12px; left: 12px; z-index: 10;
  padding: 6px 12px; border-radius: var(--radius-full);
  background: var(--rose-gradient); color: #fff;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; gap: 4px;
}

/* ─── Most Compatible ─── */
.compatible-card {
  margin: 8px; padding: 20px; border-radius: var(--radius);
  background: var(--match-gradient); color: #fff;
  position: relative; overflow: hidden;
}
.compatible-stars {
  position: absolute; top: -20px; right: -20px;
  font-size: 100px; opacity: 0.1;
}
.compatible-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; opacity: 0.8; margin-bottom: 12px;
}

/* ─── Premium Banner ─── */
.premium-banner {
  margin: 8px; padding: 20px; border-radius: var(--radius);
  background: var(--accent-gradient); color: #fff;
  text-align: center; cursor: pointer;
  transition: transform 0.2s;
}
.premium-banner:hover { transform: scale(1.02); }
.premium-banner h3 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.premium-banner p { font-size: 14px; opacity: 0.9; }

/* ─── Toast/Notification ─── */
.toast {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  max-width: 380px; width: calc(100% - 32px); z-index: 400;
  padding: 14px 20px; border-radius: var(--radius-sm);
  background: var(--bg-elevated); color: var(--text);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  display: flex; align-items: center; gap: 12px;
  animation: slideDown 0.3s ease-out;
  border-left: 4px solid var(--accent);
}
.toast-icon { font-size: 24px; flex-shrink: 0; }
.toast-content { flex: 1; }
.toast-title { font-size: 14px; font-weight: 600; }
.toast-desc { font-size: 13px; color: var(--text-secondary); }

/* ─── Empty State ─── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 60px 32px; text-align: center;
}
.empty-state-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-state-title {
  font-size: 20px; font-weight: 700; margin-bottom: 8px;
}
.empty-state-desc {
  font-size: 15px; color: var(--text-secondary); line-height: 1.5;
}

/* ─── Chips / Pill selector ─── */
.chip-row {
  display: flex; gap: 8px; overflow-x: auto; padding: 0 8px;
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.chip-row::-webkit-scrollbar { display: none; }
.chip {
  padding: 8px 16px; border-radius: var(--radius-full);
  font-size: 14px; font-weight: 500; white-space: nowrap;
  cursor: pointer; border: 1px solid var(--border);
  background: var(--bg-card); color: var(--text-secondary);
  transition: all 0.2s;
}
.chip.active {
  background: var(--accent); color: #fff; border-color: var(--accent);
}

/* ─── We Met Button ─── */
.we-met-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: var(--radius-full);
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text-secondary); font-size: 14px; font-weight: 500;
  cursor: pointer; margin: 8px auto; transition: all 0.2s;
}
.we-met-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ─── Scrollbar ─── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 2px; }

/* ─── Loading shimmer ─── */
.skeleton {
  background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-input) 50%, var(--bg-elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
`;

/* ─── SVG Icons (inline) ─── */
const Icon = ({ name, size = 24, color = "currentColor" }) => {
  const icons = {
    heart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    heartFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    chat: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    starFill: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    more: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
    camera: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    bolt: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    rose: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M12 3c-1 2-3 3-3 6 0 2 1.5 3.5 3 3.5s3-1.5 3-3.5c0-3-2-4-3-6z" fill={color} opacity="0.3"/><path d="M12 12.5c-2 0-5 2-5 5.5 0 2 2 3 5 3s5-1 5-3c0-3.5-3-5.5-5-5.5z" fill={color} opacity="0.5"/><line x1="12" y1="12" x2="12" y2="21" stroke={color} strokeWidth="1.5"/></svg>,
    compass: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    crown: <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M2 20h20l-2-12-4 4-4-8-4 8-4-4-2 12z"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    globe: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    flag: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    info: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    image: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  };
  return icons[name] || null;
};

/* ─── Helper: Generate placeholder avatar ─── */
const placeholderPhoto = (name = "?", idx = 0) => {
  const colors = ["#e8455a", "#f77062", "#fe8c4c", "#667eea", "#764ba2", "#c850c0", "#34c759", "#ff9f0a"];
  const c = colors[(name.charCodeAt(0) + idx) % colors.length];
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533" viewBox="0 0 400 533"><rect fill="${c}" width="400" height="533"/><text x="200" y="280" text-anchor="middle" font-family="Inter,sans-serif" font-size="120" fill="white">${name[0]?.toUpperCase() || "?"}</text></svg>`)}`;
};

/* ─── Helper: time ago ─── */
const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

/* ─── Helper: chat ID ─── */
const chatId = (a, b) => [a, b].sort().join("_");

/* ═══════════════════════════════════════════════
   MAIN APP COMPONENT
   ═══════════════════════════════════════════════ */

export default function App() {
  /* ─── Core state ─── */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lang, setLang] = useState("en");
  const [darkMode, setDarkMode] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  /* ─── Navigation ─── */
  const [screen, setScreen] = useState("discover"); // discover, likes, matches, profile
  const [subScreen, setSubScreen] = useState(null); // editProfile, settings, chatView, premium, filters, standouts, notifications

  /* ─── Discovery ─── */
  const [profiles, setProfiles] = useState([]);
  const [profileIdx, setProfileIdx] = useState(0);
  const [commentMode, setCommentMode] = useState(null); // { type: 'photo'|'prompt', index, profileId }
  const [commentText, setCommentText] = useState("");

  /* ─── Likes ─── */
  const [incomingLikes, setIncomingLikes] = useState([]);
  const [sentLikes, setSentLikes] = useState([]);

  /* ─── Matches & Chat ─── */
  const [matchesList, setMatchesList] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");

  /* ─── Match modal ─── */
  const [matchModal, setMatchModal] = useState(null);

  /* ─── Toast ─── */
  const [toast, setToast] = useState(null);

  /* ─── Modals ─── */
  const [showReportModal, setShowReportModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showWeMet, setShowWeMet] = useState(null);

  /* ─── Filters ─── */
  const [filters, setFilters] = useState({
    ageMin: 18, ageMax: 45,
    distance: 50,
    gender: "everyone",
    activeToday: false,
  });

  /* ─── Notifications ─── */
  const [notifications, setNotifications] = useState([]);
  const [unreadLikes, setUnreadLikes] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  /* ─── Refs ─── */
  const messagesEndRef = useRef(null);
  const toastTimerRef = useRef(null);

  const t = LANG[lang] || LANG.en;
  const isRTL = lang === "he";
  const isPremium = profile?.premium || false;

  /* ─── Auth listener ─── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setProfile(snap.data());
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  /* ─── Theme ─── */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* ─── Load discovery profiles ─── */
  useEffect(() => {
    if (!user || !profile) return;
    loadProfiles();
  }, [user, profile]);

  /* ─── Listen for incoming likes ─── */
  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "likes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q1, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setIncomingLikes(arr);
      setUnreadLikes(arr.filter(l => !l.seen).length);
    });
    return unsub;
  }, [user]);

  /* ─── Listen for matches ─── */
  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "matches"), where("users", "array-contains", user.uid));
    const unsub = onSnapshot(q1, async (snap) => {
      const arr = [];
      for (const d of snap.docs) {
        const data = d.data();
        const otherId = data.users.find(u => u !== user.uid);
        const otherSnap = await getDoc(doc(db, "users", otherId));
        if (otherSnap.exists()) {
          arr.push({ id: d.id, ...data, otherProfile: { uid: otherId, ...otherSnap.data() } });
        }
      }
      setMatchesList(arr);
    });
    return unsub;
  }, [user]);

  /* ─── Listen for messages in current chat ─── */
  useEffect(() => {
    if (!currentChat) return;
    const cid = chatId(user.uid, currentChat.uid);
    const q1 = query(
      collection(db, "chats", cid, "messages"),
      orderBy("ts", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(q1, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [currentChat]);

  /* ─── Toast timer ─── */
  useEffect(() => {
    if (toast) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 3000);
    }
  }, [toast]);

  /* ─── Inject CSS ─── */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  /* ═══ FUNCTIONS ═══ */

  const showToast = (icon, title, desc) => setToast({ icon, title, desc });

  const loadProfiles = async () => {
    try {
      // Get blocked users
      const blocksSnap = await getDocs(query(collection(db, "blocks"), where("uid", "==", user.uid)));
      const blockedIds = new Set(blocksSnap.docs.map(d => d.data().blockedUid));
      blockedIds.add(user.uid);

      // Get already-liked user IDs
      const likesSnap = await getDocs(query(collection(db, "likes"), where("fromUid", "==", user.uid)));
      const likedIds = new Set(likesSnap.docs.map(d => d.data().toUid));

      // Fetch users
      const snap = await getDocs(query(collection(db, "users"), limit(100)));
      const arr = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(p => !blockedIds.has(p.uid) && !likedIds.has(p.uid) && p.name && p.photos?.length > 0);

      // Apply filters
      const filtered = arr.filter(p => {
        if (filters.gender !== "everyone" && p.gender !== filters.gender) return false;
        if (p.age && (p.age < filters.ageMin || p.age > filters.ageMax)) return false;
        return true;
      });

      setProfiles(filtered);
      setProfileIdx(0);
    } catch (e) {
      console.error("loadProfiles error:", e);
    }
  };

  /* ─── Auth functions ─── */
  const handleSignup = async (email, password, onError) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      onError(e.message);
    }
  };

  const handleLogin = async (email, password, onError) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      onError(e.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setProfile(null);
    setScreen("discover");
    setSubScreen(null);
  };

  /* ─── Profile save ─── */
  const saveProfile = async (data) => {
    if (!user) return;
    const merged = { ...profile, ...data, uid: user.uid, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "users", user.uid), merged, { merge: true });
    setProfile(merged);
    setSubScreen(null);
    showToast("\u2705", "Profile saved", "");
  };

  /* ─── Like (photo or prompt) ─── */
  const sendLike = async (targetProfile, type, index, comment = "", isRose = false) => {
    if (!user || !targetProfile) return;

    // Check daily like limit for free users
    if (!isPremium) {
      const today = new Date().toISOString().split("T")[0];
      const snap = await getDocs(query(
        collection(db, "likes"),
        where("fromUid", "==", user.uid),
        where("date", "==", today),
      ));
      if (snap.size >= MAX_FREE_LIKES_DAY) {
        showToast("\u26A0\uFE0F", "Daily limit reached", "Upgrade to VyndLove+ for unlimited likes");
        return;
      }
    }

    // Check rose limit
    if (isRose) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const snap = await getDocs(query(
        collection(db, "likes"),
        where("fromUid", "==", user.uid),
        where("isRose", "==", true),
      ));
      const weekRoses = snap.docs.filter(d => {
        const ts = d.data().ts?.toDate?.();
        return ts && ts >= weekStart;
      }).length;
      const maxRoses = isPremium ? MAX_ROSES_PREMIUM_WEEK : MAX_ROSES_FREE_WEEK;
      if (weekRoses >= maxRoses) {
        showToast("\uD83C\uDF39", "No roses left", isPremium ? "Used all 5 this week" : "Free users get 1/week. Upgrade for more!");
        return;
      }
    }

    const likeData = {
      fromUid: user.uid,
      toUid: targetProfile.uid,
      type, // 'photo' or 'prompt'
      index,
      comment,
      isRose,
      date: new Date().toISOString().split("T")[0],
      ts: serverTimestamp(),
      seen: false,
      fromName: profile.name,
      fromPhoto: profile.photos?.[0] || "",
    };

    await addDoc(collection(db, "likes"), likeData);

    // Check for mutual like (match)
    const mutualSnap = await getDocs(query(
      collection(db, "likes"),
      where("fromUid", "==", targetProfile.uid),
      where("toUid", "==", user.uid),
    ));

    if (mutualSnap.size > 0) {
      // It's a match!
      await addDoc(collection(db, "matches"), {
        users: [user.uid, targetProfile.uid],
        ts: serverTimestamp(),
        lastMessage: "",
        lastMessageTs: serverTimestamp(),
      });

      // Create chat doc
      const cid = chatId(user.uid, targetProfile.uid);
      await setDoc(doc(db, "chats", cid), {
        users: [user.uid, targetProfile.uid],
        createdAt: serverTimestamp(),
      });

      setMatchModal(targetProfile);
    } else {
      showToast(isRose ? "\uD83C\uDF39" : "\u2764\uFE0F", isRose ? t.rosesSent : t.likesSent, "");
    }

    // Advance to next profile
    setProfileIdx(prev => prev + 1);
    setCommentMode(null);
    setCommentText("");
  };

  /* ─── Skip profile ─── */
  const skipProfile = () => {
    setProfileIdx(prev => prev + 1);
    setCommentMode(null);
    setCommentText("");
  };

  /* ─── Send message ─── */
  const sendMessage = async () => {
    if (!msgText.trim() || !currentChat) return;
    const cid = chatId(user.uid, currentChat.uid);
    const text = msgText.trim();
    setMsgText("");

    await addDoc(collection(db, "chats", cid, "messages"), {
      from: user.uid,
      text,
      ts: serverTimestamp(),
      read: false,
    });

    // Update last message in match
    const matchDoc = matchesList.find(m =>
      m.users?.includes(user.uid) && m.users?.includes(currentChat.uid)
    );
    if (matchDoc) {
      await updateDoc(doc(db, "matches", matchDoc.id), {
        lastMessage: text,
        lastMessageTs: serverTimestamp(),
      });
    }
  };

  /* ─── Report ─── */
  const reportUser = async (targetUid, reason) => {
    await addDoc(collection(db, "reports"), {
      reporterUid: user.uid,
      reportedUid: targetUid,
      reason,
      ts: serverTimestamp(),
    });
    setShowReportModal(null);
    showToast("\uD83D\uDEA9", t.report, "Thank you for keeping VyndLove safe");
  };

  /* ─── Block ─── */
  const blockUser = async (targetUid) => {
    await addDoc(collection(db, "blocks"), {
      uid: user.uid,
      blockedUid: targetUid,
      ts: serverTimestamp(),
    });
    showToast("\uD83D\uDEAB", t.block, "User blocked");
    if (currentChat?.uid === targetUid) {
      setCurrentChat(null);
      setSubScreen(null);
    }
    loadProfiles();
  };

  /* ─── Delete account ─── */
  const deleteAccount = async () => {
    try {
      // Delete user data from collections
      const uid = user.uid;
      await deleteDoc(doc(db, "users", uid));

      // Delete likes
      const likesFrom = await getDocs(query(collection(db, "likes"), where("fromUid", "==", uid)));
      const likesTo = await getDocs(query(collection(db, "likes"), where("toUid", "==", uid)));
      for (const d of [...likesFrom.docs, ...likesTo.docs]) await deleteDoc(d.ref);

      // Delete matches
      const matchDocs = await getDocs(query(collection(db, "matches"), where("users", "array-contains", uid)));
      for (const d of matchDocs.docs) await deleteDoc(d.ref);

      // Delete auth user
      await deleteUser(auth.currentUser);

      setProfile(null);
      setUser(null);
      setShowDeleteModal(false);
    } catch (e) {
      showToast("\u26A0\uFE0F", "Error", e.message);
    }
  };

  /* ─── We Met feedback ─── */
  const submitWeMet = async (matchId, didMeet) => {
    await addDoc(collection(db, "feedback"), {
      uid: user.uid,
      matchId,
      didMeet,
      ts: serverTimestamp(),
    });
    setShowWeMet(null);
    showToast("\uD83D\uDE4F", t.weMet, "Thanks for your feedback!");
  };

  /* ═══════════════════════════════════════════════
     RENDER: Age Gate
     ═══════════════════════════════════════════════ */
  if (!ageConfirmed) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div className="fade-in" style={{ textAlign: "center", padding: "32px", maxWidth: "400px" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>{"\u2764\uFE0F"}</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px", background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t.welcome}
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "15px" }}>{t.ageGate}</p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => setAgeConfirmed(true)}>{t.iAm18}</button>
            <button className="btn btn-secondary" onClick={() => window.location.href = "https://www.google.com"}>{t.under18}</button>
          </div>
          <div style={{ marginTop: "24px", display: "flex", gap: "16px", justifyContent: "center" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); setAgeConfirmed(true); }} style={{ color: "var(--accent)", fontSize: "13px" }}>{t.privacy}</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowTerms(true); setAgeConfirmed(true); }} style={{ color: "var(--accent)", fontSize: "13px" }}>{t.terms}</a>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER: Auth Screen
     ═══════════════════════════════════════════════ */
  if (authLoading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", animation: "pulse 1.5s infinite" }}>{"\u2764\uFE0F"}</div>
          <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen t={t} isRTL={isRTL} onLogin={handleLogin} onSignup={handleSignup} />;
  }

  /* ═══════════════════════════════════════════════
     RENDER: Profile Setup (no profile yet)
     ═══════════════════════════════════════════════ */
  if (!profile || !profile.name) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"}>
        <style>{CSS}</style>
        <ProfileEditor
          t={t} isRTL={isRTL}
          profile={profile || {}}
          isNew={true}
          onSave={saveProfile}
          onCancel={() => {}}
        />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER: Main App
     ═══════════════════════════════════════════════ */
  const currentProfile = profiles[profileIdx];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} id="root">
      <style>{CSS}</style>

      {/* ─── Toast ─── */}
      {toast && (
        <div className="toast" onClick={() => setToast(null)}>
          <span className="toast-icon">{toast.icon}</span>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            {toast.desc && <div className="toast-desc">{toast.desc}</div>}
          </div>
        </div>
      )}

      {/* ─── Match Modal ─── */}
      {matchModal && (
        <div className="match-modal-overlay" onClick={() => setMatchModal(null)}>
          <div className="match-modal" onClick={e => e.stopPropagation()}>
            <div className="match-modal-photos">
              <img className="match-modal-photo" src={profile.photos?.[0] || placeholderPhoto(profile.name)} alt="" />
              <img className="match-modal-photo" src={matchModal.photos?.[0] || placeholderPhoto(matchModal.name)} alt="" />
            </div>
            <div className="match-modal-title">{t.match}</div>
            <div className="match-modal-desc">{t.matchDesc.replace("{name}", matchModal.name)}</div>
            <button className="btn btn-primary" onClick={() => {
              setMatchModal(null);
              setCurrentChat(matchModal);
              setSubScreen("chatView");
              setScreen("matches");
            }}>
              {t.send} {t.chat} {"\u2192"}
            </button>
            <button className="btn btn-ghost" style={{ marginTop: "8px" }} onClick={() => setMatchModal(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* ─── We Met Modal ─── */}
      {showWeMet && (
        <div className="modal-overlay" onClick={() => setShowWeMet(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: "40vh" }}>
            <div className="modal-header">
              <span className="modal-title">{t.weMet}</span>
              <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setShowWeMet(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "32px" }}>
              <p style={{ fontSize: "16px", marginBottom: "24px" }}>
                {t.weMetQ.replace("{name}", showWeMet.name || "")}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => submitWeMet(showWeMet.matchId, true)}>{t.yes}</button>
                <button className="btn btn-secondary" onClick={() => submitWeMet(showWeMet.matchId, false)}>{t.no}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Report Modal ─── */}
      {showReportModal && (
        <ReportModal
          t={t}
          targetUid={showReportModal}
          onReport={reportUser}
          onBlock={() => blockUser(showReportModal)}
          onClose={() => setShowReportModal(null)}
        />
      )}

      {/* ─── Delete Account Modal ─── */}
      {showDeleteModal && (
        <DeleteAccountModal t={t} onConfirm={deleteAccount} onClose={() => setShowDeleteModal(false)} />
      )}

      {/* ─── Premium Modal ─── */}
      {showPremium && (
        <PremiumModal t={t} onClose={() => setShowPremium(false)} />
      )}

      {/* ─── Terms / Privacy / Safety modals ─── */}
      {showTerms && <LegalModal title={t.terms} onClose={() => setShowTerms(false)} type="terms" />}
      {showPrivacy && <LegalModal title={t.privacy} onClose={() => setShowPrivacy(false)} type="privacy" />}
      {showSafety && <LegalModal title={t.safety} onClose={() => setShowSafety(false)} type="safety" />}

      {/* ═══ SUB-SCREENS ═══ */}

      {subScreen === "chatView" && currentChat ? (
        <ChatView
          t={t} isRTL={isRTL}
          user={user} profile={profile}
          otherUser={currentChat}
          messages={messages}
          msgText={msgText}
          setMsgText={setMsgText}
          sendMessage={sendMessage}
          messagesEndRef={messagesEndRef}
          onBack={() => { setSubScreen(null); setCurrentChat(null); }}
          onReport={() => setShowReportModal(currentChat.uid)}
          onWeMet={() => {
            const match = matchesList.find(m => m.otherProfile?.uid === currentChat.uid);
            if (match) setShowWeMet({ matchId: match.id, name: currentChat.name });
          }}
          isPremium={isPremium}
        />
      ) : subScreen === "editProfile" ? (
        <ProfileEditor
          t={t} isRTL={isRTL}
          profile={profile}
          isNew={false}
          onSave={saveProfile}
          onCancel={() => setSubScreen(null)}
        />
      ) : subScreen === "settings" ? (
        <SettingsScreen
          t={t} isRTL={isRTL}
          lang={lang} setLang={setLang}
          darkMode={darkMode} setDarkMode={setDarkMode}
          filters={filters} setFilters={setFilters}
          isPremium={isPremium}
          onEditProfile={() => setSubScreen("editProfile")}
          onShowPremium={() => setShowPremium(true)}
          onShowTerms={() => setShowTerms(true)}
          onShowPrivacy={() => setShowPrivacy(true)}
          onShowSafety={() => setShowSafety(true)}
          onDeleteAccount={() => setShowDeleteModal(true)}
          onLogout={handleLogout}
        />
      ) : subScreen === "filters" ? (
        <FiltersScreen
          t={t} isRTL={isRTL}
          filters={filters} setFilters={setFilters}
          isPremium={isPremium}
          onClose={() => { setSubScreen(null); loadProfiles(); }}
        />
      ) : (
        <>
          {/* ═══ MAIN TABS ═══ */}

          {/* ─── Header ─── */}
          <div className="header">
            {screen === "discover" ? (
              <>
                <span className="header-logo">VyndLove</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setSubScreen("filters")}>
                    <Icon name="filter" size={20} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setSubScreen("settings")}>
                    <Icon name="bell" size={20} />
                    {(unreadLikes > 0 || unreadMessages > 0) && <span className="nav-badge" style={{ top: 2, right: 2 }}>{unreadLikes + unreadMessages}</span>}
                  </button>
                </div>
              </>
            ) : screen === "likes" ? (
              <>
                <span className="header-title">{t.likesYou}</span>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{incomingLikes.length}</span>
              </>
            ) : screen === "matches" ? (
              <span className="header-title">{t.matches}</span>
            ) : (
              <>
                <span className="header-title">{t.profile}</span>
                <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setSubScreen("settings")}>
                  <Icon name="settings" size={20} />
                </button>
              </>
            )}
          </div>

          {/* ─── Screen content ─── */}
          <div className="screen screen-scroll">
            {screen === "discover" && (
              <DiscoverScreen
                t={t} isRTL={isRTL}
                currentProfile={currentProfile}
                profile={profile}
                isPremium={isPremium}
                commentMode={commentMode}
                commentText={commentText}
                setCommentMode={setCommentMode}
                setCommentText={setCommentText}
                onLike={(type, idx, comment, isRose) => sendLike(currentProfile, type, idx, comment, isRose)}
                onSkip={skipProfile}
                onReport={() => currentProfile && setShowReportModal(currentProfile.uid)}
                onShowPremium={() => setShowPremium(true)}
                mostCompatible={profiles.length > 0 ? profiles[profiles.length - 1] : null}
              />
            )}
            {screen === "likes" && (
              <LikesScreen
                t={t} isRTL={isRTL}
                likes={incomingLikes}
                isPremium={isPremium}
                onShowPremium={() => setShowPremium(true)}
                onViewProfile={(like) => {
                  // Could expand to show full profile
                }}
              />
            )}
            {screen === "matches" && (
              <MatchesScreen
                t={t} isRTL={isRTL}
                matches={matchesList}
                onOpenChat={(m) => {
                  setCurrentChat(m.otherProfile);
                  setSubScreen("chatView");
                }}
              />
            )}
            {screen === "profile" && (
              <MyProfileScreen
                t={t} isRTL={isRTL}
                profile={profile}
                isPremium={isPremium}
                onEdit={() => setSubScreen("editProfile")}
                onSettings={() => setSubScreen("settings")}
                onShowPremium={() => setShowPremium(true)}
              />
            )}
          </div>

          {/* ─── Bottom Navigation ─── */}
          <nav className="bottom-nav">
            <button className={`nav-item ${screen === "discover" ? "active" : ""}`} onClick={() => setScreen("discover")}>
              <Icon name="compass" size={24} />
              <span className="nav-label">{t.discover}</span>
            </button>
            <button className={`nav-item ${screen === "likes" ? "active" : ""}`} onClick={() => setScreen("likes")}>
              <Icon name="heart" size={24} />
              <span className="nav-label">{t.likes}</span>
              {unreadLikes > 0 && <span className="nav-badge">{unreadLikes}</span>}
            </button>
            <button className={`nav-item ${screen === "matches" ? "active" : ""}`} onClick={() => setScreen("matches")}>
              <Icon name="chat" size={24} />
              <span className="nav-label">{t.matches}</span>
              {unreadMessages > 0 && <span className="nav-badge">{unreadMessages}</span>}
            </button>
            <button className={`nav-item ${screen === "profile" ? "active" : ""}`} onClick={() => setScreen("profile")}>
              <Icon name="user" size={24} />
              <span className="nav-label">{t.profile}</span>
            </button>
          </nav>

          {/* ─── Comment overlay ─── */}
          {commentMode && (
            <div className="comment-overlay">
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                {commentMode.isRose ? "\uD83C\uDF39 " : "\u2764\uFE0F "}
                {commentMode.type === "photo" ? `Liking photo ${commentMode.index + 1}` : `Liking prompt: "${currentProfile?.prompts?.[commentMode.index]?.question || ""}"`}
              </p>
              <div className="comment-input-row">
                <textarea
                  className="comment-input"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={t.comment}
                  rows={1}
                  autoFocus
                />
                <button
                  className="message-send-btn"
                  onClick={() => sendLike(currentProfile, commentMode.type, commentMode.index, commentText, commentMode.isRose)}
                >
                  <Icon name="send" size={18} color="#fff" />
                </button>
                <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => { setCommentMode(null); setCommentText(""); }}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AUTH SCREEN COMPONENT
   ═══════════════════════════════════════════════ */
function AuthScreen({ t, isRTL, onLogin, onSignup }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields");
    setError("");
    setLoading(true);
    if (isLogin) {
      await onLogin(email, password, setError);
    } else {
      await onSignup(email, password, setError);
    }
    setLoading(false);
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: "380px", padding: "32px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>{"\u2764\uFE0F"}</div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            VyndLove
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginTop: "4px" }}>{t.tagline}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              className="input-field"
              type="email"
              placeholder={t.email}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <input
              className="input-field"
              type="password"
              placeholder={t.password}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: "14px", marginBottom: "12px" }}>{error}</p>}
          <button className="btn btn-primary" type="submit" style={{ width: "100%", opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "..." : (isLogin ? t.login : t.signup)}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "20px", color: "var(--text-secondary)", fontSize: "14px" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
          >
            {isLogin ? t.signup : t.login}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PROFILE EDITOR COMPONENT
   ═══════════════════════════════════════════════ */
function ProfileEditor({ t, isRTL, profile, isNew, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: profile.name || "",
    age: profile.age || "",
    city: profile.city || "",
    bio: profile.bio || "",
    gender: profile.gender || "",
    lookingFor: profile.lookingFor || "everyone",
    height: profile.height || "",
    education: profile.education || "",
    jobTitle: profile.jobTitle || "",
    company: profile.company || "",
    religion: profile.religion || "",
    kids: profile.kids || "",
    drinking: profile.drinking || "",
    smoking: profile.smoking || "",
    photos: profile.photos || [],
    prompts: profile.prompts || [
      { question: PROMPT_OPTIONS[0], answer: "" },
      { question: PROMPT_OPTIONS[1], answer: "" },
      { question: PROMPT_OPTIONS[2], answer: "" },
    ],
    interests: profile.interests || [],
  });

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const updatePrompt = (idx, field, value) => {
    const newPrompts = [...form.prompts];
    newPrompts[idx] = { ...newPrompts[idx], [field]: value };
    setForm(f => ({ ...f, prompts: newPrompts }));
  };

  const addPhotoUrl = () => {
    const url = prompt("Enter photo URL:");
    if (url && form.photos.length < MAX_PHOTOS) {
      setForm(f => ({ ...f, photos: [...f.photos, url] }));
    }
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const toggleInterest = (interest) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : f.interests.length < 8 ? [...f.interests, interest] : f.interests,
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.age || form.age < 18) return alert("You must be 18+");
    if (PROFANITY.test(form.name) || PROFANITY.test(form.bio)) {
      return alert("Please keep your profile clean and respectful.");
    }
    onSave(form);
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{CSS}</style>
      <div className="header">
        {!isNew && (
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onCancel}>
            <Icon name="back" size={20} />
          </button>
        )}
        <span className="header-title">{isNew ? "Create Profile" : t.editProfile}</span>
        <button className="btn btn-small btn-primary" onClick={handleSave}>{t.save}</button>
      </div>

      <div style={{ padding: "16px", paddingBottom: "100px" }}>
        {/* Photos */}
        <div className="profile-section" style={{ border: "none", padding: "0 0 16px" }}>
          <h3 className="profile-section-title">{t.photos} ({form.photos.length}/{MAX_PHOTOS})</h3>
          <div className="profile-photo-grid">
            {Array.from({ length: MAX_PHOTOS }).map((_, i) => (
              <div
                key={i}
                className={`profile-photo-slot ${form.photos[i] ? "has-photo" : ""}`}
                onClick={() => form.photos[i] ? removePhoto(i) : addPhotoUrl()}
              >
                {form.photos[i] ? (
                  <>
                    <img src={form.photos[i]} alt="" />
                    <div style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="x" size={14} color="#fff" />
                    </div>
                  </>
                ) : (
                  <span>+</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="input-group">
          <label className="input-label">{t.name}</label>
          <input className="input-field" value={form.name} onChange={e => updateField("name", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="input-group">
            <label className="input-label">{t.age}</label>
            <input className="input-field" type="number" min="18" max="100" value={form.age} onChange={e => updateField("age", parseInt(e.target.value) || "")} />
          </div>
          <div className="input-group">
            <label className="input-label">{t.gender}</label>
            <select className="input-field" value={form.gender} onChange={e => updateField("gender", e.target.value)}>
              <option value="">Select...</option>
              <option value="man">{t.man}</option>
              <option value="woman">{t.woman}</option>
              <option value="non-binary">{t.nonBinary}</option>
            </select>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">{t.city}</label>
          <input className="input-field" value={form.city} onChange={e => updateField("city", e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">{t.bio}</label>
          <textarea className="input-field" value={form.bio} onChange={e => updateField("bio", e.target.value)} rows={3} />
        </div>

        {/* Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="input-group">
            <label className="input-label">{t.height} (cm)</label>
            <input className="input-field" type="number" value={form.height} onChange={e => updateField("height", e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">{t.lookingFor}</label>
            <select className="input-field" value={form.lookingFor} onChange={e => updateField("lookingFor", e.target.value)}>
              <option value="everyone">{t.everyone}</option>
              <option value="men">{t.men}</option>
              <option value="women">{t.women}</option>
            </select>
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">{t.jobTitle}</label>
          <input className="input-field" value={form.jobTitle} onChange={e => updateField("jobTitle", e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">{t.company}</label>
          <input className="input-field" value={form.company} onChange={e => updateField("company", e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">{t.education}</label>
          <input className="input-field" value={form.education} onChange={e => updateField("education", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="input-group">
            <label className="input-label">{t.religion}</label>
            <select className="input-field" value={form.religion} onChange={e => updateField("religion", e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="jewish">Jewish</option>
              <option value="christian">Christian</option>
              <option value="muslim">Muslim</option>
              <option value="buddhist">Buddhist</option>
              <option value="hindu">Hindu</option>
              <option value="spiritual">Spiritual</option>
              <option value="atheist">Atheist</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{t.kids}</label>
            <select className="input-field" value={form.kids} onChange={e => updateField("kids", e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="want">Want someday</option>
              <option value="dont-want">Don't want</option>
              <option value="have">Have & want more</option>
              <option value="have-done">Have & don't want more</option>
              <option value="open">Open to kids</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="input-group">
            <label className="input-label">{t.drinking}</label>
            <select className="input-field" value={form.drinking} onChange={e => updateField("drinking", e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="never">Never</option>
              <option value="rarely">Rarely</option>
              <option value="socially">Socially</option>
              <option value="often">Often</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{t.smoking}</label>
            <select className="input-field" value={form.smoking} onChange={e => updateField("smoking", e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="never">Never</option>
              <option value="socially">Socially</option>
              <option value="regularly">Regularly</option>
            </select>
          </div>
        </div>

        {/* Prompts */}
        <h3 className="profile-section-title" style={{ marginTop: "24px" }}>{t.prompts}</h3>
        {form.prompts.map((p, i) => (
          <div key={i} style={{ marginBottom: "16px", padding: "16px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
            <select
              className="input-field"
              value={p.question}
              onChange={e => updatePrompt(i, "question", e.target.value)}
              style={{ marginBottom: "8px", fontSize: "13px" }}
            >
              {PROMPT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <textarea
              className="input-field"
              value={p.answer}
              onChange={e => updatePrompt(i, "answer", e.target.value)}
              placeholder="Your answer..."
              rows={2}
            />
          </div>
        ))}

        {/* Interests */}
        <h3 className="profile-section-title" style={{ marginTop: "24px" }}>Interests ({form.interests.length}/8)</h3>
        <div className="tag-grid">
          {INTERESTS.map(interest => (
            <span
              key={interest}
              className={`tag ${form.interests.includes(interest) ? "selected" : ""}`}
              onClick={() => toggleInterest(interest)}
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DISCOVER SCREEN
   ═══════════════════════════════════════════════ */
function DiscoverScreen({ t, isRTL, currentProfile, profile, isPremium, commentMode, commentText, setCommentMode, setCommentText, onLike, onSkip, onReport, onShowPremium, mostCompatible }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => { setPhotoIdx(0); }, [currentProfile?.uid]);

  if (!currentProfile) {
    return (
      <div>
        {/* Most Compatible banner */}
        {mostCompatible && (
          <div className="compatible-card fade-in">
            <div className="compatible-stars">{"\u2728"}</div>
            <div className="compatible-label">{t.mostCompatible}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src={mostCompatible.photos?.[0] || placeholderPhoto(mostCompatible.name)} alt="" style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover" }} />
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700 }}>{mostCompatible.name}, {mostCompatible.age}</div>
                <div style={{ fontSize: "14px", opacity: 0.8 }}>{mostCompatible.city}</div>
              </div>
            </div>
          </div>
        )}

        {/* Premium upsell */}
        {!isPremium && (
          <div className="premium-banner" onClick={onShowPremium}>
            <h3>{"\uD83D\uDC51"} VyndLove+</h3>
            <p>{t.unlimitedLikes} {"\u2022"} {t.seeWhoLikes} {"\u2022"} {t.readReceipts}</p>
          </div>
        )}

        <div className="empty-state">
          <div className="empty-state-icon">{"\uD83D\uDC94"}</div>
          <div className="empty-state-title">{t.noMoreProfiles}</div>
          <div className="empty-state-desc">Check back later for new people in your area</div>
        </div>
      </div>
    );
  }

  const photos = currentProfile.photos || [];
  const prompts = currentProfile.prompts?.filter(p => p.answer) || [];

  return (
    <div className="fade-in">
      {/* Profile Card with photo */}
      <div className="profile-card">
        <div className="profile-card-photo" onClick={() => setPhotoIdx(i => (i + 1) % Math.max(photos.length, 1))}>
          <img src={photos[photoIdx] || placeholderPhoto(currentProfile.name, photoIdx)} alt="" />

          {/* Photo dots */}
          {photos.length > 1 && (
            <div style={{ position: "absolute", top: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
              {photos.map((_, i) => (
                <div key={i} style={{
                  width: i === photoIdx ? 24 : 8, height: 4, borderRadius: 2,
                  background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.4)",
                  transition: "all 0.2s",
                }} />
              ))}
            </div>
          )}

          <div className="profile-card-photo-overlay">
            <div className="profile-card-name">{currentProfile.name}, {currentProfile.age}</div>
            <div className="profile-card-info">
              {currentProfile.city && <span>{currentProfile.city}</span>}
              {currentProfile.jobTitle && <span>{"\u2022"} {currentProfile.jobTitle}</span>}
              {currentProfile.height && <span>{"\u2022"} {currentProfile.height}cm</span>}
            </div>
          </div>

          {/* Like photo button */}
          <button
            style={{
              position: "absolute", bottom: 60, right: 16,
              width: 44, height: 44, borderRadius: 22,
              background: "rgba(255,255,255,0.9)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setCommentMode({ type: "photo", index: photoIdx, isRose: false });
            }}
          >
            <Icon name="heartFill" size={22} color="#e8455a" />
          </button>
        </div>

        {/* Bio */}
        {currentProfile.bio && (
          <div style={{ padding: "16px" }}>
            <p style={{ fontSize: "15px", lineHeight: 1.5, color: "var(--text-secondary)" }}>{currentProfile.bio}</p>
          </div>
        )}
      </div>

      {/* Prompt cards */}
      {prompts.map((p, i) => (
        <div key={i} className="prompt-card" style={{ marginTop: "8px", position: "relative" }}>
          <div className="prompt-card-question">{p.question}</div>
          <div className="prompt-card-answer">{p.answer}</div>
          <button
            style={{
              position: "absolute", bottom: 12, right: 12,
              width: 36, height: 36, borderRadius: 18,
              background: "var(--bg-input)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => setCommentMode({ type: "prompt", index: i, isRose: false })}
          >
            <Icon name="heartFill" size={18} color="#e8455a" />
          </button>
        </div>
      ))}

      {/* Interests */}
      {currentProfile.interests?.length > 0 && (
        <div style={{ padding: "16px 8px" }}>
          <div className="tag-grid">
            {currentProfile.interests.map(int => (
              <span key={int} className="tag" style={{ cursor: "default" }}>{int}</span>
            ))}
          </div>
        </div>
      )}

      {/* Details pills */}
      <div style={{ padding: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {currentProfile.education && <span className="tag" style={{ cursor: "default" }}>{"\uD83C\uDF93"} {currentProfile.education}</span>}
        {currentProfile.religion && <span className="tag" style={{ cursor: "default" }}>{"\uD83D\uDE4F"} {currentProfile.religion}</span>}
        {currentProfile.kids && <span className="tag" style={{ cursor: "default" }}>{"\uD83D\uDC76"} {currentProfile.kids}</span>}
        {currentProfile.drinking && <span className="tag" style={{ cursor: "default" }}>{"\uD83C\uDF77"} {currentProfile.drinking}</span>}
        {currentProfile.smoking && <span className="tag" style={{ cursor: "default" }}>{"\uD83D\uDEAC"} {currentProfile.smoking}</span>}
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <button className="action-btn action-btn-skip" onClick={onSkip}>
          <Icon name="x" size={28} />
        </button>
        <button className="action-btn action-btn-like" onClick={() => onLike("photo", photoIdx, "", false)}>
          <Icon name="heartFill" size={28} color="#fff" />
        </button>
        <button className="action-btn action-btn-rose" onClick={() => setCommentMode({ type: "photo", index: photoIdx, isRose: true })}>
          {"\uD83C\uDF39"}
        </button>
        <button className="action-btn action-btn-comment" onClick={() => setCommentMode({ type: "photo", index: photoIdx, isRose: false })}>
          <Icon name="chat" size={22} />
        </button>
      </div>

      {/* Report */}
      <div style={{ textAlign: "center", paddingBottom: "24px" }}>
        <button className="btn btn-ghost" style={{ fontSize: "13px", color: "var(--text-muted)" }} onClick={onReport}>
          <Icon name="flag" size={14} /> {t.report} {currentProfile.name}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LIKES SCREEN
   ═══════════════════════════════════════════════ */
function LikesScreen({ t, isRTL, likes, isPremium, onShowPremium, onViewProfile }) {
  if (likes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">{"\u2764\uFE0F"}</div>
        <div className="empty-state-title">{t.noLikes}</div>
        <div className="empty-state-desc">Keep putting yourself out there!</div>
      </div>
    );
  }

  return (
    <div>
      {!isPremium && (
        <div className="premium-banner" onClick={onShowPremium} style={{ margin: "8px" }}>
          <h3>{"\uD83D\uDD13"} {t.upgradeToSee}</h3>
          <p>See who already likes you and match instantly</p>
        </div>
      )}
      <div className="likes-grid">
        {likes.map((like) => (
          <div key={like.id} className={`likes-card ${!isPremium ? "likes-card-blurred" : ""}`} onClick={() => onViewProfile(like)}>
            <img src={like.fromPhoto || placeholderPhoto(like.fromName || "?")} alt="" />
            {like.isRose && <div className="likes-card-rose">{"\uD83C\uDF39"}</div>}
            <div className="likes-card-info">
              <div className="likes-card-name">{isPremium ? like.fromName : "???"}</div>
              {like.comment && <div className="likes-card-prompt">"{like.comment}"</div>}
              {like.type === "prompt" && <div className="likes-card-prompt">Liked your prompt</div>}
            </div>
            {!isPremium && (
              <div className="likes-card-upgrade">
                <Icon name="lock" size={32} color="#fff" />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>VyndLove+</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MATCHES SCREEN
   ═══════════════════════════════════════════════ */
function MatchesScreen({ t, isRTL, matches, onOpenChat }) {
  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">{"\uD83D\uDCAC"}</div>
        <div className="empty-state-title">{t.noMatches}</div>
        <div className="empty-state-desc">Start liking profiles to get matched!</div>
      </div>
    );
  }

  return (
    <div className="chat-list">
      {matches.sort((a, b) => {
        const at = a.lastMessageTs?.toDate?.()?.getTime() || 0;
        const bt = b.lastMessageTs?.toDate?.()?.getTime() || 0;
        return bt - at;
      }).map((match) => (
        <div key={match.id} className="chat-item" onClick={() => onOpenChat(match)}>
          <img
            className="chat-avatar"
            src={match.otherProfile?.photos?.[0] || placeholderPhoto(match.otherProfile?.name || "?")}
            alt=""
          />
          <div className="chat-info">
            <div className="chat-name">{match.otherProfile?.name || "Unknown"}</div>
            <div className="chat-preview">{match.lastMessage || t.noMessages}</div>
          </div>
          <div className="chat-meta">
            <div className="chat-time">{timeAgo(match.lastMessageTs)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CHAT VIEW COMPONENT
   ═══════════════════════════════════════════════ */
function ChatView({ t, isRTL, user, profile, otherUser, messages, msgText, setMsgText, sendMessage, messagesEndRef, onBack, onReport, onWeMet, isPremium }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", height: "100dvh" }}>
      {/* Chat header */}
      <div className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onBack}>
            <Icon name="back" size={20} />
          </button>
          <img
            src={otherUser.photos?.[0] || placeholderPhoto(otherUser.name)}
            alt=""
            style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover" }}
          />
          <span style={{ fontWeight: 600 }}>{otherUser.name}</span>
        </div>
        <div style={{ position: "relative" }}>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setShowMenu(!showMenu)}>
            <Icon name="more" size={20} />
          </button>
          {showMenu && (
            <div style={{
              position: "absolute", top: "100%", right: 0, zIndex: 50,
              background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow)", overflow: "hidden", minWidth: "180px",
            }}>
              <button className="settings-item" onClick={() => { setShowMenu(false); onWeMet(); }}>
                {"\uD83E\uDD1D"} {t.weMet}
              </button>
              <button className="settings-item" onClick={() => { setShowMenu(false); onReport(); }} style={{ color: "var(--danger)" }}>
                {"\uD83D\uDEA9"} {t.report}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.from === user.uid ? "sent" : "received"}`}>
            <div>
              <div className="message-bubble">{msg.text}</div>
              <div className="message-time" style={{ textAlign: msg.from === user.uid ? "right" : "left" }}>
                {timeAgo(msg.ts)}
                {isPremium && msg.from === user.uid && msg.read && <span className="message-read"> {"\u2713\u2713"}</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* We Met button */}
      {messages.length >= 10 && (
        <button className="we-met-btn" onClick={onWeMet}>
          {"\uD83E\uDD1D"} {t.weMet}
        </button>
      )}

      {/* Message input */}
      <div className="message-input-bar">
        <textarea
          className="message-input"
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          placeholder={t.startChat}
          rows={1}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button className="message-send-btn" onClick={sendMessage} disabled={!msgText.trim()}>
          <Icon name="send" size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MY PROFILE SCREEN
   ═══════════════════════════════════════════════ */
function MyProfileScreen({ t, isRTL, profile, isPremium, onEdit, onSettings, onShowPremium }) {
  return (
    <div className="fade-in">
      {/* Profile card preview */}
      <div style={{ padding: "16px", textAlign: "center" }}>
        <img
          src={profile.photos?.[0] || placeholderPhoto(profile.name)}
          alt=""
          style={{ width: 120, height: 120, borderRadius: 60, objectFit: "cover", border: "3px solid var(--accent)", marginBottom: "12px" }}
        />
        <h2 style={{ fontSize: "24px", fontWeight: 700 }}>{profile.name}, {profile.age}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          {profile.city}{profile.jobTitle ? ` \u2022 ${profile.jobTitle}` : ""}
        </p>
        {isPremium && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 12px", borderRadius: "var(--radius-full)", background: "var(--accent-gradient)", color: "#fff", fontSize: "12px", fontWeight: 700, marginTop: "8px" }}>
            {"\uD83D\uDC51"} VyndLove+
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px" }}>
        <button className="btn btn-primary" style={{ width: "100%", marginBottom: "12px" }} onClick={onEdit}>
          <Icon name="edit" size={18} color="#fff" /> {t.editProfile}
        </button>

        {!isPremium && (
          <div className="premium-banner" onClick={onShowPremium}>
            <h3>{"\uD83D\uDC51"} Upgrade to VyndLove+</h3>
            <p>{t.unlimitedLikes} {"\u2022"} {t.seeWhoLikes}</p>
          </div>
        )}

        {/* Prompts preview */}
        {profile.prompts?.filter(p => p.answer).map((p, i) => (
          <div key={i} className="prompt-card" style={{ margin: "8px 0" }}>
            <div className="prompt-card-question">{p.question}</div>
            <div className="prompt-card-answer">{p.answer}</div>
          </div>
        ))}

        {/* Interests */}
        {profile.interests?.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <div className="tag-grid">
              {profile.interests.map(int => (
                <span key={int} className="tag selected" style={{ cursor: "default" }}>{int}</span>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-secondary" style={{ width: "100%", marginTop: "12px" }} onClick={onSettings}>
          <Icon name="settings" size={18} /> {t.settings}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SETTINGS SCREEN
   ═══════════════════════════════════════════════ */
function SettingsScreen({ t, isRTL, lang, setLang, darkMode, setDarkMode, filters, setFilters, isPremium, onEditProfile, onShowPremium, onShowTerms, onShowPrivacy, onShowSafety, onDeleteAccount, onLogout }) {
  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{CSS}</style>
      <div className="header">
        <span className="header-title">{t.settings}</span>
      </div>

      <div style={{ padding: "8px 16px", paddingBottom: "120px" }}>
        {/* Account */}
        <div className="settings-group">
          <button className="settings-item" onClick={onEditProfile}>
            <span className="settings-item-label"><Icon name="edit" size={18} /> {t.editProfile}</span>
            <span>{"\u203A"}</span>
          </button>
          {!isPremium && (
            <button className="settings-item" onClick={onShowPremium}>
              <span className="settings-item-label"><Icon name="crown" size={18} color="#f5a623" /> VyndLove+</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>Upgrade</span>
            </button>
          )}
        </div>

        {/* Preferences */}
        <div className="settings-group" style={{ marginTop: "16px" }}>
          <div className="settings-item">
            <span className="settings-item-label"><Icon name="moon" size={18} /> {t.darkMode}</span>
            <button className={`toggle ${darkMode ? "active" : ""}`} onClick={() => setDarkMode(!darkMode)}>
              <div className="toggle-knob" />
            </button>
          </div>
          <div className="settings-item">
            <span className="settings-item-label"><Icon name="globe" size={18} /> {t.language}</span>
            <select
              style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
              value={lang}
              onChange={e => setLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="he">{"\u05E2\u05D1\u05E8\u05D9\u05EA"}</option>
            </select>
          </div>
        </div>

        {/* Legal */}
        <div className="settings-group" style={{ marginTop: "16px" }}>
          <button className="settings-item" onClick={onShowTerms}>
            <span className="settings-item-label"><Icon name="info" size={18} /> {t.terms}</span>
            <span>{"\u203A"}</span>
          </button>
          <button className="settings-item" onClick={onShowPrivacy}>
            <span className="settings-item-label"><Icon name="shield" size={18} /> {t.privacy}</span>
            <span>{"\u203A"}</span>
          </button>
          <button className="settings-item" onClick={onShowSafety}>
            <span className="settings-item-label"><Icon name="shield" size={18} /> {t.safety}</span>
            <span>{"\u203A"}</span>
          </button>
          <button className="settings-item" onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`)}>
            <span className="settings-item-label"><Icon name="mail" size={18} /> {t.support}</span>
            <span>{"\u203A"}</span>
          </button>
        </div>

        {/* Danger zone */}
        <div className="settings-group" style={{ marginTop: "16px" }}>
          <button className="settings-item" onClick={onLogout}>
            <span className="settings-item-label" style={{ color: "var(--warning)" }}>{t.logout}</span>
          </button>
          <button className="settings-item" onClick={onDeleteAccount}>
            <span className="settings-item-label" style={{ color: "var(--danger)" }}><Icon name="trash" size={18} /> {t.deleteAccount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FILTERS SCREEN
   ═══════════════════════════════════════════════ */
function FiltersScreen({ t, isRTL, filters, setFilters, isPremium, onClose }) {
  const [local, setLocal] = useState({ ...filters });
  const update = (k, v) => setLocal(f => ({ ...f, [k]: v }));

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{CSS}</style>
      <div className="header">
        <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => { setFilters(local); onClose(); }}>
          <Icon name="back" size={20} />
        </button>
        <span className="header-title">{t.filters}</span>
        <button className="btn btn-small btn-primary" onClick={() => { setFilters(local); onClose(); }}>Apply</button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Age Range */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span className="input-label">{t.ageRange}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{local.ageMin} - {local.ageMax}</span>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{local.ageMin}</span>
            <input className="range-slider" type="range" min="18" max="65" value={local.ageMin} onChange={e => update("ageMin", parseInt(e.target.value))} />
            <input className="range-slider" type="range" min="18" max="65" value={local.ageMax} onChange={e => update("ageMax", parseInt(e.target.value))} />
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{local.ageMax}</span>
          </div>
        </div>

        {/* Distance */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span className="input-label">{t.distance}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{local.distance} km</span>
          </div>
          <input className="range-slider" type="range" min="1" max="100" value={local.distance} onChange={e => update("distance", parseInt(e.target.value))} />
        </div>

        {/* Gender */}
        <div style={{ marginBottom: "24px" }}>
          <span className="input-label">{t.lookingFor}</span>
          <div className="chip-row" style={{ marginTop: "8px" }}>
            {["everyone", "men", "women"].map(g => (
              <span key={g} className={`chip ${local.gender === g ? "active" : ""}`} onClick={() => update("gender", g)}>
                {t[g] || g}
              </span>
            ))}
          </div>
        </div>

        {/* Active Today */}
        <div className="settings-item" style={{ padding: "0", border: "none" }}>
          <span className="settings-item-label">{t.activeToday}</span>
          <button className={`toggle ${local.activeToday ? "active" : ""}`} onClick={() => update("activeToday", !local.activeToday)}>
            <div className="toggle-knob" />
          </button>
        </div>

        {!isPremium && (
          <div style={{ marginTop: "24px", padding: "16px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              {"\uD83D\uDD12"} Advanced filters like religion, height, and deal-breakers are available with VyndLove+
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   REPORT MODAL
   ═══════════════════════════════════════════════ */
function ReportModal({ t, targetUid, onReport, onBlock, onClose }) {
  const reasons = ["Inappropriate photos", "Spam or fake profile", "Offensive behavior", "Harassment", "Underage user", "Other"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{t.report}</span>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}><Icon name="x" size={20} /></button>
        </div>
        <div className="modal-body">
          {reasons.map(reason => (
            <button key={reason} className="settings-item" onClick={() => onReport(targetUid, reason)}>
              {reason}
            </button>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: "8px", paddingTop: "8px" }}>
            <button className="settings-item" style={{ color: "var(--danger)" }} onClick={onBlock}>
              {"\uD83D\uDEAB"} {t.block}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DELETE ACCOUNT MODAL
   ═══════════════════════════════════════════════ */
function DeleteAccountModal({ t, onConfirm, onClose }) {
  const [typed, setTyped] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: "50vh" }}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: "var(--danger)" }}>{t.deleteAccount}</span>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}><Icon name="x" size={20} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "15px", marginBottom: "16px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            This will permanently delete your profile, matches, messages, and all data. This cannot be undone.
          </p>
          <div className="input-group">
            <label className="input-label">{t.typeDELETE}</label>
            <input className="input-field" value={typed} onChange={e => setTyped(e.target.value)} placeholder="DELETE" />
          </div>
          <button className="btn btn-danger" style={{ width: "100%" }} disabled={typed !== "DELETE"} onClick={onConfirm}>
            {t.deleteAccount}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PREMIUM MODAL
   ═══════════════════════════════════════════════ */
function PremiumModal({ t, onClose }) {
  const features = [
    { icon: "\u2764\uFE0F", text: t.unlimitedLikes },
    { icon: "\uD83D\uDC40", text: t.seeWhoLikes },
    { icon: "\uD83C\uDF39", text: t.premiumRoses },
    { icon: "\uD83D\uDD0D", text: t.advancedFilters },
    { icon: "\u2705", text: t.readReceipts },
    { icon: "\u26A1", text: t.boostDesc },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            <span style={{ background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {"\uD83D\uDC51"} VyndLove+
            </span>
          </span>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}><Icon name="x" size={20} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>{f.icon}</span>
                <span style={{ fontSize: "15px", fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {!IS_MOBILE_BUILD ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {PLANS.map(plan => (
                <a
                  key={plan.id}
                  href={STRIPE_LINKS[plan.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px", borderRadius: "var(--radius-sm)",
                    background: plan.popular || plan.best ? "var(--accent-gradient)" : "var(--bg-elevated)",
                    color: plan.popular || plan.best ? "#fff" : "var(--text)",
                    textDecoration: "none", position: "relative", overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>{plan.label}</div>
                    <div style={{ fontSize: "13px", opacity: 0.8 }}>{plan.pricePer}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "20px" }}>{plan.price}</div>
                  {plan.best && <div style={{ position: "absolute", top: 6, right: -24, transform: "rotate(45deg)", background: "#fff", color: "var(--accent)", padding: "2px 30px", fontSize: "10px", fontWeight: 800 }}>BEST</div>}
                  {plan.popular && <div style={{ position: "absolute", top: 6, right: -30, transform: "rotate(45deg)", background: "#fff", color: "var(--accent)", padding: "2px 36px", fontSize: "10px", fontWeight: 800 }}>POPULAR</div>}
                </a>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                Subscriptions are managed through your account settings. Visit vyndlove.org to subscribe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LEGAL MODAL
   ═══════════════════════════════════════════════ */
function LegalModal({ title, onClose, type }) {
  const content = {
    terms: `Terms of Service \u2014 VyndLove

Last updated: April 2026

1. Acceptance of Terms
By using VyndLove, you agree to these Terms of Service. If you do not agree, do not use the app.

2. Eligibility
You must be at least 18 years old to use VyndLove. By creating an account, you represent that you are at least 18.

3. Account Responsibilities
You are responsible for maintaining the security of your account. Do not share your password. You are responsible for all activity under your account.

4. Acceptable Use
You agree not to: use the app for illegal purposes, harass or abuse other users, post inappropriate or offensive content, create fake profiles, or violate others' privacy.

5. Content
You retain ownership of content you post. By posting, you grant VyndLove a license to use, display, and distribute your content within the app.

6. Premium Services
VyndLove+ subscriptions are billed according to the plan selected. Refunds are subject to our refund policy.

7. Privacy
Your use of VyndLove is also governed by our Privacy Policy.

8. Termination
We may terminate or suspend your account at any time for violations of these terms.

9. Limitation of Liability
VyndLove is provided "as is" without warranties. We are not liable for damages arising from your use of the app.

10. Contact
Questions? Email ${SUPPORT_EMAIL}`,
    privacy: `Privacy Policy \u2014 VyndLove

Last updated: April 2026

1. Information We Collect
We collect: email address, profile information (name, age, photos, preferences), usage data, and device information.

2. How We Use Your Information
To provide and improve our services, match you with other users, communicate with you, and ensure safety and security.

3. Information Sharing
We do not sell your personal information. We may share data with: service providers who assist us, law enforcement when required, and other users (your profile information).

4. Data Storage & Security
We use industry-standard security measures. Your data is stored securely using Firebase/Google Cloud infrastructure.

5. Your Rights
You can: access your data, update your profile, delete your account, and request data export.

6. Cookies & Tracking
We use minimal tracking for app functionality and analytics.

7. Changes
We may update this policy. We will notify you of significant changes.

8. Contact
Privacy questions? Email ${SUPPORT_EMAIL}`,
    safety: `Safety Guide \u2014 VyndLove

Your safety is our top priority.

Meeting Someone New:
\u2022 Always meet in a public place
\u2022 Tell a friend or family member about your plans
\u2022 Arrange your own transportation
\u2022 Keep your phone charged
\u2022 Trust your instincts \u2014 if something feels off, leave

Online Safety:
\u2022 Never share financial information
\u2022 Be cautious about sharing personal details early
\u2022 Video chat before meeting in person
\u2022 Report suspicious behavior immediately

Emergency Resources:
\u2022 Emergency Services: 911 (US) / 100 (IL)
\u2022 National Domestic Violence Hotline: 1-800-799-7233
\u2022 ERAN (Israel): 1201
\u2022 Crisis Text Line: Text HOME to 741741

Report & Block:
If you feel unsafe, use the Report and Block features available on every profile and in every chat. Our team reviews all reports.

Contact us: ${SUPPORT_EMAIL}`,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={onClose}><Icon name="x" size={20} /></button>
        </div>
        <div className="modal-body">
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)", fontFamily: "inherit" }}>
            {content[type] || ""}
          </pre>
        </div>
      </div>
    </div>
  );
}
