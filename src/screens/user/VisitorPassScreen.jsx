import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode';
import logger from '../../utils/logger';
// Dynamic imports for better code splitting

export default function VisitorPassScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  
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
      logger.error('Error generating QR code:', error);
    }
  };

  const downloadPass = async () => {
    if (!tourData || !qrCodeDataUrl) return;

    setIsDownloading(true);
    
    try {
      // Create a temporary container that matches the screen structure without notes
      const passContainer = document.createElement('div');
      passContainer.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 650px;
        background: white;
        padding: 30px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        box-sizing: border-box;
        min-height: 800px;
      `;

      // Create the exact structure from the screen (without notes section)
      passContainer.innerHTML = `
        <style>
          .pdf-success-circle {
            width: 60px;
            height: 60px;
            background: #22c55e;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 15px auto;
            position: relative;
          }
          .pdf-success-circle::after {
            content: '✓';
            color: white;
            font-size: 24px;
            font-weight: bold;
            line-height: 1;
          }
          .pdf-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            background: white;
          }
          .pdf-detail-label {
            padding: 20px;
            background: #f8f9fa;
            border-right: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            color: #374151;
            font-size: 14px;
          }
          .pdf-detail-value {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            color: #111827;
            font-size: 14px;
          }
          .pdf-detail-label:nth-last-child(2),
          .pdf-detail-value:nth-last-child(1) {
            border-bottom: none;
          }
        </style>
        
        <!-- Logo Section -->
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="./Logo.png" alt="Dyanpeeth Abhyasika Logo" style="width: 100px; height: 100px;" />
        </div>
        
        <!-- Main Container matching visitor-details class -->
        <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); border: 2px solid #e5e7eb; width: 100%; margin: 0 auto; box-sizing: border-box;">
          
          <!-- Success Icon matching the screen -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div class="pdf-success-circle"></div>
            <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0; font-family: 'Inter', sans-serif;">Tour Request Confirmed!</h1>
          </div>

          <!-- QR Code matching qr-code-container -->
          <div style="text-align: center; margin: 40px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 2px solid #e5e7eb;">
            <img src="${qrCodeDataUrl}" alt="Visitor Pass QR Code" style="width: 220px; height: 220px; border: 2px solid #d1d5db; border-radius: 12px;" />
          </div>

          <!-- Details Grid matching the screen structure -->
          <div class="pdf-details-grid">
            <div class="pdf-detail-label">Name</div>
            <div class="pdf-detail-value">${tourData.fullName || 'N/A'}</div>
            
            <div class="pdf-detail-label">Email</div>
            <div class="pdf-detail-value">${tourData.email || 'N/A'}</div>
            
            <div class="pdf-detail-label">Contact</div>
            <div class="pdf-detail-value">${tourData.phoneNumber || 'N/A'}</div>
            
            <div class="pdf-detail-label">Gender</div>
            <div class="pdf-detail-value">${tourData.gender ? tourData.gender.charAt(0).toUpperCase() + tourData.gender.slice(1) : 'N/A'}</div>
            
            <div class="pdf-detail-label">Tour Date</div>
            <div class="pdf-detail-value">${tourData.tourDate ? new Date(tourData.tourDate).toLocaleDateString() : 'N/A'}</div>
            
            <div class="pdf-detail-label">Tour Time</div>
            <div class="pdf-detail-value">${tourData.tourTime || 'N/A'}</div>
          </div>
          
          <!-- Footer matching screen style -->
          <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">
              Generated: ${new Date().toLocaleString()}
            </p>
            <p style="margin: 8px 0 0 0; font-size: 16px; color: #111827; font-weight: 600;">
              Dyanpeeth Abhyasika • Digital Visitor Pass
            </p>
          </div>
        </div>
      `;

      // Add to DOM temporarily
      document.body.appendChild(passContainer);

      // Wait for images to load
      await new Promise(resolve => {
        const images = passContainer.querySelectorAll('img');
        let loadedCount = 0;
        const totalImages = images.length;
        
        if (totalImages === 0) {
          resolve();
          return;
        }
        
        images.forEach(img => {
          if (img.complete) {
            loadedCount++;
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount === totalImages) resolve();
            };
            img.onerror = () => {
              loadedCount++;
              if (loadedCount === totalImages) resolve();
            };
          }
        });
        
        if (loadedCount === totalImages) resolve();
      });

      // Generate high-quality canvas
      const canvas = await window.html2canvas(passContainer, {
        scale: 3, // Even higher resolution for PDF quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 650,
        height: passContainer.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 650,
        windowHeight: passContainer.offsetHeight
      });

      // Remove temporary container
      document.body.removeChild(passContainer);

      // Create PDF
      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // A4 dimensions: 210mm x 297mm
      const pageWidth = 210;
      const pageHeight = 297;
      
      // Calculate optimal dimensions with proper margins
      const margin = 20; // 20mm margins on all sides
      const maxWidth = pageWidth - (margin * 2); // 170mm
      const maxHeight = pageHeight - (margin * 2); // 257mm
      
      // Calculate scaled dimensions maintaining aspect ratio
      let imgWidth = maxWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If height exceeds page, scale down
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }
      
      // Center the content on the page
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      // Add the canvas image to PDF
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0),
        'PNG',
        x,
        y,
        imgWidth,
        imgHeight,
        undefined,
        'FAST'
      );

      // Save the PDF
      const fileName = `dyanpitt-visitor-pass-${(tourData.fullName || 'visitor').replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);

      setIsDownloading(false);
    } catch (error) {
      logger.error('Error downloading pass:', error);
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
          <img src="./Logo.png" alt="Dyanpeeth Abhyasika Logo" className="logo-image" />
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
          <div className="details-grid">
            <div className="detail-label-cell">
              <span className="detail-label">Name</span>
            </div>
            <div className="detail-value-cell">
              <span className="detail-value">{tourData.fullName || 'N/A'}</span>
            </div>
            
            <div className="detail-label-cell">
              <span className="detail-label">Email</span>
            </div>
            <div className="detail-value-cell">
              <span className="detail-value">{tourData.email || 'N/A'}</span>
            </div>
            
            <div className="detail-label-cell">
              <span className="detail-label">Contact</span>
            </div>
            <div className="detail-value-cell">
              <span className="detail-value">{tourData.phoneNumber || 'N/A'}</span>
            </div>
            
            <div className="detail-label-cell">
              <span className="detail-label">Gender</span>
            </div>
            <div className="detail-value-cell">
              <span className="detail-value">{tourData.gender ? tourData.gender.charAt(0).toUpperCase() + tourData.gender.slice(1) : 'N/A'}</span>
            </div>
            
            <div className="detail-label-cell">
              <span className="detail-label">Tour Date</span>
            </div>
            <div className="detail-value-cell">
              <span className="detail-value">{tourData.tourDate ? new Date(tourData.tourDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            
            <div className="detail-label-cell">
              <span className="detail-label">Tour Time</span>
            </div>
            <div className="detail-value-cell">
              <span className="detail-value">{tourData.tourTime || 'N/A'}</span>
            </div>
          </div>
          
          {/* Download Button inside container */}
          <div className="download-section">
            <button 
              onClick={downloadPass}
              disabled={isDownloading}
              className="login-button"
            >
              {isDownloading ? 'Generating PDF...' : 'Download PDF Pass'}
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