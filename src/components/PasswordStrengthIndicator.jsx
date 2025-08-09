const PasswordStrengthIndicator = ({ password }) => {
  const calculateStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '#e5e7eb' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // Calculate score based on criteria met
    Object.values(checks).forEach(check => {
      if (check) score++;
    });

    // Determine strength level
    let label, color;
    if (score === 0) {
      label = '';
      color = '#e5e7eb';
    } else if (score <= 2) {
      label = 'Weak';
      color = '#ef4444';
    } else if (score <= 3) {
      label = 'Fair';
      color = '#f59e0b';
    } else if (score <= 4) {
      label = 'Good';
      color = '#10b981';
    } else {
      label = 'Strong';
      color = '#059669';
    }

    return { score, label, color, checks };
  };

  const strength = calculateStrength(password);

  if (!password) return null;

  return (
    <div className="password-strength-container">
      {/* Strength Bar */}
      <div className="strength-bar-container">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`strength-bar-segment ${
              level <= strength.score ? 'active' : 'inactive'
            }`}
            style={{
              backgroundColor: level <= strength.score ? strength.color : '#e5e7eb'
            }}
          />
        ))}
      </div>

      {/* Strength Label */}
      {strength.label && (
        <div className="strength-label-container">
          <span 
            className="strength-label"
            style={{ color: strength.color }}
          >
            Password Strength: {strength.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;