import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isStaff: boolean;
  staffPermissions: string[];
  staffRole: string;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, referredBy?: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);
  const [staffRole, setStaffRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
            checkStaffRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsStaff(false);
          setStaffPermissions([]);
          setStaffRole("");
        }

        if (event === 'TOKEN_REFRESHED' && !session) {
          localStorage.removeItem('supabase.auth.token');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log('Session error, clearing:', error.message);
        supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
        checkStaffRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data && !error);
  };

  const checkStaffRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("staff_members")
      .select("role_title, permissions, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (data && !error) {
      setIsStaff(true);
      setStaffRole(data.role_title);
      setStaffPermissions(Array.isArray(data.permissions) ? data.permissions as string[] : []);
    } else {
      setIsStaff(false);
      setStaffPermissions([]);
      setStaffRole("");
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, referredBy?: string | null) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
          referred_by: referredBy,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsStaff(false);
    setStaffPermissions([]);
    setStaffRole("");
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isStaff, staffPermissions, staffRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
