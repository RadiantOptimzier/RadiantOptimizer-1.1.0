/**
 * Cloudflare Worker for EmailOctopus Newsletter Integration
 * 
 * This worker handles automatic newsletter subscriptions when users sign up.
 * Deploy this as a Cloudflare Worker and set the route to match /api/newsletter
 * 
 * Required Environment Variables:
 * - EMAILOCTOPUS_API_KEY: Your EmailOctopus API key
 * - EMAILOCTOPUS_LIST_ID: Your EmailOctopus list ID
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { email, firstName, lastName } = body;

    // Validate required fields
    if (!email) {
      return jsonResponse({ error: 'Email is required' }, 400);
    }

    // Get environment variables
    const apiKey = EMAILOCTOPUS_API_KEY;
    const listId = EMAILOCTOPUS_LIST_ID;

    if (!apiKey || !listId) {
      console.error('Missing EmailOctopus configuration');
      return jsonResponse({ error: 'Newsletter service not configured' }, 500);
    }

    // Subscribe to EmailOctopus
    const emailOctopusUrl = `https://emailoctopus.com/api/1.6/lists/${listId}/contacts`;
    
    const subscribeData = {
      api_key: apiKey,
      email_address: email,
      fields: {
        FirstName: firstName || '',
        LastName: lastName || ''
      },
      status: 'SUBSCRIBED'
    };

    const response = await fetch(emailOctopusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscribeData)
    });

    const result = await response.json();

    if (!response.ok) {
      // Check if already subscribed
      if (result.error && result.error.code === 'MEMBER_EXISTS_WITH_EMAIL_ADDRESS') {
        console.log(`Email already subscribed: ${email}`);
        return jsonResponse({ 
          success: true, 
          message: 'Already subscribed',
          alreadySubscribed: true 
        }, 200);
      }

      console.error('EmailOctopus error:', result);
      return jsonResponse({ 
        error: 'Failed to subscribe to newsletter',
        details: result.error?.message || 'Unknown error'
      }, 400);
    }

    console.log(`Successfully subscribed: ${email}`);
    return jsonResponse({ 
      success: true,
      message: 'Successfully subscribed to newsletter',
      contactId: result.id
    }, 200);

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      details: error.message 
    }, 500);
  }
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
