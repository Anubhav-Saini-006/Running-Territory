import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, verifyEmail, resendVerification } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await register(username, email, password);
      if (res.requiresVerification) {
        setStep('verify');
        setOtpCode('');
        setSuccessMsg(res.message || `A 6-digit verification code was sent to ${email}. Check your inbox.`);
      } else {
        navigate('/');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed.';
      const isAlreadyRegistered = err.response?.data?.alreadyRegistered || errMsg.toLowerCase().includes('already registered');

      if (isAlreadyRegistered) {
        setSuccessMsg('This email is already registered! Redirecting to login page...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(errMsg);
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
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {step === 'register' ? (
          <>
            <h2>Register for Running Territory</h2>
            <p className="auth-subtitle">Create your account to start tracking runs.</p>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="runner123"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="runner@example.com"
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
                {isSubmitting ? 'Creating account...' : 'Register'}
              </button>
            </form>

            <p className="auth-footer">
              Already have an account? <Link to="/login">Log in here</Link>
            </p>
          </>
        ) : (
          <>
            <h2>🔐 Verify Your Email</h2>
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
                {isSubmitting ? 'Verifying Code...' : 'Verify Email & Enter'}
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
                onClick={() => setStep('register')}
                className="btn btn-secondary btn-sm btn-block"
                style={{ marginTop: '0.5rem' }}
              >
                ← Back to Registration
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
