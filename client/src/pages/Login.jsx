import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [step, setStep] = useState('login'); // 'login' | 'verify' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, verifyEmail, resendVerification, forgotPassword, resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(email, password);
      if (res.requiresVerification) {
        setStep('verify');
        setOtpCode('');
        setSuccessMsg(res.message || 'Please verify your email address to log in.');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setStep('verify');
        setOtpCode('');
        setSuccessMsg(err.response.data.message || 'Please enter your 6-digit verification code.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyEmail(email, otpCode);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Email verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await forgotPassword(email);
      setStep('reset');
      setSuccessMsg(res.message || `A 6-digit password reset code was sent to ${email}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit password reset code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resetPassword(email, otpCode, newPassword);
      setStep('login');
      setPassword('');
      setNewPassword('');
      setOtpCode('');
      setSuccessMsg(res.message || 'Password reset successfully! Log in with your new password.');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccessMsg('');
    try {
      if (step === 'reset') {
        const res = await forgotPassword(email);
        setSuccessMsg(res.message || 'A new password reset code has been sent to your email.');
      } else {
        const res = await resendVerification(email);
        setSuccessMsg(res.message || 'A new verification code has been sent to your email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {step === 'login' && (
          <>
            <h2>Log In to Running Territory</h2>
            <p className="auth-subtitle">Welcome back! Sign in to track your runs.</p>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      setStep('forgot');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-color)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <p className="auth-footer">
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </>
        )}

        {step === 'verify' && (
          <>
            <h2>🔐 Email Verification Required</h2>
            <p className="auth-subtitle">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <form onSubmit={handleVerifySubmit}>
              <div className="form-group">
                <label htmlFor="otpCode">6-Digit Verification Code</label>
                <input
                  type="text"
                  id="otpCode"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="otp-input"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
              </button>
            </form>

            <div className="verification-actions">
              <button
                type="button"
                onClick={handleResendCode}
                className="btn btn-outline btn-sm btn-block"
                style={{ marginTop: '0.75rem' }}
              >
                Resend Code
              </button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="btn btn-secondary btn-sm btn-block"
                style={{ marginTop: '0.5rem' }}
              >
                ← Back to Login
              </button>
            </div>
          </>
        )}

        {step === 'forgot' && (
          <>
            <h2>🔑 Forgot Password?</h2>
            <p className="auth-subtitle">
              Enter your registered email address and we'll send you a 6-digit password reset code.
            </p>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email Address</label>
                <input
                  type="email"
                  id="resetEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? 'Sending Reset Code...' : 'Send Reset Code'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setStep('login')}
              className="btn btn-secondary btn-sm btn-block"
              style={{ marginTop: '0.85rem' }}
            >
              ← Back to Login
            </button>
          </>
        )}

        {step === 'reset' && (
          <>
            <h2>🔑 Create New Password</h2>
            <p className="auth-subtitle">
              Enter the 6-digit reset code sent to <strong>{email}</strong> and choose a new password.
            </p>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="form-group">
                <label htmlFor="resetOtpCode">6-Digit Reset Code</label>
                <input
                  type="text"
                  id="resetOtpCode"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="otp-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting Password...' : 'Reset Password & Log In'}
              </button>
            </form>

            <div className="verification-actions">
              <button
                type="button"
                onClick={handleResendCode}
                className="btn btn-outline btn-sm btn-block"
                style={{ marginTop: '0.75rem' }}
              >
                Resend Code
              </button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="btn btn-secondary btn-sm btn-block"
                style={{ marginTop: '0.5rem' }}
              >
                ← Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
