/* ============================================
   FILE: app.js
   PURPOSE: Express app (middleware + routes), shared by
            server/index.js (local `npm run dev`) and api/index.js (Vercel function)
   ============================================ */


// -------------------- DEPENDENCIES --------------------
require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


// -------------------- APP SETUP --------------------
const app = express();


// -------------------- DATABASE (lazy, cached) --------------------
// Serverless functions start cold, so connect on first API request and reuse
// the connection afterwards. With no MONGO_URI the API answers 503 and the
// front end switches to its in-browser demo mode.
let dbPromise = null;
function connectDb() {
    if (!process.env.MONGO_URI) return Promise.reject(Object.assign(new Error('MONGO_URI not set'), { code: 'NO_DB' }));
    if (mongoose.connection.readyState === 1) return Promise.resolve();
    if (!dbPromise) {
        mongoose.set('autoIndex', false);
        dbPromise = mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
            .catch(err => { dbPromise = null; throw err; });
    }
    return dbPromise;
}
async function requireDb(req, res, next) {
    try { await connectDb(); next(); }
    catch (err) { res.status(503).json({ message: 'Database unavailable', demo: true }); }
}


// -------------------- MIDDLEWARE --------------------

// Parse incoming JSON requests
app.use(express.json());

// Allow cross-origin requests (* = all domains, fine for development)
app.use(cors("*"));

// Serve all front-end files from the "public" folder
// { extensions: ['html'] } allows /dashboard to work without adding .html
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// -------------------- API ROUTES --------------------

const taskRoutes = require('./routes/taskRoutes');
const mailRoute = require('./routes/mailRoute');

// All task endpoints live under /api/tasks
app.use('/api/tasks', requireDb, taskRoutes);

// Email endpoint lives under /api/mail
app.use('/api/mail', mailRoute);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

// Unknown API routes return JSON 404 (not index.html)
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));


// -------------------- CATCH-ALL ROUTE --------------------
// If no API route matches, send back index.html (for front-end routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


module.exports = app;
module.exports.connectDb = connectDb;
