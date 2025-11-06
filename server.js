// server.js - Complete backend implementation for RadiantOptimizer
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

// Initialize Express
const app = express();
const port = process.env.PORT || 8000;

// Enable CORS with proper configuration
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Use raw body for webhooks
app.use('/webhook', express.raw({ type: 'application/json' }));

// Use JSON parser for other routes
app.use((req, res, next) => {
  if (req.path === '/webhook') {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

// Initialize Firebase Admin
try {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com"
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const db = admin.firestore();

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('RadiantOptimizer Backend API is running');
});

// Create checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    console.log("Create checkout request received:", req.body);
    const { uid, email, couponCode } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Use provided email or retrieve from Firestore
    let userEmail = email;
    if (!userEmail) {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userEmail = userDoc.data().email || '';
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
    
    console.log(`Creating checkout session for user ${uid} with email ${userEmail}`);
    
    // Get the origin from the request headers or use environment variable
    const origin = req.headers.origin || req.headers.referer || process.env.APP_URL || 'https://radiantoptimizer.com';
    console.log(`Using origin: ${origin}`);
    
    // Create checkout session with properly formatted URLs
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Radiant Optimizer Premium',
              description: 'Lifetime access to premium features',
            },
            unit_amount: 3300, // $33.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard.html?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard.html?purchase=cancelled`,
      customer_email: userEmail,
      client_reference_id: uid,
      metadata: {
        uid: uid,
        email: userEmail
      },
      // Add this to enable coupon input in Stripe checkout
      allow_promotion_codes: true
    };
    
    // If a specific coupon code was provided, apply it directly
    if (couponCode) {
      sessionParams.discounts = [
        {
          coupon: couponCode,
        },
      ];
    }
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log("Session created:", session.id, "with redirect URL:", session.success_url);
    
    // Store pending purchase in Firestore
    await db.collection('pending_purchases').doc(session.id).set({
      userId: uid,
      email: userEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      couponCode: couponCode || null
    });
    
    // Return checkout URL
    res.json({ url: session.url });
  } catch (error) {
    console.error('Detailed error:', error);
    // Check if it's a Stripe error with more details
    const errorMessage = error.raw ? error.raw.message : error.message;
    res.status(500).json({ 
      error: 'Failed to create checkout session', 
      details: errorMessage 
    });
  }
});

// Verify successful payment
app.post('/purchase-complete', async (req, res) => {
  try {
    console.log("Purchase completion request:", req.body);
    const { session_id, user_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("Retrieved Stripe session:", session.id, "Status:", session.payment_status);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Payment not complete', 
        status: session.payment_status 
      });
    }
    
    // Process the purchase
    const result = await processCompletedPurchase(session, user_id);
    
    res.json({ 
      success: true, 
      licenseKey: result.licenseKey,
      message: 'Purchase processed successfully'
    });
  } catch (error) {
    console.error('Error processing purchase completion:', error);
    res.status(500).json({ 
      error: 'Failed to process purchase', 
      details: error.message 
    });
  }
});

// Webhook handler for Stripe events
app.post('/webhook', async (req, res) => {
  console.log("Webhook endpoint called!");
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log("Webhook event received:", event.type);
  
  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.payment_status === 'paid') {
      try {
        console.log("Processing completed checkout via webhook");
        await processCompletedPurchase(session);
        console.log("Webhook processing completed successfully");
      } catch (error) {
        console.error('Error processing payment confirmation:', error);
        return res.status(500).send(`Error processing payment: ${error.message}`);
      }
    } else {
      console.log(`Payment not yet complete. Status: ${session.payment_status}`);
    }
  }
  
  // Acknowledge receipt of the event
  res.status(200).json({ received: true });
});

// Function to process completed purchases - USES USERNAME
async function processCompletedPurchase(session, providedUserId = null) {
  // Get username from session (client_reference_id is the username in new system)
  const username = session.client_reference_id || session.metadata?.username;
  const customerEmail = session.customer_email || session.metadata?.email || '';
  
  console.log(`Processing payment for username: ${username}, email: ${customerEmail}`);
  
  if (!username) {
    throw new Error('No username found in session');
  }
  
  // Check if a license key already exists for this purchase
  const existingPurchase = await db.collection('pending_purchases')
    .doc(session.id)
    .get();
    
  if (existingPurchase.exists && 
      existingPurchase.data().status === 'completed' && 
      existingPurchase.data().licenseKey) {
    console.log(`Already processed purchase ${session.id}, returning existing license key`);
    return { licenseKey: existingPurchase.data().licenseKey };
  }
  
  // Generate a unique license key
  const licenseKey = await generateUniqueLicenseKey();
  console.log(`Generated license key: ${licenseKey}`);
  
  // Store the license key in Firestore
  const licenseData = {
    key: licenseKey,
    email: customerEmail,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    purchaseId: session.id,
    productId: '4626177',
    productName: 'Radiant Optimizer',
    username: username, // Store username with license
    amount: session.amount_total ? session.amount_total / 100 : 33,
    currency: session.currency?.toUpperCase() || 'USD',
    notes: 'Generated from Stripe purchase',
    hwid: null // This will be set when the user activates
  };
  
  // Add license key to license_keys collection using username as document ID
  await db.collection('license_keys').doc(username).set(licenseData);
  console.log(`License key ${licenseKey} stored in database with doc ID: ${username}`);
  
  // Find the user document by querying username field
  const userQuery = await db.collection('users')
    .where('username', '==', username)
    .limit(1)
    .get();
  
  if (!userQuery.empty) {
    // User exists - update their document
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const existingLicenses = userData.licenses || [];
    const existingPurchases = userData.purchases || [];
    
    // Create license object for user document (use Date instead of serverTimestamp in arrays)
    const userLicenseData = {
      key: licenseKey,
      purchaseDate: new Date(),
      status: 'active'
    };
    
    // Create purchase record (use Date instead of serverTimestamp in arrays)
    const purchaseRecord = {
      product: 'RadiantOptimizer',
      amount: session.amount_total ? session.amount_total / 100 : 33,
      date: new Date(),
      licenseKey: licenseKey
    };
    
    // Update user document
    await userDoc.ref.update({
      accountType: 'premium',
      licenses: [...existingLicenses, userLicenseData],
      purchases: [...existingPurchases, purchaseRecord],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Updated user ${username} with new license key`);
  } else {
    // User doesn't exist yet - create placeholder document with username as ID
    await db.collection('users').doc(username).set({
      username: username,
      email: customerEmail,
      accountType: 'premium',
      licenses: [{
        key: licenseKey,
        purchaseDate: new Date(),
        status: 'active'
      }],
      purchases: [{
        product: 'RadiantOptimizer',
        amount: session.amount_total ? session.amount_total / 100 : 33,
        date: new Date(),
        licenseKey: licenseKey
      }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Created new user document for ${username}`);
  }
  
  // Update the pending purchase to completed
  if (session.id) {
    await db.collection('pending_purchases').doc(session.id).set({
      status: 'completed',
      licenseKey: licenseKey,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      username: username,
      email: customerEmail,
      amount: session.amount_total ? session.amount_total / 100 : 33,
      currency: session.currency?.toUpperCase() || 'USD'
    }, { merge: true });
    
    console.log(`Updated pending purchase ${session.id} to completed`);
  }
  
  // Return the generated license key
  return { licenseKey };
}

// Generate a license key
function generateLicenseKey() {
  const segments = 3;
  const segmentLength = 5;
  let licenseKey = '';
  
  for (let i = 0; i < segments; i++) {
    const randomBytes = crypto.randomBytes(segmentLength);
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      const randomValue = randomBytes[j] % 36;
      segment += randomValue.toString(36).toUpperCase();
    }
    licenseKey += segment;
    
    if (i < segments - 1) {
      licenseKey += '-';
    }
  }
  
  return licenseKey;
}

// Check if a license key already exists
async function isLicenseKeyUnique(key) {
  const snapshot = await db.collection('license_keys').where('key', '==', key).get();
  return snapshot.empty;
}

// Generate a unique license key
async function generateUniqueLicenseKey() {
  let licenseKey;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    licenseKey = generateLicenseKey();
    isUnique = await isLicenseKeyUnique(licenseKey);
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate a unique license key after multiple attempts');
  }
  
  return licenseKey;
}

// Verify license key endpoint
app.post('/verify-license', async (req, res) => {
  try {
    const { licenseKey, hwid } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key is required' });
    }
    
    console.log(`Verifying license key: ${licenseKey}, HWID: ${hwid || 'none'}`);
    
    // Query Firestore for the license key
    const snapshot = await db.collection('license_keys').where('key', '==', licenseKey).get();
    
    if (snapshot.empty) {
      console.log(`License key not found: ${licenseKey}`);
      return res.status(404).json({ error: 'License key not found', valid: false });
    }
    
    const licenseDoc = snapshot.docs[0];
    const licenseData = licenseDoc.data();
    
    // Check if license is active
    if (!licenseData.active) {
      console.log(`License key inactive: ${licenseKey}`);
      return res.status(403).json({ error: 'License is not active', valid: false });
    }
    
    // If HWID is provided, check or update it
    if (hwid) {
      if (licenseData.hwid && licenseData.hwid !== hwid) {
        console.log(`License key bound to different HWID: ${licenseKey}`);
        return res.status(403).json({ 
          error: 'License is bound to another device', 
          valid: false, 
          bound: true,
          currentHwid: licenseData.hwid
        });
      }
      
      // If HWID is not set, update it
      if (!licenseData.hwid) {
        await db.collection('license_keys').doc(licenseDoc.id).update({
          hwid: hwid,
          lastActivated: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Set HWID for license key: ${licenseKey} -> ${hwid}`);
      }
    }
    
    // Update last validated timestamp
    await db.collection('license_keys').doc(licenseDoc.id).update({
      lastValidated: admin.firestore.FieldValue.serverTimestamp(),
      activationCount: admin.firestore.FieldValue.increment(1)
    });
    
    console.log(`Successfully validated license key: ${licenseKey}`);
    
    // Return success response
    res.json({
      valid: true,
      userId: licenseData.userId,
      email: licenseData.email,
      productName: licenseData.productName,
      bound: !!licenseData.hwid,
      activationDate: licenseData.lastActivated || null
    });
  } catch (error) {
    console.error('Error verifying license:', error);
    res.status(500).json({ error: 'Failed to verify license', details: error.message });
  }
});

// Reset HWID for a license key (admin only)
app.post('/admin/reset-hwid', async (req, res) => {
  try {
    const { licenseKey, adminKey } = req.body;
    
    // Validate admin key from environment variable
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key is required' });
    }
    
    // Query Firestore for the license key
    const snapshot = await db.collection('license_keys').where('key', '==', licenseKey).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'License key not found' });
    }
    
    const licenseDoc = snapshot.docs[0];
    
    // Reset HWID
    await db.collection('license_keys').doc(licenseDoc.id).update({
      hwid: null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Reset HWID for license key: ${licenseKey}`);
    
    // Return success response
    res.json({
      success: true,
      message: 'HWID reset successfully'
    });
  } catch (error) {
    console.error('Error resetting HWID:', error);
    res.status(500).json({ error: 'Failed to reset HWID', details: error.message });
  }
});

// Get license usage statistics (for debugging and monitoring)
app.get('/admin/license-stats', async (req, res) => {
  try {
    const { adminKey } = req.query;
    
    // Validate admin key from environment variable
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get license stats
    const snapshot = await db.collection('license_keys').get();
    
    const stats = {
      totalLicenses: snapshot.size,
      activeLicenses: 0,
      boundLicenses: 0,
      activationsLast24Hours: 0,
      validationsLast24Hours: 0
    };
    
    const now = admin.firestore.Timestamp.now();
    const oneDayAgo = new admin.firestore.Timestamp(
      now.seconds - 86400,
      now.nanoseconds
    );
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.active) {
        stats.activeLicenses++;
      }
      
      if (data.hwid) {
        stats.boundLicenses++;
      }
      
      if (data.lastActivated && data.lastActivated.seconds >= oneDayAgo.seconds) {
        stats.activationsLast24Hours++;
      }
      
      if (data.lastValidated && data.lastValidated.seconds >= oneDayAgo.seconds) {
        stats.validationsLast24Hours++;
      }
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting license stats:', error);
    res.status(500).json({ error: 'Failed to get license stats', details: error.message });
  }
});

// ========== SPIN WHEEL ENDPOINTS ==========

// Check if user is eligible to spin (customers only, once per account)
app.post('/check-spin-eligibility', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Check if user has already spun
    const spinDoc = await db.collection('wheel_spins').doc(username).get();
    
    if (spinDoc.exists && spinDoc.data().hasSpun === true) {
      return res.json({ 
        eligible: false, 
        reason: 'already_spun',
        message: 'You have already used your one-time spin!' 
      });
    }
    
    // Check if user is a paying customer (has a license key)
    const licenseDoc = await db.collection('license_keys').doc(username).get();
    
    if (!licenseDoc.exists) {
      return res.json({ 
        eligible: false, 
        reason: 'not_customer',
        message: 'Only paying customers can spin the wheel!' 
      });
    }
    
    // User is a customer and hasn't spun yet - eligible!
    res.json({ eligible: true });
  } catch (error) {
    console.error('Error checking spin eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility', details: error.message });
  }
});

// Process wheel spin
app.post('/spin-wheel', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Check eligibility first
    const spinDoc = await db.collection('wheel_spins').doc(username).get();
    if (spinDoc.exists && spinDoc.data().hasSpun === true) {
      return res.status(403).json({ error: 'You have already used your one-time spin!' });
    }
    
    // Check if user is a paying customer
    const licenseDoc = await db.collection('license_keys').doc(username).get();
    if (!licenseDoc.exists) {
      return res.status(403).json({ error: 'Only paying customers can spin the wheel!' });
    }
    
    // Determine prize based on probability
    const prize = determinePrize();
    
    // Record the spin - mark as used permanently
    await db.collection('wheel_spins').doc(username).set({
      hasSpun: true,
      lastSpinTime: admin.firestore.FieldValue.serverTimestamp(),
      totalSpins: admin.firestore.FieldValue.increment(1),
      lastPrize: prize.type
    }, { merge: true });
    
    // If prize is not "try again", store it
    if (prize.type !== 'tryAgain') {
      const prizeId = `${username}_${Date.now()}`;
      await db.collection('user_prizes').doc(prizeId).set({
        username: username,
        prizeType: prize.type,
        prizeValue: prize.value,
        wonAt: admin.firestore.FieldValue.serverTimestamp(),
        redeemed: false,
        couponCode: null
      });
      
      prize.prizeId = prizeId;
    }
    
    console.log(`User ${username} spun and won: ${prize.type}`);
    
    res.json({
      success: true,
      prize: prize
    });
  } catch (error) {
    console.error('Error processing spin:', error);
    res.status(500).json({ error: 'Failed to process spin', details: error.message });
  }
});

// Helper function to determine prize based on probability
function determinePrize() {
  const random = Math.random() * 100; // 0-100
  
  // Cumulative probabilities:
  // 0.01% = Free License (0 - 0.01)
  // 1.07% = 25% off (0.01 - 1.08)
  // 7% = 17% off (1.08 - 8.08)
  // 20% = 10% off (8.08 - 28.08)
  // 25% = 7% off (28.08 - 53.08)
  // 46.92% = Try Again (53.08 - 100)
  
  if (random < 0.01) {
    return { type: 'freeLicense', value: 100, label: 'FREE LICENSE!' };
  } else if (random < 1.08) {
    return { type: 'discount25', value: 25, label: '25% OFF' };
  } else if (random < 8.08) {
    return { type: 'discount17', value: 17, label: '17% OFF' };
  } else if (random < 28.08) {
    return { type: 'discount10', value: 10, label: '10% OFF' };
  } else if (random < 53.08) {
    return { type: 'discount7', value: 7, label: '7% OFF' };
  } else {
    return { type: 'tryAgain', value: 0, label: 'Try Again Tomorrow' };
  }
}

// Create Stripe coupon for prize
app.post('/create-prize-coupon', async (req, res) => {
  try {
    const { prizeId, username } = req.body;
    
    if (!prizeId || !username) {
      return res.status(400).json({ error: 'Prize ID and username are required' });
    }
    
    // Get prize from Firestore
    const prizeDoc = await db.collection('user_prizes').doc(prizeId).get();
    
    if (!prizeDoc.exists) {
      return res.status(404).json({ error: 'Prize not found' });
    }
    
    const prizeData = prizeDoc.data();
    
    if (prizeData.redeemed) {
      return res.status(400).json({ error: 'Prize already redeemed' });
    }
    
    if (prizeData.username !== username) {
      return res.status(403).json({ error: 'Prize does not belong to this user' });
    }
    
    // Handle free license differently
    if (prizeData.prizeType === 'freeLicense') {
      // Generate license key directly
      const licenseKey = await generateUniqueLicenseKey();
      
      // Store license in database
      await db.collection('license_keys').doc(username).set({
        key: licenseKey,
        email: prizeData.email || '',
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        purchaseId: `spin_${prizeId}`,
        productId: '4626177',
        productName: 'Radiant Optimizer',
        username: username,
        amount: 0,
        currency: 'USD',
        notes: 'Won from spin wheel',
        hwid: null
      }, { merge: true });
      
      // Update user document
      const userQuery = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const existingLicenses = userData.licenses || [];
        
        await userDoc.ref.update({
          accountType: 'premium',
          licenses: [...existingLicenses, {
            key: licenseKey,
            purchaseDate: new Date(),
            status: 'active',
            source: 'spin_wheel'
          }],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Mark prize as redeemed
      await db.collection('user_prizes').doc(prizeId).update({
        redeemed: true,
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
        licenseKey: licenseKey
      });
      
      return res.json({
        success: true,
        type: 'license',
        licenseKey: licenseKey
      });
    }
    
    // For discount prizes, create Stripe coupon
    const couponId = `SPIN_${username}_${Date.now()}`.toUpperCase().substring(0, 40);
    
    const coupon = await stripe.coupons.create({
      id: couponId,
      percent_off: prizeData.prizeValue,
      duration: 'once',
      max_redemptions: 1,
      redeem_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      metadata: {
        username: username,
        prizeId: prizeId,
        source: 'spin_wheel'
      }
    });
    
    // Update prize with coupon code
    await db.collection('user_prizes').doc(prizeId).update({
      couponCode: coupon.id,
      couponCreatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Created coupon ${coupon.id} for user ${username}`);
    
    res.json({
      success: true,
      type: 'coupon',
      couponCode: coupon.id,
      discount: prizeData.prizeValue
    });
  } catch (error) {
    console.error('Error creating prize coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon', details: error.message });
  }
});

// Get user's unclaimed prizes
app.post('/get-user-prizes', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get all prizes for user
    const prizesSnapshot = await db.collection('user_prizes')
      .where('username', '==', username)
      .where('redeemed', '==', false)
      .get();
    
    const prizes = [];
    prizesSnapshot.forEach(doc => {
      const data = doc.data();
      prizes.push({
        id: doc.id,
        type: data.prizeType,
        value: data.prizeValue,
        wonAt: data.wonAt?.toDate() || null,
        couponCode: data.couponCode
      });
    });
    
    res.json({ prizes });
  } catch (error) {
    console.error('Error getting user prizes:', error);
    res.status(500).json({ error: 'Failed to get prizes', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`RadiantOptimizer Backend API running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
