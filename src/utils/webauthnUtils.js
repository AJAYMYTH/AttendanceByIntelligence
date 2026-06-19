/**
 * WebAuthn Utility Functions
 * Handles conversion between Buffer and Base64URL for WebAuthn compatibility.
 */

// Simple base64url functions for Node.js using native support
const toBase64URL = (buffer) => {
    return buffer.toString('base64url');
};

const fromBase64URL = (base64url) => {
    return Buffer.from(base64url, 'base64url');
};

module.exports = {
    toBase64URL,
    fromBase64URL
};
