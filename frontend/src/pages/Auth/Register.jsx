import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);
    const { register, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await register(name, email, password);
            setRegistered(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (response) => {
        try {
            setLoading(true);
            await googleLogin(response.credential);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Google sign-up failed');
        } finally {
            setLoading(false);
        }
    };

    // Load Google Sign-In script
    useState(() => {
        if (window.google) return;
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }, []);

    // Initialize Google button after script loads
    const googleBtnRef = (node) => {
        if (node && window.google?.accounts) {
            window.google.accounts.id.initialize({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                callback: handleGoogleSuccess
            });
            window.google.accounts.id.renderButton(node, {
                theme: 'filled_black',
                size: 'large',
                width: '100%',
                text: 'signup_with',
                shape: 'rectangular'
            });
        }
    };

    if (registered) {
        return (
            <div className="auth-page">
                <div className="auth-background">
                    <div className="auth-gradient-orb auth-gradient-orb-1"></div>
                    <div className="auth-gradient-orb auth-gradient-orb-2"></div>
                    <div className="auth-gradient-orb auth-gradient-orb-3"></div>
                </div>
                <div className="auth-container">
                    <div className="auth-card" style={{ textAlign: 'center' }}>
                        <CheckCircle size={48} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
                        <h2 className="auth-title">Check your email</h2>
                        <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
                            We've sent a verification link to <strong>{email}</strong>. Please verify your email to get full access.
                        </p>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => navigate('/')}
                        >
                            Continue to App
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-background">
                <div className="auth-gradient-orb auth-gradient-orb-1"></div>
                <div className="auth-gradient-orb auth-gradient-orb-2"></div>
                <div className="auth-gradient-orb auth-gradient-orb-3"></div>
            </div>

            <div className="auth-container">
                <div className="auth-card">
                    {/* Logo */}
                    <div className="auth-logo">
                        <div className="logo-icon-large" style={{ transform: 'rotate(-8deg)' }}>
                            <span style={{ fontSize: '64px', fontWeight: '900', transform: 'rotate(8deg)', display: 'inline-block' }}>.</span>
                        </div>
                        <h1 className="auth-title">Create account</h1>
                        <p className="auth-subtitle">Start your learning journey with .coder</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        {error && (
                            <div className="auth-error">
                                {error}
                            </div>
                        )}

                        <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <div className="input-with-icon">
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Email</label>
                            <div className="input-with-icon">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <div className="input-with-icon">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg auth-submit"
                            disabled={loading}
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                            <ArrowRight size={18} />
                        </button>

                        <div className="auth-divider">
                            <span>or</span>
                        </div>

                        <div ref={googleBtnRef} className="google-btn-wrapper"></div>
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login" className="auth-link">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
