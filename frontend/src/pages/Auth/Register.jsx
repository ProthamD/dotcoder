import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Mail, Lock, User, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: details
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, sendOtp, verifyOtp, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!email) {
            setError('Please enter your email');
            return;
        }
        setLoading(true);
        try {
            await sendOtp(email);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!otp || otp.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }
        setLoading(true);
        try {
            await verifyOtp(email, otp);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
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
            await register(name, email, password, otp);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setLoading(true);
        try {
            await sendOtp(email);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code');
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

    const renderStepIndicator = () => (
        <div className="otp-steps">
            <div className={`otp-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                <span className="otp-step-num">{step > 1 ? '✓' : '1'}</span>
                <span className="otp-step-label">Email</span>
            </div>
            <div className={`otp-step-line ${step > 1 ? 'active' : ''}`}></div>
            <div className={`otp-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                <span className="otp-step-num">{step > 2 ? '✓' : '2'}</span>
                <span className="otp-step-label">Verify</span>
            </div>
            <div className={`otp-step-line ${step > 2 ? 'active' : ''}`}></div>
            <div className={`otp-step ${step >= 3 ? 'active' : ''}`}>
                <span className="otp-step-num">3</span>
                <span className="otp-step-label">Details</span>
            </div>
        </div>
    );

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
                        <p className="auth-subtitle">
                            {step === 1 && 'Enter your email to get started'}
                            {step === 2 && 'Enter the verification code sent to your email'}
                            {step === 3 && 'Complete your profile'}
                        </p>
                    </div>

                    {renderStepIndicator()}

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Email */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="auth-form">
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

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-submit"
                                disabled={loading}
                            >
                                {loading ? 'Sending code...' : 'Send verification code'}
                                <ArrowRight size={18} />
                            </button>

                            <div className="auth-divider">
                                <span>or</span>
                            </div>

                            <div ref={googleBtnRef} className="google-btn-wrapper"></div>
                        </form>
                    )}

                    {/* Step 2: OTP Verification */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="auth-form">
                            <div className="otp-sent-info">
                                <ShieldCheck size={20} />
                                <span>Code sent to <strong>{email}</strong></span>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Verification Code</label>
                                <input
                                    type="text"
                                    className="input otp-input"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setOtp(val);
                                    }}
                                    maxLength={6}
                                    autoFocus
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-submit"
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify email'}
                                <CheckCircle size={18} />
                            </button>

                            <div className="otp-actions">
                                <button type="button" className="auth-link-btn" onClick={handleResendOtp} disabled={loading}>
                                    Resend code
                                </button>
                                <button type="button" className="auth-link-btn" onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                                    Change email
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Name & Password */}
                    {step === 3 && (
                        <form onSubmit={handleRegister} className="auth-form">
                            <div className="otp-sent-info otp-verified">
                                <CheckCircle size={20} />
                                <span><strong>{email}</strong> verified</span>
                            </div>

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
                                        autoFocus
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
                        </form>
                    )}

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
