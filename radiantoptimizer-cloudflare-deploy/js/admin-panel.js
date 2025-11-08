// Admin Panel JavaScript
// Firebase configuration (using existing from auth.js)
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

const db = firebase.firestore();

// Check admin authentication on page load
window.addEventListener('DOMContentLoaded', function() {
    // Check Firebase auth state first
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            // Not logged in with Firebase - redirect to login
            window.location.href = 'login.html';
            return;
        }
        
        // User is logged in with Firebase
        // Check if they're an admin
        try {
            const username = user.displayName || user.uid;
            const userDoc = await db.collection('users').doc(username).get();
            
            if (!userDoc.exists || userDoc.data().isAdmin !== true) {
                // Not an admin - redirect to dashboard
                window.location.href = 'dashboard.html';
                return;
            }
            
            // They are an admin and Firebase auth is active
            // Load admin panel data
            loadDashboardData();
        } catch (error) {
            console.error('Error checking admin status:', error);
            window.location.href = 'login.html';
        }
    });
});

// Global users data
let allUsers = [];
let currentUserDetails = null;

// Load all dashboard data
async function loadDashboardData() {
    try {
        // Load users
        await loadAllUsers();
        
        // Load stats
        updateStats();
        
        // Load recent activity
        loadRecentActivity();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showCustomModal('Failed to load dashboard data. Please refresh the page.', 'Error');
    }
}

// Load all users from Firebase
async function loadAllUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        allUsers = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            userData.docId = doc.id;
            allUsers.push(userData);
        });
        
        // Display users in table
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showCustomModal('Failed to load users.', 'Error');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: #666;">
                    No users found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const createdDate = user.createdAt ? 
            new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 
            'N/A';
        
        const licensesCount = user.licenses ? user.licenses.length : 0;
        const status = user.status || 'active';
        const statusClass = status === 'banned' ? 'banned' : 'active';
        
        return `
            <tr>
                <td><strong>${user.username || 'N/A'}</strong></td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${licensesCount}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewUserDetails('${user.docId}')">View</button>
                        <button class="action-btn edit" onclick="editUsername('${user.docId}')">Edit</button>
                        <button class="action-btn grant" onclick="openGrantLicenseModal('${user.docId}')" style="background: linear-gradient(135deg, #2ecc71, #27ae60);">Grant License</button>
                        ${status === 'banned' ? 
                            `<button class="action-btn unban" onclick="toggleBan('${user.docId}', false)">Unban</button>` :
                            `<button class="action-btn ban" onclick="toggleBan('${user.docId}', true)">Ban</button>`
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update dashboard stats
function updateStats() {
    const totalUsers = allUsers.length;
    const totalPurchases = allUsers.reduce((sum, user) => {
        return sum + (user.purchases ? user.purchases.length : 0);
    }, 0);
    const totalLicenses = allUsers.reduce((sum, user) => {
        return sum + (user.licenses ? user.licenses.length : 0);
    }, 0);
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalPurchases').textContent = totalPurchases;
    document.getElementById('activeLicenses').textContent = totalLicenses;
    document.getElementById('recentActivity').textContent = totalUsers + totalPurchases;
}

// Search users
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayUsers(allUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => {
        const username = (user.username || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return username.includes(searchTerm) || email.includes(searchTerm);
    });
    
    displayUsers(filteredUsers);
}

// View user details
function viewUserDetails(userId) {
    const user = allUsers.find(u => u.docId === userId);
    if (!user) {
        showCustomModal('User not found.', 'Error');
        return;
    }
    
    currentUserDetails = user;
    
    // Create detailed view
    const detailsHTML = `
        <div class="user-details-panel">
            <div class="user-details-header">
                <h3>User Details: ${user.username}</h3>
                <button class="admin-btn secondary" onclick="closeUserDetails()">Close</button>
            </div>
            
            <div class="user-info-grid">
                <div class="info-item">
                    <label>Username</label>
                    <div class="value">${user.username || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <label>Email</label>
                    <div class="value">${user.email || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <label>Status</label>
                    <div class="value"><span class="status-badge ${user.status === 'banned' ? 'banned' : 'active'}">${user.status || 'active'}</span></div>
                </div>
                <div class="info-item">
                    <label>User ID</label>
                    <div class="value" style="font-size: 0.9rem; word-break: break-all;">${user.uid || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <label>Created At</label>
                    <div class="value">${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</div>
                </div>
                <div class="info-item">
                    <label>Total Purchases</label>
                    <div class="value">${user.purchases ? user.purchases.length : 0}</div>
                </div>
            </div>
            
            <div class="licenses-list">
                <h4>License Keys (${user.licenses ? user.licenses.length : 0})</h4>
                ${user.licenses && user.licenses.length > 0 ? user.licenses.map((license, index) => `
                    <div class="license-item">
                        <div class="license-info">
                            <div class="license-key">${license.key || license.licenseKey || 'N/A'}</div>
                            <div class="license-meta">
                                Status: <strong>${license.status || 'active'}</strong> | 
                                Purchased: ${license.purchaseDate ? new Date(license.purchaseDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </div>
                            <div class="license-hwid">
                                HWID: ${license.hwid || 'Not linked yet'}
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="admin-btn" style="background: linear-gradient(135deg, #0066ff, #00d9ff);" onclick="openEditLicenseModal('${user.docId}', ${index})">Edit</button>
                            <button class="admin-btn danger" onclick="removeLicense('${user.docId}', ${index})">Delete</button>
                        </div>
                    </div>
                `).join('') : '<p style="color: #666;">No licenses found</p>'}
            </div>
            
            ${user.purchases && user.purchases.length > 0 ? `
                <div class="licenses-list" style="margin-top: 2rem;">
                    <h4>Purchase History (${user.purchases.length})</h4>
                    ${user.purchases.map(purchase => `
                        <div class="license-item">
                            <div class="license-info">
                                <div class="license-key">${purchase.product || 'RadiantOptimizer'} - $${purchase.amount || '33'}</div>
                                <div class="license-meta">
                                    Date: ${purchase.date ? new Date(purchase.date.seconds * 1000).toLocaleString() : 'N/A'}
                                </div>
                                ${purchase.licenseKey ? `<div class="license-hwid">Key: ${purchase.licenseKey}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    // Insert details panel after the users table
    const usersSection = document.querySelector('.users-table-container').parentElement;
    
    // Remove existing details panel if any
    const existingPanel = document.querySelector('.user-details-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    usersSection.insertAdjacentHTML('afterend', detailsHTML);
    
    // Scroll to details
    setTimeout(() => {
        document.querySelector('.user-details-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Close user details
function closeUserDetails() {
    const panel = document.querySelector('.user-details-panel');
    if (panel) {
        panel.remove();
    }
    currentUserDetails = null;
}

// Edit username
function editUsername(userId) {
    const user = allUsers.find(u => u.docId === userId);
    if (!user) {
        showCustomModal('User not found.', 'Error');
        return;
    }
    
    // Show edit modal
    document.getElementById('currentUsername').textContent = user.username;
    document.getElementById('newUsername').value = '';
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserModal').classList.add('active');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editUserModal').classList.remove('active');
}

// Save username change
async function saveUsernameChange() {
    const userId = document.getElementById('editUserId').value;
    const newUsername = document.getElementById('newUsername').value.trim();
    
    if (!newUsername) {
        showCustomModal('Please enter a new username.', 'Error');
        return;
    }
    
    // Validate username
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(newUsername)) {
        showCustomModal('Username can only contain letters, numbers, underscores, and hyphens.', 'Error');
        return;
    }
    
    if (newUsername.length < 3 || newUsername.length > 20) {
        showCustomModal('Username must be between 3 and 20 characters.', 'Error');
        return;
    }
    
    try {
        // Check if username is taken
        const existingUser = allUsers.find(u => u.username === newUsername && u.docId !== userId);
        if (existingUser) {
            showCustomModal('Username is already taken.', 'Error');
            return;
        }
        
        // Update username
        await db.collection('users').doc(userId).update({
            username: newUsername,
            displayName: newUsername
        });
        
        showCustomModal('Username updated successfully!', 'Success');
        closeEditModal();
        
        // Refresh data
        await loadAllUsers();
        updateStats();
    } catch (error) {
        console.error('Error updating username:', error);
        showCustomModal('Failed to update username. Please try again.', 'Error');
    }
}

// Toggle ban status
async function toggleBan(userId, shouldBan) {
    const user = allUsers.find(u => u.docId === userId);
    if (!user) {
        showCustomModal('User not found.', 'Error');
        return;
    }
    
    const action = shouldBan ? 'ban' : 'unban';
    const confirmMessage = `Are you sure you want to ${action} ${user.username}?`;
    
    // Custom confirmation
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const newStatus = shouldBan ? 'banned' : 'active';
        await db.collection('users').doc(userId).update({
            status: newStatus
        });
        
        showCustomModal(`User ${shouldBan ? 'banned' : 'unbanned'} successfully!`, 'Success');
        
        // Refresh data
        await loadAllUsers();
        updateStats();
        
        // Update details panel if open
        if (currentUserDetails && currentUserDetails.docId === userId) {
            closeUserDetails();
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        showCustomModal('Failed to update user status. Please try again.', 'Error');
    }
}

// Remove license
async function removeLicense(userId, licenseIndex) {
    const user = allUsers.find(u => u.docId === userId);
    if (!user || !user.licenses || !user.licenses[licenseIndex]) {
        showCustomModal('License not found.', 'Error');
        return;
    }
    
    const license = user.licenses[licenseIndex];
    const confirmMessage = `Are you sure you want to remove license key ${license.key || license.licenseKey}?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // Remove license from array
        const updatedLicenses = [...user.licenses];
        updatedLicenses.splice(licenseIndex, 1);
        
        await db.collection('users').doc(userId).update({
            licenses: updatedLicenses
        });
        
        showCustomModal('License removed successfully!', 'Success');
        
        // Refresh data
        await loadAllUsers();
        updateStats();
        
        // Refresh details view
        viewUserDetails(userId);
    } catch (error) {
        console.error('Error removing license:', error);
        showCustomModal('Failed to remove license. Please try again.', 'Error');
    }
}

// Load recent activity
async function loadRecentActivity() {
    const activityFeed = document.getElementById('activityFeed');
    
    // Sort users by creation date
    const recentUsers = [...allUsers]
        .filter(u => u.createdAt)
        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
        .slice(0, 10);
    
    if (recentUsers.length === 0) {
        activityFeed.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No recent activity</p>';
        return;
    }
    
    activityFeed.innerHTML = recentUsers.map(user => {
        const timeAgo = getTimeAgo(user.createdAt.seconds * 1000);
        const purchaseCount = user.purchases ? user.purchases.length : 0;
        
        return `
            <div class="activity-item">
                <div class="activity-icon user">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="activity-content">
                    <h4>New User: ${user.username}</h4>
                    <p>${purchaseCount} purchase${purchaseCount !== 1 ? 's' : ''} | ${user.licenses ? user.licenses.length : 0} license${user.licenses && user.licenses.length !== 1 ? 's' : ''}</p>
                </div>
                <div class="activity-time">${timeAgo}</div>
            </div>
        `;
    }).join('');
}

// Get time ago string
function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

// Refresh users
function refreshUsers() {
    showCustomModal('Refreshing user data...', 'Loading');
    loadDashboardData();
    
    setTimeout(() => {
        closeCustomModal();
        showCustomModal('Data refreshed successfully!', 'Success');
    }, 1000);
}

// Admin logout
function adminLogout() {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminAuthenticated');
    window.location.href = 'index.html';
}

// TAB SWITCHING FUNCTION
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(tabName + 'Tab');
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to clicked tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Load news when switching to news tab
    if (tabName === 'news' && allNewsPosts.length === 0) {
        loadNewsManagement();
    }
}

// Allow Enter key to search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUsers();
            }
        });
    }
});

// Store all activity data
let allActivity = [];
let currentFilter = 'all';

// Filter activity by type
function filterActivity(type) {
    currentFilter = type;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === type) {
            btn.classList.add('active');
        }
    });
    
    // Filter and display
    displayFilteredActivity(type);
}

// Display filtered activity
function displayFilteredActivity(filter) {
    const activityFeed = document.getElementById('activityFeed');
    
    // Get users sorted by creation date
    let recentItems = [...allUsers]
        .filter(u => u.createdAt)
        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
        .slice(0, 20);
    
    let displayItems = [];
    
    if (filter === 'users' || filter === 'all') {
        // Add new users
        displayItems = displayItems.concat(recentItems.map(user => ({
            type: 'user',
            data: user,
            timestamp: user.createdAt.seconds * 1000
        })));
    }
    
    if (filter === 'purchases' || filter === 'all') {
        // Add purchases from all users
        allUsers.forEach(user => {
            if (user.purchases && user.purchases.length > 0) {
                user.purchases.forEach(purchase => {
                    if (purchase.date) {
                        displayItems.push({
                            type: 'purchase',
                            data: { user, purchase },
                            timestamp: purchase.date.seconds * 1000
                        });
                    }
                });
            }
        });
    }
    
    // Sort by timestamp
    displayItems.sort((a, b) => b.timestamp - a.timestamp);
    displayItems = displayItems.slice(0, 15);
    
    if (displayItems.length === 0) {
        activityFeed.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No activity found</p>';
        return;
    }
    
    activityFeed.innerHTML = displayItems.map(item => {
        const timeAgo = getTimeAgo(item.timestamp);
        
        if (item.type === 'user') {
            const user = item.data;
            const purchaseCount = user.purchases ? user.purchases.length : 0;
            return `
                <div class="activity-item">
                    <div class="activity-icon user">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <h4>New User: ${user.username}</h4>
                        <p>${user.email} • ${purchaseCount} purchase${purchaseCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        } else if (item.type === 'purchase') {
            const {user, purchase} = item.data;
            return `
                <div class="activity-item">
                    <div class="activity-icon purchase">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <h4>Purchase: ${purchase.product || 'RadiantOptimizer'}</h4>
                        <p>${user.username} • $${purchase.amount || '33'}</p>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        }
    }).join('');
}

// NEWS MANAGEMENT FUNCTIONS

// Global news data
let allNewsPosts = [];

// Load all news posts
async function loadNewsManagement() {
    try {
        const newsSnapshot = await db.collection('news').get();
        
        allNewsPosts = [];
        newsSnapshot.forEach(doc => {
            const newsData = doc.data();
            newsData.id = doc.id;
            allNewsPosts.push(newsData);
        });
        
        // Sort by createdAt in JavaScript instead
        allNewsPosts.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt.seconds - a.createdAt.seconds;
        });
        
        displayNewsManagement(allNewsPosts);
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('newsManagementGrid').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                Error loading news posts
            </div>
        `;
    }
}

// Display news in management grid
function displayNewsManagement(posts) {
    const grid = document.getElementById('newsManagementGrid');
    
    if (posts.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                No news posts yet. Create your first post!
            </div>
        `;
        return;
    }
    
    grid.innerHTML = posts.map(post => {
        const createdDate = post.createdAt ? 
            new Date(post.createdAt.seconds * 1000).toLocaleString() : 
            'Just now';
        
        const readCount = post.readBy ? post.readBy.length : 0;
        const likeCount = post.likedBy ? post.likedBy.length : 0;
        
        return `
            <div class="news-management-card">
                <div class="news-management-header">
                    <h3 class="news-management-title">${escapeHtml(post.title)}</h3>
                    <span class="news-management-category ${post.category || 'news'}">${(post.category || 'news').toUpperCase()}</span>
                </div>
                <div class="news-management-content">${escapeHtml(post.content)}</div>
                <div class="news-management-footer">
                    <div class="news-management-stats">
                        <div class="news-management-stat">
                            <span>📅 ${createdDate}</span>
                        </div>
                        <div class="news-management-stat">
                            <span>👁️ ${readCount} reads</span>
                        </div>
                        <div class="news-management-stat">
                            <span>❤️ ${likeCount} likes</span>
                        </div>
                    </div>
                    <div class="news-management-actions">
                        <button class="news-action-btn edit" onclick="editNewsPost('${post.id}')">Edit</button>
                        <button class="news-action-btn delete" onclick="deleteNewsPost('${post.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open create news modal
function openCreateNewsModal() {
    document.getElementById('newsModalTitle').textContent = 'Create News Post';
    document.getElementById('newsSaveText').textContent = 'Create Post';
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsCategory').value = 'news';
    document.getElementById('newsContent').value = '';
    document.getElementById('editNewsId').value = '';
    document.getElementById('newsModal').classList.add('active');
}

// Edit news post
function editNewsPost(postId) {
    const post = allNewsPosts.find(p => p.id === postId);
    if (!post) {
        showCustomModal('Post not found.', 'Error');
        return;
    }
    
    document.getElementById('newsModalTitle').textContent = 'Edit News Post';
    document.getElementById('newsSaveText').textContent = 'Update Post';
    document.getElementById('newsTitle').value = post.title;
    document.getElementById('newsCategory').value = post.category || 'news';
    document.getElementById('newsContent').value = post.content;
    document.getElementById('editNewsId').value = postId;
    document.getElementById('newsModal').classList.add('active');
}

// Close news modal
function closeNewsModal() {
    document.getElementById('newsModal').classList.remove('active');
}

// Save news post (create or update)
async function saveNewsPost() {
    const title = document.getElementById('newsTitle').value.trim();
    const category = document.getElementById('newsCategory').value;
    const content = document.getElementById('newsContent').value.trim();
    const editId = document.getElementById('editNewsId').value;
    
    if (!title || !content) {
        showCustomModal('Please fill in all required fields.', 'Error');
        return;
    }
    
    try {
        const newsData = {
            title: title,
            category: category,
            content: content,
            readBy: [],
            likedBy: []
        };
        
        if (editId) {
            // Update existing post
            await db.collection('news').doc(editId).update({
                ...newsData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showCustomModal('News post updated successfully!', 'Success');
        } else {
            // Create new post
            newsData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('news').add(newsData);
            showCustomModal('News post created successfully!', 'Success');
        }
        
        closeNewsModal();
        await loadNewsManagement();
        
    } catch (error) {
        console.error('Error saving news:', error);
        showCustomModal('Failed to save news post. Please try again.', 'Error');
    }
}

// Delete news post
async function deleteNewsPost(postId) {
    const post = allNewsPosts.find(p => p.id === postId);
    if (!post) {
        showCustomModal('Post not found.', 'Error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
        return;
    }
    
    try {
        await db.collection('news').doc(postId).delete();
        showCustomModal('News post deleted successfully!', 'Success');
        await loadNewsManagement();
    } catch (error) {
        console.error('Error deleting news:', error);
        showCustomModal('Failed to delete news post. Please try again.', 'Error');
    }
}

// REVIEWS MANAGEMENT FUNCTIONS

// Global reviews data
let allReviews = [];

// Load all reviews
async function loadReviewsManagement() {
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
        
        displayReviewsManagement(allReviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsManagementContainer').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                Error loading reviews
            </div>
        `;
    }
}

// Display reviews in management container
function displayReviewsManagement(reviews) {
    const container = document.getElementById('reviewsManagementContainer');
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                No reviews yet
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="reviews-management-grid">
            ${reviews.map(review => {
                const createdDate = review.createdAt ? 
                    new Date(review.createdAt.seconds * 1000).toLocaleString() : 
                    'Just now';
                
                const stars = '⭐'.repeat(review.rating || 5);
                
                return `
                    <div class="review-management-card">
                        <div class="review-management-header">
                            <div class="review-management-user">
                                <div class="review-avatar">${(review.username || 'A').charAt(0).toUpperCase()}</div>
                                <div class="review-user-info">
                                    <h4>${escapeHtml(review.username || 'Anonymous')}</h4>
                                    <span class="verified-badge">✓ Verified</span>
                                    ${review.isFake ? '<span class="fake-badge">🎭 FAKE</span>' : ''}
                                </div>
                            </div>
                            <div class="review-rating">${stars}</div>
                        </div>
                        <div class="review-management-content">
                            <p>${escapeHtml(review.content)}</p>
                        </div>
                        <div class="review-management-footer">
                            <div class="review-date">
                                📅 ${createdDate}
                            </div>
                            <div class="review-management-actions">
                                <button class="review-action-btn edit" onclick="editReview('${review.id}')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Edit
                                </button>
                                <button class="review-action-btn delete" onclick="deleteReview('${review.id}')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Edit review
function editReview(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) {
        showCustomModal('Review not found.', 'Error');
        return;
    }
    
    document.getElementById('editReviewUsername').textContent = review.username || 'Anonymous';
    document.getElementById('editReviewRating').value = review.rating || 5;
    document.getElementById('editReviewContent').value = review.content || '';
    document.getElementById('editReviewId').value = reviewId;
    document.getElementById('editReviewModal').classList.add('active');
}

// Close edit review modal
function closeEditReviewModal() {
    document.getElementById('editReviewModal').classList.remove('active');
}

// Save review changes
async function saveReviewChanges() {
    const reviewId = document.getElementById('editReviewId').value;
    const rating = parseInt(document.getElementById('editReviewRating').value);
    const content = document.getElementById('editReviewContent').value.trim();
    
    if (!content || content.length < 3) {
        showCustomModal('Review content must be at least 3 characters long.', 'Error');
        return;
    }
    
    if (rating < 1 || rating > 5) {
        showCustomModal('Rating must be between 1 and 5.', 'Error');
        return;
    }
    
    try {
        await db.collection('reviews').doc(reviewId).update({
            rating: rating,
            content: content,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showCustomModal('Review updated successfully!', 'Success');
        closeEditReviewModal();
        await loadReviewsManagement();
        
    } catch (error) {
        console.error('Error updating review:', error);
        showCustomModal('Failed to update review. Please try again.', 'Error');
    }
}

// Delete review
async function deleteReview(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) {
        showCustomModal('Review not found.', 'Error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete the review by ${review.username}?`)) {
        return;
    }
    
    try {
        await db.collection('reviews').doc(reviewId).delete();
        showCustomModal('Review deleted successfully!', 'Success');
        await loadReviewsManagement();
    } catch (error) {
        console.error('Error deleting review:', error);
        showCustomModal('Failed to delete review. Please try again.', 'Error');
    }
}

// Refresh reviews
async function refreshReviews() {
    showCustomModal('Refreshing reviews...', 'Loading');
    await loadReviewsManagement();
    setTimeout(() => {
        closeCustomModal();
        showCustomModal('Reviews refreshed successfully!', 'Success');
    }, 500);
}

// Update switchTab function to load reviews when needed
const originalSwitchTab = switchTab;
switchTab = function(tabName) {
    originalSwitchTab(tabName);
    
    // Load reviews when switching to reviews tab
    if (tabName === 'reviews' && allReviews.length === 0) {
        loadReviewsManagement();
    }
    
    // Load analytics when switching to analytics tab
    if (tabName === 'analytics') {
        loadAnalyticsDashboard();
    }
};

// ANALYTICS FUNCTIONS

let revenueChart = null;
let deviceChart = null;
let currentRevenuePeriod = 'daily';

// Load Analytics Dashboard
async function loadAnalyticsDashboard() {
    try {
        await Promise.all([
            loadRevenueAnalytics(),
            loadGeographicData(),
            loadDeviceBreakdown(),
            loadPurchaseFunnel(),
            loadMarketingIntelligence(),
            loadReviewSentiment(),
            updateActiveUsers()
        ]);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Load Revenue Analytics
async function loadRevenueAnalytics() {
    try {
        // Calculate total revenue and average order value
        let totalRevenue = 0;
        let orderCount = 0;
        let redeemedKeys = 0;
        let totalKeys = 0;
        
        allUsers.forEach(user => {
            if (user.purchases && user.purchases.length > 0) {
                user.purchases.forEach(purchase => {
                    totalRevenue += parseFloat(purchase.amount || 33);
                    orderCount++;
                });
            }
            
            if (user.licenses && user.licenses.length > 0) {
                user.licenses.forEach(license => {
                    totalKeys++;
                    if (license.hwid) {
                        redeemedKeys++;
                    }
                });
            }
        });
        
        const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
        const conversionRate = allUsers.length > 0 ? (orderCount / allUsers.length * 100) : 0;
        const redemptionRate = totalKeys > 0 ? (redeemedKeys / totalKeys * 100) : 0;
        
        // Update stats
        document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toFixed(2);
        document.getElementById('avgOrderValue').textContent = '$' + avgOrderValue.toFixed(2);
        document.getElementById('conversionRate').textContent = conversionRate.toFixed(1) + '%';
        document.getElementById('keyRedemptionRate').textContent = redemptionRate.toFixed(1) + '%';
        
        // Create revenue chart
        createRevenueChart(currentRevenuePeriod);
        
    } catch (error) {
        console.error('Error loading revenue analytics:', error);
    }
}

// Create Revenue Chart
function createRevenueChart(period) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    // Generate data based on period
    const { labels, data } = generateRevenueData(period);
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#0066ff',
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Generate Revenue Data
function generateRevenueData(period) {
    const now = new Date();
    let labels = [];
    let data = [];
    
    if (period === 'daily') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            // Calculate revenue for this day
            const dayRevenue = allUsers.reduce((sum, user) => {
                if (user.purchases) {
                    return sum + user.purchases.filter(p => {
                        if (!p.date) return false;
                        const purchaseDate = new Date(p.date.seconds * 1000);
                        return purchaseDate.toDateString() === date.toDateString();
                    }).reduce((s, p) => s + parseFloat(p.amount || 33), 0);
                }
                return sum;
            }, 0);
            
            data.push(dayRevenue);
        }
    } else if (period === 'weekly') {
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            labels.push('Week ' + (8 - i));
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            const weekRevenue = allUsers.reduce((sum, user) => {
                if (user.purchases) {
                    return sum + user.purchases.filter(p => {
                        if (!p.date) return false;
                        const purchaseDate = new Date(p.date.seconds * 1000);
                        return purchaseDate >= weekStart && purchaseDate < weekEnd;
                    }).reduce((s, p) => s + parseFloat(p.amount || 33), 0);
                }
                return sum;
            }, 0);
            
            data.push(weekRevenue);
        }
    } else if (period === 'monthly') {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const month = new Date(now);
            month.setMonth(month.getMonth() - i);
            labels.push(month.toLocaleDateString('en-US', { month: 'short' }));
            
            const monthRevenue = allUsers.reduce((sum, user) => {
                if (user.purchases) {
                    return sum + user.purchases.filter(p => {
                        if (!p.date) return false;
                        const purchaseDate = new Date(p.date.seconds * 1000);
                        return purchaseDate.getMonth() === month.getMonth() && 
                               purchaseDate.getFullYear() === month.getFullYear();
                    }).reduce((s, p) => s + parseFloat(p.amount || 33), 0);
                }
                return sum;
            }, 0);
            
            data.push(monthRevenue);
        }
    }
    
    return { labels, data };
}

// Filter Revenue by Period
function filterRevenue(period) {
    currentRevenuePeriod = period;
    
    // Update button states
    document.querySelectorAll('.time-filter-buttons .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-period') === period) {
            btn.classList.add('active');
        }
    });
    
    createRevenueChart(period);
}

// Load Geographic Distribution
async function loadGeographicData() {
    const container = document.getElementById('geoDistribution');
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Geographic tracking not enabled. Enable IP geolocation to track user locations.</p>';
}

// Load Device Breakdown
async function loadDeviceBreakdown() {
    const canvas = document.getElementById('deviceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (deviceChart) {
        deviceChart.destroy();
    }
    
    // Show "no data" message instead of chart
    const container = canvas.parentElement;
    container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Device tracking not enabled. Add device detection to track Desktop vs Mobile usage.</p>';
}

// Load Purchase Funnel
async function loadPurchaseFunnel() {
    // Only show real purchase data
    const purchases = allUsers.reduce((sum, user) => {
        return sum + (user.purchases ? user.purchases.length : 0);
    }, 0);
    
    document.getElementById('funnelLanding').textContent = 'N/A';
    document.getElementById('funnelProduct').textContent = 'N/A';
    document.getElementById('funnelCheckout').textContent = 'N/A';
    document.getElementById('funnelComplete').textContent = purchases + ' purchases';
}

// Load Marketing Intelligence
async function loadMarketingIntelligence() {
    // Referral Sources - no data available
    const referralContainer = document.getElementById('referralSources');
    referralContainer.innerHTML = '<p style="color: #666;">Enable UTM tracking to see referral sources</p>';
    
    // Social Media Impact - no data available
    const socialContainer = document.getElementById('socialImpact');
    socialContainer.innerHTML = '<p style="color: #666;">Enable UTM tracking to measure social media impact</p>';
}

// Load Review Sentiment
async function loadReviewSentiment() {
    if (allReviews.length === 0) {
        await loadReviewsManagement();
    }
    
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    
    allReviews.forEach(review => {
        const rating = review.rating || 5;
        if (rating >= 4) {
            positive++;
        } else if (rating === 3) {
            neutral++;
        } else {
            negative++;
        }
    });
    
    const total = positive + neutral + negative;
    const positivePercent = total > 0 ? (positive / total * 100) : 0;
    
    document.querySelector('.sentiment-positive').style.width = positivePercent + '%';
    document.getElementById('positiveCount').textContent = positive;
    document.getElementById('neutralCount').textContent = neutral;
    document.getElementById('negativeCount').textContent = negative;
}

// Update Active Users
function updateActiveUsers() {
    // Show 0 or implement real session tracking
    document.getElementById('activeUsersCount').textContent = '0';
}

// GRANT LICENSE FUNCTIONS

// Generate a unique license key
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 4;
    const segmentLength = 4;
    let key = '';
    
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segmentLength; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        if (i < segments - 1) {
            key += '-';
        }
    }
    
    return key;
}

// Open grant license modal
function openGrantLicenseModal(userId) {
    const user = allUsers.find(u => u.docId === userId);
    if (!user) {
        showCustomModal('User not found.', 'Error');
        return;
    }
    
    // Generate a new license key
    const licenseKey = generateLicenseKey();
    
    // Set modal values
    document.getElementById('grantLicenseUsername').textContent = user.username || 'N/A';
    document.getElementById('licenseKeyInput').value = licenseKey;
    document.getElementById('grantLicenseUserId').value = userId;
    document.getElementById('grantLicenseModal').classList.add('active');
}

// Close grant license modal
function closeGrantLicenseModal() {
    document.getElementById('grantLicenseModal').classList.remove('active');
}

// Save granted license
async function saveGrantedLicense() {
    const userId = document.getElementById('grantLicenseUserId').value;
    const licenseKey = document.getElementById('licenseKeyInput').value.trim();
    
    if (!licenseKey) {
        showCustomModal('License key cannot be empty.', 'Error');
        return;
    }
    
    const user = allUsers.find(u => u.docId === userId);
    if (!user) {
        showCustomModal('User not found.', 'Error');
        return;
    }
    
    try {
        // Create the new license object
        const newLicense = {
            key: licenseKey,
            licenseKey: licenseKey,
            status: 'active',
            purchaseDate: firebase.firestore.Timestamp.now(),
            hwid: null,
            grantedByAdmin: true
        };
        
        // Get existing licenses or create empty array
        const existingLicenses = user.licenses || [];
        
        // Check if license key already exists
        const keyExists = existingLicenses.some(l => 
            (l.key === licenseKey || l.licenseKey === licenseKey)
        );
        
        if (keyExists) {
            showCustomModal('This license key already exists for this user.', 'Error');
            return;
        }
        
        // Add new license to array
        const updatedLicenses = [...existingLicenses, newLicense];
        
        // Update user document
        await db.collection('users').doc(userId).update({
            licenses: updatedLicenses
        });
        
        showCustomModal(`License key ${licenseKey} granted successfully to ${user.username}!`, 'Success');
        closeGrantLicenseModal();
        
        // Refresh data
        await loadAllUsers();
        updateStats();
        
        // Update details view if open
        if (currentUserDetails && currentUserDetails.docId === userId) {
            viewUserDetails(userId);
        }
        
    } catch (error) {
        console.error('Error granting license:', error);
        showCustomModal('Failed to grant license. Please try again.', 'Error');
    }
}

// EDIT LICENSE FUNCTIONS

// Open edit license modal
function openEditLicenseModal(userId, licenseIndex) {
    const user = allUsers.find(u => u.docId === userId);
    if (!user || !user.licenses || !user.licenses[licenseIndex]) {
        showCustomModal('License not found.', 'Error');
        return;
    }
    
    const license = user.licenses[licenseIndex];
    
    // Set modal values
    document.getElementById('editLicenseUsername').textContent = user.username || 'N/A';
    document.getElementById('currentLicenseKey').textContent = license.key || license.licenseKey || 'N/A';
    document.getElementById('newLicenseKey').value = license.key || license.licenseKey || '';
    document.getElementById('licenseStatus').value = license.status || 'active';
    document.getElementById('editLicenseUserId').value = userId;
    document.getElementById('editLicenseIndex').value = licenseIndex;
    document.getElementById('editLicenseModal').classList.add('active');
}

// Close edit license modal
function closeEditLicenseModal() {
    document.getElementById('editLicenseModal').classList.remove('active');
}

// Save license edit
async function saveLicenseEdit() {
    const userId = document.getElementById('editLicenseUserId').value;
    const licenseIndex = parseInt(document.getElementById('editLicenseIndex').value);
    const newLicenseKey = document.getElementById('newLicenseKey').value.trim();
    const newStatus = document.getElementById('licenseStatus').value;
    
    if (!newLicenseKey) {
        showCustomModal('License key cannot be empty.', 'Error');
        return;
    }
    
    const user = allUsers.find(u => u.docId === userId);
    if (!user || !user.licenses || !user.licenses[licenseIndex]) {
        showCustomModal('License not found.', 'Error');
        return;
    }
    
    try {
        // Get the licenses array
        const updatedLicenses = [...user.licenses];
        
        // Check if new license key already exists in other licenses
        const keyExists = updatedLicenses.some((l, index) => 
            index !== licenseIndex && (l.key === newLicenseKey || l.licenseKey === newLicenseKey)
        );
        
        if (keyExists) {
            showCustomModal('This license key already exists for this user.', 'Error');
            return;
        }
        
        // Update the license at the specified index
        updatedLicenses[licenseIndex] = {
            ...updatedLicenses[licenseIndex],
            key: newLicenseKey,
            licenseKey: newLicenseKey,
            status: newStatus
        };
        
        // Update user document
        await db.collection('users').doc(userId).update({
            licenses: updatedLicenses
        });
        
        showCustomModal('License updated successfully!', 'Success');
        closeEditLicenseModal();
        
        // Refresh data
        await loadAllUsers();
        updateStats();
        
        // Update details view if open
        if (currentUserDetails && currentUserDetails.docId === userId) {
            viewUserDetails(userId);
        }
        
    } catch (error) {
        console.error('Error updating license:', error);
        showCustomModal('Failed to update license. Please try again.', 'Error');
    }
}

// FAKE REVIEWS FUNCTIONS

// Track current review filter
let currentReviewFilter = 'all';

// Filter reviews by type
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
