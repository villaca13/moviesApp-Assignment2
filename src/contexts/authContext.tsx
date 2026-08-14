import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SignInProps } from "../types/interfaces";
import {  loginUser, logoutUser, getSession } from "../api/auth-api";

interface AuthContextInterface {
    user:  string | null,
    token:  string,
    login (data: SignInProps ): void,
    logout() :void,
}

const initialAuthContext: AuthContextInterface = {
    user: null,
    token: '',
    login: () => {},
    logout: () => {}
}

export const AuthContext = React.createContext<AuthContextInterface>(initialAuthContext);

const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const storedSession = getSession();
    const [user, setUser] = useState<string | null>(storedSession ? storedSession.email : null);
    const [token, setToken] = useState<string>(storedSession ? storedSession.token : '');
    const navigate = useNavigate();

    const login = (data: SignInProps) => {
        const session = loginUser(data);
        setUser(session.email);
        setToken(session.token);
        navigate('/dashboard');
    };

    const logout = () => {
        logoutUser();
        setUser(null);
        setToken('');
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ user,token, login, logout}}>
            { children }
        </AuthContext.Provider>
    )
};

export default AuthContextProvider;

export const useAuth = () => {
    return useContext(AuthContext)
}
