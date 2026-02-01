import { useState, useRef, useEffect } from 'react';

export default function CustomDropdown({ 
  name, 
  value, 
  onChange, 
  options, 
  placeholder, 
  className, 
  error 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue, event) => {
    // Prevent event bubbling to avoid conflicts
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Call the onChange handler passed from parent
    onChange({
      target: {
        name: name,
        value: optionValue
      }
    });
    
    // Close the dropdown
    setIsOpen(false);
    
    // Auto-scroll to the next adjacent field after selection
    setTimeout(() => {
      if (wrapperRef.current) {
        // Find the next input field (adjacent field)
        const parentForm = wrapperRef.current.closest('form');
        const allInputGroups = parentForm ? Array.from(parentForm.querySelectorAll('.input-group')) : [];
        const currentInputGroup = wrapperRef.current.closest('.input-group');
        const currentIndex = allInputGroups.indexOf(currentInputGroup);
        const nextInputGroup = allInputGroups[currentIndex + 1];
        
        if (nextInputGroup) {
          // Wait a bit for the dropdown to fully close and layout to settle
          setTimeout(() => {
            const nextRect = nextInputGroup.getBoundingClientRect();
            const nextElementTop = nextRect.top + window.scrollY;
            const viewportHeight = window.innerHeight;
            
            // Position the next field at 20% from top of viewport for better visibility
            const targetScrollY = nextElementTop - (viewportHeight * 0.2);
            
            window.scrollTo({
              top: Math.max(0, targetScrollY),
              behavior: 'smooth'
            });
            
            // Focus the next input if it's a form input
            const nextInput = nextInputGroup.querySelector('input, textarea, .custom-dropdown');
            if (nextInput && !nextInput.disabled) {
              setTimeout(() => {
                if (nextInput.classList && nextInput.classList.contains('custom-dropdown')) {
                  // For custom dropdowns, focus the clickable element
                  nextInput.focus();
                } else if (nextInput.focus) {
                  nextInput.focus();
                }
              }, 400); // Wait for scroll to complete
            }
          }, 50);
        }
      }
    }, 100); // Small delay to ensure dropdown has closed
  };

  const selectedOption = options.find(option => option.value === value);

  const handleDropdownClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="custom-dropdown-wrapper" ref={wrapperRef}>
      <div 
        ref={dropdownRef}
        className={`custom-dropdown ${className} ${error ? 'input-error' : ''} ${isOpen ? 'open' : ''}`}
        onClick={handleDropdownClick}
      >
        <span className="custom-dropdown-selected">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="custom-dropdown-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </span>
      </div>
      
      {isOpen && (
        <div className={`custom-dropdown-options ${name === 'examPreparation' ? 'grid-layout' : ''}`}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-dropdown-option ${value === option.value ? 'selected' : ''} ${option.description ? 'has-description' : ''}`}
              onClick={(e) => handleSelect(option.value, e)}
              onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
            >
              <div className="option-content">
                <div className="option-label">{option.label}</div>
                {option.description && (
                  <div className="option-description">{option.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}