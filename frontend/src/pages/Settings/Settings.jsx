import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, User, Mail, Settings as SettingsIcon, Brain, Sparkles, Map, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import './Settings.css';

const Settings = () => {
    const { user, updateSettings, logout, resendVerification } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState('');
    const [settings, setSettings] = useState(user?.settings || {
        aiEnabled: true,
        mindmapEnabled: true,
        suggestionsEnabled: true
    });

    const handleToggle = async (key) => {
        const newSettings = {
            ...settings,
            [key]: !settings[key]
        };
        setSettings(newSettings);

        setLoading(true);
        try {
            await updateSettings(newSettings);
        } catch (error) {
            console.error('Error updating settings:', error);
            // Revert on error
            setSettings(settings);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleResendVerification = async () => {
        setVerifyLoading(true);
        setVerifyMessage('');
        try {
            const res = await resendVerification();
            setVerifyMessage(res.message || 'Verification email sent!');
        } catch (error) {
            setVerifyMessage(error.response?.data?.message || 'Failed to send verification email');
        } finally {
            setVerifyLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="container settings-container">
                <button
                    className="btn btn-ghost"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={18} />
                    Back
                </button>

                <div className="settings-header">
                    <h1 className="page-title">Settings</h1>
                    <p className="page-description">Manage your account and preferences</p>
                </div>

                {/* Email Verification Alert */}
                {!user?.emailVerified && (
                    <div className="verification-alert">
                        <div className="verification-alert-content">
                            <AlertTriangle size={20} className="verification-alert-icon" />
                            <div>
                                <h4>Email not verified</h4>
                                <p>Please verify your email address. Unverified accounts will be disabled within 15 business days.</p>
                                {verifyMessage && (
                                    <p className="verification-message">{verifyMessage}</p>
                                )}
                            </div>
                        </div>
                        <button
                            className="btn btn-warning"
                            onClick={handleResendVerification}
                            disabled={verifyLoading}
                        >
                            {verifyLoading ? 'Sending...' : 'Verify Now'}
                        </button>
                    </div>
                )}

                {/* Profile Section */}
                <div className="settings-section">
                    <div className="section-title-bar">
                        <User size={20} />
                        <h2>Profile</h2>
                    </div>
                    <div className="settings-card">
                        <div className="profile-info">
                            <div className="profile-avatar">
                                <User size={24} />
                            </div>
                            <div>
                                <h3>{user?.name}</h3>
                                <p>{user?.email}</p>
                                <div className="verification-badge" style={{ marginTop: '6px' }}>
                                    {user?.emailVerified ? (
                                        <span className="badge badge-success"><CheckCircle size={14} /> Verified</span>
                                    ) : (
                                        <span className="badge badge-warning"><AlertTriangle size={14} /> Not Verified</span>
                                    )}
                                    {user?.authProvider === 'google' && (
                                        <span className="badge badge-info"><Shield size={14} /> Google</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Features Section */}
                <div className="settings-section">
                    <div className="section-title-bar">
                        <Sparkles size={20} />
                        <h2>AI Features</h2>
                    </div>
                    <div className="settings-card">
                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-icon">
                                    <Brain size={20} />
                                </div>
                                <div>
                                    <h4>AI Assistance</h4>
                                    <p>Enable AI-powered features throughout the app</p>
                                </div>
                            </div>
                            <button
                                className={`toggle ${settings.aiEnabled ? 'active' : ''}`}
                                onClick={() => handleToggle('aiEnabled')}
                                disabled={loading}
                            />
                        </div>

                        <div className="divider" />

                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-icon">
                                    <Map size={20} />
                                </div>
                                <div>
                                    <h4>Mindmap Generation</h4>
                                    <p>Generate visual mindmaps from your notes</p>
                                </div>
                            </div>
                            <button
                                className={`toggle ${settings.mindmapEnabled ? 'active' : ''}`}
                                onClick={() => handleToggle('mindmapEnabled')}
                                disabled={loading || !settings.aiEnabled}
                            />
                        </div>

                        <div className="divider" />

                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-icon">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h4>Smart Suggestions</h4>
                                    <p>Get AI suggestions while editing</p>
                                </div>
                            </div>
                            <button
                                className={`toggle ${settings.suggestionsEnabled ? 'active' : ''}`}
                                onClick={() => handleToggle('suggestionsEnabled')}
                                disabled={loading || !settings.aiEnabled}
                            />
                        </div>
                    </div>
                </div>

                {/* Account Section */}
                <div className="settings-section">
                    <div className="section-title-bar">
                        <SettingsIcon size={20} />
                        <h2>Account</h2>
                    </div>
                    <div className="settings-card">
                        <button
                            className="btn btn-secondary settings-logout"
                            onClick={handleLogout}
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
