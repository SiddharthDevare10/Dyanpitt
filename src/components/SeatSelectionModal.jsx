import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import logger from '../utils/logger';

export default function SeatSelectionModal({ isOpen, onClose, selectedSeat, onSeatSelect, userData, membershipType, timeSlot, membershipStartDate, membershipDuration }) {
  
  // State for selected range in Dyanpurn Kaksh
  const [selectedRange, setSelectedRange] = useState('50-59');
  
  // State for selected section in venues that use sections (future use)
  // const [selectedSection, setSelectedSection] = useState('A');
  
  // Fetch occupied seats from backend based on date range
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Fetch seat data when modal opens
  // Add ref to prevent duplicate calls
  const fetchDataRef = useRef(false);
  
  useEffect(() => {
    const fetchSeatData = async () => {
      // Only fetch if we have all required data
      if (!membershipType || !timeSlot || !membershipStartDate || !membershipDuration) {
        return;
      }

      setLoading(true);
      try {
        // Import API service dynamically to avoid circular dependencies
        const apiService = (await import('../services/api')).default;
        
        // Calculate end date based on start date and duration
        const startDate = new Date(membershipStartDate);
        const endDate = new Date(startDate);
        
        if (membershipDuration.includes('Day')) {
          const days = parseInt(membershipDuration);
          endDate.setDate(startDate.getDate() + days - 1);
        } else if (membershipDuration.includes('Month')) {
          const months = parseInt(membershipDuration);
          endDate.setMonth(startDate.getMonth() + months);
          endDate.setDate(startDate.getDate() - 1);
        }
        
        // Fetch occupied seats for this date range
        const response = await apiService.request(
          `/booking/check-seat-availability?membershipType=${encodeURIComponent(membershipType)}&timeSlot=${encodeURIComponent(timeSlot)}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (response.success && response.occupiedSeats) {
          setOccupiedSeats(response.occupiedSeats);
          logger.info('Fetched occupied seats:', response.occupiedSeats);
        }
      } catch (error) {
        logger.error('Error fetching seat availability:', error);
        // Continue with empty occupied seats list
        setOccupiedSeats([]);
      }
      setLoading(false);
    };
    
    if (isOpen && membershipType && timeSlot && membershipStartDate && membershipDuration && !fetchDataRef.current) {
      fetchDataRef.current = true;
      fetchSeatData();
    }
    
    // Reset ref when modal closes
    if (!isOpen) {
      fetchDataRef.current = false;
    }
  }, [isOpen, membershipType, timeSlot, membershipStartDate, membershipDuration]);
  
  if (!isOpen) return null;

  // Determine which venue we're showing
  const venue = membershipType || 'Dyandhara Kaksh';

  // Dhyandhara Kaksh is for male users only
  if (venue === 'Dyandhara Kaksh' && userData?.gender === 'female') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="seat-modal" onClick={(e) => e.stopPropagation()}>
          <div className="seat-modal-header">
            <h2>Access Restricted</h2>
            <button className="modal-close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="seat-modal-access-restricted-content">
            <p className="seat-modal-access-restricted-message">
              Dhyandhara Kaksh is exclusively for male students.
            </p>
            <p className="seat-modal-access-restricted-description">
              Please select a different study area that accommodates female students.
            </p>
          </div>
          <div className="seat-modal-actions">
            <button className="modal-confirm-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Define seat layouts for different venues
  const getSeatLayout = () => {
    if (venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn') {
      // Dyanpurn Kaksh layout - Range based
      if (selectedRange === '50-59') {
        return [
          { row: '5', seats: [54, 55, 56] },                // Row 5: 3 seats (top row)
          { row: '4', seats: [53, 0, 57] },            // Row 4: seat 53, zero, seat 57
          { row: '3', seats: [52, 0, 58] },            // Row 3: seat 52, zero, seat 58
          { row: '2', seats: [51, 0, 59] },            // Row 2: seat 51, zero, seat 59
          { row: '1', seats: [50, 0, 0] }             // Row 1: seat 50, two zeros
        ];
      } else if (selectedRange === '60-69') {
        return [
          { row: '4', seats: [63, 64, 65] },                  // Row 4: 3 seats (top row) - col1: 5, col2: 6, col3: 7
          { row: '3', seats: [62, 0, 66] },             // Row 3: 2 seats with fake box - col1: 3, col2: fake, col3: 4
          { row: '2', seats: [61, 0, 0] },        // Row 2: seat 1 aligned with seat 5 (col1)
          { row: '1', seats: [60, 0, 0] }         // Row 1: seat 2 aligned with seat 6 (col2)
        ];
      } else if (selectedRange === '70-73') {
        return [
          { row: '4', seats: [72, 0, 71] },               // Row 4: 2 seats with space in between
          { row: '3', seats: [73, 0, 70] },               // Row 3: 2 seats with space in between
          { row: '2', seats: [0, 0, 0] },               // Row 2: 3 seats
          { row: '1', seats: [67, 68, 69] },                  // Row 1: 3 seats
        ];
      }
      return [];
    } else if (venue === 'Dyanasmi Kaksh') {
      // Dyanasmi Kaksh layout - Range based (separate from Dyanpurn)
      if (selectedRange === '74-81') {
        return [
          { row: '5', seats: [0, 0, 0,'entry'] },
          { row: '4', seats: [81, 0, 0, 74] },               // Row 4: 2 seats with space in between
          { row: '3', seats: [80, 0, 0, 75] },
          { row: '2', seats: [79, 0, 0, 0] },               // Row 3: 2 seats with space in between              // Row 2: 3 seats
          { row: '1', seats: [0, 78, 77, 76] },                  // Row 1: 3 seats
        ];
      } else if (selectedRange === '82-88') {
        return [
          { row: '5', seats: [87, 86, 85] }, 
          { row: '4', seats: [88, 0, 0, 84] },                  // Row 4: 3 seats (top row) - col1: 5, col2: 6, col3: 7
          { row: '3', seats: [89, 0, 0, 83] },             // Row 3: 2 seats with fake box - col1: 3, col2: fake, col3: 4
          { row: '2', seats: [90, 0, 0, 82] },        // Row 2: seat 1 aligned with seat 5 (col1)
          { row: '1', seats: [0, 91, 92, 'entry'] }         // Row 1: seat 2 aligned with seat 6 (col2)
        ];
      } else if (selectedRange === '89-95') {
        return [
          { row: '4', seats: [0, 0, 0,'entry'] },                  // Row 4: 3 seats (top row) - col1: 5, col2: 6, col3: 7
          { row: '3', seats: [0, 0, 0, 93] },             // Row 3: 2 seats with fake box - col1: 3, col2: fake, col3: 4
          { row: '2', seats: [0, 0, 0, 0] },        // Row 2: seat 1 aligned with seat 5 (col1)
          { row: '1', seats: [0, 95, 94, 0] }         // Row 1: seat 2 aligned with seat 6 (col2)
        ];
      }
      return [];
    } else {
      // Dyandhara Kaksh layout (original)
      return [
        { row: 'E', seats: [30, 31, 32, 33, 'aisle', 24, 25, 26, 27, 28, 29] }, // Row E has 10 seats (back)
        { row: 'D', seats: [37, 36, 35, 34, 'aisle', 23, 22, 21, 20, 19, 18] }, // Row D has 10 seats
        { row: 'C', seats: [38, 39, 40, 41, 'aisle', 12, 13, 14, 15, 16, 17] }, // Row C has 10 seats
        { row: 'B', seats: [45, 44, 43, 42, 'aisle', 11, 10, 9, 8, 7, 6] }, // Row B has 10 seats
        { row: 'A', seats: [46, 47, 48, 49, 'entry', 1, 2, 3, 4, 5, 0] }     // Row A has 9 seats (front) + 1 hidden + entry
      ];
    }
  };

  const seatLayout = getSeatLayout();

  // Define seat tiers and gender restrictions
  const getSeatTier = (seatNum) => {
    if (venue === 'Dyandhara Kaksh') {
      if (seatNum === 5) return 'gold';
      if ([24, 25, 26, 27, 28, 29, 32, 33].includes(seatNum)) return 'silver';
      return 'standard';
    } else if (venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn') {
      // Seat tiers for Dyanpurn Kaksh
      if (selectedRange === '50-59') {
        // Range 50-59: seats 54, 55, 56 are silver
        if ([54, 55, 56].includes(seatNum)) return 'silver';
      } else if (selectedRange === '60-69') {
        // Range 60-69: seats 63, 64, 65 are silver
        if ([63, 64, 65].includes(seatNum)) return 'silver';
      } else if (selectedRange === '70-73') {
        // Range 70-73: seat 69 is gold
        if (seatNum === 69) return 'gold';
      }
      return 'standard';
    } else if (venue === 'Dyanasmi Kaksh') {
      // Seat tiers for Dyanasmi Kaksh (separate from Dyanpurn)
      if (selectedRange === '74-81') {
        // Range 74-81: seats 74, 81 are silver
        if ([74, 81].includes(seatNum)) return 'silver';
      } else if (selectedRange === '82-88') {
        // Range 82-88: seats 82, 88 are silver
        if ([82, 88].includes(seatNum)) return 'silver';
      } else if (selectedRange === '89-95') {
        // Range 89-95: seat 89 is silver
        if (seatNum === 89) return 'silver';
      }
      return 'standard';
    }
    return 'standard';
  };

  const handleSeatClick = (seatId) => {
    if (occupiedSeats.includes(seatId)) {
      return; // Can't select occupied seats
    }
    
    // Check gender restrictions for different venues
    if (venue === 'Dyanpurn Kaksh') {
      // Dyanpurn Kaksh is male-only venue - ALL sections A, B, C are for males only
      if (userData?.gender !== 'male') {
        // Female user trying to access male-only venue
        return;
      }
    } else if (venue === 'Dyanasmi Kaksh') {
      // Dyanasmi Kaksh is female-only venue - ALL sections A, B, C are for females only
      if (userData?.gender !== 'female') {
        // Male user trying to access female-only venue
        return;
      }
    }
    
    onSeatSelect(seatId);
  };

  const getSeatStatus = (seatId) => {
    if (occupiedSeats.includes(seatId)) return 'occupied';
    if (selectedSeat === seatId) return 'selected';
    return 'available';
  };

  const handleConfirmSelection = () => {
    if (selectedSeat) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`seat-modal ${venue === 'Dyanasmi Kaksh' ? 'dyanasmi-kaksh' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="seat-modal-header">
          <h2 style={{ fontSize: '18px', textAlign: 'center', width: '100%' }}>Select Your Preferred Seat</h2>
          {venue !== 'Dyandhara Kaksh' && (
            <button className="modal-close-button" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Range Legend for Dyanpurn Kaksh and Dyanasmi Kaksh */}
        {venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' ? (
          <div className="section-legend-container">
            <div className="section-legend-items">
              <div 
                className={`section-legend-item ${selectedRange === '50-59' ? 'active' : ''}`}
                onClick={() => setSelectedRange('50-59')}
              >
                <span>Range 50-59</span>
              </div>
              <div 
                className={`section-legend-item ${selectedRange === '60-69' ? 'active' : ''}`}
                onClick={() => setSelectedRange('60-69')}
              >
                <span>Range 60-69</span>
              </div>
              <div 
                className={`section-legend-item ${selectedRange === '70-73' ? 'active' : ''}`}
                onClick={() => setSelectedRange('70-73')}
              >
                <span>Range 70-73</span>
              </div>
            </div>
          </div>
        ) : venue === 'Dyanasmi Kaksh' ? (
          <div className="section-legend-container">
            <div className="section-legend-items">
              <div 
                className={`section-legend-item ${selectedRange === '74-81' ? 'active' : ''}`}
                onClick={() => setSelectedRange('74-81')}
              >
                <span>Range 74-81</span>
              </div>
              <div 
                className={`section-legend-item ${selectedRange === '82-88' ? 'active' : ''}`}
                onClick={() => setSelectedRange('82-88')}
              >
                <span>Range 82-88</span>
              </div>
              <div 
                className={`section-legend-item ${selectedRange === '89-95' ? 'active' : ''}`}
                onClick={() => setSelectedRange('89-95')}
              >
                <span>Range 89-95</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', margin: '16px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              border: '3px solid #f3f3f3', 
              borderTop: '3px solid #5B5B5B', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <span style={{ marginLeft: '12px', color: '#666' }}>Loading seats...</span>
          </div>
        )}

        {/* Interactive Seat Map */}
        {!loading && (
          <div className="seat-map">
          {(venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh') && seatLayout.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="seat-row">
              <div className="seats-container">
                {row.seats.map((seatNum, index) => {
                  // Handle aisle spacing
                  if (seatNum === 'aisle') {
                    return <div key={`${row.row}-aisle-${index}`} className="aisle-space"></div>;
                  }
                  
                  // Handle empty spaces
                  if (seatNum === 'empty') {
                    return <div key={`${row.row}-empty-${index}`} className="empty-space"></div>;
                  }
                  
                  // Handle fake boxes for alignment
                  if (seatNum === 'fake') {
                    return <div key={`${row.row}-fake-${index}`} className="fake-seat"></div>;
                  }
                  
                  // Handle entry point
                  if (seatNum === 'entry') {
                    const isRotatedEntry = venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh';
                    // For Dyanasmi Kaksh, show entry text without box outline
                    if (venue === 'Dyanasmi Kaksh') {
                      return (
                        <div key={`${row.row}-entry-${index}`} className={`entry-no-box ${isRotatedEntry ? 'rotated' : ''}`}>
                          <div className="entry-text" style={{ fontSize: '12px', fontWeight: 'bold' }}>entry</div>
                        </div>
                      );
                    }
                    return (
                      <div key={`${row.row}-entry-${index}`} className={`entry-indicator ${isRotatedEntry ? 'rotated' : ''}`}>
                        <div className="entry-arrow">↑</div>
                        <div className="entry-text">entry</div>
                      </div>
                    );
                  }

                  // Handle seats with value 0 (hidden but maintain layout spacing)
                  if (seatNum === 0) {
                    return <div key={`${row.row}-zero-${index}`} className="empty-space"></div>;
                  }

                  // Generate seat ID based on venue type
                  const seatId = (venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh') 
                    ? `${seatNum}` // Range-based venues use just the seat number
                    : `${row.row}${seatNum}`; // Section-based venues use row letter + seat number
                  const status = getSeatStatus(seatId);
                  const tier = getSeatTier(seatNum);
                  
                  // Handle double-width seat 86 in Dyanasmi Kaksh
                  const isDoubleWidth = venue === 'Dyanasmi Kaksh' && seatNum === 86;
                  
                  return (
                    <button
                      key={`${seatId}-${index}`}
                      className={`seat ${status} male-seat ${tier}-tier ${isDoubleWidth ? 'double-width' : ''}`}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={status === 'occupied'}
                      title={`Seat ${seatId} - ${status}`}
                      style={isDoubleWidth ? { width: '60px', minWidth: '60px' } : {}}
                    >
                      <span className="seat-number">{seatNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {(venue !== 'Dyanpurn Kaksh' && venue !== 'Dyanpurn' && venue !== 'Dyanasmi Kaksh') && seatLayout.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="seat-row">
              <div className="seats-container">
                {row.seats.map((seatNum, index) => {
                  // Handle aisle spacing
                  if (seatNum === 'aisle') {
                    return <div key={`${row.row}-aisle-${index}`} className="aisle-space"></div>;
                  }

                  // Handle empty spaces
                  if (seatNum === 'empty') {
                    return <div key={`${row.row}-empty-${index}`} className="empty-space"></div>;
                  }

                  // Handle seats with value 0 (hidden but maintain layout spacing)
                  if (seatNum === 0) {
                    return <div key={`${row.row}-zero-${index}`} className="empty-space"></div>;
                  }

                  // Handle entry point
                  if (seatNum === 'entry') {
                    // For Dyanasmi Kaksh, don't show entry box
                    if (venue === 'Dyanasmi Kaksh') {
                      return <div key={`${row.row}-entry-${index}`} className="empty-space"></div>;
                    }
                    const isRotatedEntry = venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh';
                    return (
                      <div key={`${row.row}-entry-${index}`} className={`entry-indicator ${isRotatedEntry ? 'rotated' : ''}`}>
                        <div className="entry-arrow">↑</div>
                        <div className="entry-text">entry</div>
                      </div>
                    );
                  }

                  const seatId = `${row.row}${seatNum}`;
                  const status = getSeatStatus(seatId);
                  const tier = getSeatTier(seatNum);
                  
                  return (
                    <React.Fragment key={`${row.row}-${index}-fragment`}>
                      <button
                        className={`seat ${status} male-seat ${tier}-tier`}
                        onClick={() => handleSeatClick(seatId)}
                        disabled={status === 'occupied'}
                        title={`Seat ${seatId} - ${status}`}
                      >
                        <span className="seat-number">{seatNum}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Seat Legend */}
        <div className="seat-legend-container">
          {venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh' ? (
            <>
              <div className="legend-item">
                <span className="seat-demo-circle gold-tier-demo"></span>
                <span>Gold Tier</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle silver-tier-demo"></span>
                <span>Silver Tier</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle male-selected"></span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle male-occupied"></span>
                <span>Not Available</span>
              </div>
            </>
          ) : venue === 'Dyandhara Kaksh' ? (
            <>
              <div className="legend-item">
                <span className="seat-demo-circle gold-tier-demo"></span>
                <span>Gold Tier</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle silver-tier-demo"></span>
                <span>Silver Tier</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle male-selected"></span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle male-occupied"></span>
                <span>Not Available</span>
              </div>
            </>
          ) : (
            <>
              <div className="legend-item">
                <span className="seat-demo-circle gold-tier-demo"></span>
                <span>Gold Tier</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle silver-tier-demo"></span>
                <span>Silver Tier</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle male-selected"></span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle male-occupied"></span>
                <span>Not Available</span>
              </div>
            </>
          )}
        </div>

        {/* Selected Seat Info - Hide for Dyandhara Kaksh */}
        {selectedSeat && venue !== 'Dyandhara Kaksh' && (
          <div className="selected-seat-info">
            <p>Selected Seat: <strong>{selectedSeat}</strong></p>
            {(() => {
              const seatNum = parseInt(selectedSeat.substring(1));
              const tier = getSeatTier(seatNum);
              if (tier !== 'standard') {
                return <p>Tier: <strong>{tier.charAt(0).toUpperCase() + tier.slice(1)}</strong></p>;
              }
              return null;
            })()}
          </div>
        )}

        {/* Modal Actions */}
        <div className="seat-modal-actions">
          <button 
            className="modal-confirm-button" 
            onClick={handleConfirmSelection}
            disabled={!selectedSeat}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
}