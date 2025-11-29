const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configuration
// In production, these should be environment variables
const SECRET_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32 bytes (64 hex chars)
const ALGORITHM = 'aes-256-gcm';

// Helper to get key buffer
const getKey = () => Buffer.from(SECRET_KEY_HEX, 'hex');

// Encrypt Endpoint
app.post('/api/encrypt', (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        const data = JSON.stringify({ name, phone });
        const iv = crypto.randomBytes(12); // 12 bytes for GCM
        const key = getKey();

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        // Create a hash for integrity check (similar to previous implementation)
        const hash = crypto.createHash('sha256')
            .update(SECRET_KEY_HEX + encrypted + iv.toString('hex') + authTag)
            .digest('hex');

        res.json({
            encrypted,
            iv: iv.toString('hex'),
            authTag,
            hash
        });
    } catch (error) {
        console.error('Encryption error:', error);
        res.status(500).json({ error: 'Encryption failed' });
    }
});

// Decrypt Endpoint
app.post('/api/decrypt', (req, res) => {
    try {
        const { encrypted, iv, authTag, hash } = req.body;

        if (!encrypted || !iv || !authTag || !hash) {
            return res.status(400).json({ error: 'Missing required encryption fields' });
        }

        // Verify integrity hash first
        const expectedHash = crypto.createHash('sha256')
            .update(SECRET_KEY_HEX + encrypted + iv + authTag)
            .digest('hex');

        if (expectedHash !== hash) {
            return res.status(401).json({ error: 'Integrity check failed. Data may be tampered.' });
        }

        const key = getKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));

        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const data = JSON.parse(decrypted);
        res.json(data);
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(400).json({ error: 'Decryption failed. Invalid key or corrupted data.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Secure Encryption Server running on http://localhost:${PORT}`);
});
