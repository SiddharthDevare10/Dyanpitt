import React, { useState } from 'react';
import { X } from 'lucide-react';
import CustomDropdown from './CustomDropdown';

export default function SeatSelectionModal({ isOpen, onClose, selectedSeat, onSeatSelect, userData, membershipType }) {
  
  // State for selected section in Dyanpurn Kaksh
  const [selectedSection, setSelectedSection] = useState('A');
  
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
      // Dyanpurn Kaksh layout - Section based
      if (selectedSection === 'A') {
        return [
          { row: '5', seats: [54, 55, 56] },                // Row 5: 3 seats (top row)
          { row: '4', seats: [53, 0, 57] },            // Row 4: seat 53, zero, seat 57
          { row: '3', seats: [52, 0, 58] },            // Row 3: seat 52, zero, seat 58
          { row: '2', seats: [51, 0, 59] },            // Row 2: seat 51, zero, seat 59
          { row: '1', seats: [50, 0, 0] }             // Row 1: seat 50, two zeros
        ];
      } else if (selectedSection === 'B') {
        return [
          { row: '4', seats: [63, 64, 65] },                  // Row 4: 3 seats (top row) - col1: 5, col2: 6, col3: 7
          { row: '3', seats: [62, 0, 66] },             // Row 3: 2 seats with fake box - col1: 3, col2: fake, col3: 4
          { row: '2', seats: [61, 0, 0] },        // Row 2: seat 1 aligned with seat 5 (col1)
          { row: '1', seats: [60, 0, 0] }         // Row 1: seat 2 aligned with seat 6 (col2)
        ];
      } else if (selectedSection === 'C') {
        return [
          { row: '4', seats: [72, 0, 71] },               // Row 4: 2 seats with space in between
          { row: '3', seats: [73, 0, 70] },               // Row 3: 2 seats with space in between
          { row: '2', seats: [0, 0, 0] },               // Row 2: 3 seats
          { row: '1', seats: [67, 68, 69] },                  // Row 1: 3 seats
        ];
      }
      return [];
    } else if (venue === 'Dyanasmi Kaksh') {
      // Dyanasmi Kaksh layout - Section based (separate from Dyanpurn)
      if (selectedSection === 'A') {
        return [
          { row: '5', seats: [0, 0, 0,'entry'] },
          { row: '4', seats: [81, 0, 0, 74] },               // Row 4: 2 seats with space in between
          { row: '3', seats: [80, 0, 0, 75] },
          { row: '2', seats: [79, 0, 0, 0] },               // Row 3: 2 seats with space in between              // Row 2: 3 seats
          { row: '1', seats: [0, 78, 77, 76] },                  // Row 1: 3 seats
        ];
      } else if (selectedSection === 'B') {
        return [
          { row: '5', seats: [87, 86, 85] }, 
          { row: '4', seats: [88, 0, 0, 84] },                  // Row 4: 3 seats (top row) - col1: 5, col2: 6, col3: 7
          { row: '3', seats: [89, 0, 0, 83] },             // Row 3: 2 seats with fake box - col1: 3, col2: fake, col3: 4
          { row: '2', seats: [90, 0, 0, 82] },        // Row 2: seat 1 aligned with seat 5 (col1)
          { row: '1', seats: [0, 91, 92, 'entry'] }         // Row 1: seat 2 aligned with seat 6 (col2)
        ];
      } else if (selectedSection === 'C') {
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
      if (selectedSection === 'A') {
        // Section A: seats 54, 55, 56 are silver
        if ([54, 55, 56].includes(seatNum)) return 'silver';
      } else if (selectedSection === 'B') {
        // Section B: seats 63, 64, 65 are silver
        if ([63, 64, 65].includes(seatNum)) return 'silver';
      } else if (selectedSection === 'C') {
        // Section C: seat 69 is gold
        if (seatNum === 69) return 'gold';
      }
      return 'standard';
    } else if (venue === 'Dyanasmi Kaksh') {
      // Seat tiers for Dyanasmi Kaksh (separate from Dyanpurn)
      if (selectedSection === 'A') {
        // Section A: seats 54, 55, 56 are silver
        if ([54, 55, 56].includes(seatNum)) return 'silver';
      } else if (selectedSection === 'B') {
        // Section B: seats 63, 64, 65 are silver
        if ([63, 64, 65].includes(seatNum)) return 'silver';
      } else if (selectedSection === 'C') {
        // Section C: seat 69 is gold
        if (seatNum === 69) return 'gold';
      }
      return 'standard';
    }
    return 'standard';
  };


  // All seats are available for now
  const occupiedSeats = [];

  const handleSeatClick = (seatId) => {
    if (occupiedSeats.includes(seatId)) {
      return; // Can't select occupied seats
    }
    
    // Check gender restrictions for Dyanpurn Kaksh and Dyanasmi Kaksh
    if (venue === 'Dyanpurn Kaksh' || venue === 'Dyanasmi Kaksh') {
      if (selectedSection === 'A' && userData?.gender !== 'female') {
        // Male user trying to select female-only Section A
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

        {/* Section Legend for Dyanpurn Kaksh and Dyanasmi Kaksh */}
        {(venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh') && (
          <div className="section-legend-container">
            <div className="section-legend-items">
              <div 
                className={`section-legend-item ${selectedSection === 'A' ? 'active' : ''}`}
                onClick={() => setSelectedSection('A')}
              >
                <span>Section A</span>
              </div>
              <div 
                className={`section-legend-item ${selectedSection === 'B' ? 'active' : ''}`}
                onClick={() => setSelectedSection('B')}
              >
                <span>Section B</span>
              </div>
              <div 
                className={`section-legend-item ${selectedSection === 'C' ? 'active' : ''}`}
                onClick={() => setSelectedSection('C')}
              >
                <span>Section C</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Seat Map */}
        <div className="seat-map">
          {(venue === 'Dyanpurn Kaksh' || venue === 'Dyanpurn' || venue === 'Dyanasmi Kaksh') && (selectedSection === 'A' || selectedSection === 'B' || selectedSection === 'C') && seatLayout.map((row, rowIndex) => (
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

                  const seatId = `${selectedSection}${seatNum}`;
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
                      {tier === 'gold' && <span className="tier-indicator gold"></span>}
                      {tier === 'silver' && <span className="tier-indicator silver"></span>}
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
                        {tier === 'gold' && <span className="tier-indicator gold"></span>}
                        {tier === 'silver' && <span className="tier-indicator silver"></span>}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

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