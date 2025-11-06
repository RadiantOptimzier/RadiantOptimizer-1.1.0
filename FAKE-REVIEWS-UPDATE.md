# Fake Reviews & Navigation Update

## Changes Made:

### 1. Admin Panel HTML (`admin-panel.html`)
✅ Added "Create Fake Review" button
✅ Added filter buttons (All / Real / Fake)
✅ Added Create Fake Review modal

### 2. JavaScript Updates Needed (`admin-panel.js`)

Add these functions at the end of the reviews section:

```javascript
// Filter reviews by type
let currentReviewFilter = 'all';

function filterReviews(type) {
    currentReviewFilter = type;
    
    // Update button states
    document.querySelectorAll('.review-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === type) {
            btn.classList.add('active');
        }
    });
    
    // Filter and display
    let filteredReviews = [];
    if (type === 'all') {
        filteredReviews = allReviews;
    } else if (type === 'fake') {
        filteredReviews = allReviews.filter(r => r.isFake === true);
    } else if (type === 'real') {
        filteredReviews = allReviews.filter(r => r.isFake !== true);
    }
    
    displayReviewsManagement(filteredReviews);
}

// Open fake review modal
function openCreateFakeReviewModal() {
    document.getElementById('fakeReviewUsername').value = '';
    document.getElementById('fakeReviewRating').value = '5';
    document.getElementById('fakeReviewContent').value = '';
    document.getElementById('createFakeReviewModal').classList.add('active');
}

// Close fake review modal
function closeFakeReviewModal() {
    document.getElementById('createFakeReviewModal').classList.remove('active');
}

// Save fake review
async function saveFakeReview() {
    const username = document.getElementById('fakeReviewUsername').value.trim();
    const rating = parseInt(document.getElementById('fakeReviewRating').value);
    const content = document.getElementById('fakeReviewContent').value.trim();
    
    if (!username || !content) {
        showCustomModal('Please fill in all fields.', 'Error');
        return;
    }
    
    if (content.length < 3) {
        showCustomModal('Review content must be at least 3 characters long.', 'Error');
        return;
    }
    
    try {
        await db.collection('reviews').add({
            userId: 'admin-fake',
            username: username,
            rating: rating,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verified: true,
            isFake: true // Mark as fake review
        });
        
        showCustomModal('Fake review created successfully!', 'Success');
        closeFakeReviewModal();
        await loadReviewsManagement();
        
    } catch (error) {
        console.error('Error creating fake review:', error);
        showCustomModal('Failed to create fake review. Please try again.', 'Error');
    }
}
```

### 3. Update displayReviewsManagement function

Find the displayReviewsManagement function and update the review card generation to show a "FAKE" badge:

```javascript
// In the map function, after the verified badge line, add:
${review.isFake ? '<span class="fake-badge">🎭 FAKE</span>' : ''}
```

### 4. Add CSS for fake badge (`admin-panel.css`)

```css
.fake-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.6rem;
    background: linear-gradient(135deg, #ff6b6b, #ff4757);
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
}
```

### 5. Fix Navigation Reviews Link

Update all navbar files to use `reviews.html` instead of `#reviews`:

Files to update:
- `index.html`
- `dashboard.html`  
- `news.html`
- Any other pages with navigation

Change:
```html
<li><a href="#reviews">REVIEWS</a></li>
```

To:
```html
<li><a href="reviews.html">REVIEWS</a></li>
```

## Summary:

1. ✅ Created "Create Fake Review" button in admin
2. ✅ Added filter buttons (All/Real/Fake)  
3. ✅ Created fake review modal
4. 📝 Need to add JavaScript functions above
5. 📝 Need to add CSS for fake badge
6. 📝 Need to fix navbar links to reviews.html

Once these updates are complete, you'll be able to:
- Create fake reviews from admin panel
- Filter between all/real/fake reviews
- See fake badge on fake reviews
- Navigate to reviews page from navbar
