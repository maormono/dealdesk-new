import React, { useState, useEffect } from 'react';
import { Settings, Users, DollarSign, Database, Shield, ChevronLeft, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DealRules } from '../components/admin/DealRules';
import { UserManagement } from './UserManagement';
import { TestWeightedPricing } from '../components/TestWeightedPricing';
import { supabase } from '../lib/supabase';
import { getUserDealDeskPermissions } from '../lib/permissions';
import { AccessDenied } from './AccessDenied';

type AdminTab = 'rules' | 'users' | 'operators' | 'security' | 'test';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('rules');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
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

      // Check if user has admin role in DealDesk
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

  const tabs = [
    { id: 'rules' as AdminTab, label: 'Deal Rules', icon: DollarSign },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'operators' as AdminTab, label: 'Operators', icon: Database },
    { id: 'security' as AdminTab, label: 'Security', icon: Shield },
    { id: 'test' as AdminTab, label: 'Test Pricing', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-[#5B9BD5] to-[#9B7BB6] rounded-xl">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-500 mt-0.5">System configuration and management</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'text-[#5B9BD5] border-[#5B9BD5]'
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
      </div>

      {/* Tab Content */}
      <div className="py-8">
        {activeTab === 'rules' && <DealRules />}
        
        {activeTab === 'users' && (
          <div className="max-w-7xl mx-auto">
            <UserManagement />
          </div>
        )}
        
        {activeTab === 'operators' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Operator Configuration</h3>
              <p className="text-gray-500">Operator pricing and configuration coming soon...</p>
            </div>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
              <p className="text-gray-500">Security configuration coming soon...</p>
            </div>
          </div>
        )}
        
        {activeTab === 'test' && (
          <div className="max-w-4xl mx-auto p-6">
            <TestWeightedPricing />
          </div>
        )}
      </div>
    </div>
  );
};