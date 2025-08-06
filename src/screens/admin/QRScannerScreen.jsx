import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QRScannerScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [manualQRData, setManualQRData] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      // For now, we'll implement manual QR data entry
      // In a real implementation, you'd use a QR code reading library like jsQR
      alert('Please use the manual QR data entry below for now. In production, this would automatically read the QR code from the image.');
    } catch (error) {
      setError('Failed to read QR code from image');
    } finally {
      setIsScanning(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualQRData.trim()) {
      setError('Please enter QR data');
      return;
    }

    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      // Validate QR data format
      let parsedData;
      try {
        parsedData = JSON.parse(manualQRData);
      } catch (parseError) {
        throw new Error('Invalid QR code format. Please check the data.');
      }

      if (parsedData.type !== 'VISITOR_PASS' || !parsedData.id) {
        throw new Error('Invalid visitor pass QR code');
      }

      // Send to backend for processing
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tour/scan-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ qrData: manualQRData })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to process QR code');
      }

      setScanResult(result);
      setManualQRData('');
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setError(error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBack = () => {
    navigate('/admin-dashboard');
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    setManualQRData('');
  };

  return (
    <div className="main-container qr-scanner-container">
      <button onClick={handleBack} className="back-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19L5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="header-section">
        <h1 className="main-title">QR Code Scanner</h1>
        <p className="main-subtitle">Scan visitor passes to complete tours</p>
      </div>

      <div className="qr-scanner-content">
        {!scanResult && (
          <>
            {/* File Upload Method */}
            <div className="scanner-method">
              <h3>Method 1: Upload QR Code Image</h3>
              <div className="file-upload-section">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-button"
                  disabled={isScanning}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload QR Code Image
                </button>
                <p className="upload-description">
                  Take a photo of the visitor's QR code or upload an existing image
                </p>
              </div>
            </div>

            <div className="scanner-divider">
              <span>OR</span>
            </div>

            {/* Manual Entry Method */}
            <div className="scanner-method">
              <h3>Method 2: Manual QR Data Entry</h3>
              <div className="manual-entry-section">
                <label className="input-label">
                  Paste QR Code Data:
                </label>
                <textarea
                  value={manualQRData}
                  onChange={(e) => setManualQRData(e.target.value)}
                  placeholder='Paste the QR code data here (JSON format starting with {"type":"VISITOR_PASS"...})'
                  className="qr-data-input"
                  rows={4}
                  disabled={isScanning}
                />
                <button 
                  onClick={handleManualScan}
                  className="scan-button"
                  disabled={isScanning || !manualQRData.trim()}
                >
                  {isScanning ? (
                    <>
                      <div className="spinner small"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Process QR Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-result">
            <div className="error-icon">❌</div>
            <h3>Scan Failed</h3>
            <p>{error}</p>
            <button onClick={resetScanner} className="retry-button">
              Try Again
            </button>
          </div>
        )}

        {/* Success Result */}
        {scanResult && (
          <div className="success-result">
            <div className="success-icon">✅</div>
            <h3>Tour Completed Successfully!</h3>
            <p>{scanResult.message}</p>
            
            <div className="visitor-info">
              <h4>Visitor Information:</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{scanResult.data.fullName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{scanResult.data.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{scanResult.data.phoneNumber}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Tour Date:</span>
                  <span className="info-value">{new Date(scanResult.data.tourDate).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Tour Time:</span>
                  <span className="info-value">{scanResult.data.tourTime}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className="info-value status-completed">Completed</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={resetScanner} className="scan-another-button">
                Scan Another QR Code
              </button>
              <button onClick={handleBack} className="back-to-dashboard-button">
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="scanner-instructions">
          <h4>📋 Instructions:</h4>
          <ul>
            <li>Ask the visitor to show their digital visitor pass</li>
            <li>Either upload a photo of the QR code or copy the QR data</li>
            <li>The system will automatically mark the tour as completed</li>
            <li>A feedback email will be sent to the visitor</li>
          </ul>
        </div>
      </div>
    </div>
  );
}