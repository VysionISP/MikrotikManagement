import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Router,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

export function Sidebar() {
  const { user } = useAuth();
  const { orgId, siteId } = useParams();

  const topNav: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/organizations', icon: <Building2 size={18} />, label: 'Organizations' },
  ];

  const contextNav: NavItem[] = [];
  if (orgId) {
    contextNav.push({ to: `/organizations/${orgId}`, icon: <MapPin size={18} />, label: 'Sites' });
  }
  if (siteId) {
    contextNav.push({ to: `/sites/${siteId}`, icon: <Router size={18} />, label: 'Devices' });
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Router className="text-blue-400" size={22} />
          <span className="font-bold text-lg tracking-tight">MikroCloud</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Management Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {topNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {contextNav.length > 0 && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Context
              </p>
            </div>
            {contextNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <ChevronRight size={14} className="text-gray-500" />
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <NavLink to="/settings">
            <Settings size={16} className="text-gray-400 hover:text-white transition-colors" />
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
