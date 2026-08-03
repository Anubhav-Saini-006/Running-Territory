import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [step, setStep] = useState('login'); // 'login' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, verifyEmail, resendVerification } = useContext(AuthContext);
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

  const handleResendCode = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await resendVerification(email);
      setOtpCode('');
      setSuccessMsg(res.message || 'A new 6-digit verification code has been sent to your email!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {step === 'login' ? (
          <>
            <h2>Log In to Running Territory</h2>
            <p className="auth-subtitle">Welcome back! Sign in to track your runs.</p>

            {error && <div className="alert alert-danger">{error}</div>}

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
                <label htmlFor="password">Password</label>
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
        ) : (
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
      </div>
    </div>
  );
};

export default Login;
