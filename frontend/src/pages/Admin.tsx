import React, { useState, useEffect } from 'react';
import { Settings, Users, DollarSign, Database, Shield, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserDealDeskPermissions } from '../lib/permissions';
import { AccessDenied } from './AccessDenied';
import { DealRules } from '../components/admin/DealRules';
import { UserManagement } from './UserManagement';
import { TestWeightedPricing } from '../components/TestWeightedPricing';

type AdminSection = 'users' | 'rules' | 'operators' | 'security' | 'test' | 'system';

export const Admin: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('users');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      const permissions = await getUserDealDeskPermissions(user.id);
      const hasAdminAccess = permissions.role === 'admin';

      if (!hasAdminAccess) {
        console.log('Access denied - not DealDesk admin. User:', user.email);
        setIsAdmin(false);
        return;
      }

      console.log('Admin access granted for:', user.email);
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B9BD5]"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  const renderTabContent = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagement />;
      case 'rules':
        return <DealRules />;
      case 'test':
        return <TestWeightedPricing />;
      case 'operators':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Operator Configuration</h3>
            <p className="text-gray-500">Operator pricing and configuration coming soon...</p>
          </div>
        );
      case 'security':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
            <p className="text-gray-500">Security configuration coming soon...</p>
          </div>
        );
      case 'system':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Configuration</h3>
            <p className="text-gray-500">System configuration coming soon...</p>
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
      id: 'operators' as AdminSection,
      label: 'Operators',
      icon: Database
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
      id: 'system' as AdminSection,
      label: 'System',
      icon: Settings
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
                    onClick={() => setActiveSection(tab.id)}
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