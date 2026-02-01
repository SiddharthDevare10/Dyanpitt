import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Download, Calendar, TrendingUp, Clock, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import BookingHistoryCard from '../../components/BookingHistoryCard';
import logger from '../../utils/logger';
import { SkeletonCard } from '../../components/SkeletonLoader';
import cache, { cacheKeys } from '../../utils/cache';

export default function BookingHistoryScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [bookingHistory, setBookingHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'all', label: 'All Bookings', icon: Calendar },
    { id: 'active', label: 'Active', icon: Clock },
    { id: 'expired', label: 'Past', icon: Clock },
    { id: 'transactions', label: 'Transactions', icon: CreditCard }
  ];

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      
      // Try cache first for faster loading
      const cachedHistory = cache.get(cacheKeys.bookings('history', 1));
      if (cachedHistory) {
        setBookingHistory(cachedHistory);
        setLoading(false);
      }
      
      const response = await apiService.request('/booking-history/history');
      
      if (response.success) {
        setBookingHistory(response.data);
        // Cache for 2 minutes
        cache.set(cacheKeys.bookings('history', 1), response.data, 2 * 60 * 1000);
      } else {
        setError(response.message || 'Failed to fetch booking history');
      }
    } catch (error) {
      logger.error('Error fetching booking history:', error);
      setError('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBookings = () => {
    if (!bookingHistory) return [];
    
    switch (activeTab) {
      case 'active':
        return [...bookingHistory.categorized.active, ...bookingHistory.categorized.upcoming];
      case 'expired':
        return bookingHistory.categorized.expired;
      case 'transactions':
        return bookingHistory.history.filter(b => 
          b.paymentStatus === 'completed' || b.paymentStatus === 'cash_collected'
        );
      case 'all':
      default:
        return bookingHistory.history;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading && !bookingHistory) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-container">
        <button 
          onClick={() => navigate(-1)}
          className="back-button mb-4"
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchBookingHistory}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="back-button"
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 className="main-title">Booking History</h1>
          <p className="main-subtitle">View your membership history and transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      {bookingHistory && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-blue-600" />
              <span className="text-sm text-gray-600">Total Bookings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bookingHistory.summary.totalBookings}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-green-600" />
              <span className="text-sm text-gray-600">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bookingHistory.summary.activeBookings}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="text-sm text-gray-600">Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(bookingHistory.summary.totalSpent)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-orange-600" />
              <span className="text-sm text-gray-600">Longest Period</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bookingHistory.summary.longestMembership} days</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {bookingHistory && tab.id !== 'all' && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.id === 'active' 
                      ? bookingHistory.categorized.active.length + bookingHistory.categorized.upcoming.length
                      : tab.id === 'expired'
                      ? bookingHistory.categorized.expired.length
                      : tab.id === 'transactions'
                      ? bookingHistory.history.filter(b => b.paymentStatus === 'completed' || b.paymentStatus === 'cash_collected').length
                      : ''
                    }
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {getFilteredBookings().map((booking) => (
          <BookingHistoryCard key={booking._id} booking={booking} />
        ))}
        
        {getFilteredBookings().length === 0 && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'active' && "You don't have any active memberships."}
              {activeTab === 'expired' && "You don't have any expired memberships."}
              {activeTab === 'transactions' && "You don't have any completed transactions."}
              {activeTab === 'all' && "You haven't made any bookings yet."}
            </p>
            {activeTab === 'all' && (
              <button 
                onClick={() => navigate('/booking')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Book Your First Membership
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending Payments Alert */}
      {bookingHistory && 
        (bookingHistory.categorized.pending.length > 0 || bookingHistory.categorized.cashPending.length > 0) && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-md shadow-lg max-w-sm">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Pending Payments:</strong> You have {
                  bookingHistory.categorized.pending.length + bookingHistory.categorized.cashPending.length
                } pending payment(s).
              </p>
              <button 
                onClick={() => setActiveTab('all')}
                className="text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}