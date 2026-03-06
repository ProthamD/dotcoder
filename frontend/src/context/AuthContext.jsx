import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const res = await api.get('/auth/me');
                setUser(res.data.data);
            } catch (error) {
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
    };

    const register = async (name, email, password, otp) => {
        const res = await api.post('/auth/register', { name, email, password, otp });
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
    };

    const sendOtp = async (email) => {
        const res = await api.post('/auth/send-otp', { email });
        return res.data;
    };

    const verifyOtp = async (email, otp) => {
        const res = await api.post('/auth/verify-otp', { email, otp });
        return res.data;
    };

    const googleLogin = async (credential) => {
        const res = await api.post('/auth/google', { credential });
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const updateSettings = async (settings) => {
        const res = await api.put('/auth/settings', { settings });
        setUser(res.data.data);
        return res.data.data;
    };

    const resendVerification = async () => {
        const res = await api.post('/auth/resend-verification');
        return res.data;
    };

    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const res = await api.get('/auth/me');
                setUser(res.data.data);
            } catch (error) {
                // ignore
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                sendOtp,
                verifyOtp,
                googleLogin,
                logout,
                updateSettings,
                resendVerification,
                refreshUser,
                isAuthenticated: !!user,
                isAdmin: user?.role === 'admin',
                isTrusted: user?.role === 'trusted'
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
