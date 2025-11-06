// UPDATED processCompletedPurchase function for username-based system
// Replace the existing processCompletedPurchase function in your server.js with this:

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
  
  // Add license key to license_keys collection
  await db.collection('license_keys').add(licenseData);
  console.log(`License key ${licenseKey} stored in database`);
  
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
    
    // Create license object for user document
    const userLicenseData = {
      key: licenseKey,
      purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };
    
    // Create purchase record
    const purchaseRecord = {
      product: 'RadiantOptimizer',
      amount: session.amount_total ? session.amount_total / 100 : 33,
      date: admin.firestore.FieldValue.serverTimestamp(),
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
        purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      }],
      purchases: [{
        product: 'RadiantOptimizer',
        amount: session.amount_total ? session.amount_total / 100 : 33,
        date: admin.firestore.FieldValue.serverTimestamp(),
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
