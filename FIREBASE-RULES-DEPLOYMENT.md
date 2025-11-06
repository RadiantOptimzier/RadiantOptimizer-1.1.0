# Firebase Security Rules Deployment Guide

## Issue Fixed
Your paid account users were unable to write reviews due to missing or insufficient Firebase Firestore permissions. This has been resolved by creating proper security rules.

## What Was Done
1. Created `firestore.rules` - Defines security rules for your Firestore database
2. Created `firebase.json` - Configuration file for Firebase project
3. These rules allow:
   - Authenticated users to read their own user data
   - Anyone to read reviews (public display)
   - Authenticated users with verified purchases to create reviews
   - Users to update/delete their own reviews

## Deployment Steps

### Method 1: Firebase Console (Easiest - Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **radiantoptimizer**
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Copy the entire content from `firestore.rules` file
6. Paste it into the Firebase Console rules editor
7. Click **Publish** button
8. Wait for confirmation message

### Method 2: Firebase CLI (For Developers)

1. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Navigate to your project directory:
   ```bash
   cd radiantoptimizer
   ```

4. Initialize Firebase (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your project: radiantoptimizer
   - Accept the default firestore.rules file

5. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

6. Confirm deployment was successful

## Verify the Fix

After deploying the rules:

1. Open your website in a browser
2. Sign in with your paid account
3. Go to the Reviews page (`reviews.html`)
4. You should see the "Write a Review" button enabled
5. Click the button and fill out the review form
6. Submit the review - it should now work without permission errors

## Security Features Implemented

- ✅ Only authenticated users can access their own user data
- ✅ Reviews are publicly readable (for display on website)
- ✅ Only authenticated users can create reviews
- ✅ Reviews must include valid rating (1-5 stars)
- ✅ Review content must be 50-1000 characters
- ✅ Users can only update/delete their own reviews
- ✅ News articles are read-only for regular users

## Troubleshooting

### If reviews still don't work after deployment:

1. **Clear browser cache and cookies**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Firebase Console for errors**
   - Go to Firestore Database > Data tab
   - Try to create a test document manually to verify permissions

3. **Verify your account has a purchase/license**
   - Check the `users` collection in Firestore
   - Ensure your user document has either:
     - `licenses` array with at least one item, OR
     - `purchases` array with at least one item

4. **Check browser console for errors**
   - Open Developer Tools (F12)
   - Look for any Firebase permission errors
   - If you see "Missing or insufficient permissions", the rules may not have deployed correctly

5. **Verify you're signed in**
   - Make sure you're logged in with a paid account
   - Check that the profile button shows your username in the navbar

## Additional Notes

- These rules are designed for production use with proper security
- The rules validate all review submissions to prevent spam/abuse
- Users can only submit one review per account (checked in JavaScript)
- All reviews are marked as "Verified Purchaser" for authenticity

## Need Help?

If you continue to experience issues after deploying these rules, check:
- Firebase Console > Firestore > Usage tab for any quota limits
- Firebase Console > Authentication > Users to verify your account exists
- Browser console for detailed error messages
