import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Settings, LogOut, User } from 'lucide-react';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">ASQ-3</span>
              </Link>
              <div className="flex items-center gap-1">
                <Link to="/" className={navLinkClass('/')}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                {hasRole("PARENT") && (
                  <Link to="/my-children" className={navLinkClass('/my-children')}>
                    <Users className="w-4 h-4" />
                    My Children
                  </Link>
                )}
                {hasRole(["SPECIALIST", "ADMIN"]) && (
                  <Link to="/children" className={navLinkClass('/children')}>
                    <Users className="w-4 h-4" />
                    All Children
                  </Link>
                )}
                {hasRole("ADMIN") && (
                  <Link to="/admin" className={navLinkClass('/admin')}>
                    <Settings className="w-4 h-4" />
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user?.username}</span>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

