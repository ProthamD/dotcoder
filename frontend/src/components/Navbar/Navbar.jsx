import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Home,
    FileText,
    Settings,
    LogOut,
    User,
    Sparkles,
    MessageSquare,
    Menu,
    X
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setMobileMenuOpen(false);
    };

    const isActive = (path) => location.pathname === path;

    const handleNavClick = () => {
        setMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo" onClick={handleNavClick}>
                    <div className="logo-icon" style={{ transform: 'rotate(-8deg)' }}>
                        <span style={{ fontSize: '32px', fontWeight: '900', transform: 'rotate(8deg)', display: 'inline-block' }}>.</span>
                    </div>
                    <span className="logo-text">coder</span>
                </Link>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>

                {/* Navigation Links */}
                <div className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                    <Link
                        to="/"
                        className={`nav-link ${isActive('/') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        <Home size={18} />
                        <span>Home</span>
                    </Link>
                    <Link
                        to="/discussion"
                        className={`nav-link ${isActive('/discussion') || location.pathname.startsWith('/discussion/') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        <MessageSquare size={18} />
                        <span>Discussion</span>
                    </Link>
                    <Link
                        to="/cheatsheets"
                        className={`nav-link ${isActive('/cheatsheets') ? 'active' : ''}`}
                        onClick={handleNavClick}
                    >
                        <FileText size={18} />
                        <span>Cheatsheets</span>
                    </Link>

                    {/* Mobile-only user actions */}
                    <div className="mobile-user-section">
                        {user && (
                            <>
                                <div className="mobile-user-info">
                                    <div className="user-avatar">
                                        <User size={18} />
                                    </div>
                                    <span>{user.name}</span>
                                </div>
                                <Link
                                    to="/settings"
                                    className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                                    onClick={handleNavClick}
                                >
                                    <Settings size={18} />
                                    <span>Settings</span>
                                </Link>
                                <button
                                    className="nav-link mobile-logout"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Desktop User Menu */}
                <div className="navbar-user">
                    {user && (
                        <>
                            <div className="user-info">
                                <div className="user-avatar">
                                    <User size={18} />
                                </div>
                                <span className="user-name">{user.name}</span>
                            </div>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={() => navigate('/settings')}
                                title="Settings"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={handleLogout}
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
