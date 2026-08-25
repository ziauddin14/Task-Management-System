import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Users, FileText, Menu, X, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    queryClient.clear();
    if (typeof window !== 'undefined' && window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect();
    }
    navigate('/login');
  }

  function navLinkClass({ isActive }) {
    return [
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors border border-transparent',
      isActive
        ? 'bg-brand/10 text-brand border-brand/20'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200',
    ].join(' ');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      <header className="relative z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm no-print">
        
        {/* RIGHT SIDE (in RTL, this is DOM-first element) - User Avatar & Dropdown */}
        <div className="flex items-center" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-full py-1 pe-2 ps-1 hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 focus:outline-none"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-sm">
              {getInitials(user?.name)}
            </div>
            <div className="hidden flex-col items-start md:flex max-w-[120px] lg:max-w-[160px]">
              <span className="truncate w-full text-sm font-medium text-gray-900 leading-none text-start">{user?.name}</span>
            </div>
            <ChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute start-4 top-14 mt-1 w-56 rounded-lg border border-gray-100 bg-white shadow-lg ring-1 ring-black/5 z-50">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900 truncate text-start">{user?.name}</p>
                <p className="mt-0.5 text-xs text-gray-500 truncate text-start">
                  {user?.responsibility ? `${user.responsibility}` : ''}
                  {user?.responsibility && user?.role ? ' (' : ''}
                  {user?.role ? (user?.role === 'admin' ? 'Admin' : 'User') : ''}
                  {user?.responsibility && user?.role ? ')' : ''}
                </p>
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>لاگ آؤٹ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CENTER - System Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-max max-w-[50vw]">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-brand tracking-tight truncate text-center">
            ٹاسک مینجمنٹ سسٹم
          </h1>
        </div>

        {/* LEFT SIDE (in RTL, this is DOM-last element) - Action Buttons */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="relative" ref={mobileMenuRef}>
              {/* Desktop action buttons */}
              <nav className="hidden items-center gap-2 md:flex" aria-label="Admin navigation">
                <NavLink to="/users" className={navLinkClass}>
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>تمام یوزرز</span>
                </NavLink>
                <NavLink to="/reports/user-summary" className={navLinkClass}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span>یوزر سمری رپورٹ</span>
                </NavLink>
              </nav>

              {/* Mobile hamburger menu toggle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors md:hidden focus:outline-none"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              {/* Mobile action buttons dropdown */}
              {isMobileMenuOpen && (
                <div className="absolute end-0 top-14 mt-1 w-48 rounded-lg border border-gray-100 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50 md:hidden">
                  <div className="flex flex-col gap-1">
                    <NavLink to="/users" className={navLinkClass}>
                      <Users className="h-4 w-4" aria-hidden="true" />
                      <span>تمام یوزرز</span>
                    </NavLink>
                    <NavLink to="/reports/user-summary" className={navLinkClass}>
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <span>یوزر سمری رپورٹ</span>
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </header>
      <main className="flex-1 p-4 md:p-6 mx-auto w-full max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
