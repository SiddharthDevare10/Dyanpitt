import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import MinimalCalendar from './MinimalCalendar';

export default function DatePicker({ 
  value, 
  onChange, 
  name, 
  className = '', 
  error = false, 
  min, 
  max, 
  placeholder = 'Select date' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    const formattedDate = date.toISOString().split('T')[0];
    
    // Create a synthetic event to match the expected format
    const syntheticEvent = {
      target: {
        name: name,
        value: formattedDate
      }
    };
    
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  const formatDisplayDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };


  return (
    <div className="date-picker-container">
      <div 
        className={`form-input date-picker-input ${error ? 'input-error' : ''} ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedDate ? 'date-selected' : 'date-placeholder'}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        <CalendarIcon size={20} className="date-picker-icon" />
      </div>
      
      {isOpen && (
        <div className="date-picker-overlay" onClick={() => setIsOpen(false)}>
          <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="date-picker-header">
              <h3>Select Date</h3>
              <button 
                type="button"
                className="date-picker-close"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <MinimalCalendar
              value={selectedDate}
              onChange={handleDateChange}
              minDate={min}
              maxDate={max}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}