import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
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
                <Link to="/questionnaires" className="text-gray-700 hover:text-gray-900">
                  Questionnaires
                </Link>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

