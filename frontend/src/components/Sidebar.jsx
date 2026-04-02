import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Clients', href: '/clients', icon: '👥' },
  { name: 'Workouts', href: '/workouts', icon: '💪' },
  { name: 'Metrics', href: '/metrics', icon: '📊' },
];

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useApp();

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full md:h-screen">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <h2 className="text-white text-lg font-semibold">ACEest</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200
                  ${isActive(item.href)
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              ACEest Fitness & Gym
              <br />
              Management System
            </div>
          </div>
        </div>
      </div>
    </>
  );
}