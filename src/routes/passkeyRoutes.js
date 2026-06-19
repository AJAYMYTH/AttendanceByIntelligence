const express = require('express');
const router = express.Router();
const webauthnService = require('../services/webauthnService');
const jwt = require('jsonwebtoken');

// Temporary store for challenges (In-memory for simplicity)
const challengeStore = new Map();

// Registration Endpoints (Requires standard JWT)
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                console.error('[WebAuthn Auth] JWT Verify Error:', err.message);
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        console.warn('[WebAuthn Auth] No Auth Header');
        res.sendStatus(401);
    }
};

router.post('/register/options', authenticateJWT, async (req, res) => {
    try {
        console.log(`[WebAuthn] Generating registration options for user: ${req.user.username} (${req.user.id})`);
        const options = await webauthnService.generateRegistrationOptions(req.user);
        challengeStore.set(`reg_${req.user.id}`, options.challenge);
        res.json(options);
    } catch (err) {
        console.error('[WebAuthn] /register/options error:', err);
        res.status(500).json({ message: err.message });
    }
});

router.post('/register/verify', authenticateJWT, async (req, res) => {
    try {
        const expectedChallenge = challengeStore.get(`reg_${req.user.id}`);
        console.log(`[WebAuthn] Verifying registration for user: ${req.user.username}. Challenge found: ${!!expectedChallenge}`);
        
        if (!expectedChallenge) return res.status(400).json({ message: 'Challenge not found' });

        const verification = await webauthnService.verifyRegistration(req.user, req.body, expectedChallenge);
        challengeStore.delete(`reg_${req.user.id}`);

        if (verification.verified) {
            console.log(`[WebAuthn] Registration successful for user: ${req.user.username}`);
            res.json({ success: true });
        } else {
            console.error(`[WebAuthn] Registration verification failed for user: ${req.user.username}`);
            res.status(400).json({ message: 'Verification failed' });
        }
    } catch (err) {
        console.error('[WebAuthn] /register/verify error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Authentication Endpoints (Pre-session)
router.post('/login/options', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    try {
        console.log(`[WebAuthn] Generating login options for userId: ${userId}`);
        // We need username for the service
        const { data: user } = await require('../utils/supabase')
            .from('app_users')
            .select('id, username')
            .eq('id', userId)
            .single();

        if (!user) {
            console.warn(`[WebAuthn] User not found for login options: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        const options = await webauthnService.generateAuthenticationOptions(user);
        challengeStore.set(`auth_${userId}`, options.challenge);
        res.json(options);
    } catch (err) {
        console.error('[WebAuthn] /login/options error:', err);
        res.status(500).json({ message: err.message });
    }
});

router.post('/login/verify', async (req, res) => {
    const { userId, ...body } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    try {
        const expectedChallenge = challengeStore.get(`auth_${userId}`);
        console.log(`[WebAuthn] Verifying login for userId: ${userId}. Challenge found: ${!!expectedChallenge}`);
        
        if (!expectedChallenge) return res.status(400).json({ message: 'Challenge expired or not found' });

        const { data: user } = await require('../utils/supabase')
            .from('app_users')
            .select('*')
            .eq('id', userId)
            .single();

        const verification = await webauthnService.verifyAuthentication(user, body, expectedChallenge);
        challengeStore.delete(`auth_${userId}`);

        if (verification.verified) {
            console.log(`[WebAuthn] Login successful for user: ${user.username}`);
            // Generate final JWT
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role, uid: user.uid },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                login_success: true,
                token,
                user: {
                    username: user.username,
                    role: user.role,
                    uid: user.uid
                }
            });
        } else {
            console.error(`[WebAuthn] Login verification failed for user: ${user.username}`);
            res.status(401).json({ message: 'Passkey verification failed' });
        }
    } catch (err) {
        console.error('[WebAuthn] /login/verify error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Device Management
router.get('/devices', authenticateJWT, async (req, res) => {
    try {
        const { data: devices } = await require('../utils/supabase')
            .from('webauthn_credentials')
            .select('id, device_name, created_at')
            .eq('user_id', req.user.id);
        res.json(devices);
    } catch (err) {
        console.error('[WebAuthn] /devices error:', err);
        res.status(500).json({ message: err.message });
    }
});

router.delete('/devices/:id', authenticateJWT, async (req, res) => {
    try {
        const { error } = await require('../utils/supabase')
            .from('webauthn_credentials')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('[WebAuthn] /devices delete error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
