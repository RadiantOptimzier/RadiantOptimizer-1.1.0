// Real-time signup validation
let usernameCheckTimeout;
let emailCheckTimeout;

// Username availability indicator
const usernameInput = document.getElementById('username');
if (usernameInput) {
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'availability-indicator';
    indicator.id = 'usernameIndicator';
    usernameInput.parentElement.appendChild(indicator);
    
    usernameInput.addEventListener('input', () => {
        const username = usernameInput.value.trim();
        const indicator = document.getElementById('usernameIndicator');
        
        // Clear previous timeout
        clearTimeout(usernameCheckTimeout);
        
        if (username.length < 3) {
            indicator.innerHTML = '<span class="indicator-neutral">Minimum 3 characters</span>';
            return;
        }
        
        if (username.length > 20) {
            indicator.innerHTML = '<span class="indicator-error">Maximum 20 characters</span>';
            return;
        }
        
        // Validate format
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            indicator.innerHTML = '<span class="indicator-error">Letters, numbers, _ and - only</span>';
            return;
        }
        
        indicator.innerHTML = '<span class="indicator-checking">Checking...</span>';
        
        // Debounce the check
        usernameCheckTimeout = setTimeout(async () => {
            try {
                // Query for username field instead of document ID
                const querySnapshot = await firebase.firestore()
                    .collection('users')
                    .where('username', '==', username)
                    .limit(1)
                    .get();
                
                if (!querySnapshot.empty) {
                    indicator.innerHTML = '<span class="indicator-error">✗ Username taken</span>';
                } else {
                    indicator.innerHTML = '<span class="indicator-success">✓ Username available</span>';
                }
            } catch (error) {
                console.error('Username check error:', error);
                // If permission denied, we need to update Firestore rules
                if (error.code === 'permission-denied') {
                    indicator.innerHTML = '<span class="indicator-neutral">✓ Format valid (availability check disabled)</span>';
                } else {
                    indicator.innerHTML = '<span class="indicator-error">Check failed</span>';
                }
            }
        }, 500);
    });
}

// Email availability indicator
const emailInput = document.getElementById('email');
if (emailInput) {
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'availability-indicator';
    indicator.id = 'emailIndicator';
    emailInput.parentElement.appendChild(indicator);
    
    emailInput.addEventListener('input', () => {
        const email = emailInput.value.trim();
        const indicator = document.getElementById('emailIndicator');
        
        // Clear previous timeout
        clearTimeout(emailCheckTimeout);
        
        if (email.length === 0) {
            indicator.innerHTML = '';
            return;
        }
        
        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            indicator.innerHTML = '<span class="indicator-error">Invalid email format</span>';
            return;
        }
        
        indicator.innerHTML = '<span class="indicator-checking">Checking...</span>';
        
        // Debounce the check
        emailCheckTimeout = setTimeout(async () => {
            try {
                // Check both Firebase Auth and Firestore
                const [authMethods, firestoreQuery] = await Promise.all([
                    firebase.auth().fetchSignInMethodsForEmail(email),
                    firebase.firestore().collection('users')
                        .where('email', '==', email)
                        .limit(1)
                        .get()
                ]);
                
                if (authMethods.length > 0 || !firestoreQuery.empty) {
                    indicator.innerHTML = '<span class="indicator-error">✗ Email already registered</span>';
                } else {
                    indicator.innerHTML = '<span class="indicator-success">✓ Email available</span>';
                }
            } catch (error) {
                console.error('Email check error:', error);
                indicator.innerHTML = '<span class="indicator-neutral">Unable to check</span>';
            }
        }, 500);
    });
}

// Password strength indicator
const passwordInput = document.getElementById('password');
if (passwordInput) {
    const indicator = document.createElement('div');
    indicator.className = 'availability-indicator';
    indicator.id = 'passwordIndicator';
    passwordInput.parentElement.appendChild(indicator);
    
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const indicator = document.getElementById('passwordIndicator');
        
        if (password.length === 0) {
            indicator.innerHTML = '';
            return;
        }
        
        if (password.length < 6) {
            indicator.innerHTML = '<span class="indicator-error">Minimum 6 characters</span>';
        } else if (password.length < 8) {
            indicator.innerHTML = '<span class="indicator-neutral">Weak password</span>';
        } else if (password.length < 12) {
            indicator.innerHTML = '<span class="indicator-success">Good password</span>';
        } else {
            indicator.innerHTML = '<span class="indicator-success">Strong password</span>';
        }
    });
}

// Confirm password match indicator
const confirmPasswordInput = document.getElementById('confirmPassword');
if (confirmPasswordInput && passwordInput) {
    const indicator = document.createElement('div');
    indicator.className = 'availability-indicator';
    indicator.id = 'confirmIndicator';
    confirmPasswordInput.parentElement.appendChild(indicator);
    
    const checkMatch = () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const indicator = document.getElementById('confirmIndicator');
        
        if (confirmPassword.length === 0) {
            indicator.innerHTML = '';
            return;
        }
        
        if (password === confirmPassword) {
            indicator.innerHTML = '<span class="indicator-success">✓ Passwords match</span>';
        } else {
            indicator.innerHTML = '<span class="indicator-error">✗ Passwords don\'t match</span>';
        }
    };
    
    passwordInput.addEventListener('input', checkMatch);
    confirmPasswordInput.addEventListener('input', checkMatch);
}
