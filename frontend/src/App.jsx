import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Home from './pages/Home/Home';
import ChapterDetail from './pages/Chapter/ChapterDetail';
import Cheatsheets from './pages/Cheatsheets/Cheatsheets';
import Settings from './pages/Settings/Settings';
import Discussion from './pages/Discussion/Discussion';
import ThreadDetail from './pages/Discussion/ThreadDetail';
import Blogs from './pages/Blog/Blogs';
import BlogDetail from './pages/Blog/BlogDetail';
import WriteBlog from './pages/Blog/WriteBlog';
import AdminBlogs from './pages/Blog/AdminBlogs';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" /> : children;
};

// Layout with Navbar
const AppLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Home />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chapter/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChapterDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cheatsheets"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Cheatsheets />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discussion"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Discussion />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discussion/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ThreadDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Blogs />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs/write"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WriteBlog />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BlogDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/blogs"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AdminBlogs />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
