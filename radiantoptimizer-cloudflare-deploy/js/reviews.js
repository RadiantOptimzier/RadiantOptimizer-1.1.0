// Reviews JavaScript - Verified purchaser review system

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADicB51bTMiEd4y7UBs9cXOyXUe76G3C4",
  authDomain: "radiantoptimizer.firebaseapp.com",
  projectId: "radiantoptimizer",
  storageBucket: "radiantoptimizer.firebasestorage.app",
  messagingSenderId: "799070539679",
  appId: "1:799070539679:web:4b8a542ea278b4edbdf7aa",
  measurementId: "G-LKXZHTHVVR"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

let allReviews = [];
let currentUser = null;
let currentUserData = null;
let selectedRating = 0;
let canWriteReview = false;
let hasExistingReview = false;

// Check authentication and load reviews
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Update profile display
        const username = user.displayName || user.email.split('@')[0];
        const profileBtn = document.getElementById('profileBtn');
        const profileUsername = document.getElementById('profileUsername');
        const signinBtn = document.getElementById('signinBtn');
        
        if (profileBtn && profileUsername && signinBtn) {
            profileUsername.textContent = username;
            profileBtn.style.display = 'flex';
            signinBtn.style.display = 'none';
        }
        
        // Check if user is verified purchaser
        await checkUserVerification();
    } else {
        // User not logged in
        currentUser = null;
        const writeReviewBtn = document.getElementById('writeReviewBtn');
        const verificationMessage = document.getElementById('verificationMessage');
        
        if (writeReviewBtn) {
            writeReviewBtn.disabled = true;
            writeReviewBtn.textContent = '🔒 Sign In to Write Review';
        }
        
        if (verificationMessage) {
            verificationMessage.style.display = 'block';
            verificationMessage.querySelector('p').textContent = 'You must be signed in to write a review.';
        }
    }
    
    // Load reviews for everyone
    loadReviews();
    
    // Setup star rating input
    setupStarRating();
});

// Check if user is verified purchaser
async function checkUserVerification() {
    const writeReviewBtn = document.getElementById('writeReviewBtn');
    const verificationMessage = document.getElementById('verificationMessage');
    
    try {
        // Get user document
        const username = currentUser.displayName || currentUser.uid;
        const userDoc = await db.collection('users').doc(username).get();
        
        if (!userDoc.exists) {
            canWriteReview = false;
            if (writeReviewBtn) {
                writeReviewBtn.disabled = true;
                writeReviewBtn.textContent = '❌ User Profile Not Found';
            }
            if (verificationMessage) {
                verificationMessage.style.display = 'block';
                verificationMessage.querySelector('p').textContent = 'User profile not found. Please contact support.';
            }
            return;
        }
        
        currentUserData = userDoc.data();
        const licenses = currentUserData.licenses || [];
        const purchases = currentUserData.purchases || [];
        
        // Check if user has at least 1 license or purchase
        const hasLicense = licenses.length > 0;
        const hasPurchase = purchases.length > 0;
        
        if (!hasLicense && !hasPurchase) {
            canWriteReview = false;
            if (writeReviewBtn) {
                writeReviewBtn.disabled = true;
                writeReviewBtn.textContent = '🔒 Purchase Required to Review';
            }
            if (verificationMessage) {
                verificationMessage.style.display = 'block';
                verificationMessage.querySelector('p').textContent = 'You must purchase RadiantOptimizer to write a review. Only verified purchasers can leave reviews.';
            }
            return;
        }
        
        // Check if user already has a review
        const reviewsSnapshot = await db.collection('reviews')
            .where('userId', '==', currentUser.uid)
            .get();
        
        if (!reviewsSnapshot.empty) {
            hasExistingReview = true;
            canWriteReview = false;
            if (writeReviewBtn) {
                writeReviewBtn.disabled = true;
                writeReviewBtn.textContent = '✅ Review Already Submitted';
            }
            if (verificationMessage) {
                verificationMessage.style.display = 'block';
                verificationMessage.querySelector('p').textContent = 'You have already submitted a review. Thank you for your feedback!';
            }
            return;
        }
        
        // User is verified and hasn't reviewed yet
        canWriteReview = true;
        if (writeReviewBtn) {
            writeReviewBtn.disabled = false;
            writeReviewBtn.textContent = '✍️ Write a Review';
        }
        if (verificationMessage) {
            verificationMessage.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error checking user verification:', error);
        canWriteReview = false;
        if (writeReviewBtn) {
            writeReviewBtn.disabled = true;
            writeReviewBtn.textContent = '❌ Error Verifying User';
        }
    }
}

// Load all reviews from Firebase
async function loadReviews() {
    try {
        const reviewsSnapshot = await db.collection('reviews').get();
        
        allReviews = [];
        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();
            reviewData.id = doc.id;
            allReviews.push(reviewData);
        });
        
        // Sort by date (newest first)
        allReviews.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });
        
        // Calculate and display stats
        updateStats();
        
        // Display reviews
        displayReviews(allReviews);
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsGrid').innerHTML = `
            <div class="empty-state">
                <h3>Error Loading Reviews</h3>
                <p>Failed to load reviews. Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Update statistics
function updateStats() {
    const avgRatingEl = document.getElementById('avgRating');
    const totalReviewsEl = document.getElementById('totalReviews');
    
    if (allReviews.length === 0) {
        avgRatingEl.textContent = '0.0';
        totalReviewsEl.textContent = '0';
        return;
    }
    
    // Calculate average rating
    const totalRating = allReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const avgRating = totalRating / allReviews.length;
    
    avgRatingEl.textContent = avgRating.toFixed(1);
    totalReviewsEl.textContent = allReviews.length;
}

// Display reviews
function displayReviews(reviews) {
    const reviewsGrid = document.getElementById('reviewsGrid');
    
    if (reviews.length === 0) {
        reviewsGrid.innerHTML = `
            <div class="empty-state">
                <h3>No Reviews Yet</h3>
                <p>Be the first verified purchaser to leave a review!</p>
            </div>
        `;
        return;
    }
    
    reviewsGrid.innerHTML = reviews.map(review => createReviewCard(review)).join('');
}

// Create review card HTML
function createReviewCard(review) {
    const createdDate = review.createdAt ? 
        new Date(review.createdAt.seconds * 1000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        }) : 
        'Just now';
    
    const rating = review.rating || 5;
    const stars = generateStars(rating);
    const username = review.username || 'Anonymous';
    const firstLetter = username.charAt(0).toUpperCase();
    
    return `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${firstLetter}</div>
                    <div class="reviewer-details">
                        <div class="reviewer-name">
                            ${escapeHtml(username)}
                            <span class="verified-badge">
                                ✓ Verified Purchaser
                            </span>
                        </div>
                        <div class="review-date">${createdDate}</div>
                    </div>
                </div>
                <div class="star-rating">
                    ${stars}
                </div>
            </div>
            <div class="review-content">${escapeHtml(review.content)}</div>
        </div>
    `;
}

// Generate star HTML
function generateStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += '<span class="star">★</span>';
        } else {
            starsHTML += '<span class="star empty">★</span>';
        }
    }
    return starsHTML;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup star rating input
function setupStarRating() {
    const starInputs = document.querySelectorAll('.star-input');
    
    starInputs.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            selectedRating = rating;
            
            // Update visual state
            starInputs.forEach(s => {
                const starRating = parseInt(s.getAttribute('data-rating'));
                if (starRating <= rating) {
                    s.classList.add('selected');
                } else {
                    s.classList.remove('selected');
                }
            });
        });
        
        // Hover effect
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            starInputs.forEach(s => {
                const starRating = parseInt(s.getAttribute('data-rating'));
                if (starRating <= rating) {
                    s.style.color = '#ffd700';
                } else {
                    s.style.color = '#ddd';
                }
            });
        });
    });
    
    // Reset on mouse leave
    document.getElementById('starRatingInput').addEventListener('mouseleave', function() {
        const starInputs = document.querySelectorAll('.star-input');
        starInputs.forEach(s => {
            if (s.classList.contains('selected')) {
                s.style.color = '#ffd700';
            } else {
                s.style.color = '#ddd';
            }
        });
    });
}

// Open review modal
function openReviewModal() {
    if (!canWriteReview) {
        if (!currentUser) {
            showCustomModal('Please sign in to write a review.', 'Sign In Required');
        } else if (hasExistingReview) {
            showCustomModal('You have already submitted a review. Thank you!', 'Review Already Submitted');
        } else {
            showCustomModal('You must purchase RadiantOptimizer to write a review. Only verified purchasers can leave reviews.', 'Purchase Required');
        }
        return;
    }
    
    document.getElementById('reviewModal').classList.add('active');
    // Reset form
    selectedRating = 0;
    document.querySelectorAll('.star-input').forEach(s => s.classList.remove('selected'));
    document.getElementById('reviewText').value = '';
}

// Close review modal
function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
}

// Handle review form submission
document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!canWriteReview) {
        showCustomModal('You are not authorized to write a review.', 'Error');
        return;
    }
    
    if (selectedRating === 0) {
        showCustomModal('Please select a star rating.', 'Rating Required');
        return;
    }
    
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (reviewText.length < 3) {
        showCustomModal('Your review must be at least 3 characters long.', 'Review Too Short');
        return;
    }
    
    const submitBtn = document.getElementById('submitReviewBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        // Create review document
        await db.collection('reviews').add({
            userId: currentUser.uid,
            username: currentUser.displayName || currentUser.email.split('@')[0],
            rating: selectedRating,
            content: reviewText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verified: true
        });
        
        showCustomModal('Thank you for your review! It has been submitted successfully.', 'Review Submitted');
        closeReviewModal();
        
        // Reload reviews
        await loadReviews();
        
        // Update button state
        hasExistingReview = true;
        canWriteReview = false;
        const writeReviewBtn = document.getElementById('writeReviewBtn');
        if (writeReviewBtn) {
            writeReviewBtn.disabled = true;
            writeReviewBtn.textContent = '✅ Review Already Submitted';
        }
        
        const verificationMessage = document.getElementById('verificationMessage');
        if (verificationMessage) {
            verificationMessage.style.display = 'block';
            verificationMessage.querySelector('p').textContent = 'You have already submitted a review. Thank you for your feedback!';
        }
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showCustomModal('Failed to submit review. Please try again.', 'Error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
});

// Custom modal functions
function showCustomModal(message, title = 'Notification') {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    
    if (modal && modalTitle && modalMessage) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.add('active');
    }
}

function closeCustomModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
document.getElementById('reviewModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeReviewModal();
    }
});

document.getElementById('customModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCustomModal();
    }
});
