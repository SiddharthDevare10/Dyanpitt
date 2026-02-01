import { useState } from 'react';

const CustomTimePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select your preferred time slot",
  label = "Preferred Tour Time",
  labelHindi = "टूरची प्राधान्य वेळ",
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(value ? parseInt(value.split(':')[0]) : 9);
  const [selectedMinute, setSelectedMinute] = useState(value ? parseInt(value.split(':')[1].split(' ')[0]) : 0); // 0 or 30 minutes
  const [selectedPeriod, setSelectedPeriod] = useState(value ? value.split(' ')[1] : 'AM');

  const formatTime = (hour, minute, period) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${formattedMinute} ${period}`;
  };

  const formatDisplayTime = (hour, minute, period) => {
    const time = formatTime(hour, minute, period);
    const nextHour = hour === 23 ? 0 : hour + 1;
    const nextPeriod = hour === 11 ? (period === 'AM' ? 'PM' : 'AM') : period;
    const endTime = formatTime(nextHour, minute, nextPeriod);
    return `${time} - ${endTime}`;
  };

  const handleHourIncrement = () => {
    setSelectedHour(prev => {
      if (prev === 8 && selectedPeriod === 'PM') return 9; // 8pm -> 9pm (last slot)
      if (prev === 11 && selectedPeriod === 'AM') {
        setSelectedPeriod('PM');
        return 12; // 11am -> 12pm
      }
      if (prev === 11 && selectedPeriod === 'PM') return 9; // Wrap around 11pm -> 9am
      if (prev === 12 && selectedPeriod === 'PM') return 1; // 12pm -> 1pm
      return prev === 9 ? 10 : prev + 1;
    });
  };

  const handleHourDecrement = () => {
    setSelectedHour(prev => {
      if (prev === 9 && selectedPeriod === 'AM') {
        setSelectedPeriod('PM');
        return 9; // Wrap around 9am -> 9pm
      }
      if (prev === 9 && selectedPeriod === 'PM') return 8; // 9pm -> 8pm
      if (prev === 12 && selectedPeriod === 'PM') {
        setSelectedPeriod('AM');
        return 11; // 12pm -> 11am
      }
      if (prev === 1 && selectedPeriod === 'PM') return 12; // 1pm -> 12pm
      return prev - 1;
    });
  };

  const handleMinuteIncrement = () => {
    setSelectedMinute(prev => prev === 0 ? 30 : 0); // Toggle between 0 and 30
  };

  const handleMinuteDecrement = () => {
    setSelectedMinute(prev => prev === 30 ? 0 : 30); // Toggle between 30 and 0
  };

  const handlePeriodIncrement = () => {
    if (selectedPeriod === 'AM') {
      setSelectedPeriod('PM');
      setSelectedHour(12); // Switch to 12pm when going AM -> PM
    } else {
      setSelectedPeriod('AM');
      setSelectedHour(9); // Switch to 9am when going PM -> AM
    }
  };

  const handlePeriodDecrement = () => {
    if (selectedPeriod === 'PM') {
      setSelectedPeriod('AM');
      setSelectedHour(9); // Switch to 9am when going PM -> AM
    } else {
      setSelectedPeriod('PM');
      setSelectedHour(12); // Switch to 12pm when going AM -> PM
    }
  };

  const handleConfirm = () => {
    const timeValue = formatDisplayTime(selectedHour, selectedMinute, selectedPeriod);
    onChange(timeValue);
    setIsOpen(false);
  };

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
  const displayValue = formatDisplayTime(selectedHour, selectedMinute, selectedPeriod);

  return (
    <div className="input-group">
      <label className="membership-input-label">
        {label}
      </label>
      <div className="marathi-text">
        {labelHindi}
      </div>
      
      {/* Clock Input Field */}
      <div 
        className={`custom-clock-input ${value ? 'clock-selected' : ''} ${error ? 'clock-error' : ''}`}
        onClick={handleOpenModal}
      >
        {value ? (
          <span className="custom-clock-value">{displayValue}</span>
        ) : (
          <span className="custom-clock-placeholder">{placeholder}</span>
        )}
        <span className="custom-clock-chevron"></span>
      </div>

      {error && (
        <span className="error-message">{error}</span>
      )}

      {/* Time Picker Modal */}
      {isOpen && (
        <div className="custom-time-modal-backdrop" onClick={handleCloseModal}>
          <div className="custom-time-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="custom-time-header">
              <h2 className="custom-time-title">Select Tour Time</h2>
              <p className="custom-time-subtitle">Select your preferred 1-hour time slot</p>
            </div>

            {/* Modal Body */}
            <div className="custom-time-body">
              <div className="custom-time-picker">
                {/* Labels Header Box */}
                <div className="custom-time-labels-box">
                  <div className="custom-label-item">Hour</div>
                  <div className="custom-label-colon">:</div>
                  <div className="custom-label-item">Minute</div>
                  <div className="custom-label-item">Period</div>
                </div>
                
                <div className="custom-time-selectors">
                  {/* Hour Control */}
                  <div className="custom-time-unit">
                    <div className="custom-unit-container">
                      <button 
                        className="custom-increment-btn"
                        onClick={handleHourIncrement}
                        type="button"
                      >
                        <div className="custom-arrow-up"></div>
                      </button>
                      <div className="custom-time-display">
                        {displayHour.toString().padStart(2, '0')}
                      </div>
                      <button 
                        className="custom-decrement-btn"
                        onClick={handleHourDecrement}
                        type="button"
                      >
                        <div className="custom-arrow-down"></div>
                      </button>
                    </div>
                  </div>

                  {/* Colon Separator */}
                  <div className="custom-time-colon">:</div>

                  {/* Minute Control */}
                  <div className="custom-time-unit">
                    <div className="custom-unit-container">
                      <button 
                        className="custom-increment-btn"
                        onClick={handleMinuteIncrement}
                        type="button"
                      >
                        <div className="custom-arrow-up"></div>
                      </button>
                      <div className="custom-time-display">
                        {selectedMinute.toString().padStart(2, '0')}
                      </div>
                      <button 
                        className="custom-decrement-btn"
                        onClick={handleMinuteDecrement}
                        type="button"
                      >
                        <div className="custom-arrow-down"></div>
                      </button>
                    </div>
                  </div>

                  {/* Period Control */}
                  <div className="custom-period-unit">
                    <div className="custom-period-container">
                      <button 
                        className="custom-period-increment-btn"
                        onClick={handlePeriodIncrement}
                        type="button"
                      >
                        <div className="custom-arrow-up"></div>
                      </button>
                      <div className="custom-period-display">
                        {selectedPeriod}
                      </div>
                      <button 
                        className="custom-period-decrement-btn"
                        onClick={handlePeriodDecrement}
                        type="button"
                      >
                        <div className="custom-arrow-down"></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm Button */}
                <button 
                  className="custom-time-confirm"
                  onClick={handleConfirm}
                  type="button"
                >
                  Confirm Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTimePicker;