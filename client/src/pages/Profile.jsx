import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { formatPace } from '../utils/geo';
import ConfirmModal from '../components/ConfirmModal';

const Profile = () => {
  const { user: authUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', profilePicture: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Delete Account States
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users/profile');
      if (res.data && res.data.user) {
        setProfile(res.data);
        setEditForm({
          name: res.data.user.name || '',
          bio: res.data.user.bio || '',
          profilePicture: res.data.user.profilePicture || ''
        });
      } else {
        throw new Error('Invalid profile payload');
      }
    } catch (err) {
      console.warn('Profile fetch warning (using fallback defaults for new user):', err);
      const fallbackUser = {
        id: authUser?.id || '',
        name: authUser?.name || authUser?.username || 'Runner',
        username: authUser?.username || 'runner',
        email: authUser?.email || '',
        bio: authUser?.bio || 'Runner exploring territories one kilometer at a time.',
        profilePicture: authUser?.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        createdAt: authUser?.createdAt || new Date(),
        totalDistance: 0,
        totalRuns: 0,
        longestRun: 0,
        averagePace: 0,
        currentStreak: 0
      };
      setProfile({ user: fallbackUser, recentRuns: [] });
      setEditForm({
        name: fallbackUser.name,
        bio: fallbackUser.bio,
        profilePicture: fallbackUser.profilePicture
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        setUploadingPhoto(true);
        setErrorMsg('');
        const res = await axios.post('/api/users/profile/upload-photo', { image: base64Data });
        setEditForm((prev) => ({ ...prev, profilePicture: res.data.profilePicture }));
        setProfile((prev) => ({
          ...prev,
          user: { ...prev.user, profilePicture: res.data.profilePicture }
        }));
        setSaveSuccess('📷 Profile photo uploaded successfully!');
        setTimeout(() => setSaveSuccess(''), 3000);
      } catch (err) {
        console.error('Gallery photo upload error:', err);
        setErrorMsg(err.response?.data?.message || 'Error uploading photo to Cloudinary.');
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      const res = await axios.put('/api/users/profile', editForm);
      setProfile((prev) => ({
        ...prev,
        user: { ...prev.user, ...res.data.user }
      }));
      setIsEditing(false);
      setSaveSuccess('🎉 Profile updated successfully!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMsg('Error saving profile modifications.');
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password to authorize account deletion.');
      return;
    }

    try {
      setDeletingAccount(true);
      setDeleteError('');
      await axios.delete('/api/users/profile', { data: { password: deletePassword } });
      setShowDeleteModal(false);
      logout();
      navigate('/register');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeleteError(err.response?.data?.message || 'Error deleting account. Please check your password.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading runner profile...</div>;
  }

  const user = profile?.user || {
    name: authUser?.username || 'Runner',
    username: authUser?.username || 'runner',
    email: authUser?.email || '',
    bio: 'Runner exploring territories one kilometer at a time.',
    profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    createdAt: new Date(),
    totalDistance: 0,
    totalRuns: 0,
    longestRun: 0,
    averagePace: 0,
    currentStreak: 0
  };

  const recentRuns = profile?.recentRuns || [];

  return (
    <div className="profile-container">
      <ConfirmModal
        isOpen={showDeleteModal}
        title="⚠️ Delete Account & Territory Data?"
        message="Are you sure you want to permanently delete your Running Territory profile? All of your saved routes, statistics, and account details will be permanently erased. This action CANNOT be undone."
        confirmText={deletingAccount ? 'Deleting...' : 'Permanently Delete My Account'}
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteError('');
        }}
      />

      {saveSuccess && <div className="toast-notification">{saveSuccess}</div>}
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

      {/* Top Banner / User Info Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrapper">
          <img
            src={user.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
            alt={user.username}
            className="profile-avatar"
          />
        </div>

        <div className="profile-header-info">
          <div className="profile-name-row">
            <h2>{user.name || user.username}</h2>
            <span className="profile-username-tag">@{user.username}</span>
            <button onClick={() => setIsEditing(true)} className="btn btn-outline btn-sm edit-btn">
              ✏️ Edit Profile
            </button>
          </div>

          <p className="profile-bio">{user.bio || 'No bio provided yet.'}</p>
          <div className="profile-meta">
            <span>📅 Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
            {user.email && <span>✉️ {user.email}</span>}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Runner Profile</h3>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  rows="3"
                  className="form-textarea"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell others about your running goals..."
                />
              </div>

              <div className="form-group">
                <label>Choose Profile Picture from Device Gallery</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ marginTop: '0.25rem' }}
                />
                {uploadingPhoto && <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>Uploading to Cloudinary...</span>}
              </div>

              <div className="form-group">
                <label>Or Enter Image URL</label>
                <input
                  type="url"
                  value={editForm.profilePicture}
                  onChange={(e) => setEditForm({ ...editForm, profilePicture: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Runner Telemetry Stats Grid */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <span className="stat-icon">🏃‍♂️</span>
          <span className="stat-value">{((user.totalDistance || 0) / 1000).toFixed(2)} km</span>
          <span className="stat-label">Total Distance</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">👟</span>
          <span className="stat-value">{user.totalRuns || 0}</span>
          <span className="stat-label">Total Runs</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-value">{((user.longestRun || 0) / 1000).toFixed(2)} km</span>
          <span className="stat-label">Longest Run</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">⚡</span>
          <span className="stat-value">{formatPace(user.averagePace || 0)}</span>
          <span className="stat-label">Avg Pace</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{user.currentStreak || 0} Days</span>
          <span className="stat-label">Active Streak</span>
        </div>
      </div>

      {/* Recent Runs Activity */}
      <div className="profile-recent-section">
        <h3>Recent Activity History</h3>
        {recentRuns.length === 0 ? (
          <p className="no-runs-message">No completed runs recorded yet. Hit the road to claim your territory!</p>
        ) : (
          <div className="recent-runs-list">
            {recentRuns.map((run) => (
              <div key={run._id} className="recent-run-card">
                <div className="run-card-header">
                  <span className="run-date">{new Date(run.startedAt).toLocaleDateString()}</span>
                  <span className="run-dist-badge">{(run.distance / 1000).toFixed(2)} km</span>
                </div>
                <div className="run-card-metrics">
                  <span>⏱️ {Math.floor(run.duration / 60)} mins</span>
                  <span>⚡ {formatPace(run.averagePace)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Account Section */}
      <div className="danger-zone-card" style={{ marginTop: '2.5rem', padding: '1.5rem', border: '1px solid var(--danger-color)', borderRadius: '12px', background: 'rgba(220, 38, 38, 0.04)' }}>
        <h4 style={{ color: 'var(--danger-color)', marginBottom: '0.5rem' }}>🗑️ Delete Runner Account</h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Deleting your account will permanently purge your profile, saved routes, and territory records from our database.
        </p>

        {deleteError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{deleteError}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="password"
            className="form-control"
            style={{ maxWidth: '280px', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
            placeholder="Enter password to confirm"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <button
            onClick={() => {
              if (!deletePassword) {
                setDeleteError('Please enter your password first to proceed with account deletion.');
                return;
              }
              setDeleteError('');
              setShowDeleteModal(true);
            }}
            className="btn btn-danger btn-sm"
          >
            Delete Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
