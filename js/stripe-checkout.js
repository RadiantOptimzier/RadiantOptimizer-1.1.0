// Stripe Checkout Integration for RadiantOptimizer
// Backend URL
const BACKEND_URL = 'https://radiant-backend-xoxk.onrender.com';

// Function to show loading overlay
function showTransferringScreen() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'transferringOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create content container
    const content = document.createElement('div');
    content.style.cssText = `
        text-align: center;
        color: white;
    `;
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 60px;
        height: 60px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 30px;
    `;
    
    // Create text
    const text = document.createElement('h2');
    text.textContent = 'Hang on, we\'re transferring you over...';
    text.style.cssText = `
        font-size: 24px;
        font-weight: 600;
        margin: 0;
        animation: pulse 2s ease infinite;
    `;
    
    // Add styles for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Assemble overlay
    content.appendChild(spinner);
    content.appendChild(text);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// Function to handle purchase - USES BACKEND
async function purchaseRadiantOptimizer() {
    try {
        // Get current user info
        const user = firebase.auth().currentUser;
        
        if (!user) {
            alert('Please sign in to purchase RadiantOptimizer');
            window.location.href = 'login.html';
            return;
        }

        // Show transferring screen immediately
        showTransferringScreen();

        // Get username from display name
        const username = user.displayName;
        const email = user.email;

        console.log('Creating checkout session for:', username);

        // Call backend to create checkout session
        const response = await fetch(`${BACKEND_URL}/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uid: username,  // Send username as uid
                email: email
            })
        });

        if (!response.ok) {
            // Remove overlay on error
            const overlay = document.getElementById('transferringOverlay');
            if (overlay) overlay.remove();
            throw new Error('Failed to create checkout session');
        }

        const data = await response.json();
        
        // Redirect to Stripe Checkout URL
        if (data.url) {
            window.location.href = data.url;
        } else {
            // Remove overlay on error
            const overlay = document.getElementById('transferringOverlay');
            if (overlay) overlay.remove();
            throw new Error('No checkout URL returned');
        }
    } catch (error) {
        console.error('Purchase error:', error);
        // Remove overlay on error
        const overlay = document.getElementById('transferringOverlay');
        if (overlay) overlay.remove();
        alert('Failed to start checkout. Please try again.');
    }
}

// Export function for use in HTML
window.purchaseRadiantOptimizer = purchaseRadiantOptimizer;

// Check for purchase success on page load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const purchaseStatus = urlParams.get('purchase');
    
    if (purchaseStatus === 'success') {
        alert('🎉 Thank you for your purchase! Your license key will appear shortly.');
        // Clear the URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        // Reload to show new license
        setTimeout(() => location.reload(), 2000);
    } else if (purchaseStatus === 'cancelled') {
        alert('Purchase was cancelled.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
