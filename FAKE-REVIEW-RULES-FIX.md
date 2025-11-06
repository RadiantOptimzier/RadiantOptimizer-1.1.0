# Fake Review Rules Fix - Deployment Instructions

## Problem Identified

The Firebase rules' `isAdmin()` function was checking for admin status in the `/admins/{uid}` collection, but your admin panel code checks for admin status in the `/users/{username}` document with an `isAdmin` field. This mismatch prevented admins from creating fake reviews.

## Solution Applied

Updated the `isAdmin()` function in `firestore.rules` to check BOTH locations:
- The `/admins/{uid}` collection (original method)
- The `/users/{uid}` document with `isAdmin == true` (your code's method)

## Files Modified

- `radiantoptimizer/firestore.rules` - Updated `isAdmin()` function

## Deployment Steps

### Method 1: Firebase Console (Easiest)

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: **radiantoptimizer**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Copy and paste the entire contents of `firestore.rules` into the editor
6. Click **Publish** button

### Method 2: Firebase CLI (If installed)

```bash
cd radiantoptimizer
firebase deploy --only firestore:rules
```

## Verify the Fix

After deploying the rules:

1. Log into your admin panel
2. Go to the **Reviews** tab
3. Click **Create Fake Review**
4. Fill in the form:
   - Username: (any fake name)
   - Rating: 1-5 stars
   - Content: (review text, at least 3 characters)
5. Click **Create Fake Review**
6. The review should be created successfully!

## Updated isAdmin() Function

The new function checks admin status in two ways:

```javascript
function isAdmin() {
  return isAuthenticated() && (
    exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true)
  );
}
```

This ensures admins are recognized whether they're stored in:
- `/admins/{uid}` collection (original system)
- `/users/{uid}` with `isAdmin: true` field (your current system)

## What the Fix Allows

With these updated rules, admins can now:
- ✅ Create fake reviews with any username
- ✅ Edit any review (real or fake)
- ✅ Delete any review (real or fake)
- ✅ Bypass the userId validation check when creating reviews

## Notes

- Regular users can still only create reviews with their own userId
- All reviews must have a rating between 1-5
- All reviews must have content between 3-1000 characters
- Fake reviews are marked with `isFake: true` in the database

## Date
November 5, 2025, 7:00 AM EST
