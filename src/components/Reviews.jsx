import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { Star, MessageCircle, User, Calendar, ThumbsUp } from 'lucide-react';
import Sidebar from './layout/Sidebar';

const Reviews = ({ user, db }) => {
  const [reviews, setReviews] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    ownerBusinessName: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch reviews and owners on component mount
  useEffect(() => {
    fetchReviews();
    fetchOwners();
  }, [db]);

  // Fetch all reviews
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const reviewsCollection = collection(db, 'reviews');
      const reviewsQuery = query(reviewsCollection, orderBy('createdAt', 'desc'));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      const reviewsList = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setReviews(reviewsList);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved owners
  const fetchOwners = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const ownersQuery = query(
        usersCollection, 
        where('role', '==', 'owner'),
        where('status', '==', 'approved')
      );
      const ownersSnapshot = await getDocs(ownersQuery);
      
      const ownersList = ownersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(owner => owner.businessName);
      
      setOwners(ownersList);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReview(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle rating change
  const handleRatingChange = (rating) => {
    setNewReview(prev => ({
      ...prev,
      rating
    }));
  };

  // Submit new review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!newReview.ownerBusinessName || !newReview.comment.trim()) {
      alert('Please select an owner and provide a comment');
      return;
    }

    try {
      const reviewData = {
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        ownerBusinessName: newReview.ownerBusinessName,
        reviewerName: user?.fullName || user?.email || 'Anonymous',
        reviewerId: user?.uid || user?.id,
        createdAt: serverTimestamp(),
        helpful: 0
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      
      // Reset form
      setNewReview({
        rating: 5,
        comment: '',
        ownerBusinessName: ''
      });
      setShowAddForm(false);
      
      // Refresh reviews
      fetchReviews();
      
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  // Get average rating for an owner
  const getOwnerAverageRating = (businessName) => {
    const ownerReviews = reviews.filter(review => review.ownerBusinessName === businessName);
    if (ownerReviews.length === 0) return 0;
    
    const totalRating = ownerReviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / ownerReviews.length).toFixed(1);
  };

  // Get review count for an owner
  const getOwnerReviewCount = (businessName) => {
    return reviews.filter(review => review.ownerBusinessName === businessName).length;
  };

  // Filter reviews by selected owner
  const filteredReviews = selectedOwner 
    ? reviews.filter(review => review.ownerBusinessName === selectedOwner)
    : reviews;

  // Render star rating
  const renderStars = (rating, size = 16) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={size}
        className={`${
          index < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  // Render interactive star rating for form
  const renderInteractiveStars = (currentRating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => handleRatingChange(index + 1)}
        className="focus:outline-none"
      >
        <Star
          size={24}
          className={`${
            index < currentRating 
              ? 'text-yellow-400 fill-current' 
              : 'text-gray-300 hover:text-yellow-200'
          } transition-colors`}
        />
      </button>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar currentPage="reviews" />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-md border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
                <p className="text-gray-600">View and analyze customer reviews for car owners</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <MessageCircle size={16} className="mr-2" />
                Add Review
              </button>
            </div>

            {/* Add Review Form */}
            {showAddForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Write a Review</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Owner
                    </label>
                    <select
                      name="ownerBusinessName"
                      value={newReview.ownerBusinessName}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">-- Select Business Owner --</option>
                      {owners.map(owner => (
                        <option key={owner.id} value={owner.businessName}>
                          {owner.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating
                    </label>
                    <div className="flex items-center space-x-1">
                      {renderInteractiveStars(newReview.rating)}
                      <span className="ml-2 text-sm text-gray-600">
                        {newReview.rating} out of 5 stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment
                    </label>
                    <textarea
                      name="comment"
                      value={newReview.comment}
                      onChange={handleInputChange}
                      rows={4}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Share your experience with this car owner..."
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Submit Review
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Owner Filter */}
            <div className="mb-6">
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="block w-64 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Owners ({reviews.length} reviews)</option>
                {owners.map(owner => {
                  const reviewCount = getOwnerReviewCount(owner.businessName);
                  const avgRating = getOwnerAverageRating(owner.businessName);
                  return (
                    <option key={owner.id} value={owner.businessName}>
                      {owner.businessName} ({reviewCount} reviews, {avgRating}★)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Owner Summary Cards */}
            {!selectedOwner && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {owners.map(owner => {
                  const reviewCount = getOwnerReviewCount(owner.businessName);
                  const avgRating = getOwnerAverageRating(owner.businessName);
                  
                  return (
                    <div key={owner.id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {owner.businessName}
                        </h3>
                        <div className="flex items-center">
                          {renderStars(Math.round(avgRating))}
                          <span className="ml-2 text-sm text-gray-600">
                            {avgRating}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{reviewCount} reviews</p>
                        <p className="mt-1">{owner.fullName}</p>
                      </div>
                      <button
                        onClick={() => setSelectedOwner(owner.businessName)}
                        className="mt-4 text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                      >
                        View Reviews →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                  <p className="text-gray-500">
                    {selectedOwner 
                      ? `No reviews yet for ${selectedOwner}` 
                      : 'Be the first to write a review!'
                    }
                  </p>
                </div>
              ) : (
                filteredReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <User size={40} className="text-gray-400 bg-gray-100 rounded-full p-2" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            {review.reviewerName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Reviewed {review.ownerBusinessName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-sm text-gray-600">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{review.comment}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {review.createdAt?.toDate ? 
                          review.createdAt.toDate().toLocaleDateString() : 
                          'Recently'
                        }
                      </div>
                      <div className="flex items-center">
                        <ThumbsUp size={14} className="mr-1" />
                        {review.helpful || 0} helpful
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reviews;