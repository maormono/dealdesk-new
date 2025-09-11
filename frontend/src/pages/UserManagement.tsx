import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  DollarSign, 
  UserX, 
  AlertCircle,
  CheckCircle,
  Activity,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface UserProfile {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in: string;
  role: 'admin' | 'sales' | 'viewer';
  can_see_costs: boolean;
  can_edit_pricing: boolean;
  can_export_data: boolean;
  markup_percentage: number;
}

interface UserStats {
  total_users: number;
  admin_count: number;
  sales_count: number;
  viewer_count: number;
  users_last_7_days: number;
  users_last_30_days: number;
}

export function UserManagement() {
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; markup: number } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  // Recalculate stats when users change
  useEffect(() => {
    if (users.length > 0) {
      fetchStats();
    }
  }, [users]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      
      // Fetch from user_profiles table directly
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        
        // Check if it's an RLS recursion error
        if (profilesError.message?.includes('infinite recursion')) {
          setMessage({ 
            type: 'error', 
            text: 'Database configuration issue detected. Please run the fix-rls-recursion.sql script in Supabase.' 
          });
        }
        
        // Show current user as fallback
        const currentUserProfile: UserProfile = {
          user_id: user?.id || 'current-user-id',
          email: user?.email || 'admin@monogoto.io',
          created_at: new Date().toISOString(),
          last_sign_in: new Date().toISOString(),
          role: 'admin',
          can_see_costs: true,
          can_edit_pricing: true,
          can_export_data: true,
          markup_percentage: 50
        };
        setUsers([currentUserProfile]);
      } else {
        // Map profiles to UserProfile interface
        const formattedUsers: UserProfile[] = (profiles || []).map(profile => ({
          user_id: profile.user_id || profile.id,
          email: profile.email || 'Unknown',
          created_at: profile.created_at,
          last_sign_in: profile.updated_at || profile.created_at,
          role: profile.role || 'viewer',
          can_see_costs: profile.can_see_costs ?? false,
          can_edit_pricing: profile.can_edit_pricing ?? false,
          can_export_data: profile.can_export_data ?? false,
          markup_percentage: profile.markup_percentage || 50
        }));
        
        console.log('Users data received:', formattedUsers);
        setUsers(formattedUsers);
        setMessage(null);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      // Show current user as fallback
      const fallbackUser: UserProfile = {
        user_id: user?.id || 'current-user',
        email: user?.email || 'current@monogoto.io',
        created_at: new Date().toISOString(),
        last_sign_in: new Date().toISOString(),
        role: 'admin',
        can_see_costs: true,
        can_edit_pricing: true,
        can_export_data: true,
        markup_percentage: 50
      };
      setUsers([fallbackUser]);
      setMessage({ 
        type: 'error', 
        text: 'Unable to load all users. Showing current user only.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching user statistics...');
      
      // Calculate stats from the users array
      const total = users.length;
      const adminCount = users.filter(u => u.role === 'admin').length;
      const salesCount = users.filter(u => u.role === 'sales').length;
      const viewerCount = users.filter(u => u.role === 'viewer').length;
      
      // Calculate recent users (mock data for now)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const usersLast7Days = users.filter(u => 
        new Date(u.created_at) >= sevenDaysAgo
      ).length;
      
      const usersLast30Days = users.filter(u => 
        new Date(u.created_at) >= thirtyDaysAgo
      ).length;
      
      const stats: UserStats = {
        total_users: total,
        admin_count: adminCount,
        sales_count: salesCount,
        viewer_count: viewerCount,
        users_last_7_days: usersLast7Days,
        users_last_30_days: usersLast30Days
      };
      
      console.log('Stats calculated:', stats);
      setStats(stats);
    } catch (error: any) {
      console.error('Error calculating stats:', error);
      // Set default stats
      setStats({
        total_users: users.length,
        admin_count: 1,
        sales_count: 0,
        viewer_count: 0,
        users_last_7_days: 0,
        users_last_30_days: 0
      });
    }
  };

  const handleRoleUpdate = async (userId: string) => {
    if (!editForm) return;

    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: editForm.role,
        new_markup: editForm.markup
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'User role updated successfully' });
      setEditingUser(null);
      setEditForm(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update user role' });
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const { error } = await supabase.rpc('deactivate_user', {
        target_user_id: userId
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'User deactivated successfully' });
      fetchUsers();
      fetchStats();
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to deactivate user' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.endsWith('@monogoto.io')) {
      setMessage({ type: 'error', text: 'Only @monogoto.io email addresses are allowed' });
      return;
    }

    setInviting(true);
    try {
      // Use the correct production URL if on Netlify, otherwise use current origin
      const baseUrl = window.location.hostname.includes('netlify.app') 
        ? 'https://deal-desk.netlify.app'
        : window.location.origin;
      const redirectUrl = `${baseUrl}/auth/callback`;
      
      console.log('Sending invitation to:', inviteEmail);
      console.log('Redirect URL:', redirectUrl);
      
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to invite users');
      }
      
      // Call the Edge Function to invite the user
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: inviteEmail,
          redirectTo: redirectUrl
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error === 'User already exists') {
          setMessage({ 
            type: 'error', 
            text: data.message || 'This user is already registered.' 
          });
        } else {
          throw new Error(data.error);
        }
      } else {
        setMessage({ 
          type: 'success', 
          text: data.message || `Invitation sent to ${inviteEmail}. They will receive an email to set up their account.` 
        });
        setInviteEmail('');
        
        // Refresh users list after a delay to show new user
        setTimeout(() => {
          fetchUsers();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error inviting user:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to send invitation';
      if (error.message?.includes('Only admins')) {
        errorMessage = 'Only administrators can invite new users.';
      } else if (error.message?.includes('rate')) {
        errorMessage = 'Too many invitation attempts. Please wait a few minutes and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setInviting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'sales':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 pt-20 flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-purple-600">{stats.admin_count}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sales</p>
                <p className="text-2xl font-bold text-blue-600">{stats.sales_count}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viewers</p>
                <p className="text-2xl font-bold text-gray-600">{stats.viewer_count}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active (7d)</p>
                <p className="text-2xl font-bold text-green-600">{stats.users_last_7_days}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active (30d)</p>
                <p className="text-2xl font-bold text-green-600">{stats.users_last_30_days}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      )}

      <main>
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Invite New User Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite New User</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@monogoto.io"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{inviting ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Only @monogoto.io email addresses can be invited
          </p>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Markup %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userProfile) => (
                  <tr key={userProfile.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium">
                            {userProfile.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{userProfile.email}</p>
                          {userProfile.user_id === user?.id && (
                            <p className="text-xs text-gray-500">You</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === userProfile.user_id ? (
                        <select
                          value={editForm?.role || userProfile.role}
                          onChange={(e) => setEditForm({ ...editForm!, role: e.target.value })}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="admin">Admin</option>
                          <option value="sales">Sales</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRoleBadgeColor(userProfile.role)}`}>
                          {userProfile.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {userProfile.can_see_costs && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                            See Costs
                          </span>
                        )}
                        {userProfile.can_edit_pricing && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            Edit Pricing
                          </span>
                        )}
                        {userProfile.can_export_data && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                            Export
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === userProfile.user_id && editForm?.role === 'sales' ? (
                        <input
                          type="number"
                          value={editForm?.markup || 0}
                          onChange={(e) => setEditForm({ ...editForm!, markup: parseFloat(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          min="0"
                          max="999"
                          step="0.1"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          {userProfile.role === 'sales' ? `${userProfile.markup_percentage}%` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userProfile.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(userProfile.last_sign_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingUser === userProfile.user_id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRoleUpdate(userProfile.user_id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              setEditForm(null);
                            }}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(userProfile.user_id);
                              setEditForm({
                                role: userProfile.role,
                                markup: userProfile.markup_percentage
                              });
                            }}
                            disabled={userProfile.user_id === user?.id}
                            className="text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeactivate(userProfile.user_id)}
                            disabled={userProfile.user_id === user?.id || userProfile.role === 'admin'}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}