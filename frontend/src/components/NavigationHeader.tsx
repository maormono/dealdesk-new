import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload, LogOut, Calculator, Shield, Book, X, ArrowLeft, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { NotesDictionary } from './NotesDisplay';
import monogotoLogo from '../assets/monogoto-logo.svg';

interface NavigationHeaderProps {}

export const NavigationHeader: React.FC<NavigationHeaderProps> = () => {
  const { user, signOut } = useAuth();
  const { userRole, isAdmin } = useUser();
  const location = useLocation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotesDictionary, setShowNotesDictionary] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active page
  const isActivePage = (path: string) => location.pathname === path;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={monogotoLogo} alt="Monogoto" className="h-8" />
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">DealDesk</h1>
                <p className="text-sm text-gray-500">Operator Pricing Analysis Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all border whitespace-nowrap ${
                  isActivePage('/')
                    ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-sm border-slate-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Networks Database</span>
              </Link>
              
              <Link 
                to="/deal-review"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all border whitespace-nowrap ${
                  isActivePage('/deal-review')
                    ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-sm border-slate-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Deal Review</span>
              </Link>
              
              <Link 
                to="/price-updater"
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all border whitespace-nowrap ${
                  isActivePage('/price-updater')
                    ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-sm border-slate-700'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Price Updater</span>
              </Link>
              
              {isAdmin && (
                <Link 
                  to="/admin"
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all border whitespace-nowrap ${
                    isActivePage('/admin')
                      ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-sm border-slate-700'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
              
              {user && (
                <div className="relative" ref={dropdownRef}>
                  {/* User Avatar */}
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:from-blue-600 hover:to-purple-700 transition-colors"
                    title="User Menu"
                  >
                    <span className="text-xs">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </button>
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center pointer-events-none">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  
                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500 capitalize">{userRole?.role || 'User'}</p>
                      </div>
                      <a
                        href="https://monogoto-os.netlify.app/dashboard"
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Monogoto OS</span>
                      </a>
                      <button
                        onClick={() => {
                          setShowNotesDictionary(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                      >
                        <Book className="w-4 h-4" />
                        <span>Notes Dictionary & Legend</span>
                      </button>
                      <div className="border-t border-gray-100" />
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
      </header>
      
      {/* Notes Dictionary Modal */}
      {showNotesDictionary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto relative">
            <button
              onClick={() => setShowNotesDictionary(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <NotesDictionary />
            </div>
          </div>
        </div>
      )}
    </>
  );
};