/**
 * Phone number validation and normalization utilities
 */

/**
 * Validates and normalizes a phone number to E.164 format (+1XXXXXXXXXX)
 * Accepts various formats:
 * - (+1) 843-555-5555
 * - 8435555555
 * - 843-555-5555
 * - (843) 555-5555
 * - 1-843-555-5555
 * 
 * @param {string} phoneNumber - The phone number to validate
 * @returns {object} - { isValid: boolean, normalized: string|null, error: string|null }
 */
export function validateAndNormalizePhone(phoneNumber) {
  if (!phoneNumber) {
    return { isValid: false, normalized: null, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // Check if it's 10 digits (without country code) or 11 digits (with country code 1)
  if (digitsOnly.length === 10) {
    // Add country code for US
    return {
      isValid: true,
      normalized: `+1${digitsOnly}`,
      error: null
    };
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // Has country code already
    return {
      isValid: true,
      normalized: `+${digitsOnly}`,
      error: null
    };
  } else {
    return {
      isValid: false,
      normalized: null,
      error: 'Please enter a valid 10-digit US phone number'
    };
  }
}

/**
 * Formats a phone number for display
 * @param {string} phoneNumber - The normalized phone number (+1XXXXXXXXXX)
 * @returns {string} - Formatted as (XXX) XXX-XXXX
 */
export function formatPhoneForDisplay(phoneNumber) {
  if (!phoneNumber) return '';
  
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Remove country code if present
  const localNumber = digitsOnly.startsWith('1') && digitsOnly.length === 11
    ? digitsOnly.slice(1)
    : digitsOnly;
  
  if (localNumber.length === 10) {
    return `(${localNumber.slice(0, 3)}) ${localNumber.slice(3, 6)}-${localNumber.slice(6)}`;
  }
  
  return phoneNumber;
}
