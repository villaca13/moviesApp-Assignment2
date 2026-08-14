import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SignInProps } from "../types/interfaces";
import { loginUser, logoutUser } from "../api/supabase-api";
import { supabase } from "../api/supabase-client";

interface AuthContextInterface {
  user: string | null;
  userId: string | null;
  token: string;
  login(data: SignInProps): Promise<void>;
  logout(): Promise<void>;
}

const initialAuthContext: AuthContextInterface = {
  user: null,
  userId: null,
  token: "",
  login: async () => {},
  logout: async () => {},
};

export const AuthContext = React.createContext<AuthContextInterface>(initialAuthContext);

const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Restore an existing session (e.g. after a page refresh)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser(data.session.user.email ?? null);
        setUserId(data.session.user.id);
        setToken(data.session.access_token);
      }
    });

    // Keep state in sync if the session changes elsewhere (refresh, other tab, sign-out)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setToken(session?.access_token ?? "");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (data: SignInProps) => {
    const session = await loginUser(data);
    setUser(session.user.email);
    setUserId(session.user.id);
    setToken(session.access_token);
    navigate("/dashboard");
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setUserId(null);
    setToken("");
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, userId, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;

export const useAuth = () => {
  return useContext(AuthContext);
};