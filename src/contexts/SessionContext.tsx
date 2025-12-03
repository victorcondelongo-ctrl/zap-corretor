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
  loading: boolean;           // só se refere ao "user"
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ZapProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      console.log("[SessionContext] fetchProfile(): sem user, limpando profile");
      setProfile(null);
      return;
    }

    console.log("[SessionContext] fetchProfile() start para user", user.id);
    try {
      const p = await getCurrentProfile();
      console.log("[SessionContext] fetchProfile() success", p);
      setProfile(p);
    } catch (error) {
      console.error("[SessionContext] fetchProfile() error", error);
      setProfile(null);
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      console.log("[SessionContext] loadInitial() start");
      setLoading(true);

      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (error) {
          console.error("[SessionContext] getUser() error", error);
        }

        const currentUser = data?.user ?? null;
        console.log("[SessionContext] loadInitial() user =", currentUser);
        setUser(currentUser);

        // IMPORTANTE: não await aqui
        if (currentUser) {
          void fetchProfile();
        } else {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log("[SessionContext] loadInitial() finished → setLoading(false)");
          setLoading(false);
        }
      }
    };

    loadInitial();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[SessionContext] onAuthStateChange:", event, session);
        if (event === "INITIAL_SESSION") return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          void fetchProfile();
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
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
  if (!context) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return context;
};