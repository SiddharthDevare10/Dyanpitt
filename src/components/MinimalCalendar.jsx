import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentIST } from '../utils/istUtils';

export default function MinimalCalendar({ 
  value, 
  onChange, 
  minDate, 
  maxDate
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) return new Date(value);
    const today = getCurrentIST();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateDisabled = (date) => {
    // Normalize dates to local timezone for comparison
    const normalizeDate = (d) => {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };
    
    const normalizedDate = normalizeDate(date);
    
    if (minDate) {
      const normalizedMin = normalizeDate(minDate);
      if (normalizedDate < normalizedMin) return true;
    }
    
    if (maxDate) {
      const normalizedMax = normalizeDate(maxDate);
      if (normalizedDate > normalizedMax) return true;
    }
    
    return false;
  };

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    if (isDateDisabled(clickedDate)) return;
    
    setSelectedDate(clickedDate);
    onChange(clickedDate);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const canNavigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    
    // Check minDate constraint
    if (minDate) {
      const minDateObj = new Date(minDate);
      // For backward navigation, check if the new month would be before minDate
      if (direction < 0) {
        const newMonthStart = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        const minMonthStart = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), 1);
        if (newMonthStart < minMonthStart) return false;
      }
    }
    
    // Check maxDate constraint
    if (maxDate) {
      const maxDateObj = new Date(maxDate);
      // For forward navigation, check if the new month would be after maxDate
      if (direction > 0) {
        const newMonthStart = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        const maxMonthStart = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), 1);
        if (newMonthStart > maxMonthStart) return false;
      }
    }
    
    return true;
  };


  const handleMonthSelect = (monthIndex) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(monthIndex);
      return newDate;
    });
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(year);
      return newDate;
    });
    setShowYearPicker(false);
  };

  const generateYearRange = () => {
    const currentYear = new Date().getFullYear();
    let startYear, endYear;
    
    // If minDate is set, start from that year
    if (minDate) {
      const minYear = new Date(minDate).getFullYear();
      const today = new Date();
      const minDateObj = new Date(minDate);
      
      // If minDate is in the future, only show future years
      if (minDateObj > today) {
        startYear = minYear;
        endYear = currentYear + 10; // 10 years forward from current year
      } else {
        // Normal range if minDate is not in future
        startYear = currentYear - 100;
        endYear = currentYear + 10;
      }
    } else {
      // For date of birth, limit to years that make users at least 12 years old
      // Someone born in currentYear - 12 would be 12 years old this year
      startYear = currentYear - 100; // Allow up to 100 years back
      endYear = currentYear - 12; // Only show years that make users at least 12
    }
    
    // If maxDate is set, limit the end year and potentially start year
    if (maxDate) {
      const maxYear = new Date(maxDate).getFullYear();
      endYear = Math.min(endYear, maxYear);
      
      // If we have both minDate and maxDate, ensure we only show relevant years
      if (minDate) {
        const minYear = new Date(minDate).getFullYear();
        startYear = Math.max(startYear, minYear);
      }
    }
    
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    
    // For date of birth (when we have a wide range going back in time), 
    // reverse the array so oldest years appear first
    if (startYear < currentYear - 50) {
      return years.reverse();
    }
    
    return years;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isSelected = isSameDate(date, selectedDate);
      const isDisabled = isDateDisabled(date);
      const isToday = isSameDate(date, getCurrentIST());

      days.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="minimal-calendar">
      {/* Header with navigation */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button 
            type="button" 
            className={`nav-button ${!canNavigateMonth(-1) ? 'disabled' : ''}`}
            onClick={() => canNavigateMonth(-1) && navigateMonth(-1)}
            disabled={!canNavigateMonth(-1)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        
        <div className="calendar-title">
          <div className="month-year-selectors">
            <button 
              type="button"
              className="month-selector"
              onClick={() => {
                setShowMonthPicker(!showMonthPicker);
                setShowYearPicker(false);
              }}
            >
              {monthNames[currentDate.getMonth()]}
            </button>
            <button 
              type="button"
              className="year-selector"
              onClick={() => {
                setShowYearPicker(!showYearPicker);
                setShowMonthPicker(false);
              }}
            >
              {currentDate.getFullYear()}
            </button>
          </div>
        </div>
        
        <div className="calendar-nav">
          <button 
            type="button" 
            className={`nav-button ${!canNavigateMonth(1) ? 'disabled' : ''}`}
            onClick={() => canNavigateMonth(1) && navigateMonth(1)}
            disabled={!canNavigateMonth(1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month Picker Dropdown */}
      {showMonthPicker && (
        <div className="picker-dropdown month-picker">
          <div className="picker-grid">
            {monthNames.map((month, index) => {
              // Check if this month should be disabled based on minDate and maxDate
              let isMonthDisabled = false;
              
              if (minDate && !isMonthDisabled) {
                const minDateObj = new Date(minDate);
                
                // If we're in the same year as minDate
                if (currentDate.getFullYear() === minDateObj.getFullYear()) {
                  // Disable months before the minDate month
                  isMonthDisabled = index < minDateObj.getMonth();
                }
                
                // If current year is before minDate year, disable all months
                if (currentDate.getFullYear() < minDateObj.getFullYear()) {
                  isMonthDisabled = true;
                }
              }
              
              if (maxDate && !isMonthDisabled) {
                const maxDateObj = new Date(maxDate);
                
                // If we're in the same year as maxDate
                if (currentDate.getFullYear() === maxDateObj.getFullYear()) {
                  // Disable months after the maxDate month
                  isMonthDisabled = index > maxDateObj.getMonth();
                }
                
                // If current year is after maxDate year, disable all months
                if (currentDate.getFullYear() > maxDateObj.getFullYear()) {
                  isMonthDisabled = true;
                }
              }
              
              return (
                <button
                  key={month}
                  type="button"
                  className={`picker-item ${currentDate.getMonth() === index ? 'active' : ''} ${isMonthDisabled ? 'disabled' : ''}`}
                  onClick={() => !isMonthDisabled && handleMonthSelect(index)}
                  disabled={isMonthDisabled}
                >
                  {month.substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Year Picker Dropdown */}
      {showYearPicker && (
        <div className="picker-dropdown year-picker">
          <div className="picker-scroll">
            {generateYearRange().map((year) => (
              <button
                key={year}
                type="button"
                className={`picker-item ${currentDate.getFullYear() === year ? 'active' : ''}`}
                onClick={() => handleYearSelect(year)}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day names */}
      <div className="calendar-weekdays">
        {dayNames.map(day => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {renderCalendarDays()}
      </div>

      {/* Footer with confirm button */}
      <div className="calendar-footer">
        <button 
          type="button" 
          className="confirm-button"
          onClick={() => {
            if (selectedDate) {
              onChange(selectedDate);
            }
          }}
          disabled={!selectedDate}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}