"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { auth, db } from "./firebaseConfig";
import { doc, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let exitHandler: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);

      // Always update lastActive so "Live" badge stays accurate
      updateDoc(userRef, { lastActive: serverTimestamp() }).catch(() => {});

      // Per-session tracking — fires once per browser tab open
      const sessionKey = "cx_tracked_" + user.uid;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");

        // Async work in a self-contained function so the callback stays sync
        (async () => {
          // 1. Fetch IP + geolocation
          let geo: Record<string, string> = {};
          try {
            const r = await fetch("https://ipapi.co/json/",
              { signal: AbortSignal.timeout(4000) });
            if (r.ok) {
              const d = await r.json();
              geo = {
                city:    d.city    || "",
                region:  d.region  || "",
                country: d.country_name || d.country || "",
                ip:      d.ip      || "",
              };
            }
          } catch (_) { /* offline or blocked */ }

          // 2. Login history entry (ISO string — serverTimestamp can't go inside arrayUnion)
          const loginEntry: Record<string, string> = {
            at: new Date().toISOString(), ...geo,
          };

          // 3. Write to Firestore
          try {
            const update: Record<string, any> = {
              lastLoginAt:  serverTimestamp(),
              lastEntry:    serverTimestamp(),
              loginCount:   increment(1),
              loginHistory: arrayUnion(loginEntry),
            };
            if (geo.city) { update.location = geo; }
            await updateDoc(userRef, update);
          } catch (e) {
            console.error("Session tracking error:", e);
          }
        })();
      }

      // Exit tracking — register once, clean up in useEffect cleanup
      if (exitHandler) window.removeEventListener("beforeunload", exitHandler);
      exitHandler = () => {
        updateDoc(userRef, { lastExit: serverTimestamp() }).catch(() => {});
      };
      window.addEventListener("beforeunload", exitHandler);
    });

    return () => {
      unsubscribe();
      if (exitHandler) window.removeEventListener("beforeunload", exitHandler);
    };
  }, []);

  if (!mounted) return null;

  // ✅ Hide layout for specific paths (like editor)
  const hideLayout = pathname.startsWith("/resume/editor");

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex flex-col min-h-[80vh]"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* ✅ Keep Footer visible unless on hidden layout path */}
      {!hideLayout && <Footer />}
    </>
  );
}