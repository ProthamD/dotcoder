import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Home,
    FileText,
    Settings,
    LogOut,
    User,
    Sparkles,
    MessageSquare
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <div className="logo-icon" style={{ transform: 'rotate(-8deg)' }}>
                        <span style={{ fontSize: '32px', fontWeight: '900', transform: 'rotate(8deg)', display: 'inline-block' }}>.</span>
                    </div>
                    <span className="logo-text">coder</span>
                </Link>

                {/* Navigation Links */}
                <div className="navbar-links">
                    <Link
                        to="/"
                        className={`nav-link ${isActive('/') ? 'active' : ''}`}
                    >
                        <Home size={18} />
                        <span>Home</span>
                    </Link>
                    <Link
                        to="/discussion"
                        className={`nav-link ${isActive('/discussion') || location.pathname.startsWith('/discussion/') ? 'active' : ''}`}
                    >
                        <MessageSquare size={18} />
                        <span>Discussion</span>
                    </Link>
                    <Link
                        to="/cheatsheets"
                        className={`nav-link ${isActive('/cheatsheets') ? 'active' : ''}`}
                    >
                        <FileText size={18} />
                        <span>Cheatsheets</span>
                    </Link>
                </div>

                {/* User Menu */}
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
