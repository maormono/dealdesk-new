import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Database, Shield, ChevronLeft, Calculator, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DealRules } from '../components/admin/DealRules';
import { TestWeightedPricing } from '../components/TestWeightedPricing';
import { supabase } from '../lib/supabase';

type AdminTab = 'rules' | 'operators' | 'templates' | 'test';

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

      // Check if user has admin role
      // First try user_profiles with user_id field
      let { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      // If that fails, try with id field
      if (profileError) {
        const result = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        profile = result.data;
      }

      // Also check hardcoded admin list (matching UserContext)
      const adminEmails = ['maor@monogoto.io', 'israel@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io'];
      const isHardcodedAdmin = adminEmails.includes(user.email || '');

      if (profile?.role !== 'admin' && !isHardcodedAdmin) {
        console.log('Access denied - not admin. User:', user.email, 'Role:', profile?.role);
        navigate('/');
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
    return null;
  }

  const tabs = [
    { id: 'rules' as AdminTab, label: 'Deal Rules', icon: DollarSign },
    { id: 'operators' as AdminTab, label: 'Operator Settings', icon: Database },
    { id: 'templates' as AdminTab, label: 'Deal Templates', icon: FileText },
    { id: 'test' as AdminTab, label: 'Test Pricing', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <h1 className="text-2xl font-semibold text-gray-900">DealDesk Admin</h1>
                  <p className="text-sm text-gray-500 mt-0.5">DealDesk configuration and settings</p>
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
        
        {activeTab === 'operators' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Operator Settings</h3>
              <p className="text-gray-500 mb-4">Configure operator-specific pricing rules and preferences.</p>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Default Markup Rules</h4>
                  <p className="text-sm text-gray-600">Set default markup percentages by operator tier</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Preferred Operators</h4>
                  <p className="text-sm text-gray-600">Mark operators as preferred for better deal scoring</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Blacklist Management</h4>
                  <p className="text-sm text-gray-600">Manage operators to exclude from deals</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deal Templates</h3>
              <p className="text-gray-500 mb-4">Create and manage reusable deal templates for common scenarios.</p>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">IoT Device Template</h4>
                  <p className="text-sm text-blue-700">Standard template for IoT device deployments</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Enterprise Mobility Template</h4>
                  <p className="text-sm text-green-700">Template for enterprise mobility solutions</p>
                </div>
                <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors">
                  + Create New Template
                </button>
              </div>
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