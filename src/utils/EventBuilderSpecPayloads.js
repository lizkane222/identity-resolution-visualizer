/**
 * Segment API Spec Payloads for Event Builder
 * Based on Segment's official API documentation
 */

import { uuidv4 } from './uuid';

/**
 * Parse Segment analytics method calls and convert to proper JSON format
 * Supports: analytics.identify(), analytics.track(), analytics.page(), analytics.screen(), analytics.group(), analytics.alias()
 */
export function parseSegmentMethodCall(input, currentUser) {
  // Clean up the input - remove extra whitespace and newlines
  const cleanInput = input.trim();
  
  // Pattern to match analytics method calls with flexible parameter handling
  const methodPattern = /analytics\.(identify|track|page|screen|group|alias)\s*\(\s*(.*?)\s*\);?\s*$/s;
  const match = cleanInput.match(methodPattern);
  
  if (!match) {
    return null; // Not a valid analytics method call
  }
  
  const method = match[1].toLowerCase();
  const paramsString = match[2].trim();
  
  // Parse parameters based on method type
  let parsedParams = [];
  if (paramsString) {
    try {
      // For track method, we need to handle: event, properties, options, callback
      // For other methods, it's usually just one object parameter
      
      if (method === 'track') {
        parsedParams = parseTrackParameters(paramsString);
      } else if (method === 'page') {
        parsedParams = parsePageParameters(paramsString);
      } else if (method === 'group') {
        parsedParams = parseGroupParameters(paramsString);
      } else if (method === 'alias') {
        parsedParams = parseAliasParameters(paramsString);
      } else {
        // For non-track methods, try to parse as a single object
        if (paramsString.startsWith('{') && paramsString.endsWith('}')) {
          const cleanParams = paramsString
            .replace(/(\w+):/g, '"$1":') // Convert unquoted keys to quoted keys
            .replace(/'/g, '"') // Convert single quotes to double quotes
            .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
          
          parsedParams = [JSON.parse(cleanParams)];
        }
      }
    } catch (error) {
      console.warn('Failed to parse analytics method parameters:', error);
      return null;
    }
  }
  
  // Get user identification
  const userIds = getUserId(currentUser);
  
  // Build the Segment spec payload based on the method
  const basePayload = {
    type: method,
    timestamp: new Date().toISOString(),
    ...userIds
  };
  
  switch (method) {
    case 'identify':
      const identifyData = parsedParams[0] || getUserTraits(currentUser);
      return {
        ...basePayload,
        traits: identifyData,
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      };
      
    case 'track':
      const eventName = parsedParams[0] || 'Custom Event';
      const properties = parsedParams[1] || {};
      
      return {
        ...basePayload,
        event: eventName,
        properties,
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      };
      
    case 'page':
      // parsedParams: [category], [name], [properties], [options], [callback]
      // or [name], [properties] if category is omitted
      let pageName = 'Untitled Page';
      let pageCategory = undefined;
      let pageProperties = {};
      
      if (parsedParams.length >= 1) {
        const firstParam = parsedParams[0];
        const secondParam = parsedParams[1];
        const thirdParam = parsedParams[2];
        
        if (typeof firstParam === 'string') {
          if (typeof secondParam === 'string') {
            // format: analytics.page('category', 'name', properties)
            pageCategory = firstParam;
            pageName = secondParam;
            pageProperties = thirdParam || {};
          } else {
            // format: analytics.page('name', properties) or analytics.page('name')
            pageName = firstParam;
            pageProperties = secondParam || {};
          }
        } else if (typeof firstParam === 'object') {
          // format: analytics.page(properties)
          pageProperties = firstParam;
          pageName = pageProperties.name || 'Untitled Page';
          pageCategory = pageProperties.category;
        }
      }
      
      return {
        ...basePayload,
        name: pageName,
        category: pageCategory,
        properties: pageProperties,
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      };
      
    case 'screen':
      // Similar to page but for mobile screens
      let screenName = 'Untitled Screen';
      let screenCategory = undefined;
      let screenProperties = {};
      
      if (parsedParams.length >= 1) {
        const firstParam = parsedParams[0];
        const secondParam = parsedParams[1];
        const thirdParam = parsedParams[2];
        
        if (typeof firstParam === 'string') {
          if (typeof secondParam === 'string') {
            screenCategory = firstParam;
            screenName = secondParam;
            screenProperties = thirdParam || {};
          } else {
            screenName = firstParam;
            screenProperties = secondParam || {};
          }
        } else if (typeof firstParam === 'object') {
          screenProperties = firstParam;
          screenName = screenProperties.name || 'Untitled Screen';
          screenCategory = screenProperties.category;
        }
      }
      
      return {
        ...basePayload,
        name: screenName,
        category: screenCategory,
        properties: screenProperties,
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          app: {
            name: "Example Mobile App",
            version: "2.1.0",
            build: "1234"
          },
          device: {
            type: "mobile",
            manufacturer: "Apple",
            model: "iPhone 14"
          },
          os: {
            name: "iOS",
            version: "16.0"
          }
        }
      };
      
    case 'group':
      // parsedParams: groupId, [traits], [options], [callback]
      let groupId = 'group-123';
      let groupTraits = {};
      
      if (parsedParams.length >= 1) {
        const firstParam = parsedParams[0];
        const secondParam = parsedParams[1];
        
        if (typeof firstParam === 'string') {
          groupId = firstParam;
          groupTraits = secondParam || {};
        } else if (typeof firstParam === 'object') {
          // If first param is object, treat it as traits and use default groupId
          groupTraits = firstParam;
          groupId = firstParam.groupId || 'group-123';
        }
      }
      
      return {
        ...basePayload,
        groupId: groupId,
        traits: groupTraits,
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      };
      
    case 'alias':
      // parsedParams: userId, [previousId], [options], [callback]
      const aliasPayload = {
        ...basePayload,
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
      };
      
      // Remove userId and anonymousId from base payload for alias
      delete aliasPayload.userId;
      delete aliasPayload.anonymousId;
      
      if (parsedParams.length >= 1) {
        const newUserId = parsedParams[0];
        const previousId = parsedParams[1];
        
        if (newUserId) {
          aliasPayload.userId = newUserId;
        }
        
        if (previousId) {
          aliasPayload.previousId = previousId;
        } else {
          // If no previousId provided, use current user's anonymousId if available
          const toggles = currentUser?._toggles || { userId: true, anonymousId: true };
          if (toggles.anonymousId && currentUser?.anonymousId) {
            aliasPayload.previousId = currentUser.anonymousId;
          }
        }
      } else {
        // No parameters provided - create a template for user to fill in
        aliasPayload.userId = ""; // Empty for user to fill
        aliasPayload.previousId = ""; // Empty for user to fill
        
        // Add a comment in the JSON to guide the user
        aliasPayload._instructions = "Fill in userId (new identity) and previousId (current identity from CurrentUser or custom value)";
      }
      
      return aliasPayload;
      
    default:
      return null;
  }
}

// Helper function to parse track method parameters
function parseTrackParameters(paramsString) {
  // Track method can have: event, properties, options, callback
  // We need to carefully parse these parameters
  
  const params = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;
  let quoteChar = '';
  let i = 0;
  
  while (i < paramsString.length) {
    const char = paramsString[i];
    // const nextChar = paramsString[i + 1]; // Reserved for future use
    
    if (!inQuotes) {
      if (char === '"' || char === "'") {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === '{' || char === '[') {
        depth++;
        current += char;
      } else if (char === '}' || char === ']') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        // Found a parameter separator
        const param = current.trim();
        if (param) {
          params.push(parseParameter(param));
        }
        current = '';
        i++;
        continue;
      } else {
        current += char;
      }
    } else {
      current += char;
      if (char === quoteChar && paramsString[i - 1] !== '\\') {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    i++;
  }
  
  // Don't forget the last parameter
  const param = current.trim();
  if (param) {
    params.push(parseParameter(param));
  }
  
  return params;
}

// Helper function to parse individual parameters
function parseParameter(param) {
  param = param.trim();
  
  // Remove surrounding quotes if it's a string
  if ((param.startsWith('"') && param.endsWith('"')) || 
      (param.startsWith("'") && param.endsWith("'"))) {
    return param.slice(1, -1);
  }
  
  // Try to parse as object/array
  if ((param.startsWith('{') && param.endsWith('}')) || 
      (param.startsWith('[') && param.endsWith(']'))) {
    try {
      const cleanParam = param
        .replace(/(\w+):/g, '"$1":') // Convert unquoted keys to quoted keys
        .replace(/'/g, '"') // Convert single quotes to double quotes
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
      
      return JSON.parse(cleanParam);
    } catch (error) {
      console.warn('Failed to parse parameter as JSON:', param, error);
      return param;
    }
  }
  
  // Return as-is if it's not a recognizable format
  return param;
}

// Helper function to parse page method parameters
// analytics.page([category], [name], [properties], [options], [callback]);
function parsePageParameters(paramsString) {
  const params = parseTrackParameters(paramsString); // Reuse the track parameter parser
  return params;
}

// Helper function to parse group method parameters  
// analytics.group(groupId, [traits], [options], [callback]);
function parseGroupParameters(paramsString) {
  const params = parseTrackParameters(paramsString); // Reuse the track parameter parser
  return params;
}

// Helper function to parse alias method parameters
// analytics.alias(userId, [previousId], [options], [callback]);
function parseAliasParameters(paramsString) {
  const params = parseTrackParameters(paramsString); // Reuse the track parameter parser
  return params;
}

// Get or generate a persistent userId for this browser
function getOrPersistUserId() {
  let userId = null;
  try {
    userId = localStorage.getItem('eventBuilderUserId');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('eventBuilderUserId', userId);
    }
  } catch (e) {
    // Fallback if localStorage is unavailable
    userId = uuidv4();
  }
  return userId;
}

// Helper function to generate dynamic user identification
const getUserId = (currentUser) => {
  // Get toggle states from currentUser (if available)
  const toggles = currentUser?._toggles || { userId: true, anonymousId: true };
  
  const ids = {};
  
  // Include userId if toggle is enabled and value exists
  if (toggles.userId && currentUser?.userId && currentUser.userId.trim()) {
    ids.userId = currentUser.userId.trim();
  }
  
  // Include anonymousId if toggle is enabled and value exists
  if (toggles.anonymousId && currentUser?.anonymousId && currentUser.anonymousId.trim()) {
    ids.anonymousId = currentUser.anonymousId.trim();
  }
  
  // If no IDs were added but both toggles are enabled, provide default userId
  if (Object.keys(ids).length === 0 && toggles.userId && toggles.anonymousId) {
    ids.userId = getOrPersistUserId();
  }
  
  return ids;
};

// Helper function to get user traits from current user
const getUserTraits = (currentUser) => {
  const traits = {};
  
  if (currentUser?.firstName) traits.firstName = currentUser.firstName;
  if (currentUser?.lastName) traits.lastName = currentUser.lastName;
  if (currentUser?.email) traits.email = currentUser.email;
  
  // Add any custom fields
  if (currentUser) {
    Object.keys(currentUser).forEach(key => {
      if (!['userId', 'anonymousId', 'firstName', 'lastName', 'email', '_toggles'].includes(key)) {
        traits[key] = currentUser[key];
      }
    });
  }
  
  // Fallback defaults if no user data
  return Object.keys(traits).length > 0 ? traits : {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    age: 28,
    city: "San Francisco",
    state: "CA",
    country: "USA",
    plan: "premium"
  };
};

export const CORE_EVENTS = {
  track: {
    name: "Track",
    description: "The Track call is how you record any actions your users perform, along with any properties that describe the action.",
    payload: (currentUser) => {
      const ids = getUserId(currentUser);
      const payload = {
        userId: ids.userId || undefined,
        anonymousId: ids.anonymousId || undefined,
        type: "track",
        event: "Product Purchased",
        properties: {
          product_id: "prod-123",
          name: "Premium Headphones",
          category: "Electronics",
          price: 199.99,
          currency: "USD",
          quantity: 1,
          discount: 10.00
        },
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        },
        timestamp: new Date().toISOString()
      };
      // Remove undefined fields
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      return payload;
    }
  },

  identify: {
    name: "Identify",
    description: "The Identify call lets you tie a user to their actions and record traits about them. It includes a unique User ID and any optional traits you know about the user.",
    payload: (currentUser) => {
      const ids = getUserId(currentUser);
      const payload = {
        userId: ids.userId || undefined,
        anonymousId: ids.anonymousId || undefined,
        type: "identify",
        traits: getUserTraits(currentUser),
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        },
        timestamp: new Date().toISOString()
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      return payload;
    }
  },
  
  page: {
    name: "Page",
    description: "The Page call lets you record whenever a user sees a page of your website, along with any optional properties about the page.",
    payload: (currentUser) => ({
      "type": "page",
      ...getUserId(currentUser),
      "name": "Product Details",
      "category": "E-commerce",
      "properties": {
        "title": "Premium Headphones - Best Audio Experience",
        "url": "https://example.com/products/premium-headphones",
        "path": "/products/premium-headphones",
        "referrer": "https://google.com",
        "search": "?category=electronics"
      },
      "context": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      },
      "timestamp": new Date().toISOString()
    })
  },
  
  screen: {
    name: "Screen",
    description: "The Screen call lets you record whenever a user sees a screen, the mobile equivalent of Page, in your mobile app, along with any properties about the screen.",
    payload: (currentUser) => ({
      "type": "screen",
      ...getUserId(currentUser),
      "name": "Product Details",
      "category": "E-commerce",
      "properties": {
        "productId": "prod-789",
        "productName": "Premium Headphones",
        "category": "Electronics",
        "price": 199.99,
        "currency": "USD"
      },
      "context": {
        "ip": "192.168.1.1",
        "app": {
          "name": "Example Mobile App",
          "version": "2.1.0",
          "build": "1234"
        },
        "device": {
          "type": "mobile",
          "manufacturer": "Apple",
          "model": "iPhone 14"
        },
        "os": {
          "name": "iOS",
          "version": "16.0"
        }
      },
      "timestamp": new Date().toISOString()
    })
  },

  group: {
    name: "Group",
    description: "The Group call lets you associate an individual user with a group. A group could be a company, organization, account, project, or team.",
    payload: (currentUser) => ({
      "type": "group",
      ...getUserId(currentUser),
      "groupId": "company-456",
      "traits": {
        "name": "Acme Corp",
        "industry": "Technology",
        "employees": 500,
        "plan": "enterprise",
        "website": "https://acme.com"
      },
      "context": {
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      },
      "timestamp": new Date().toISOString()
    })
  },

  alias: {
    name: "Alias",
    description: "The Alias call lets you merge two user identities, effectively connecting two sets of user data as one.",
    requiresInput: true, // Flag to indicate this event needs user input
    payload: (currentUser) => {
      // Return a template payload that requires user input
      const aliasPayload = {
        "type": "alias",
        "userId": "", // Empty - user must provide
        "previousId": "", // Empty - user must provide
        "context": {
          "ip": "192.168.1.1",
          "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        },
        "timestamp": new Date().toISOString(),
        "_instructions": "Please provide userId (new identity) and previousId (current/previous identity to merge)"
      };
      
      return aliasPayload;
    }
  }
};

export const PRODUCT_EVENTS = {
  "Product Viewed": {
    name: "Product Viewed",
    description: "User viewed a product page or product details",
    payload: (currentUser) => {
      const ids = getUserId(currentUser);
      const payload = {
        userId: ids.userId || undefined,
        anonymousId: ids.anonymousId || undefined,
        type: "track",
        event: "Product Viewed",
        properties: {
          product_id: "507f1f77bcf86cd799439011",
          sku: "G-32",
          category: "Games",
          name: "Monopoly: 3rd Edition",
          brand: "Hasbro",
          variant: "200 pieces",
          price: 18.99,
          quantity: 1,
          coupon: "MAYDEALS",
          currency: "usd",
          position: 3,
          value: 18.99,
          url: "https://www.example.com/product/path",
          image_url: "https://www.example.com/product/path.jpg"
        },
        context: {
          ip: "192.168.1.1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        },
        timestamp: new Date().toISOString()
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      return payload;
    }
  },

  "Product Added": {
    name: "Product Added",
    description: "User added a product to their shopping cart",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Added",
      "properties": {
        "cart_id": "cart-789",
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "name": "Premium Headphones",
        "category": "Electronics",
        "brand": "AudioTech",
        "variant": "Black",
        "price": 199.99,
        "currency": "USD",
        "quantity": 1,
        "coupon": "SUMMER25",
        "position": 1,
        "url": "https://example.com/products/premium-headphones",
        "image_url": "https://example.com/images/premium-headphones.jpg"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product Removed": {
    name: "Product Removed",
    description: "User removed a product from their shopping cart",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Removed",
      "properties": {
        "cart_id": "cart-789",
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "name": "Premium Headphones",
        "category": "Electronics",
        "brand": "AudioTech",
        "price": 199.99,
        "currency": "USD",
        "quantity": 1
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Cart Viewed": {
    name: "Cart Viewed",
    description: "User viewed their shopping cart",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Cart Viewed",
      "properties": {
        "cart_id": "cart-789",
        "products": [
          {
            "product_id": "prod-123",
            "sku": "SKU-12345",
            "name": "Premium Headphones",
            "category": "Electronics",
            "price": 199.99,
            "quantity": 1
          },
          {
            "product_id": "prod-456",
            "sku": "SKU-67890",
            "name": "Wireless Mouse",
            "category": "Electronics",
            "price": 49.99,
            "quantity": 2
          }
        ],
        "cart_total": 299.97,
        "currency": "USD"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product List Viewed": {
    name: "Product List Viewed",
    description: "User viewed a product list or category page",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product List Viewed",
      "properties": {
        "list_id": "electronics-category",
        "category": "Electronics",
        "products": [
          {
            "product_id": "prod-123",
            "name": "Premium Headphones",
            "category": "Electronics",
            "price": 199.99,
            "position": 1
          },
          {
            "product_id": "prod-456",
            "name": "Wireless Mouse",
            "category": "Electronics",
            "price": 49.99,
            "position": 2
          }
        ]
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product Clicked": {
    name: "Product Clicked",
    description: "User clicked on a product in a list",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Clicked",
      "properties": {
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "name": "Premium Headphones",
        "category": "Electronics",
        "brand": "AudioTech",
        "variant": "Black",
        "price": 199.99,
        "currency": "USD",
        "quantity": 1,
        "coupon": "SUMMER25",
        "position": 1,
        "list_id": "electronics-category",
        "url": "https://example.com/products/premium-headphones",
        "image_url": "https://example.com/images/premium-headphones.jpg"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product Shared": {
    name: "Product Shared",
    description: "User shared a product via social media or messaging",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Shared",
      "properties": {
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "name": "Premium Headphones",
        "category": "Electronics",
        "brand": "AudioTech",
        "variant": "Black",
        "price": 199.99,
        "currency": "USD",
        "share_via": "facebook",
        "share_message": "Check out these amazing headphones!",
        "recipient": "friend@example.com",
        "url": "https://example.com/products/premium-headphones",
        "image_url": "https://example.com/images/premium-headphones.jpg"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Wishlist Product Added": {
    name: "Wishlist Product Added",
    description: "User added a product to their wishlist",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Wishlist Product Added",
      "properties": {
        "wishlist_id": "wishlist-123",
        "product_id": "prod-123",
        "name": "Premium Headphones",
        "category": "Electronics",
        "brand": "AudioTech",
        "price": 199.99,
        "currency": "USD"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Wishlist Product Removed": {
    name: "Wishlist Product Removed",
    description: "User removed a product from their wishlist",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Wishlist Product Removed",
      "properties": {
        "wishlist_id": "wishlist-123",
        "product_id": "prod-123",
        "name": "Premium Headphones",
        "category": "Electronics",
        "brand": "AudioTech",
        "price": 199.99,
        "currency": "USD"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Cart Abandoned": {
    name: "Cart Abandoned",
    description: "User left the site with items in their cart",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Cart Abandoned",
      "properties": {
        "cart_id": "cart-789",
        "products": [
          {
            "product_id": "prod-123",
            "name": "Premium Headphones",
            "category": "Electronics",
            "price": 199.99,
            "quantity": 1
          },
          {
            "product_id": "prod-456",
            "name": "Wireless Mouse",
            "category": "Electronics",
            "price": 49.99,
            "quantity": 2
          }
        ],
        "cart_total": 399.97,
        "currency": "USD"
      },
      "timestamp": new Date().toISOString()
    })
  },
  
  "Checkout Started": {
    name: "Checkout Started",
    description: "User initiated the order process (a transaction is created)",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Checkout Started",
      "properties": {
        "order_id": "order-789",
        "checkout_id": "checkout-123",
        "affiliation": "Online Store",
        "value": 399.97,
        "revenue": 379.97,
        "shipping": 15.00,
        "tax": 25.00,
        "discount": 20.00,
        "coupon": "SUMMER25",
        "currency": "USD",
        "products": [
          {
            "product_id": "prod-123",
            "sku": "SKU-12345",
            "name": "Premium Headphones",
            "category": "Electronics",
            "brand": "AudioTech",
            "variant": "Black",
            "price": 199.99,
            "quantity": 1,
            "position": 1,
            "url": "https://example.com/products/premium-headphones",
            "image_url": "https://example.com/images/premium-headphones.jpg"
          },
          {
            "product_id": "prod-456",
            "sku": "SKU-67890",
            "name": "Wireless Mouse",
            "category": "Electronics",
            "brand": "TechCorp",
            "variant": "Silver",
            "price": 49.99,
            "quantity": 2,
            "position": 2,
            "url": "https://example.com/products/wireless-mouse",
            "image_url": "https://example.com/images/wireless-mouse.jpg"
          }
        ]
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Order Completed": {
    name: "Order Completed",
    description: "User completed the purchase and transaction was successful",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Order Completed",
      "properties": {
        "checkout_id": "checkout-123",
        "order_id": "order-789",
        "affiliation": "Online Store",
        "subtotal": 249.98,
        "total": 289.98,
        "revenue": 249.98,
        "shipping": 15.00,
        "tax": 25.00,
        "discount": 20.00,
        "coupon": "SUMMER25",
        "currency": "USD",
        "products": [
          {
            "product_id": "prod-123",
            "sku": "SKU-12345",
            "name": "Premium Headphones",
            "category": "Electronics",
            "brand": "AudioTech",
            "variant": "Black",
            "price": 199.99,
            "quantity": 1,
            "coupon": "SUMMER25",
            "position": 1,
            "url": "https://example.com/products/premium-headphones",
            "image_url": "https://example.com/images/premium-headphones.jpg"
          }
        ]
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Order Updated": {
    name: "Order Updated",
    description: "User modified details of an existing order",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Order Updated",
      "properties": {
        "order_id": "order-789",
        "affiliation": "Online Store",
        "total": 274.98,
        "revenue": 249.98,
        "shipping": 15.00,
        "tax": 25.00,
        "discount": 15.00,
        "coupon": "UPDATED25",
        "currency": "USD",
        "products": [
          {
            "product_id": "prod-123",
            "sku": "SKU-12345",
            "name": "Premium Headphones",
            "category": "Electronics",
            "brand": "AudioTech",
            "variant": "Black",
            "price": 199.99,
            "quantity": 1,
            "coupon": "UPDATED25",
            "position": 1,
            "url": "https://example.com/products/premium-headphones",
            "image_url": "https://example.com/images/premium-headphones.jpg"
          }
        ]
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Order Cancelled": {
    name: "Order Cancelled",
    description: "User cancelled their order",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Order Cancelled",
      "properties": {
        "order_id": "order-789",
        "total": 399.97,
        "currency": "USD",
        "reason": "Changed mind"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Order Refunded": {
    name: "Order Refunded",
    description: "User received a refund for their order",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Order Refunded",
      "properties": {
        "order_id": "order-789",
        "total": 399.97,
        "currency": "USD",
        "reason": "Product defect"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Coupon Entered": {
    name: "Coupon Entered",
    description: "User entered a coupon code",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Coupon Entered",
      "properties": {
        "order_id": "order-789",
        "cart_id": "cart-789",
        "coupon_id": "SAVE20",
        "coupon_name": "20% Off Electronics",
        "discount": 79.99
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Coupon Applied": {
    name: "Coupon Applied",
    description: "Coupon was successfully applied to the order",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Coupon Applied",
      "properties": {
        "order_id": "order-789",
        "cart_id": "cart-789",
        "coupon_id": "SAVE20",
        "coupon_name": "20% Off Electronics",
        "discount": 79.99
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Coupon Denied": {
    name: "Coupon Denied",
    description: "Coupon was rejected or invalid",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Coupon Denied",
      "properties": {
        "order_id": "order-789",
        "cart_id": "cart-789",
        "coupon": "EXPIRED20",
        "reason": "Coupon has expired"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Coupon Removed": {
    name: "Coupon Removed",
    description: "User removed a coupon from their order",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Coupon Removed",
      "properties": {
        "order_id": "order-789",
        "cart_id": "cart-789",
        "coupon_id": "SAVE20",
        "coupon_name": "20% Off Electronics",
        "discount": 79.99
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product Reviewed": {
    name: "Product Reviewed",
    description: "User wrote a review for a product",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Reviewed",
      "properties": {
        "product_id": "prod-789",
        "name": "Premium Headphones",
        "review_id": "review-456",
        "rating": 5,
        "review_body": "Amazing sound quality and comfortable to wear for hours!"
      },
      "timestamp": new Date().toISOString()
    })
  }
};

export const BROWSING_EVENTS = {
  "Products Searched": {
    name: "Products Searched",
    description: "User searched for products",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Products Searched",
      "properties": {
        "query": "wireless headphones"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product List Filtered": {
    name: "Product List Filtered",
    description: "User filtered a product list or category",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product List Filtered",
      "properties": {
        "list_id": "electronics-category",
        "category": "Electronics",
        "filters": [
          {
            "type": "price",
            "value": "under-$100"
          },
          {
            "type": "brand",
            "value": "AudioTech"
          }
        ],
        "sorts": [
          {
            "type": "price",
            "value": "desc"
          }
        ],
        "products": [
          {
            "product_id": "prod-123",
            "sku": "SKU-12345",
            "name": "Premium Headphones",
            "category": "Electronics",
            "price": 199.99,
            "position": 1,
            "url": "https://example.com/products/premium-headphones",
            "image_url": "https://example.com/images/premium-headphones.jpg"
          }
        ]
      },
      "timestamp": new Date().toISOString()
    })
  }
};

export const PROMOTION_EVENTS = {
  "Promotion Viewed": {
    name: "Promotion Viewed",
    description: "User viewed a promotion",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Promotion Viewed",
      "properties": {
        "promotion_id": "promo-summer-2025",
        "creative": "summer_banner_top",
        "name": "Summer Sale - 50% Off Electronics",
        "position": "home_banner_top"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Promotion Clicked": {
    name: "Promotion Clicked",
    description: "User clicked on a promotion",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Promotion Clicked",
      "properties": {
        "promotion_id": "promo-summer-2025",
        "creative": "summer_banner_top",
        "name": "Summer Sale - 50% Off Electronics",
        "position": "home_banner_top"
      },
      "timestamp": new Date().toISOString()
    })
  }
};

export const CHECKOUT_EVENTS = {
  "Checkout Step Viewed": {
    name: "Checkout Step Viewed",
    description: "User viewed a checkout step",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Checkout Step Viewed",
      "properties": {
        "checkout_id": "checkout-123",
        "step": 2,
        "shipping_method": "FedEx Ground",
        "payment_method": "Visa"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Checkout Step Completed": {
    name: "Checkout Step Completed",
    description: "User completed a checkout step",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Checkout Step Completed",
      "properties": {
        "checkout_id": "checkout-123",
        "step": 2,
        "shipping_method": "FedEx Ground",
        "payment_method": "Visa"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Payment Info Entered": {
    name: "Payment Info Entered",
    description: "User entered payment information",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Payment Info Entered",
      "properties": {
        "checkout_id": "checkout-123",
        "order_id": "order-789",
        "step": 3,
        "shipping_method": "FedEx Ground",
        "payment_method": "Visa"
      },
      "timestamp": new Date().toISOString()
    })
  }
};

export const WISHLIST_EVENTS = {
  "Product Added to Wishlist": {
    name: "Product Added to Wishlist",
    description: "User added a product to their wishlist",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Added to Wishlist",
      "properties": {
        "wishlist_id": "wishlist-123",
        "wishlist_name": "Electronics Wishlist",
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "category": "Electronics",
        "name": "Premium Headphones",
        "brand": "AudioTech",
        "variant": "Black",
        "price": 199.99,
        "quantity": 1,
        "coupon": "SUMMER25",
        "position": 1,
        "url": "https://example.com/products/premium-headphones",
        "image_url": "https://example.com/images/premium-headphones.jpg"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Product Removed from Wishlist": {
    name: "Product Removed from Wishlist",
    description: "User removed a product from their wishlist",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Product Removed from Wishlist",
      "properties": {
        "wishlist_id": "wishlist-123",
        "wishlist_name": "Electronics Wishlist",
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "category": "Electronics",
        "name": "Premium Headphones",
        "brand": "AudioTech",
        "variant": "Black",
        "price": 199.99,
        "quantity": 1,
        "coupon": "SUMMER25",
        "position": 1,
        "url": "https://example.com/products/premium-headphones",
        "image_url": "https://example.com/images/premium-headphones.jpg"
      },
      "timestamp": new Date().toISOString()
    })
  },

  "Wishlist Product Added to Cart": {
    name: "Wishlist Product Added to Cart",
    description: "User moved a product from their wishlist to their cart",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Wishlist Product Added to Cart",
      "properties": {
        "wishlist_id": "wishlist-123",
        "wishlist_name": "Electronics Wishlist",
        "cart_id": "cart-789",
        "product_id": "prod-123",
        "sku": "SKU-12345",
        "category": "Electronics",
        "name": "Premium Headphones",
        "brand": "AudioTech",
        "variant": "Black",
        "price": 199.99,
        "quantity": 1,
        "coupon": "SUMMER25",
        "position": 1,
        "url": "https://example.com/products/premium-headphones",
        "image_url": "https://example.com/images/premium-headphones.jpg"
      },
      "timestamp": new Date().toISOString()
    })
  }
};

export const SHARING_EVENTS = {
  "Cart Shared": {
    name: "Cart Shared",
    description: "User shared their shopping cart",
    payload: (currentUser) => ({
      "type": "track",
      ...getUserId(currentUser),
      "event": "Cart Shared",
      "properties": {
        "share_via": "email",
        "share_message": "Check out my cart!",
        "recipient": "friend@example.com",
        "cart_id": "cart-789",
        "products": [
          {
            "product_id": "prod-123"
          },
          {
            "product_id": "prod-456"
          }
        ]
      },
      "timestamp": new Date().toISOString()
    })
  }
};
