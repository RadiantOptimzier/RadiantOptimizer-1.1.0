// Dashboard JavaScript - Connected to Firebase

// Wait for Firebase auth to initialize
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        // Check if user is admin and redirect to admin panel
        const db = firebase.firestore();
        const username = user.displayName || user.uid;
        
        try {
            const userDoc = await db.collection('users').doc(username).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.isAdmin === true) {
                    // Admin user - redirect to admin panel
                    sessionStorage.setItem('isAdmin', 'true');
                    sessionStorage.setItem('adminAuthenticated', Date.now().toString());
                    window.location.href = 'admin-panel.html';
                    return;
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
        
        // Regular user - load dashboard
        await loadUserData(user);
    } else {
        // User is not signed in, redirect to login
        window.location.href = 'login.html';
    }
});

// Load and display user data from Firestore
async function loadUserData(user) {
    try {
        const db = firebase.firestore();
        
        // Get username from display name
        let username = user.displayName;
        
        if (!username) {
            console.error('No username found - using UID as fallback');
            username = user.uid;
        }
        
        // Query for user document by username field (since doc IDs might be username OR random)
        const querySnapshot = await db.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (querySnapshot.empty) {
            // Fallback: try getting by username as doc ID
            const userDoc = await db.collection('users').doc(username).get();
            if (!userDoc.exists) {
                console.error('User document not found - creating it now');
                // Create the document since it doesn't exist
                // Create a temporary username from email if displayName is missing
                const tempUsername = username === user.uid ? user.email.split('@')[0] : username;
                
                const newUserData = {
                    uid: user.uid,
                    username: tempUsername,
                    email: user.email,
                    displayName: tempUsername,
                    role: 'user',
                    status: 'active',
                    createdAt: new Date(), // Use client-side timestamp for immediate display
                    licenses: [],
                    purchases: []
                };
                await db.collection('users').doc(tempUsername).set(newUserData);
                
                // Update with server timestamp in background
                db.collection('users').doc(tempUsername).update({
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => console.log('Failed to update server timestamp:', err));
                
                displayUserData(newUserData);
                return;
            }
            const userData = userDoc.data();
            displayUserData(userData);
            return;
        }
        
        // Get the user data from query result
        const userData = querySnapshot.docs[0].data();
        
        displayUserData(userData);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showCustomModal('Failed to load user data. Please try refreshing the page.', 'Error');
    }
}

// Function to display user data
function displayUserData(userData) {
    // Update user name displays
    document.getElementById('userName').textContent = userData.username;
    document.getElementById('userNameDisplay').textContent = userData.username;
    document.getElementById('userEmail').textContent = userData.email;
    document.getElementById('userUsername').textContent = userData.username;
    
    // Format member since date
    const memberSinceEl = document.getElementById('memberSince');
    if (memberSinceEl) {
        if (userData.createdAt) {
            try {
                let createdDate;
                if (userData.createdAt.toDate) {
                    // Firestore Timestamp
                    createdDate = userData.createdAt.toDate();
                } else if (userData.createdAt instanceof Date) {
                    // Regular Date object
                    createdDate = userData.createdAt;
                } else {
                    // Fallback
                    createdDate = new Date();
                }
                const options = { year: 'numeric', month: 'long' };
                memberSinceEl.textContent = createdDate.toLocaleDateString('en-US', options);
            } catch (error) {
                console.error('Error formatting date:', error);
                memberSinceEl.textContent = 'Just now';
            }
        } else {
            memberSinceEl.textContent = 'Just now';
        }
    }
    
    // Update stats
    const licenses = userData.licenses || [];
    const purchases = userData.purchases || [];
    
    document.getElementById('activeLicenses').textContent = licenses.length;
    document.getElementById('totalPurchases').textContent = purchases.length;
    
    // Load license keys
    loadLicenseKeys(licenses);
    
    // Load purchase history
    loadPurchaseHistory(purchases);
}

// Load and display license keys
function loadLicenseKeys(licenses) {
    const licenseGrid = document.getElementById('licenseGrid');
    
    if (!licenses || licenses.length === 0) {
        // Show empty state (already in HTML)
        return;
    }
    
    // Clear empty state
    licenseGrid.innerHTML = '';
    
    // Display each license
    licenses.forEach(license => {
        const licenseCard = createLicenseCard(license);
        licenseGrid.appendChild(licenseCard);
    });
}

// Create license card HTML
function createLicenseCard(license) {
    const card = document.createElement('div');
    card.className = 'license-card';
    
    // Format date
    let purchaseDate = 'N/A';
    if (license.purchaseDate) {
        if (license.purchaseDate.toDate) {
            purchaseDate = license.purchaseDate.toDate().toLocaleDateString();
        } else {
            purchaseDate = new Date(license.purchaseDate).toLocaleDateString();
        }
    }
    
    card.innerHTML = `
        <div class="license-header">
            <h3>RadiantOptimizer</h3>
            <span class="license-status active">Active</span>
        </div>
        <div class="license-key-display">
            <label>License Key</label>
            <div class="key-value">${license.key || license.licenseKey}</div>
        </div>
        <div class="license-actions">
            <button class="btn-copy" onclick="copyLicenseKey('${license.key || license.licenseKey}')">
                Copy Key
            </button>
        </div>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
            Purchased: ${purchaseDate}
        </p>
    `;
    
    return card;
}

// Copy license key to clipboard
function copyLicenseKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        showCustomModal('License key copied to clipboard!', 'Success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = key;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showCustomModal('License key copied to clipboard!', 'Success');
        } catch (err) {
            showCustomModal('Failed to copy license key. Please copy it manually.', 'Error');
        }
        document.body.removeChild(textArea);
    });
}

// Load and display purchase history
function loadPurchaseHistory(purchases) {
    const historyContainer = document.getElementById('purchaseHistory');
    
    if (!purchases || purchases.length === 0) {
        // Show empty state (already in HTML)
        return;
    }
    
    // Clear empty state
    historyContainer.innerHTML = '';
    
    // Display each purchase
    purchases.forEach(purchase => {
        const purchaseItem = createPurchaseItem(purchase);
        historyContainer.appendChild(purchaseItem);
    });
}

// Create purchase item HTML
function createPurchaseItem(purchase) {
    const item = document.createElement('div');
    item.className = 'purchase-item';
    
    // Format date
    let purchaseDate = 'N/A';
    if (purchase.date) {
        if (purchase.date.toDate) {
            purchaseDate = purchase.date.toDate().toLocaleDateString();
        } else {
            purchaseDate = new Date(purchase.date).toLocaleDateString();
        }
    }
    
    item.innerHTML = `
        <div class="purchase-info">
            <h4>${purchase.product || 'RadiantOptimizer'}</h4>
            <p>${purchaseDate}</p>
        </div>
        <div class="purchase-amount">$${purchase.amount || purchase.price || '33'}</div>
    `;
    
    return item;
}

// Handle logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        // No confirm dialog needed - just logout directly
        try {
            await firebase.auth().signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            showCustomModal('Failed to logout. Please try again.', 'Error');
        }
    });
}

// Function to add a license after purchase (will be called by Stripe webhook)
async function addLicenseToUser(username, licenseKey, purchaseData) {
    try {
        const db = firebase.firestore();
        
        const licenseData = {
            key: licenseKey,
            purchaseDate: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };
        
        const purchaseRecord = {
            product: 'RadiantOptimizer',
            amount: purchaseData.amount || 33,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            licenseKey: licenseKey
        };
        
        // Update user document
        await db.collection('users').doc(username).update({
            licenses: firebase.firestore.FieldValue.arrayUnion(licenseData),
            purchases: firebase.firestore.FieldValue.arrayUnion(purchaseRecord)
        });
        
        console.log('License added successfully');
        return true;
    } catch (error) {
        console.error('Error adding license:', error);
        return false;
    }
}

// Export function for use in other scripts
window.addLicenseToUser = addLicenseToUser;

// Load news notification badge
async function loadNewsNotificationBadge() {
    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        
        const newsSnapshot = await firebase.firestore().collection('news').get();
        let unreadCount = 0;
        
        newsSnapshot.forEach(doc => {
            const newsData = doc.data();
            const readBy = newsData.readBy || [];
            if (!readBy.includes(currentUser.uid)) {
                unreadCount++;
            }
        });
        
        const badge = document.getElementById('newsNotificationBadge');
        if (badge && unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading news badge:', error);
    }
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const body = document.body;

    if (mobileMenuToggle && navMenu) {
        console.log('Mobile menu initialized'); // Debug log
        
        // Toggle menu
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu toggle clicked'); // Debug log
            
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            body.classList.toggle('no-scroll');
            
            console.log('Menu active:', navMenu.classList.contains('active')); // Debug log
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (navMenu.classList.contains('active') && 
                !navMenu.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                body.classList.remove('no-scroll');
            }
        });

        // Prevent menu clicks from closing it
        navMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    } else {
        console.log('Mobile menu elements not found'); // Debug log
    }
    
    // Load news notification badge
    loadNewsNotificationBadge();
});
