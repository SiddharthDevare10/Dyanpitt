import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';

export default function VisitorPassScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [tourData, setTourData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Get tour data from navigation state
    const data = location.state?.tourData;
    
    if (!data) {
      // If no data, redirect back to tour request
      navigate('/tour');
      return;
    }

    setTourData(data);
    generateQRCode(data);
  }, [location.state, navigate]);

  const generateQRCode = async (data) => {
    try {
      // Create QR code data with tour details
      const qrData = {
        type: 'VISITOR_PASS',
        id: data._id || 'unknown',
        name: data.fullName || 'Unknown',
        email: data.email || 'unknown@email.com',
        contact: data.phoneNumber || 'N/A',
        gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : 'N/A',
        tourDate: data.tourDate || new Date().toISOString(),
        tourTime: data.tourTime || 'N/A',
        generatedAt: new Date().toISOString(),
        status: 'pending'
      };

      // Generate QR code as data URL
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadPass = async () => {
    if (!tourData || !qrCodeDataUrl) return;

    setIsDownloading(true);
    
    try {
      // Create a canvas for the visitor pass
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match container proportions
      canvas.width = 600;
      canvas.height = 700;
      
      // Background - match visitor details container
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add border radius effect with clipping
      ctx.beginPath();
      ctx.roundRect(0, 0, canvas.width, canvas.height, 12);
      ctx.clip();
      
      // Container padding
      const padding = 30;
      const contentWidth = canvas.width - (padding * 2);
      
      // Header - Visitor Information
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      let yPos = padding + 30;
      ctx.fillText('Visitor Information', canvas.width / 2, yPos);
      
      // QR Code section
      const qrImg = new Image();
      qrImg.onload = () => {
        yPos += 40;
        const qrSize = 160;
        const qrX = (canvas.width - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, yPos, qrSize, qrSize);
        
        // Details section - match exact container layout
        yPos += qrSize + 40;
        
        const details = [
          { label: 'Name:', value: tourData.fullName || 'N/A' },
          { label: 'Email:', value: tourData.email || 'N/A' },
          { label: 'Contact:', value: tourData.phoneNumber || 'N/A' },
          { label: 'Gender:', value: tourData.gender ? tourData.gender.charAt(0).toUpperCase() + tourData.gender.slice(1) : 'N/A' },
          { label: 'Tour Date:', value: tourData.tourDate ? new Date(tourData.tourDate).toLocaleDateString() : 'N/A' },
          { label: 'Tour Time:', value: tourData.tourTime || 'N/A' }
        ];
        
        details.forEach((detail, index) => {
          // Draw detail row with border line (except last)
          if (index < details.length - 1) {
            ctx.strokeStyle = '#e9ecef';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding, yPos + 25);
            ctx.lineTo(canvas.width - padding, yPos + 25);
            ctx.stroke();
          }
          
          // Label
          ctx.fillStyle = '#666666';
          ctx.font = '15px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(detail.label, padding, yPos);
          
          // Value
          ctx.fillStyle = '#333333';
          ctx.font = '16px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(detail.value, canvas.width - padding, yPos);
          
          yPos += 35;
        });
        
        // Download section separator line
        yPos += 10;
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, yPos);
        ctx.lineTo(canvas.width - padding, yPos);
        ctx.stroke();
        
        // Download section text
        yPos += 30;
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Digital Visitor Pass', canvas.width / 2, yPos);
        
        // Footer timestamp
        yPos += 30;
        ctx.fillStyle = '#999999';
        ctx.font = '12px Arial';
        ctx.fillText('Generated: ' + new Date().toLocaleString(), canvas.width / 2, yPos);
        
        // Download the canvas as image
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `visitor-pass-${(tourData.fullName || 'visitor').replace(/\s+/g, '-')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsDownloading(false);
        });
      };
      
      qrImg.src = qrCodeDataUrl;
    } catch (error) {
      console.error('Error downloading pass:', error);
      setIsDownloading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!tourData) {
    return (
      <div className="main-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading visitor pass...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="congratulations-container">
      {/* Close Button */}
      <button onClick={handleBack} className="close-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Main Content */}
      <div className="congratulations-content">
        {/* Success Header - Match Congratulations Design */}
        <div className="success-icon">
          <div className="success-circle">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="congratulations-header">
          <h1 className="congratulations-title">Tour Request Confirmed!</h1>
          <p className="congratulations-subtitle">
            Your digital visitor pass is ready.
          </p>
        </div>

        {/* Visitor Details with QR Code */}
        <div className="visitor-details">
          <h3>Visitor Details</h3>
          <div className="qr-code-container">
            {qrCodeDataUrl && (
              <img 
                src={qrCodeDataUrl} 
                alt="Visitor Pass QR Code" 
                className="qr-code-image"
              />
            )}
          </div>
          <div className="detail-row">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{tourData.fullName || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{tourData.email || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Contact:</span>
            <span className="detail-value">{tourData.phoneNumber || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Gender:</span>
            <span className="detail-value">{tourData.gender ? tourData.gender.charAt(0).toUpperCase() + tourData.gender.slice(1) : 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Tour Date:</span>
            <span className="detail-value">{tourData.tourDate ? new Date(tourData.tourDate).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Tour Time:</span>
            <span className="detail-value">{tourData.tourTime || 'N/A'}</span>
          </div>
          
          {/* Download Button inside container */}
          <div className="download-section">
            <button 
              onClick={downloadPass}
              disabled={isDownloading}
              className="login-button"
            >
              {isDownloading ? 'Generating...' : 'Download Pass'}
            </button>
          </div>
        </div>

        {/* Important Notes */}
        <div className="visitor-pass-notes">
          <h4>📋 Important Notes</h4>
          <ul>
            <li>It is <strong>mandatory</strong> to carry this pass during your visit</li>
            <li>Present this QR code at the reception for quick check-in</li>
            <li>The admin will scan this code to mark your tour as complete</li>
            <li>Please arrive 10 minutes before your scheduled time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}