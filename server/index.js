/* ============================================
   FILE: index.js
   PURPOSE: Local dev server — connects to MongoDB and starts Express
   (on Vercel the same app runs as a serverless function via api/index.js)
   ============================================ */

require("dotenv").config();
const app = require('./app');
const port = process.env.PORT || 3000;


// -------------------- TERMINAL COLOURS --------------------
// ANSI escape codes for coloured console output
const colour = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};


// -------------------- DATABASE + START SERVER --------------------
(async () => {
    console.log('');
    console.log(`${colour.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colour.reset}`);
    console.log(`${colour.bold}  🚀 GetShitDone — Starting Up...${colour.reset}`);
    console.log(`${colour.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colour.reset}`);
    console.log('');

    try {
        // Load the Task model so we can sync indexes
        const Task = require('./models/task');

        // Connect to MongoDB Atlas using the URI from .env
        console.log(`${colour.dim}  ⏳ Connecting to MongoDB...${colour.reset}`);
        await app.connectDb();
        console.log(`${colour.green}  ✅ MongoDB Connected${colour.reset}`);

        // Make sure database indexes match what the schema defines
        await Task.syncIndexes();
        console.log(`${colour.green}  ✅ Database indexes synced${colour.reset}`);

        // Start listening for requests
        app.listen(port, () => {
            console.log(`${colour.green}  ✅ Express server running${colour.reset}`);
            console.log('');
            console.log(`${colour.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colour.reset}`);
            console.log(`${colour.bold}  🎉 App Ready at: ${colour.cyan}http://localhost:${port}${colour.reset}`);
            console.log(`${colour.bold}  📊 Dashboard at: ${colour.cyan}http://localhost:${port}/dashboard${colour.reset}`);
            console.log(`${colour.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colour.reset}`);
            console.log('');
        });
    } catch (err) {
        console.log('');
        console.log(`${colour.red}  ❌ STARTUP FAILED${colour.reset}`);
        console.log(`${colour.red}  ❌ Error: ${err.message}${colour.reset}`);
        console.log('');

        // Give helpful hints based on common errors
        if (err.message.includes('ENOTFOUND') || err.message.includes('failed to connect')) {
            console.log(`${colour.yellow}  💡 Hint: Check your MONGO_URI in the .env file${colour.reset}`);
            console.log(`${colour.yellow}  💡 Make sure your IP is whitelisted in MongoDB Atlas${colour.reset}`);
        }
        if (err.message.includes('authentication failed') || err.message.includes('AuthenticationFailed')) {
            console.log(`${colour.yellow}  💡 Hint: Check your MongoDB username and password in .env${colour.reset}`);
        }

        console.log('');
        process.exit(1);
    }
})();
