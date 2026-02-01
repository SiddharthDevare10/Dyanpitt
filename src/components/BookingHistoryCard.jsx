import React from 'react';
import { Calendar, Clock, CreditCard, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const BookingHistoryCard = ({ booking }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'expired':
        return <Clock className="text-gray-500" size={20} />;
      case 'upcoming':
        return <Calendar className="text-blue-500" size={20} />;
      case 'payment_pending':
      case 'cash_payment_pending':
        return <AlertCircle className="text-yellow-500" size={20} />;
      case 'failed':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'upcoming':
        return 'Upcoming';
      case 'payment_pending':
        return 'Payment Pending';
      case 'cash_payment_pending':
        return 'Cash Payment Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'payment_pending':
      case 'cash_payment_pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(booking.status)}
          <div>
            <h3 className="font-semibold text-gray-900">{booking.membershipType}</h3>
            <p className="text-sm text-gray-600">{booking.timeSlot}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
          {getStatusText(booking.status)}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Duration</p>
          <p className="font-medium">{booking.membershipDuration}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Amount</p>
          <p className="font-medium">{formatAmount(booking.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Start Date</p>
          <p className="font-medium">{formatDate(booking.membershipStartDate)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">End Date</p>
          <p className="font-medium">{formatDate(booking.membershipEndDate)}</p>
        </div>
      </div>

      {/* Payment Info */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <CreditCard size={16} className="text-gray-400" />
        <span className="text-sm text-gray-600">
          {booking.paymentMethod === 'upi' ? 'UPI Payment' : 'Cash Payment'}
        </span>
        {booking.paymentDate && (
          <span className="text-sm text-gray-500">
            • Paid on {formatDate(booking.paymentDate)}
          </span>
        )}
      </div>

      {/* Status-specific additional info */}
      {booking.status === 'active' && booking.daysRemaining && (
        <div className="mt-3 p-3 bg-green-50 rounded-md">
          <p className="text-sm text-green-700">
            <strong>{booking.daysRemaining} days remaining</strong>
            {booking.daysRemaining <= 7 && (
              <span className="text-orange-600"> • Renew soon!</span>
            )}
          </p>
        </div>
      )}

      {booking.status === 'upcoming' && booking.daysUntilStart && (
        <div className="mt-3 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            Starts in <strong>{booking.daysUntilStart} days</strong>
          </p>
        </div>
      )}

      {(booking.status === 'payment_pending' || booking.status === 'cash_payment_pending') && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-700">
            {booking.status === 'cash_payment_pending' 
              ? 'Waiting for admin to collect cash payment'
              : 'Complete your payment to activate membership'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryCard;