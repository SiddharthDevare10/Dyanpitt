/**
 * Centralized progress validation utility
 * Provides consistent validation logic for user progress tracking
 */

/**
 * Check if user has an active membership
 */
export const hasActiveMembership = (user) => {
  if (!user || !user.bookings || user.bookings.length === 0) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return user.bookings.some(booking => {
    if (booking.paymentStatus !== 'completed' && booking.paymentStatus !== 'cash_collected') {
      return false;
    }
    
    const endDate = new Date(booking.membershipEndDate);
    endDate.setHours(23, 59, 59, 999);
    
    return booking.membershipActive && endDate >= today;
  });
};

/**
 * Get user's active membership details
 */
export const getActiveMembership = (user) => {
  if (!user || !user.bookings || user.bookings.length === 0) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return user.bookings.find(booking => {
    if (booking.paymentStatus !== 'completed' && booking.paymentStatus !== 'cash_collected') {
      return false;
    }
    
    const endDate = new Date(booking.membershipEndDate);
    endDate.setHours(23, 59, 59, 999);
    
    return booking.membershipActive && endDate >= today;
  });
};

/**
 * Define the sequential steps in the user registration flow
 */
export const PROGRESS_STEPS = {
  MEMBERSHIP: 'membership',
  BOOKING: 'booking', 
  PAYMENT: 'payment',
  DASHBOARD: 'dashboard'
};

/**
 * Define the step order for validation
 */
export const STEP_ORDER = [
  PROGRESS_STEPS.MEMBERSHIP,
  PROGRESS_STEPS.BOOKING,
  PROGRESS_STEPS.PAYMENT,
  PROGRESS_STEPS.DASHBOARD
];

/**
 * Validate if a user has completed a specific step
 */
export const hasCompletedStep = (user, step) => {
  if (!user) return false;

  switch (step) {
    case PROGRESS_STEPS.MEMBERSHIP:
      return user.membershipCompleted === true;
      
    case PROGRESS_STEPS.BOOKING:
      // For now, consider booking completed if user has any booking record
      // The actual validation will be done via API calls
      return user.membershipCompleted === true && user.bookingCompleted === true;
             
    case PROGRESS_STEPS.PAYMENT: {
      // Check if user has completed payment either through regular flow or cash payment
      const hasRegularPayment = user.membershipCompleted === true &&
                               user.bookingDetails &&
                               user.bookingDetails.timeSlot &&
                               user.bookingDetails.membershipType &&
                               user.bookingCompleted === true &&
                               user.paymentCompleted === true;
      
      // Check if user has cash payment completed (cash_collected status)
      const hasCashPayment = user.bookings?.some(booking => 
        booking.paymentStatus === 'cash_collected'
      );
      
      return hasRegularPayment || hasCashPayment;
    }
    
    case PROGRESS_STEPS.DASHBOARD:
      return hasCompletedStep(user, PROGRESS_STEPS.PAYMENT);
      
    default:
      return false;
  }
}

/**
 * Check if user can access a specific step
 * Returns true if user has completed all previous steps
 */
export const canAccessStep = (user, targetStep) => {
  if (!user) return false;

  const stepIndex = STEP_ORDER.indexOf(targetStep);
  if (stepIndex === -1) return false;

  // For membership step, just need to be authenticated
  if (targetStep === PROGRESS_STEPS.MEMBERSHIP) {
    // Check if user already has an active membership
    if (hasActiveMembership(user)) {
      return false; // Cannot start new membership process if already active
    }
    return true;
  }

  // For booking step, also check for active membership
  if (targetStep === PROGRESS_STEPS.BOOKING) {
    // Check if user already has an active membership
    if (hasActiveMembership(user)) {
      return false; // Cannot create new booking if already have active membership
    }
  }

  // For other steps, check that all previous steps are completed
  for (let i = 0; i < stepIndex; i++) {
    if (!hasCompletedStep(user, STEP_ORDER[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Get the next required step for a user
 * Returns the step they should be redirected to, or null if all steps are complete
 */
export const getNextRequiredStep = (user) => {
  if (!user) return PROGRESS_STEPS.MEMBERSHIP;

  // Check each step in order
  for (const step of STEP_ORDER) {
    const stepCompleted = hasCompletedStep(user, step);
    if (!stepCompleted) {
      return step;
    }
  }

  // All steps completed, user can access dashboard
  return PROGRESS_STEPS.DASHBOARD;
};

/**
 * Get the appropriate redirect path for a user based on their completion status
 */
export const getRedirectPath = (user) => {
  if (!user) return '/login';

  const nextStep = getNextRequiredStep(user);
  
  switch (nextStep) {
    case PROGRESS_STEPS.MEMBERSHIP:
      return '/membership';
    case PROGRESS_STEPS.BOOKING:
      return '/booking';
    case PROGRESS_STEPS.PAYMENT:
      return '/payment';
    case PROGRESS_STEPS.DASHBOARD:
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

/**
 * Validate user progress and return validation result
 */
export const validateUserProgress = (user, requiredStep) => {
  if (!user) {
    return {
      isValid: false,
      redirectTo: '/login',
      reason: 'Not authenticated'
    };
  }

  // Admin users bypass all progress validation
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return { isValid: true };
  }

  // CRITICAL: Check for cash pending users FIRST - they should be redirected to cash payment page
  const hasCashPendingBooking = user.bookings?.some(booking => 
    booking.paymentStatus === 'cash_pending'
  ) || user.pendingCashPaymentRequest;
  
  if (hasCashPendingBooking) {
    // Cash payment users should only access cash-payment-pending page
    if (requiredStep === 'cash-payment-pending' || !requiredStep) {
      return {
        isValid: true,
        redirectTo: null,
        reason: 'Cash payment user accessing cash payment page'
      };
    } else {
      return {
        isValid: false,
        redirectTo: '/cash-payment-pending',
        reason: 'Cash payment pending - redirect to cash payment page'
      };
    }
  }

  // NEW LOGIC: Check if user has an active membership
  // If they do, they should only be able to access dashboard
  if (hasActiveMembership(user)) {
    if (requiredStep === PROGRESS_STEPS.DASHBOARD) {
      return {
        isValid: true,
        redirectTo: null,
        reason: 'User has active membership - dashboard access allowed'
      };
    } else {
      return {
        isValid: false,
        redirectTo: '/dashboard',
        reason: 'User has active membership - can only access dashboard'
      };
    }
  }

  // NEW LOGIC: If user has Dnyanpeeth ID but no active membership,
  // they can only access dashboard (no new membership process)
  if (user.hasDnyanpittId && user.dyanpittId && !hasActiveMembership(user)) {
    if (requiredStep === PROGRESS_STEPS.DASHBOARD) {
      return {
        isValid: true,
        redirectTo: null,
        reason: 'User has Dnyanpeeth ID - dashboard access allowed'
      };
    } else {
      return {
        isValid: false,
        redirectTo: '/dashboard',
        reason: 'User has Dnyanpeeth ID - must go to dashboard for new membership'
      };
    }
  }

  // Check if user can access the required step
  if (!canAccessStep(user, requiredStep)) {
    const nextStep = getNextRequiredStep(user);
    return {
      isValid: false,
      redirectTo: getRedirectPath(user),
      reason: `Must complete ${nextStep} step first`
    };
  }

  // If user has already completed this step and all subsequent steps,
  // and they're trying to access an earlier step, allow it
  if (hasCompletedStep(user, requiredStep)) {
    return {
      isValid: true,
      redirectTo: null,
      reason: 'Step already completed - allowing access'
    };
  }

  // If user has completed all previous steps, allow access to current step
  return {
    isValid: true,
    redirectTo: null,
    reason: 'Ready to access step'
  };
};

/**
 * Special validation for payment step
 * Payment step has additional logic for handling different payment states
 */
export const validatePaymentAccess = (user, navigationState = null) => {
  if (!user) {
    return {
      isValid: false,
      redirectTo: '/login',
      reason: 'Not authenticated'
    };
  }

  // FIXED: If user has an active membership, they should go to dashboard
  // This prevents users with active memberships from accessing payment page
  if (hasActiveMembership(user)) {
    return {
      isValid: false,
      redirectTo: '/dashboard',
      reason: 'User has active membership - redirect to dashboard'
    };
  }

  // Must have completed membership
  if (!hasCompletedStep(user, PROGRESS_STEPS.MEMBERSHIP)) {
    return {
      isValid: false,
      redirectTo: '/membership',
      reason: 'Must complete membership first'
    };
  }

  // Check if we have valid booking data either in user state or navigation state
  const hasValidBookingInUser = user.membershipCompleted && 
                               user.bookingDetails && 
                               user.bookingDetails.timeSlot && 
                               user.bookingDetails.membershipType &&
                               user.bookingCompleted;

  const hasValidBookingInNavState = navigationState?.bookingData &&
                                   navigationState.bookingData.timeSlot &&
                                   navigationState.bookingData.membershipType;

  // Must have completed booking (have booking details AND bookingCompleted flag)
  // OR have valid booking data in navigation state (for temp bookings)
  if (!hasValidBookingInUser && !hasValidBookingInNavState) {
    return {
      isValid: false,
      redirectTo: '/booking',
      reason: 'Must complete booking first'
    };
  }

  // If payment is already completed, redirect to dashboard
  if (hasCompletedStep(user, PROGRESS_STEPS.PAYMENT)) {
    return {
      isValid: false,
      redirectTo: '/dashboard',
      reason: 'Payment already completed'
    };
  }

  // Payment step is accessible
  return {
    isValid: true,
    redirectTo: null,
    reason: 'Ready for payment'
  };
};

/**
 * Special validation for dashboard access
 */
export const validateDashboardAccess = (user) => {
  if (!user) {
    return {
      isValid: false,
      redirectTo: '/login',
      reason: 'Not authenticated'
    };
  }

  // Admin users can always access dashboard
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return { isValid: true };
  }

  // CRITICAL: Check for pending cash payments FIRST - before any other validation
  // This ensures cash payment users are redirected to cash payment page, not booking page
  if (user?.pendingCashPaymentRequest) {
    // Check if the request has expired (2 days)
    const expiryDate = new Date(user.pendingCashPaymentRequest.expiresAt);
    const now = new Date();
    
    if (now > expiryDate) {
      // Request expired, allow user to start over
      return {
        isValid: false,
        redirectTo: '/booking',
        reason: 'Cash payment request expired. Please start a new booking.'
      };
    }
    
    return {
      isValid: false,
      redirectTo: '/cash-payment-pending',
      reason: 'Cash payment pending admin confirmation'
    };
  }
  
  if (user?.bookings?.length > 0) {
    const pendingCashPayment = user.bookings.find(booking => 
      booking.paymentStatus === 'cash_pending'
    );
    
    if (pendingCashPayment) {
      return {
        isValid: false,
        redirectTo: '/cash-payment-pending',
        reason: 'Cash payment pending collection'
      };
    }
  }

  // FIXED: If user has an active membership, they should be able to access dashboard
  // This prevents the infinite loop where users with active memberships get stuck
  if (hasActiveMembership(user)) {
    return {
      isValid: true,
      redirectTo: null,
      reason: 'User has active membership - dashboard access allowed'
    };
  }

  // NEW LOGIC: If user has a Dnyanpeeth ID, they can always access dashboard
  // This allows users to stay on dashboard even after membership expires
  if (user.hasDnyanpittId && user.dyanpittId) {
    return {
      isValid: true,
      redirectTo: null,
      reason: 'User has Dnyanpeeth ID - permanent dashboard access'
    };
  }

  // For users without active membership or Dnyanpeeth ID, check if all required steps are completed
  if (!hasCompletedStep(user, PROGRESS_STEPS.PAYMENT)) {
    const nextStep = getNextRequiredStep(user);
    return {
      isValid: false,
      redirectTo: getRedirectPath(user),
      reason: `Must complete ${nextStep} step first`
    };
  }

  return {
    isValid: true,
    redirectTo: null,
    reason: 'All steps completed'
  };
};