import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import LayoutWithSidebar from '../components/LayoutWithSidebar';

const API = process.env.REACT_APP_BACKEND_URL;

const PermissionManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/dashboard');
      return;
    }
    fetchPermissions();
  }, [user, navigate]);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get available permissions
      const availRes = await axios.get(`${API}/api/permissions/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAvailablePermissions(availRes.data.permissions);
      setRoles(availRes.data.roles);
      
      // Get current role permissions
      const rolesRes = await axios.get(`${API}/api/permissions/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const permsMap = {};
      rolesRes.data.role_permissions.forEach(rp => {
        permsMap[rp.role] = rp.permissions;
      });
      setRolePermissions(permsMap);
      
      if (availRes.data.roles.length > 0) {
        setSelectedRole(availRes.data.roles[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setMessage('Error loading permissions');
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission) => {
    const currentPerms = rolePermissions[selectedRole] || [];
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter(p => p !== permission)
      : [...currentPerms, permission];
    
    setRolePermissions({
      ...rolePermissions,
      [selectedRole]: newPerms
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/permissions/roles`,
        {
          role: selectedRole,
          permissions: rolePermissions[selectedRole] || []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage(`✓ Permissions saved for ${selectedRole}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving permissions: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToExisting = async () => {
    if (!confirm(`Apply these permissions to all existing ${selectedRole} users?`)) {
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/api/permissions/apply-to-existing-users/${selectedRole}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage(`✓ ${res.data.message}`);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('Error applying permissions: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const isPermissionChecked = (permission) => {
    return (rolePermissions[selectedRole] || []).includes(permission);
  };

  const getPermissionCount = (role) => {
    return (rolePermissions[role] || []).length;
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>Permission Management</h1>
          <p className="text-gray-600 mt-2">
            Configure default permissions for each role. These permissions will be automatically
            applied when creating new users.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Select Role</h2>
            <div className="space-y-2">
              {roles && roles.length > 0 ? (
                roles.map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedRole === role
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-medium capitalize">
                      {role.replace('_', ' ')}
                    </div>
                    <div className="text-sm opacity-75">
                      {getPermissionCount(role)} permissions
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-gray-500">No roles available</div>
              )}
            </div>
          </div>

          {/* Permission Configuration */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold capitalize">
                {selectedRole.replace('_', ' ')} Permissions
              </h2>
              <div className="space-x-2">
                <button
                  onClick={handleApplyToExisting}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  Apply to Existing Users
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {availablePermissions && Object.keys(availablePermissions).length > 0 ? (
                Object.entries(availablePermissions).map(([category, perms]) => (
                  <div key={category} className="border-b pb-6 last:border-0">
                    <h3 className="text-md font-semibold text-gray-700 mb-3 capitalize">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms && Object.entries(perms).map(([permKey, permLabel]) => (
                        <label
                          key={permKey}
                          className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isPermissionChecked(permKey)}
                            onChange={() => handlePermissionToggle(permKey)}
                            className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{permLabel}</div>
                            <div className="text-xs text-gray-500">{permKey}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No permissions available. Please check your backend configuration.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
            <li>Configure default permissions for each role</li>
            <li>When you create a new user with a specific role, these permissions are automatically applied</li>
            <li>You can also apply permissions to existing users with "Apply to Existing Users" button</li>
            <li>Individual user permissions can be customized later in User Management</li>
          </ul>
        </div>
      </div>
    </LayoutWithSidebar>
  );
};

export default PermissionManagement;
