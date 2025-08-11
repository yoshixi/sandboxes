export interface SlackVerificationResult {
  isValid: boolean;
  error?: string;
}

export async function verifySlackRequest(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): Promise<SlackVerificationResult> {
  try {
    // Check if timestamp is too old (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    
    if (Math.abs(currentTime - requestTime) > 300) { // 5 minutes
      return { isValid: false, error: 'Request timestamp is too old' };
    }

    // Create the signature basestring
    const basestring = `v0:${timestamp}:${body}`;
    
    // Create HMAC-SHA256 hash using Web Crypto API
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature_bytes = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(basestring)
    );
    
    const signature_hex = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const computedSignature = `v0=${signature_hex}`;
    
    // Compare signatures using constant-time comparison
    const isValid = computedSignature === signature;
    
    return { 
      isValid, 
      error: isValid ? undefined : 'Signature verification failed' 
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export function extractSlackHeaders(headers: Headers | Record<string, string>): {
  timestamp: string | null;
  signature: string | null;
} {
  if (headers instanceof Headers) {
    return {
      timestamp: headers.get('x-slack-request-timestamp'),
      signature: headers.get('x-slack-signature'),
    };
  } else {
    return {
      timestamp: headers['x-slack-request-timestamp'] || null,
      signature: headers['x-slack-signature'] || null,
    };
  }
}