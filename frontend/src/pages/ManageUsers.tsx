import React, { useState, useEffect } from 'react';
import { UserPlus, Users } from 'lucide-react';
import CreateAdminModal from '../components/CreateAdminModal';
import CreateUserModal from '../components/CreateUserModal';
import AssignTaskModal from '../components/AssignTaskModal';
import EditUserModal from '../components/EditUserModal';
import './ManageUsers.css';

interface AppUser {
  _id: string;
  name?: string;
  email: string;
  role: string;
  organization?: string;
  state?: string;
  isActive: boolean;
  createdAt: string;
}

const getRoleBadgeClass = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'role-badge superadmin';
  if (role === 'ADMIN') return 'role-badge admin';
  return 'role-badge user';
};

const getRoleLabel = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'superadmin';
  if (role === 'ADMIN') return 'admin';
  return 'user';
};

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<AppUser | null>(null);
  const [editUser, setEditUser] = useState<AppUser | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        alert(`User "${userName}" was successfully deleted and moved to Recycle Bin.`);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user.');
      }
    } catch (error) {
      alert('An error occurred while deleting.');
    }
  };

  const handleEditUser = (userToEdit: AppUser) => {
    setEditUser(userToEdit);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="manage-users">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <span className="section-badge">USER MANAGEMENT</span>
          <h1>Manage Users</h1>
          <p>View, assign and manage all registered users across editions. Create new admin accounts below.</p>
        </div>
        <div className="header-actions">
          {user.role === 'SUPER_ADMIN' && (
            <>
              <button className="btn-create-admin" onClick={() => setIsCreateAdminOpen(true)}>
                <UserPlus size={16} />
                + Create Admin
              </button>
              <button className="btn-create-user" onClick={() => setIsCreateUserOpen(true)}>
                <Users size={16} />
                + Create User
              </button>
              <button className="btn-bulk-import">
                <span style={{ color: '#f59e0b' }}>📁</span> Bulk Import Users
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <div className="table-topbar">
          <div className="table-count">
            <span className="count-title">All Users</span>
            <span className="count-badge">{loading ? '...' : users.length}</span>
          </div>
          <div className="search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>ORGANIZATION</th>
                <th>STATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <div className="empty-content"><p>Loading users...</p></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <div className="empty-content">
                      <Users size={40} color="#cbd5e1" />
                      <p>No users found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((appUser) => (
                  <tr key={appUser._id}>
                    <td>
                      <span className="user-id">
                        {appUser.role === 'SUPER_ADMIN' ? 'user_superadmin' : `user_${appUser.email.split('@')[0]}`}
                      </span>
                    </td>
                    <td>
                      <div className="user-name-cell">
                        <span className="name">{appUser.name || appUser.email.split('@')[0]}</span>
                        <span className="username">{getRoleLabel(appUser.role)}</span>
                      </div>
                    </td>
                    <td>{appUser.email}</td>
                    <td>
                      <span className={getRoleBadgeClass(appUser.role)}>
                        {getRoleLabel(appUser.role)}
                      </span>
                    </td>
                    <td>{appUser.organization || 'DPIIT'}</td>
                    <td>{appUser.state || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                    <td>
                      <div className="actions-cell">
                        {appUser.role === 'USER' && user.role === 'SUPER_ADMIN' && (
                          <button
                            className="btn-action-assign"
                            onClick={() => setAssignUser(appUser)}
                          >
                            Assign
                          </button>
                        )}
                        <button 
                          className="btn-action-edit"
                          onClick={() => handleEditUser(appUser)}
                        >
                          Edit
                        </button>
                        {appUser.role !== 'SUPER_ADMIN' && user.role === 'SUPER_ADMIN' && (
                          <>
                            <button
                              className="btn-action-delete"
                              onClick={() => handleDeleteUser(appUser._id, appUser.name || appUser.email)}
                            >
                              Delete
                            </button>
                            <button className="btn-action-deactivate">
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateAdminOpen && (
        <CreateAdminModal
          onClose={() => setIsCreateAdminOpen(false)}
          onSuccess={() => {
            setIsCreateAdminOpen(false);
            fetchUsers();
          }}
        />
      )}

      {isCreateUserOpen && (
        <CreateUserModal
          onClose={() => setIsCreateUserOpen(false)}
          onSuccess={() => {
            setIsCreateUserOpen(false);
            fetchUsers();
          }}
        />
      )}

      {assignUser && (
        <AssignTaskModal
          user={assignUser}
          onClose={() => setAssignUser(null)}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

export default ManageUsers;
