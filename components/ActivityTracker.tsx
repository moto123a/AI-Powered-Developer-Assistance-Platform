"use client";
import { useEffect } from "react";
import { auth, db } from "../app/firebaseConfig";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ActivityTracker() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Mark them as "Online" right now
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, { lastActive: serverTimestamp() });

        // 2. Heartbeat: Every 1 minute, add 1 minute to their "Total Time"
        const interval = setInterval(() => {
          updateDoc(userRef, { 
            totalMinutesSpent: increment(1),
            lastActive: serverTimestamp() 
          });
        }, 60000); // 60,000ms = 1 minute

        return () => clearInterval(interval);
      }
    });
    return () => unsubscribe();
  }, []);

  return null; // This component is invisible
}