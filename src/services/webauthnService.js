const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const supabase = require('../utils/supabase');
const { toBase64URL, fromBase64URL } = require('../utils/webauthnUtils');

// Configuration
const RP_NAME = 'Attendance By Intelligence';
const RP_ID = 'localhost'; // Should be your domain in production
const EXPECTED_ORIGIN = ['http://localhost:5000', 'https://localhost:5000'];

/**
 * Service to handle WebAuthn logic
 */
class WebAuthnService {
    /**
     * Generate registration options for a user
     */
    async generateRegistrationOptions(user) {
        // Get existing credentials to exclude them
        const { data: credentials } = await supabase
            .from('webauthn_credentials')
            .select('credential_id')
            .eq('user_id', user.id);

        const excludeCredentials = credentials ? credentials.map(cred => ({
            id: cred.credential_id, // SimpleWebAuthn expects base64url string for id in options
            type: 'public-key',
            transports: ['internal', 'usb', 'nfc', 'ble'],
        })) : [];

        try {
            const options = await generateRegistrationOptions({
                rpName: RP_NAME,
                rpID: RP_ID,
                userID: Buffer.from(user.id),
                userName: user.username,
                attestationType: 'none',
                excludeCredentials,
                authenticatorSelection: {
                    residentKey: 'preferred',
                    userVerification: 'preferred',
                    authenticatorAttachment: 'platform', // Prefer device-bound (biometrics)
                },
            });
            return options;
        } catch (err) {
            console.error('[WebAuthnService] generateRegistrationOptions error:', err);
            throw err;
        }
    }

    /**
     * Verify registration response
     */
    async verifyRegistration(user, body, expectedChallenge) {
        console.log('[WebAuthnService] Starting verification for user:', user.id);
        
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: EXPECTED_ORIGIN,
            expectedRPID: RP_ID,
        });

        console.log('[WebAuthnService] Verification verified:', verification.verified);
        
        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;
            
            // In SimpleWebAuthn v10+, registrationInfo.credential.id is already a base64url string
            // registrationInfo.credential.publicKey is a Uint8Array (Buffer)
            const credentialID = credential ? credential.id : null;
            const credentialPublicKey = credential ? credential.publicKey : null;
            const counter = (credential && typeof credential.counter === 'number') ? credential.counter : 0;

            console.log('[WebAuthnService] Extracted Data:', {
                hasID: !!credentialID,
                idType: typeof credentialID,
                hasPublicKey: !!credentialPublicKey,
                pkType: typeof credentialPublicKey,
                counter: counter
            });

            if (!credentialID || !credentialPublicKey) {
                throw new Error(`Registration info incomplete. ID or Public Key missing.`);
            }

            // Store the new credential
            const { error } = await supabase
                .from('webauthn_credentials')
                .insert([{
                    user_id: user.id,
                    credential_id: credentialID, // Store directly as string
                    public_key: toBase64URL(Buffer.from(credentialPublicKey)), // Store as string
                    counter: counter,
                    device_name: body.deviceName || 'New Device'
                }]);

            if (error) {
                console.error('[WebAuthnService] Supabase insert error:', error);
                throw error;
            }
        }

        return verification;
    }

    /**
     * Generate authentication options
     */
    async generateAuthenticationOptions(user) {
        try {
            console.log('[WebAuthnService] Generating auth options for user:', user.id);
            const { data: credentials, error: dbError } = await supabase
                .from('webauthn_credentials')
                .select('credential_id')
                .eq('user_id', user.id);

            if (dbError) {
                console.error('[WebAuthnService] Supabase query error:', dbError);
                throw dbError;
            }

            if (!credentials || credentials.length === 0) {
                console.warn('[WebAuthnService] No credentials found for user:', user.id);
                throw new Error('No passkeys registered for this user');
            }

            // In this version of @simplewebauthn/server, allowCredentials.id MUST be a base64url string
            const allowCredentials = credentials.map(cred => ({
                id: cred.credential_id,
                type: 'public-key',
                transports: ['internal', 'usb', 'nfc', 'ble'],
            }));

            console.log('[WebAuthnService] Passing credential IDs as strings:', allowCredentials.map(c => c.id));

            const options = await generateAuthenticationOptions({
                rpID: RP_ID,
                allowCredentials,
                userVerification: 'preferred',
            });

            return options;
        } catch (err) {
            console.error('[WebAuthnService] generateAuthenticationOptions error:', err);
            throw err;
        }
    }

    /**
     * Verify authentication response
     */
    async verifyAuthentication(user, body, expectedChallenge) {
        try {
            console.log('[WebAuthnService] Starting auth verification for user:', user.id);
            // Fetch the credential from DB
            const { data: dbCredential, error: fetchError } = await supabase
                .from('webauthn_credentials')
                .select('*')
                .eq('credential_id', body.id)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !dbCredential) {
                console.error('[WebAuthnService] Credential not found in DB:', body.id);
                throw new Error('Credential not found');
            }

            console.log('[WebAuthnService] DB Credential found, counter:', dbCredential.counter);

            // verifyAuthenticationResponse expects:
            // credential.id: base64url string
            // credential.publicKey: Uint8Array
            const verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: EXPECTED_ORIGIN,
                expectedRPID: RP_ID,
                credential: {
                    id: dbCredential.credential_id,
                    publicKey: new Uint8Array(fromBase64URL(dbCredential.public_key)),
                    counter: dbCredential.counter,
                },
            });

            console.log('[WebAuthnService] Auth verification verified:', verification.verified);

            if (verification.verified) {
                // Update counter
                const { newCounter } = verification.authenticationInfo;
                console.log('[WebAuthnService] Updating counter to:', newCounter);
                await supabase
                    .from('webauthn_credentials')
                    .update({ counter: newCounter })
                    .eq('id', dbCredential.id);
            }

            return verification;
        } catch (err) {
            console.error('[WebAuthnService] verifyAuthentication error:', err);
            throw err;
        }
    }

    /**
     * Check if user has passkeys
     */
    async hasPasskeys(userId) {
        const { count, error } = await supabase
            .from('webauthn_credentials')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        if (error) return false;
        return count > 0;
    }
}

module.exports = new WebAuthnService();
