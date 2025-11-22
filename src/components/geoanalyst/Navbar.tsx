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
    <nav className="bg-white shadow-md border-b border-gray-200 h-16">
      <div className="max-w-full px-6 h-full">
        <div className="flex justify-between items-center h-full">
          {/* Logo/Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 rounded-full p-2 shadow-sm hover:scale-110 transition-transform duration-300">
              <Globe className="h-8 w-8 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                KhananNetra
              </h1>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                Geospatial-Mines Intelligence Platform
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="#dashboard"
              className="text-gray-700 hover:text-gray-900 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2"
            >
              <Globe size={16} />
              <span>Dashboard</span>
            </a>
            <a
              href="#about"
              className="text-gray-700 hover:text-gray-900 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2"
            >
              <FileText size={16} />
              <span>About</span>
            </a>
            <a
              href="#contact"
              className="text-gray-700 hover:text-gray-900 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2"
            >
              <Mail size={16} />
              <span>Contact</span>
            </a>

            {/* User Info & Logout */}
            {user && (
              <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-200">
                <span className="text-gray-700 text-sm">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-gray-900 transition-colors duration-200 font-semibold text-sm uppercase tracking-wide flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 p-2"
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
