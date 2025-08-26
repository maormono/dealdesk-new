import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserX, 
  AlertCircle,
  CheckCircle,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  DollarSign
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
}

export function AdminUserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          role,
          can_see_costs,
          can_edit_pricing,
          can_export_data,
          markup_percentage,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get email addresses from auth.users
      const { data: authUsers, error: authError } = await supabase
        .rpc('get_all_users_admin');

      if (!authError && authUsers) {
        const enrichedUsers = profiles?.map(profile => {
          const authUser = authUsers.find((u: any) => u.id === profile.user_id);
          return {
            ...profile,
            email: authUser?.email || 'Unknown',
            last_sign_in: authUser?.last_sign_in_at || profile.created_at
          };
        }) || [];

        setUsers(enrichedUsers);

        // Calculate stats
        const adminCount = enrichedUsers.filter(u => u.role === 'admin').length;
        const salesCount = enrichedUsers.filter(u => u.role === 'sales').length;
        const viewerCount = enrichedUsers.filter(u => u.role === 'viewer').length;

        setStats({
          total_users: enrichedUsers.length,
          admin_count: adminCount,
          sales_count: salesCount,
          viewer_count: viewerCount
        });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setInviting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({ 
            email: newEmail,
            redirectTo: window.location.origin + '/auth/callback'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setMessage({ type: 'success', text: `Invitation sent to ${newEmail}` });
      setNewEmail('');
      loadUsers(); // Reload to show new user
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send invitation' });
    } finally {
      setInviting(false);
    }
  };

  const updateUserRole = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: updates.role,
          can_see_costs: updates.can_see_costs,
          can_edit_pricing: updates.can_edit_pricing,
          can_export_data: updates.can_export_data,
          markup_percentage: updates.markup_percentage,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'User updated successfully' });
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: 'Failed to update user' });
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete from user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Note: We can't delete from auth.users directly from client
      // This would need a server-side function
      
      setMessage({ type: 'success', text: 'User profile deleted' });
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Failed to delete user' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Admin</span>;
      case 'sales':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Sales</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Viewer</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B9BD5]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.admin_count || 0}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sales</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.sales_count || 0}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Viewers</p>
              <p className="text-2xl font-bold text-gray-600">{stats?.viewer_count || 0}</p>
            </div>
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Invite New User */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invite New User
        </h3>
        
        <div className="flex gap-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email address (e.g., user@monogoto.io)"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5B9BD5] focus:border-transparent"
            disabled={inviting}
          />
          <button
            onClick={inviteUser}
            disabled={inviting || !newEmail}
            className="px-6 py-2 bg-[#5B9BD5] text-white rounded-xl hover:bg-[#4A8AC4] disabled:opacity-50 flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
        
        {message && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Markup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((userProfile) => (
                <tr key={userProfile.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {userProfile.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{userProfile.email}</div>
                        <div className="text-xs text-gray-500">ID: {userProfile.user_id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {editingUser === userProfile.user_id ? (
                      <select
                        value={userProfile.role}
                        onChange={(e) => {
                          const newRole = e.target.value as 'admin' | 'sales' | 'viewer';
                          setUsers(users.map(u => 
                            u.user_id === userProfile.user_id 
                              ? { ...u, role: newRole }
                              : u
                          ));
                        }}
                        className="px-3 py-1 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="sales">Sales</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      getRoleBadge(userProfile.role)
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    {editingUser === userProfile.user_id ? (
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={userProfile.can_see_costs}
                            onChange={(e) => setUsers(users.map(u => 
                              u.user_id === userProfile.user_id 
                                ? { ...u, can_see_costs: e.target.checked }
                                : u
                            ))}
                          />
                          Costs
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={userProfile.can_edit_pricing}
                            onChange={(e) => setUsers(users.map(u => 
                              u.user_id === userProfile.user_id 
                                ? { ...u, can_edit_pricing: e.target.checked }
                                : u
                            ))}
                          />
                          Edit
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={userProfile.can_export_data}
                            onChange={(e) => setUsers(users.map(u => 
                              u.user_id === userProfile.user_id 
                                ? { ...u, can_export_data: e.target.checked }
                                : u
                            ))}
                          />
                          Export
                        </label>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {userProfile.can_see_costs && (
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">Costs</span>
                        )}
                        {userProfile.can_edit_pricing && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Edit</span>
                        )}
                        {userProfile.can_export_data && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">Export</span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    {editingUser === userProfile.user_id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={userProfile.markup_percentage}
                          onChange={(e) => setUsers(users.map(u => 
                            u.user_id === userProfile.user_id 
                              ? { ...u, markup_percentage: parseFloat(e.target.value) || 0 }
                              : u
                          ))}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900">{userProfile.markup_percentage}%</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {editingUser === userProfile.user_id ? (
                        <>
                          <button
                            onClick={() => updateUserRole(userProfile.user_id, userProfile)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Save changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              loadUsers(); // Reset changes
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingUser(userProfile.user_id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit user"
                            disabled={userProfile.user_id === user?.id}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(userProfile.user_id, userProfile.email)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete user"
                            disabled={userProfile.user_id === user?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}