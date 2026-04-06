// api/delete-account.js
// Vercel Serverless Function — backup server-side account deletion
// Requires FIREBASE_SERVICE_ACCOUNT env var (JSON string of service account key)

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export default async function handler(req, res) {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    await admin.auth().deleteUser(uid);
    res.status(200).json({ success: true });
  } catch (e) {
    console.error("delete-account error:", e);
    res.status(500).json({ error: e.message });
  }
}
