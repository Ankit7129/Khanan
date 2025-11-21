'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
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
    <nav className="bg-white shadow-md border-b border-gray-200">
      {/* Top Bar */}
      <div className="bg-[#16151D] px-4 sm:px-6 py-1.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1.5">
            <img
              src="https://doc.ux4g.gov.in/assets/img/icon/in-flag.png"
              alt="Indian flag"
              className="h-5 w-8 rounded-sm"
              loading="lazy"
            />
            <span className="text-sm font-bold text-white">
              NTRO (National Technical Research Organisation)
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <img
              src="https://doc.ux4g.gov.in/assets/img/logo/national-emblem.png"
              alt="National emblem"
              className="h-12 w-auto"
              loading="lazy"
            />
            <img
              src="/ntro logo.png"
              alt="NTRO"
              className="h-12 w-auto"
              loading="lazy"
            />
            <div className="hidden sm:block w-px h-10 bg-gray-300 rounded mx-1"></div>
            <div className="hidden sm:flex items-center space-x-1">
              <img
                src="/logo.png"
                alt="KhananNetra"
                className="h-12 w-auto"
                loading="lazy"
              />
              <span className="text-lg font-semibold text-gray-900" style={{ fontFamily: '"EB Garamond", "Garamond", "Times New Roman", serif', letterSpacing: '0.5px' }}>
                KhananNetra
              </span>
            </div>
          </div>

          {/* User Info & Logout */}
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default GeoAnalystNavbar;
