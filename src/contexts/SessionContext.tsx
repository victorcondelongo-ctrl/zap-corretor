import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { ZapProfile, getCurrentProfile } from "@/services/zapCorretor";
import { User } from "@supabase/supabase-js";

interface SessionContextType {
  user: User | null;
  profile: ZapProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ZapProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    console.log("[SessionContext] fetchProfile() start");
    try {
      const p = await getCurrentProfile();
      console.log("[SessionContext] fetchProfile() success:", p);
      setProfile(p);
    } catch (error) {
      console.error("[SessionContext] fetchProfile() ERROR:", error);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    console.log("[SessionContext] refreshProfile() called. user =", user);
    if (user) {
      await fetchProfile();
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      console.log("[SessionContext] init() start");
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("[SessionContext] getSession() result:", { data, error });

        if (cancelled) return;

        const currentUser = data?.session?.user ?? null;
        setUser(currentUser);
        console.log("[SessionContext] currentUser =", currentUser);

        if (currentUser) {
          await fetchProfile();
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("[SessionContext] init() ERROR:", err);
        setUser(null);
        setProfile(null);
      } finally {
        if (!cancelled) {
          console.log("[SessionContext] init() finished, setLoading(false)");
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[SessionContext] onAuthStateChange:", { event, session });
        if (cancelled) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        console.log("[SessionContext] onAuthStateChange user =", currentUser);

        if (currentUser) {
          await fetchProfile();
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      console.log("[SessionContext] cleanup");
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  console.log("[SessionContext] render:", { user, profile, loading });

  return (
    <SessionContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return context;
};