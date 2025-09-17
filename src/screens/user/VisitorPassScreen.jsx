import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';

export default function VisitorPassScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // const canvasRef = useRef(null); - Currently unused
  
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
      
      // Set canvas size for a professional pass design
      canvas.width = 600;
      canvas.height = 800;
      
      // Clean white background - minimalist approach
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Subtle border - matching app's minimal design
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      
      // Header section with minimal black background
      const headerHeight = 100;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, headerHeight);
      
      // Container padding
      const padding = 30;
      let yPos = 40;
      
      // Load and draw logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      const drawPassContent = () => {
        // Logo in header (white version for black background)
        const logoSize = 50;
        const logoX = padding;
        ctx.drawImage(logoImg, logoX, yPos + 5, logoSize, logoSize);
        
        // Company name next to logo - clean typography
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 22px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('DYANPITT', logoX + logoSize + 15, yPos + 25);
        
        // Subtitle - minimal
        ctx.font = '400 14px Inter, sans-serif';
        ctx.fillText('Study Room', logoX + logoSize + 15, yPos + 45);
        
        // Pass title on right side - clean and minimal
        ctx.font = '500 18px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('VISITOR PASS', canvas.width - padding, yPos + 35);
        
        yPos = headerHeight + 30;
        
        // Minimal status indicator - no background, just text
        ctx.fillStyle = '#000000';
        ctx.font = '500 14px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Status: Confirmed', padding, yPos);
        
        // QR Code section - minimal styling
        const qrImg = new Image();
        qrImg.onload = () => {
          yPos += 40;
          
          // QR Code - clean, no container background
          const qrSize = 160;
          const qrX = (canvas.width - qrSize) / 2;
          ctx.drawImage(qrImg, qrX, yPos, qrSize, qrSize);
          
          // QR Code label - minimal
          yPos += qrSize + 20;
          ctx.fillStyle = '#6b7280';
          ctx.font = '400 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Present this QR code at reception', canvas.width / 2, yPos);
          
          // Details section
          yPos += 40;
        
        // Details section - minimal, matching app's visitor-details style
        const detailsStartY = yPos;
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(padding, detailsStartY, canvas.width - (padding * 2), 220);
        
        yPos += 25;
        
        // Details header - minimal
        ctx.fillStyle = '#333333';
        ctx.font = '600 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Visitor Information', canvas.width / 2, yPos);
        
        yPos += 30;
        
        const details = [
          { label: 'Name:', value: tourData.fullName || 'N/A' },
          { label: 'Email:', value: tourData.email || 'N/A' },
          { label: 'Contact:', value: tourData.phoneNumber || 'N/A' },
          { label: 'Gender:', value: tourData.gender ? tourData.gender.charAt(0).toUpperCase() + tourData.gender.slice(1) : 'N/A' },
          { label: 'Tour Date:', value: tourData.tourDate ? new Date(tourData.tourDate).toLocaleDateString() : 'N/A' },
          { label: 'Tour Time:', value: tourData.tourTime || 'N/A' }
        ];
        
        details.forEach((detail, index) => {
          // Subtle border lines like the app
          if (index < details.length - 1) {
            ctx.strokeStyle = '#e9ecef';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding + 20, yPos + 15);
            ctx.lineTo(canvas.width - padding - 20, yPos + 15);
            ctx.stroke();
          }
          
          // Label - matching app's detail-label style
          ctx.fillStyle = '#666666';
          ctx.font = '500 14px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(detail.label, padding + 20, yPos);
          
          // Value - matching app's detail-value style
          ctx.fillStyle = '#333333';
          ctx.font = '500 14px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(detail.value, canvas.width - padding - 20, yPos);
          
          yPos += 30;
        });
        
        // Footer section - minimal
        yPos += 40;
        
        // Important notes - minimal gray section
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(padding, yPos, canvas.width - (padding * 2), 70);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, yPos, canvas.width - (padding * 2), 70);
        
        yPos += 20;
        ctx.fillStyle = '#333333';
        ctx.font = '500 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Important Instructions', canvas.width / 2, yPos);
        
        yPos += 18;
        ctx.fillStyle = '#666666';
        ctx.font = '400 11px Inter, sans-serif';
        ctx.fillText('Present this pass at reception • Arrive 10 minutes early', canvas.width / 2, yPos);
        yPos += 12;
        ctx.fillText('Valid only for the specified date and time', canvas.width / 2, yPos);
        
        // Footer with generation info - minimal
        yPos += 40;
        ctx.fillStyle = '#6b7280';
        ctx.font = '400 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Generated: ' + new Date().toLocaleString(), canvas.width / 2, yPos);
        yPos += 12;
        ctx.fillText('Dyanpitt Study Room • Digital Visitor Pass', canvas.width / 2, yPos);
        
        // Download the canvas as image
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dyanpitt-visitor-pass-${(tourData.fullName || 'visitor').replace(/\s+/g, '-')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsDownloading(false);
        });
      };
      
      qrImg.src = qrCodeDataUrl;
    };
    
    // Load logo and start drawing
    logoImg.onload = drawPassContent;
    logoImg.onerror = () => {
      console.warn('Logo failed to load, proceeding without logo');
      drawPassContent();
    };
    logoImg.src = '/Logo.png';
    } catch (error) {
      console.error('Error downloading pass:', error);
      setIsDownloading(false);
    }
  };


  if (!tourData) {
    return (
      <div className="main-container">
        <div className="simple-loading">
          <p>Loading visitor pass...</p>
        </div>
      </div>
    );
  }

  const handleBackToMain = () => {
    navigate('/');
  };

  return (
    <div className="congratulations-container">
      {/* Main Content */}
      <div className="congratulations-content">
        {/* Logo */}
        <div className="visitor-pass-logo">
          <img src="/Logo.png" alt="Dyanpitt Logo" className="logo-image" />
        </div>

        {/* Visitor Details with QR Code */}
        <div className="visitor-details">
          {/* Success Header and confirmation inside container */}
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
            
            {/* Back to Main Button */}
            <button 
              onClick={handleBackToMain}
              className="login-button back-to-main-button"
            >
              Back to Main
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