import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-gray-900">
                ASQ3
              </Link>
              <div className="flex space-x-4">
                <Link to="/" className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Link>
                
                {hasRole("PARENT") && (
                  <Link to="/my-children" className="text-gray-700 hover:text-gray-900">
                    My Children
                  </Link>
                )}
                
                {hasRole(["SPECIALIST", "ADMIN"]) && (
                  <Link to="/children" className="text-gray-700 hover:text-gray-900">
                    All Children
                  </Link>
                )}
                
                <Link to="/questionnaires" className="text-gray-700 hover:text-gray-900">
                  Questionnaires
                </Link>
                
                {hasRole("ADMIN") && (
                  <Link to="/admin" className="text-gray-700 hover:text-gray-900">
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                {user?.role}
              </span>
              <span className="text-sm text-gray-600">
                {user?.username}
              </span>
            <button
              onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Logout
            </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

