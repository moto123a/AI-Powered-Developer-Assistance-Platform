"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../app/firebaseConfig";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ["/login", "/signup", "/terms", "/privacy"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Set session cookie so middleware can verify auth
        const token = await firebaseUser.getIdToken();
        document.cookie = `coopilotx_session=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;

        // If on login page and now authenticated, redirect to destination
        if (pathname === "/login" || pathname === "/signup") {
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect") || "/";
          router.replace(redirect);
        }
      } else {
        // Clear session cookie on logout
        document.cookie = "coopilotx_session=; path=/; max-age=0";

        // If on protected route and not authenticated, redirect to login
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}