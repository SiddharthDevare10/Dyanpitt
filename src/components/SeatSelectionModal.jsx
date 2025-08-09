import { useState } from 'react';
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
    if (venue === 'Calista Garden') {
      // Calista Garden layout with gender-specific seating
      return [
        { row: 'E', seats: [30, 31, 32, 33, 'aisle', 24, 25, 26, 27, 28, 29] }, // Row E (back)
        { row: 'D', seats: [37, 36, 35, 34, 'aisle', 23, 22, 21, 20, 19, 18] }, // Row D
        { row: 'C', seats: [38, 39, 40, 41, 'aisle', 12, 13, 14, 15, 16, 17] }, // Row C
        { row: 'B', seats: [45, 44, 43, 42, 'aisle', 11, 10, 9, 8, 7, 6] },     // Row B
        { row: 'A', seats: [46, 47, 48, 49, 'aisle', 1, 2, 3, 4, 5] }           // Row A (front)
      ];
    } else if (venue === 'Dyanpurn Kaksh') {
      // Dyanpurn Kaksh layout - Section based
      if (selectedSection === 'A') {
        return [
          { row: '5', seats: [54, 55, 56] },                // Row 5: 3 seats (top row)
          { row: '4', seats: [53, 0, 57] },            // Row 4: 2 seats with aisle
          { row: '3', seats: [52, 0, 58] },            // Row 3: 2 seats with aisle
          { row: '2', seats: [51, 0, 59] },            // Row 2: 2 seats with aisle
          { row: '1', seats: [50, 0, 0] }             // Row 1: 2 seats with aisle
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
    } else {
      // Dyandhara Kaksh layout (original)
      return [
        { row: 'E', seats: [30, 31, 32, 33, 24, 25, 26, 27, 28, 29] }, // Row E has 10 seats (back)
        { row: 'D', seats: [37, 36, 35, 34, 23, 22, 21, 20, 19, 18] }, // Row D has 10 seats
        { row: 'C', seats: [38, 39, 40, 41, 12, 13, 14, 15, 16, 17] }, // Row C has 10 seats
        { row: 'B', seats: [45, 44, 43, 42, 11, 10, 9, 8, 7, 6] }, // Row B has 10 seats
        { row: 'A', seats: [46, 47, 48, 49, 1, 2, 3, 4, 5] }      // Row A has 9 seats (front)
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
    } else if (venue === 'Calista Garden') {
      if (seatNum === 5) return 'gold';
      if ([24, 25, 26, 27, 28, 29, 32, 33].includes(seatNum)) return 'silver';
      return 'standard';
    } else if (venue === 'Dyanpurn Kaksh') {
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
    }
    return 'standard';
  };

  // Check if seat is for females (left side of aisle in Calista Garden)
  const isFemaleOnlySeat = (seatNum) => {
    if (venue !== 'Calista Garden') return false;
    // In Calista Garden, seats to the left of aisle (higher numbers) are female-only
    const femaleSeats = [30, 31, 32, 33, 37, 36, 35, 34, 38, 39, 40, 41, 45, 44, 43, 42, 46, 47, 48, 49];
    return femaleSeats.includes(seatNum);
  };

  // All seats are available for now
  const occupiedSeats = [];

  const handleSeatClick = (seatId) => {
    if (occupiedSeats.includes(seatId)) {
      return; // Can't select occupied seats
    }
    
    // Extract seat number from seatId (e.g., "A5" -> 5, "A1" -> 1)
    const seatNum = parseInt(seatId.match(/\d+$/)[0]);
    
    // Check gender restrictions for Calista Garden
    if (venue === 'Calista Garden') {
      const isFemaleOnly = isFemaleOnlySeat(seatNum);
      if (isFemaleOnly && userData?.gender !== 'female') {
        // Male user trying to select female-only seat
        return;
      }
      if (!isFemaleOnly && userData?.gender === 'female') {
        // Female user trying to select male seat - allow but show warning
        // For now, we'll allow it
      }
    }
    
    // Check gender restrictions for Dyanpurn Kaksh
    if (venue === 'Dyanpurn Kaksh') {
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
      <div className="seat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="seat-modal-header">
          <h2>Select Your Preferred Seat</h2>
          <button className="modal-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Room Header */}
        <div className="room-header">
          <h3>{venue}</h3>
        </div>

        {/* Section Dropdown for Dyanpurn Kaksh */}
        {venue === 'Dyanpurn Kaksh' && (
          <div className="section-dropdown-container">
            <label className="section-dropdown-label">
              Select Section:
            </label>
            <CustomDropdown
              name="section"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              options={[
                { value: 'A', label: 'Section A ( Females Only ' },
                { value: 'B', label: 'Section B ( Males Only )' },
                { value: 'C', label: 'Section C ( Males Only )' }
              ]}
              placeholder="Select Section"
            />
          </div>
        )}

        {/* Interactive Seat Map */}
        <div className="seat-map">
          {venue === 'Dyanpurn Kaksh' && (selectedSection === 'A' || selectedSection === 'B' || selectedSection === 'C') && seatLayout.map((row, rowIndex) => (
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
                  
                  // Handle seats with value 0 (invisible but maintain layout)
                  if (seatNum === 0) {
                    return (
                      <button
                        key={`${row.row}-zero-${index}`}
                        className="seat zero-value-seat"
                        disabled={true}
                        className="seat-modal-seat-disabled"
                      >
                        <span className="seat-number">{seatNum}</span>
                      </button>
                    );
                  }

                  const seatId = `${selectedSection}${seatNum}`;
                  const status = getSeatStatus(seatId);
                  const tier = getSeatTier(seatNum);
                  const isFemaleOnlySection = selectedSection === 'A';
                  const isGenderRestricted = isFemaleOnlySection && userData?.gender !== 'female';
                  return (
                    <button
                      key={`${seatId}-${index}`}
                      className={`seat ${status} ${isFemaleOnlySection ? 'female-only' : 'male-seat'} ${tier}-tier ${isGenderRestricted ? 'gender-restricted' : ''}`}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={status === 'occupied' || isGenderRestricted}
                      title={`Seat ${seatId} - ${status}${isFemaleOnlySection ? ' (Female Only)' : ''}`}
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
          {venue !== 'Dyanpurn Kaksh' && seatLayout.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="seat-row">
              <div className="seats-container">
                {row.seats.map((seatNum, index) => {
                  // Handle aisle spacing
                  if (seatNum === 'aisle') {
                    return <div key={`${row.row}-aisle-${index}`} className="aisle-space"></div>;
                  }

                  const seatId = `${row.row}${seatNum}`;
                  const status = getSeatStatus(seatId);
                  const tier = getSeatTier(seatNum);
                  const isFemaleOnly = isFemaleOnlySeat(seatNum);
                  const isGenderRestricted = venue === 'Calista Garden' && isFemaleOnly && userData?.gender !== 'female';
                  
                  return (
                    <React.Fragment key={`${row.row}-${index}-fragment`}>
                      <button
                        className={`seat ${status} ${isFemaleOnly ? 'female-only' : 'male-seat'} ${tier}-tier ${isGenderRestricted ? 'gender-restricted' : ''}`}
                        onClick={() => handleSeatClick(seatId)}
                        disabled={status === 'occupied' || isGenderRestricted}
                        title={`Seat ${seatId} - ${status}${isFemaleOnly ? ' (Female Only)' : ''}`}
                      >
                        <span className="seat-number">{seatNum}</span>
                        {tier === 'gold' && <span className="tier-indicator gold"></span>}
                        {tier === 'silver' && <span className="tier-indicator silver"></span>}
                      </button>
                      {/* Add walking space after 4th seat for Dyandhara Kaksh */}
                      {venue === 'Dyandhara Kaksh' && index === 3 && <div className="walking-space"></div>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Seat Legend */}
        <div className="seat-legend-container">
          {venue === 'Calista Garden' ? (
            <>
              <div className="legend-item">
                <span className="seat-demo-circle male-available"></span>
                <span>Male</span>
              </div>
              <div className="legend-item">
                <span className="seat-demo-circle female-available"></span>
                <span>Female</span>
              </div>
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
          ) : venue === 'Dyanpurn Kaksh' && selectedSection === 'A' ? (
            <>
              <div className="legend-item">
                <span className="seat-demo-circle female-available"></span>
                <span>Female</span>
              </div>
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
                <span className="seat-demo-circle male-available"></span>
                <span>Male</span>
              </div>
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

        {/* Selected Seat Info */}
        {selectedSeat && (
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