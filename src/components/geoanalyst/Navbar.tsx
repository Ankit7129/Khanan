'use client';

import React from 'react';
import { Menu, Globe, FileText, Mail, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const GeoAnalystNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl border-b border-amber-500/20 h-16">
      <div className="max-w-full px-6 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform duration-300">
              <Globe className="h-8 w-8 text-[#1a1a2e]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent tracking-tight drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]">
                KhananNetra
              </h1>
              <span className="text-xs text-amber-200/80 font-medium uppercase tracking-wider">
                Geospatial-Mines Intelligence Platform
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#dashboard"
              className="text-amber-100 hover:text-amber-300 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2 group"
            >
              <Globe size={16} className="group-hover:text-amber-400 transition-colors" />
              <span>Dashboard</span>
            </a>
            <a
              href="#about"
              className="text-amber-100 hover:text-amber-300 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2 group"
            >
              <FileText size={16} className="group-hover:text-amber-400 transition-colors" />
              <span>About</span>
            </a>
            <a
              href="#contact"
              className="text-amber-100 hover:text-amber-300 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2 group"
            >
              <Mail size={16} className="group-hover:text-amber-400 transition-colors" />
              <span>Contact</span>
            </a>

            {/* User Info & Logout */}
            {user && (
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-amber-500/30">
                <span className="text-amber-100 text-sm">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-amber-100 hover:text-amber-300 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2 group"
                >
                  <LogOut size={16} className="group-hover:text-amber-400 transition-colors" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-amber-100 hover:text-amber-300 transition-colors duration-200 p-2"
            >
              <Menu size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default GeoAnalystNavbar;
