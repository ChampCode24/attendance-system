import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import API from '../api/axios';

const ScanQR = () => {
  const { courseId } = useParams(); // eslint-disable-line no-unused-vars
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permissionStep, setPermissionStep] = useState('idle');
  const [permissionError, setPermissionError] = useState('');
  const scannerRef = useRef(null); // eslint-disable-line no-unused-vars
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
  return () => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop().catch(() => {});
      } catch (e) {
        // Scanner already stopped, ignore
      }
    }
  };
}, []);

  const requestPermissions = async () => {
  setPermissionStep('requesting');
  setPermissionError('');

  try {
    // Request camera permission first
    try {
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (cameraErr) {
      setPermissionStep('denied');
      setPermissionError(`Camera access failed: ${cameraErr.message}. Please allow camera access in your browser settings.`);
      return;
    }

    // Request location permission
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000,
          enableHighAccuracy: false,
        });
      });
    } catch (locationErr) {
      setPermissionStep('denied');
      setPermissionError(`Location access failed: ${locationErr.message}. Please allow location access in your browser settings.`);
      return;
    }

    setPermissionStep('granted');
    startScanner();
  } catch (err) {
    setPermissionStep('denied');
    setPermissionError(`Permission error: ${err.message}`);
  }
};

  const startScanner = () => {
    setScanning(true);
    setResult(null);

    setTimeout(() => {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
  try {
    await html5QrCode.stop().catch(() => {});
  } catch (e) {
    // ignore
  }
  setScanning(false);
  await handleScanSuccess(decodedText);
},
        () => {}
      ).catch(() => {
        setPermissionError('Could not start camera. Please try again.');
        setScanning(false);
      });
    }, 100);
  };

  const handleScanSuccess = async (qr_payload) => {
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const fp = await FingerprintJS.load();
          const fpResult = await fp.get();
          const device_fingerprint = fpResult.visitorId;

          const res = await API.post('/attendance/scan', {
            qr_payload,
            student_lat: latitude,
            student_lng: longitude,
            device_fingerprint,
          });

          setResult({
            success: true,
            message: res.data.message,
            distance: res.data.distance,
            is_flagged: res.data.is_flagged,
          });
        } catch (err) {
          setResult({
            success: false,
            message: err.response?.data?.error || 'Scan failed. Please try again.',
          });
        } finally {
          setLoading(false);
        }
      },
      () => {
        setResult({
          success: false,
          message: 'Location access denied. Please enable location services and try again.',
        });
        setLoading(false);
      }
    );
  };

  const handleStopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop().catch(() => {});
    }
    setScanning(false);
    setPermissionStep('idle');
  };

  return (
    <div className="dashboard-container">
      <button onClick={() => navigate('/scan-home')} className="btn-back">
        ← Back to Courses
      </button>

      <div className="scan-container">
        <h2>Scan Attendance QR Code</h2>

        {/* Initial permission request screen */}
        {permissionStep === 'idle' && !result && !loading && (
          <div className="permission-screen">
            <div className="permission-icon">📍📷</div>
            <h3>Permissions Required</h3>
            <p>To mark your attendance, SmartAttendance needs access to:</p>
            <div className="permission-list">
              <div className="permission-item">
                <span className="permission-check">📷</span>
                <div>
                  <strong>Camera</strong>
                  <p>To scan the QR code displayed by your lecturer</p>
                </div>
              </div>
              <div className="permission-item">
                <span className="permission-check">📍</span>
                <div>
                  <strong>Location</strong>
                  <p>To verify you are physically present in the classroom. Your location is only used during attendance sessions and is never stored beyond verification.</p>
                </div>
              </div>
            </div>
            <button onClick={requestPermissions} className="btn-primary">
              Allow & Open Camera
            </button>
          </div>
        )}

        {/* Requesting permissions */}
        {permissionStep === 'requesting' && (
          <div className="loading-state">
            <p>Requesting permissions...</p>
          </div>
        )}

        {/* Permission denied */}
        {permissionStep === 'denied' && (
          <div className="result-card error">
            <h3>✗ Permission Denied</h3>
            <p>{permissionError}</p>
            <button
              onClick={() => setPermissionStep('idle')}
              className="btn-primary"
              style={{ marginTop: '1rem', width: 'auto' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Scanner */}
        {scanning && (
          <div className="scanner-wrapper">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Point your camera at the QR code on the lecturer's screen
            </p>
            <div id="qr-reader" style={{ width: '100%' }}></div>
            <button onClick={handleStopScanner} className="btn-secondary">
              Cancel
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <p>Verifying your attendance...</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`result-card ${result.success ? 'success' : 'error'}`}>
            <h3>{result.success ? '✓ Attendance Marked' : '✗ Scan Failed'}</h3>
            <p>{result.message}</p>
            {result.distance !== undefined && result.distance !== null && (
              <p className="distance-info">Distance from lecturer: {result.distance}m</p>
            )}
            {result.is_flagged && (
              <p className="flag-warning">
                ⚠️ Your scan has been flagged for review by the lecturer.
              </p>
            )}
            <button
              onClick={() => navigate('/student')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanQR;