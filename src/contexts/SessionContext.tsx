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
    try {
      const p = await getCurrentProfile();
      setProfile(p);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile();
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile();
        } else {
          setProfile(null);
        }

        // The INITIAL_SESSION event is fired only once when the client connects.
        // It signifies that the initial authentication check is complete.
        // We can now safely set loading to false.
        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    // If onAuthStateChange doesn't fire an initial session for some reason,
    // we need a fallback to stop the loading. Let's check manually.
    const checkInitialUser = async () => {
        const { data: { user: initialUser } } = await supabase.auth.getUser();
        if (loading) { // Only set loading if it's still true
            if (initialUser) {
                setUser(initialUser);
                await fetchProfile();
            }
            setLoading(false);
        }
    };
    
    // Give onAuthStateChange a moment to fire, then check manually.
    const timer = setTimeout(() => {
        checkInitialUser();
    }, 500);


    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [fetchProfile]);

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