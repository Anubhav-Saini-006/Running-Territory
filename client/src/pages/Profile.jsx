import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { formatPace } from '../utils/geo';

const Profile = () => {
  const { user: authUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', profilePicture: '' });
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users/profile');
      setProfile(res.data);
      setEditForm({
        name: res.data.user.name || '',
        bio: res.data.user.bio || '',
        profilePicture: res.data.user.profilePicture || ''
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
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
      alert('Error saving profile modifications.');
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading runner profile...</div>;
  }

  if (error || !profile) {
    return <div className="alert alert-danger">{error || 'Profile not found.'}</div>;
  }

  const { user, recentRuns } = profile;

  return (
    <div className="profile-container">
      {saveSuccess && <div className="toast-notification">{saveSuccess}</div>}

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
            <span>📅 Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            <span>✉️ {user.email}</span>
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
                <label>Profile Picture URL</label>
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
          <span className="stat-value">{(user.totalDistance / 1000).toFixed(2)} km</span>
          <span className="stat-label">Total Distance</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">👟</span>
          <span className="stat-value">{user.totalRuns}</span>
          <span className="stat-label">Total Runs</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-value">{(user.longestRun / 1000).toFixed(2)} km</span>
          <span className="stat-label">Longest Run</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">⚡</span>
          <span className="stat-value">{formatPace(user.averagePace)}</span>
          <span className="stat-label">Avg Pace</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{user.currentStreak} Days</span>
          <span className="stat-label">Active Streak</span>
        </div>

        <div className="profile-stat-card">
          <span className="stat-icon">🥗</span>
          <span className="stat-value">{user.caloriesBurned} kcal</span>
          <span className="stat-label">Calories Burned</span>
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
                  <span>🔥 {run.calories || Math.round((run.distance / 1000) * 65)} kcal</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
