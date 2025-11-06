// Custom Modal Functions (embedded for reliability)
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

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyADicB51bTMiEd4y7UBs9cXOyXUe76G3C4",
  authDomain: "radiantoptimizer.firebaseapp.com",
  projectId: "radiantoptimizer",
  storageBucket: "radiantoptimizer.firebasestorage.app",
  messagingSenderId: "799070539679",
  appId: "1:799070539679:web:4b8a542ea278b4edbdf7aa",
  measurementId: "G-LKXZHTHVVR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Signing In...';
        
        try {
            // Sign in with Firebase
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Login successful for:', user.email);
            console.log('Email verified status:', user.emailVerified);
            
            // Check if email is verified FIRST before any redirects
            if (!user.emailVerified) {
                console.log('BLOCKING LOGIN - Email not verified for user:', user.email);
                
                // Store user reference before signing out
                const userForResend = user;
                
                // Sign out immediately to prevent any redirects
                await auth.signOut();
                console.log('User signed out');
                
                // Small delay to ensure signout completes
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Show custom modal
                console.log('Calling showCustomModal...');
                showCustomModal(
                    'You must verify your email before you can sign in. Please check your inbox (and spam folder) for the verification email and click the link to verify.',
                    'Email Not Verified'
                );
                console.log('showCustomModal called');
                
                submitButton.disabled = false;
                submitButton.textContent = 'Sign In';
                return;
            }
            
            console.log('Email is verified, proceeding with login');
            
            // Check if user is admin
            const username = user.displayName || user.uid;
            const userDoc = await db.collection('users').doc(username).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // If user is admin, redirect to admin panel
                if (userData.isAdmin === true) {
                    sessionStorage.setItem('isAdmin', 'true');
                    sessionStorage.setItem('adminAuthenticated', Date.now().toString());
                    window.location.href = 'admin-panel.html';
                    return;
                }
            }
            
            // Regular user - redirect to dashboard
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Login error:', error);
            
            // Show user-friendly error messages
            let errorMessage = 'Failed to sign in. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage += 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    errorMessage += 'This account has been disabled.';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            showCustomModal(errorMessage, 'Login Error');
            
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = 'Sign In';
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showCustomModal('Passwords do not match!', 'Validation Error');
            return;
        }
        
        // Validate username format (alphanumeric, underscore, hyphen only)
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            showCustomModal('Username can only contain letters, numbers, underscores, and hyphens.', 'Validation Error');
            return;
        }
        
        // Validate username length
        if (username.length < 3 || username.length > 20) {
            showCustomModal('Username must be between 3 and 20 characters.', 'Validation Error');
            return;
        }
        
        // Disable button and show loading
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        try {
            // First, check if username is already taken (query by field, not doc ID)
            const usernameQuery = await db.collection('users')
                .where('username', '==', username)
                .limit(1)
                .get();
            
            if (!usernameQuery.empty) {
                showCustomModal('Username is already taken. Please choose a different username.', 'Username Taken');
                submitButton.disabled = false;
                submitButton.textContent = 'Create Account';
                return;
            }
            
            // Create Firebase Auth account
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update Firebase Auth profile first
            await user.updateProfile({
                displayName: username
            });
            
            // Wait for auth state to fully propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Force refresh the ID token to get updated claims
            await user.getIdToken(true);
            
            // Create user document in Firestore with username as document ID
            // Use client-side timestamp for immediate availability
            await db.collection('users').doc(username).set({
                uid: user.uid,
                username: username,
                email: email,
                displayName: username,
                role: 'user',
                status: 'active',
                createdAt: new Date(),
                licenses: [],
                purchases: []
            });
            
            // Update with server timestamp in background
            db.collection('users').doc(username).update({
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.log('Failed to update server timestamp:', err));
            
            // Send email verification
            try {
                await user.sendEmailVerification();
                
                // Sign out the user immediately
                await auth.signOut();
                
                showCustomModal('Account created! A verification email has been sent to ' + email + '. You MUST verify your email before you can sign in. Please check your inbox and click the verification link.', 'Email Verification Required');
                
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } catch (emailError) {
                console.error('Error sending verification email:', emailError);
                
                // Delete the account if email fails
                await user.delete();
                await db.collection('users').doc(username).delete();
                
                showCustomModal('Failed to send verification email. Please try again.', 'Error');
                submitButton.disabled = false;
                submitButton.textContent = 'Create Account';
            }
        } catch (error) {
            console.error('Signup error:', error);
            
            // Show user-friendly error messages
            let errorMessage = 'Failed to create account. ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'This email is already registered.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Password is too weak. Use at least 6 characters.';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            showCustomModal(errorMessage, 'Signup Error');
            
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
        }
    });
}

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Update navigation buttons based on auth state
    const signinBtn = document.getElementById('signinBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profileUsername = document.getElementById('profileUsername');
    
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        
        // Show profile button, hide sign-in button
        if (signinBtn) signinBtn.style.display = 'none';
        if (profileBtn) {
            profileBtn.style.display = 'flex';
            
            // Get username from Firestore or display name
            try {
                const userDoc = await db.collection('users').doc(user.displayName || user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (profileUsername) {
                        profileUsername.textContent = userData.username || user.displayName || 'User';
                    }
                } else if (profileUsername) {
                    profileUsername.textContent = user.displayName || user.email.split('@')[0];
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                if (profileUsername) {
                    profileUsername.textContent = user.displayName || user.email.split('@')[0];
                }
            }
        }
        
        // DON'T redirect from signup or login pages
        // The login form handles this explicitly after verification check
        // (Removed auto-redirect from login page to prevent flash)
    } else {
        // User is signed out
        console.log('No user signed in');
        
        // Show sign-in button, hide profile button
        if (signinBtn) signinBtn.style.display = 'block';
        if (profileBtn) profileBtn.style.display = 'none';
        
        // Redirect to login if on dashboard page
        if (currentPage === 'dashboard.html') {
            window.location.href = 'login.html';
        }
    }
});
