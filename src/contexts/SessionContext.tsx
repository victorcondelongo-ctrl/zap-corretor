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

  const fetchProfile = useCallback(async (currentUser: User) => {
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
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      // 1. Get initial user session
      const { data: { user: initialUser } } = await supabase.auth.getUser();
      
      if (!isMounted) return;

      setUser(initialUser);

      // 2. If user exists, fetch profile
      if (initialUser) {
        await fetchProfile(initialUser);
      }

      // 3. Stop loading state
      if (isMounted) {
        setLoading(false);
      }
    };

    initializeSession();

    // 4. Set up real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            setUser(currentUser);
            if (currentUser) {
                await fetchProfile(currentUser);
            }
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
        }
        // Note: We don't set loading=false here, as it was set in initializeSession
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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