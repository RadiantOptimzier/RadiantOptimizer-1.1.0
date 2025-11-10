// News JavaScript - Handle news display, filtering, likes, and read tracking

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

let allNews = [];
let currentUser = null;
let currentFilter = 'all';

// Check authentication and load news
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
    } else {
        // User not logged in - that's OK, news is public
        currentUser = null;
        
        // Show sign in button
        const profileBtn = document.getElementById('profileBtn');
        const signinBtn = document.getElementById('signinBtn');
        if (profileBtn && signinBtn) {
            profileBtn.style.display = 'none';
            signinBtn.style.display = 'block';
        }
    }
    
    // Load news for everyone (logged in or not)
    loadNews();
    
    // Setup filter button listeners
    setupFilterButtons();
});

// Setup filter button event listeners
function setupFilterButtons() {
    document.querySelectorAll('.filter-tag').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.getAttribute('data-filter');
            filterNews(category, this);
        });
    });
}

// Load all news from Firebase
async function loadNews() {
    try {
        const newsSnapshot = await db.collection('news').get();
        
        allNews = [];
        newsSnapshot.forEach(doc => {
            const newsData = doc.data();
            newsData.id = doc.id;
            allNews.push(newsData);
        });
        
        // Sort by createdAt in JavaScript instead
        allNews.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });
        
        // Display news
        displayNews(allNews);
        
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('newsGrid').innerHTML = `
            <div class="empty-state">
                <h3>Error Loading News</h3>
                <p>Failed to load news. Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Display news posts
function displayNews(newsPosts) {
    const newsGrid = document.getElementById('newsGrid');
    
    if (newsPosts.length === 0) {
        newsGrid.innerHTML = `
            <div class="empty-state">
                <h3>No News Yet</h3>
                <p>Check back later for updates and announcements!</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    newsPosts.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
    });
    
    // Get the most recent post ID to mark as "NEW"
    const mostRecentId = newsPosts[0]?.id;
    
    newsGrid.innerHTML = newsPosts.map(post => createNewsCard(post, post.id === mostRecentId)).join('');
}

// Create news card HTML
function createNewsCard(post, isNewest) {
    const createdDate = post.createdAt ? 
        new Date(post.createdAt.seconds * 1000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 
        'Just now';
    
    // Check if user has read this post (only if logged in)
    const isRead = currentUser && post.readBy && post.readBy.includes(currentUser.uid);
    
    // Check if user has liked this post (only if logged in)
    const isLiked = currentUser && post.likedBy && post.likedBy.includes(currentUser.uid);
    const likeCount = post.likedBy ? post.likedBy.length : 0;
    
    // Category badge color
    const categoryClass = `category-${post.category || 'news'}`;
    const categoryDisplay = (post.category || 'news').charAt(0).toUpperCase() + (post.category || 'news').slice(1);
    
    return `
        <div class="news-card" data-category="${post.category || 'news'}" data-id="${post.id}">
            <div class="news-card-header">
                <div class="news-badges">
                    ${isNewest ? '<span class="news-badge new">NEW</span>' : ''}
                    <span class="news-badge ${categoryClass}">${categoryDisplay}</span>
                </div>
                <span class="news-date">${createdDate}</span>
            </div>
            
            <h2 class="news-title">${escapeHtml(post.title)}</h2>
            <div class="news-content">${escapeHtml(post.content)}</div>
            
            <div class="news-footer">
                <div class="news-actions">
                    <button class="news-like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>${likeCount}</span>
                    </button>
                </div>
                ${isRead ? '<span class="news-read-badge">✓ Read</span>' : ''}
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filter news by category
function filterNews(category, buttonElement) {
    currentFilter = category;
    
    // Update button states
    document.querySelectorAll('.filter-tag').forEach(btn => {
        btn.classList.remove('active');
    });
    buttonElement.classList.add('active');
    
    // Filter and display
    if (category === 'all') {
        displayNews(allNews);
    } else {
        const filtered = allNews.filter(post => post.category === category);
        displayNews(filtered);
    }
}

// Toggle like on a news post
async function toggleLike(postId) {
    if (!currentUser) return;
    
    try {
        const postRef = db.collection('news').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) return;
        
        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];
        const userIndex = likedBy.indexOf(currentUser.uid);
        
        if (userIndex > -1) {
            // Unlike
            likedBy.splice(userIndex, 1);
        } else {
            // Like
            likedBy.push(currentUser.uid);
            
            // Mark as read when liking
            const readBy = postData.readBy || [];
            if (!readBy.includes(currentUser.uid)) {
                readBy.push(currentUser.uid);
                await postRef.update({ readBy });
            }
        }
        
        await postRef.update({ likedBy });
        
        // Reload news to update UI
        await loadNews();
        
    } catch (error) {
        console.error('Error toggling like:', error);
        showCustomModal('Failed to update like. Please try again.', 'Error');
    }
}

// Mark post as read when scrolled into view
const observerOptions = {
    threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const postId = entry.target.dataset.id;
            markAsRead(postId);
        }
    });
}, observerOptions);

// Mark a post as read
async function markAsRead(postId) {
    if (!currentUser) return;
    
    try {
        const postRef = db.collection('news').doc(postId);
        const postDoc = await postRef.get();
        
        if (!postDoc.exists) return;
        
        const postData = postDoc.data();
        const readBy = postData.readBy || [];
        
        if (!readBy.includes(currentUser.uid)) {
            readBy.push(currentUser.uid);
            await postRef.update({ readBy });
            
            // Update local data
            const post = allNews.find(p => p.id === postId);
            if (post) {
                post.readBy = readBy;
            }
        }
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

// Observe news cards for read tracking
function observeNewsCards() {
    document.querySelectorAll('.news-card').forEach(card => {
        observer.observe(card);
    });
}

// Call observe after news is loaded
const originalDisplayNews = displayNews;
displayNews = function(...args) {
    originalDisplayNews(...args);
    setTimeout(observeNewsCards, 100);
};

// Get unread count for badge
async function getUnreadCount() {
    if (!currentUser) return 0;
    
    try {
        const newsSnapshot = await db.collection('news').get();
        let unreadCount = 0;
        
        newsSnapshot.forEach(doc => {
            const newsData = doc.data();
            const readBy = newsData.readBy || [];
            if (!readBy.includes(currentUser.uid)) {
                unreadCount++;
            }
        });
        
        return unreadCount;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

// Export function for use in other pages
window.getUnreadNewsCount = getUnreadCount;
