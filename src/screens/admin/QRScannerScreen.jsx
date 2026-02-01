import { useState, useRef, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import apiService from '../../services/api';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';

export default function QRScannerScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [manualQRData, setManualQRData] = useState('');
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  // Initialize camera scanner
  const startCameraScanner = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Check if QR scanner is supported
      if (!QrScanner.hasCamera()) {
        throw new Error('No camera found on this device');
      }
      

      // Request camera permission properly
      try {
        // First check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this device');
        }
        
        // Request camera permission explicitly with timeout
        const permissionTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Camera permission request timed out')), 10000);
        });
        
        let stream;
        try {
          // Try back camera first
          stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({ 
              video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            }),
            permissionTimeout
          ]);
        } catch {
          // Fallback to front camera or any available camera
          stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({ 
              video: { 
                facingMode: 'user', // Front camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            }),
            permissionTimeout
          ]);
        }
        
        // Stop the stream immediately as QrScanner will handle it
        stream.getTracks().forEach(track => track.stop());
        
        setCameraPermission('granted');
      } catch (permissionError) {
        logger.error('Camera permission error:', permissionError);
        setCameraPermission('denied');
        
        if (permissionError.name === 'NotAllowedError') {
          throw new Error('Camera permission was denied. Please allow camera access in your browser settings and try again.');
        } else if (permissionError.name === 'NotFoundError') {
          throw new Error('No camera found on this device');
        } else if (permissionError.name === 'NotSupportedError') {
          throw new Error('Camera not supported on this device');
        } else {
          throw new Error('Unable to access camera: ' + permissionError.message);
        }
      }

      setCameraPermission('granted');

      // Initialize QR scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleQRScanResult(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
        }
      );

      await qrScannerRef.current.start();
      setIsCameraActive(true);
      setIsScanning(false);
    } catch (error) {
      logger.error('Error starting camera:', error);
      setError(error.message);
      setIsScanning(false);
      setIsCameraActive(false);
      if (error.name === 'NotAllowedError') {
        setCameraPermission('denied');
      }
    }
  };

  // Stop camera scanner
  const stopCameraScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Handle QR scan result
  const handleQRScanResult = async (qrData) => {
    try {
      setIsScanning(true);
      stopCameraScanner(); // Stop camera when QR is detected

      // Validate QR data format
      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch {
        throw new Error('Invalid QR code format. Please check the data.');
      }

      if (parsedData.type !== 'VISITOR_PASS' || !parsedData.id) {
        throw new Error('Invalid visitor pass QR code');
      }

      // Send to backend for processing
      const result = await apiService.request('/tour/scan-qr', {
        method: 'POST',
        body: JSON.stringify({ qrData })
      });

      setScanResult(result);
    } catch (error) {
      logger.error('Error processing QR scan:', error);
      setError(error.message);
      // Restart camera on error
      setTimeout(() => {
        if (!scanResult) {
          startCameraScanner();
        }
      }, 2000);
    } finally {
      setIsScanning(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      
      // Use QrScanner to read QR code from image file
      const qrData = await QrScanner.scanImage(file, {
        returnDetailedScanResult: false
      });
      
      
      // Process the QR data
      await handleQRScanResult(qrData);
      
    } catch (error) {
      logger.error('Error reading QR code from image:', error);
      
      if (error.message.includes('No QR code found')) {
        setError('No QR code found in the image. Please make sure the QR code is clearly visible and try again.');
      } else {
        setError('Failed to read QR code from image. Please try taking a clearer photo or use manual entry.');
      }
    } finally {
      setIsScanning(false);
      // Clear the file input so the same file can be selected again if needed
      event.target.value = '';
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
      } catch {
        throw new Error('Invalid QR code format. Please check the data.');
      }

      if (parsedData.type !== 'VISITOR_PASS' || !parsedData.id) {
        throw new Error('Invalid visitor pass QR code');
      }

      // Send to backend for processing
      const result = await apiService.request('/tour/scan-qr', {
        method: 'POST',
        body: JSON.stringify({ qrData: manualQRData })
      });

      setScanResult(result);
      setManualQRData('');
    } catch (error) {
      logger.error('Error processing QR scan:', error);
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
    stopCameraScanner();
  };

  return (
    <div className="main-container qr-scanner-container admin-page">
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
            {/* Camera Scanner Method */}
            <div className="scanner-method camera-method">
              <h3>📱 Live Camera Scanner</h3>
              
              {!isCameraActive && (
                <div className="camera-controls">
                  <button 
                    onClick={startCameraScanner}
                    className="camera-button"
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <>
                        <div className="spinner small"></div>
                        Starting Camera...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 22 21 22H3C2.46957 22 1.96086 21.7893 1.58579 21.4142C1.21071 21.0391 1 20.5304 1 20V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Start Camera Scanner
                      </>
                    )}
                  </button>
                  
                  {cameraPermission === 'denied' && (
                    <div className="permission-warning">
                      <p>⚠️ Camera permission is required to scan QR codes.</p>
                      <p><strong>To fix this:</strong></p>
                      <ol style={{textAlign: 'left', margin: '10px 0'}}>
                        <li>Look for the camera icon in your browser's address bar</li>
                        <li>Click it and select "Allow" for camera access</li>
                        <li>Refresh the page if needed</li>
                        <li>Try the camera scanner again</li>
                      </ol>
                      <button 
                        onClick={() => {
                          setCameraPermission('prompt');
                          setError('');
                        }}
                        className="retry-permission-button"
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isCameraActive && (
                <div className="camera-scanner">
                  <div className="camera-container">
                    <video ref={videoRef} className="camera-video" />
                    <div className="scanner-overlay">
                      <div className="scanner-frame">
                        <div className="corner top-left"></div>
                        <div className="corner top-right"></div>
                        <div className="corner bottom-left"></div>
                        <div className="corner bottom-right"></div>
                      </div>
                      <p className="scanner-instructions">
                        Point the camera at the QR code
                      </p>
                    </div>
                  </div>
                  
                  <div className="camera-controls">
                    <button 
                      onClick={stopCameraScanner}
                      className="stop-camera-button"
                    >
                      Stop Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="scanner-divider">
              <span>Alternative Methods</span>
            </div>

            {/* Mobile Camera Integration */}
            <div className="scanner-method">
              <h3>📱 Use Device Camera</h3>
              <div className="mobile-camera-section">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="camera-capture-button"
                  disabled={isScanning}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '15px 25px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 22 21 22H3C2.46957 22 1.96086 21.7893 1.58579 21.4142C1.21071 21.0391 1 20.5304 1 20V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  📷 Open Camera & Scan QR Code
                </button>
                <div className="camera-instructions" style={{
                  backgroundColor: '#e8f5e8',
                  padding: '15px',
                  borderRadius: '8px',
                  marginTop: '10px',
                  border: '1px solid #28a745'
                }}>
                  <h4 style={{margin: '0 0 10px 0', color: '#155724'}}>📱 How to use:</h4>
                  <ol style={{margin: 0, paddingLeft: '20px', color: '#155724'}}>
                    <li>Tap the green "Open Camera" button above</li>
                    <li>Your device camera app will open</li>
                    <li>Point camera at the visitor's QR code</li>
                    <li>Take a photo of the QR code</li>
                    <li>Return to this app - the photo will be processed automatically</li>
                  </ol>
                  <p style={{margin: '10px 0 0 0', fontWeight: 'bold', color: '#155724'}}>
                    ✅ Works with any QR scanner app or camera app!
                  </p>
                </div>
              </div>
            </div>

            {/* Alternative: Upload from Gallery */}
            <div className="scanner-method">
              <h3>🖼️ Upload from Gallery</h3>
              <div className="file-upload-section">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/*"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px dashed #007bff',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}
                />
                <p className="upload-description" style={{margin: '10px 0 0 0', color: '#6c757d'}}>
                  Select a photo of the QR code from your device gallery
                </p>
              </div>
            </div>

            {/* Manual Entry Method */}
            <div className="scanner-method">
              <h3>✏️ Manual QR Data Entry</h3>
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
            <li><strong>Recommended:</strong> Use the live camera scanner for instant QR code detection</li>
            <li>Ask the visitor to show their digital visitor pass</li>
            <li>Point the camera at the QR code or use alternative methods</li>
            <li>The system will automatically mark the tour as completed</li>
            <li>A feedback email will be sent to the visitor</li>
          </ul>
        </div>
      </div>
    </div>
  );
}