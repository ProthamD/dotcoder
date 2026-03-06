import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import './Auth.css';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            verifyEmail(token);
        } else {
            setStatus('error');
            setMessage('No verification token provided');
        }
    }, [searchParams]);

    const verifyEmail = async (token) => {
        try {
            const res = await api.get(`/auth/verify-email/${token}`);
            setStatus('success');
            setMessage(res.data.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Verification failed');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-background">
                <div className="auth-gradient-orb auth-gradient-orb-1"></div>
                <div className="auth-gradient-orb auth-gradient-orb-2"></div>
                <div className="auth-gradient-orb auth-gradient-orb-3"></div>
            </div>

            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="auth-logo">
                        <div className="logo-icon-large" style={{ transform: 'rotate(-8deg)' }}>
                            <span style={{ fontSize: '64px', fontWeight: '900', transform: 'rotate(8deg)', display: 'inline-block' }}>.</span>
                        </div>
                    </div>

                    {status === 'verifying' && (
                        <>
                            <Loader size={48} className="verify-spinner" style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                            <h2 className="auth-title">Verifying your email...</h2>
                            <p className="auth-subtitle">Please wait while we verify your email address.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle size={48} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
                            <h2 className="auth-title">Email Verified!</h2>
                            <p className="auth-subtitle" style={{ marginBottom: '24px' }}>{message}</p>
                            <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', gap: '8px' }}>
                                Continue to Login
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
                            <h2 className="auth-title">Verification Failed</h2>
                            <p className="auth-subtitle" style={{ marginBottom: '24px' }}>{message}</p>
                            <Link to="/login" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', gap: '8px' }}>
                                Go to Login
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
