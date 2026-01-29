import React, { useState } from 'react';
import { Users, DollarSign, Database, Shield, Calculator, ClipboardList } from 'lucide-react';
import { DealRules } from '../components/admin/DealRules';
import { DealAudit } from '../components/admin/DealAudit';
import { UserManagement } from './UserManagement';
import { TestWeightedPricing } from '../components/TestWeightedPricing';
import { DataUpload } from '../components/DataUpload';
import { useUser } from '../contexts/UserContext';
import { AccessDenied } from './AccessDenied';

type AdminSection = 'users' | 'rules' | 'audit' | 'security' | 'test' | 'database';

// localStorage key for persisting admin state
const ADMIN_STORAGE_KEY = 'dealdesk_admin_state';

// Load saved state from localStorage
const loadAdminState = (): AdminSection => {
  try {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved).activeSection || 'users';
    }
  } catch (e) {
    console.warn('Failed to load admin state:', e);
  }
  return 'users';
};

export const Admin: React.FC = () => {
  // Use the already-loaded user permissions from context (no need to re-fetch)
  const { isAdmin } = useUser();
  const [activeSection, setActiveSection] = useState<AdminSection>(loadAdminState);

  // Save state when activeSection changes
  const handleSetActiveSection = (section: AdminSection) => {
    setActiveSection(section);
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ activeSection: section }));
    } catch (e) {
      console.warn('Failed to save admin state:', e);
    }
  };

  // ProtectedRoute already checks permissions, but double-check for admin
  if (!isAdmin) {
    return <AccessDenied />;
  }

  const renderTabContent = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagement />;
      case 'rules':
        return <DealRules />;
      case 'audit':
        return (
          <div className="p-6">
            <DealAudit />
          </div>
        );
      case 'test':
        return <TestWeightedPricing />;
      case 'security':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
            <p className="text-gray-500">Security configuration coming soon...</p>
          </div>
        );
      case 'database':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Management</h3>
            <p className="text-gray-500 mb-6">Upload and manage network pricing data. The uploaded data will be available in both localhost and production.</p>
            <DataUpload />
          </div>
        );
      default:
        return null;
    }
  };

  const adminTabs = [
    {
      id: 'users' as AdminSection,
      label: 'Users',
      icon: Users
    },
    {
      id: 'rules' as AdminSection,
      label: 'Deal Rules',
      icon: DollarSign
    },
    {
      id: 'audit' as AdminSection,
      label: 'Deal Audit',
      icon: ClipboardList
    },
    {
      id: 'security' as AdminSection,
      label: 'Security',
      icon: Shield
    },
    {
      id: 'test' as AdminSection,
      label: 'Test Pricing',
      icon: Calculator
    },
    {
      id: 'database' as AdminSection,
      label: 'Database',
      icon: Database
    }
  ];

  return (
    <div className="bg-gray-50 pt-20 flex-1">
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Admin Panel</h2>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-1">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSetActiveSection(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                      activeSection === tab.id
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="min-h-[600px]">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
};