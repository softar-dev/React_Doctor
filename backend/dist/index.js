"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const reports_1 = __importDefault(require("./routes/reports"));
// Load .env from the backend folder, not from cwd
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "react-doctor-secret-key-change-this";
// Make API_KEY available globally so auth middleware can use it
process.env.API_KEY = API_KEY;
// ── Security headers ────────────────────────────────────────────
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
// ── API routes ───────────────────────────────────────────────────
app.use('/api/reports', reports_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ── Serve the built dashboard ────────────────────────────────────
// Try multiple possible paths for the public directory
const possiblePublicPaths = [
    path_1.default.join(__dirname, '..', 'public'), // Normal: backend/public
    path_1.default.join(__dirname, '..', '..', 'dashboard', 'public'), // Dashboard is in dashboard folder
    path_1.default.join(__dirname, '..', '..', 'frontend', 'dist'), // Old: frontend/dist
    path_1.default.join(__dirname, 'public'), // Alternative: backend/dist/public
    path_1.default.join(__dirname, '..', '..', 'public'), // If backend is in a subfolder
    path_1.default.join(process.cwd(), 'public'), // Current working directory
    path_1.default.join(process.cwd(), 'backend', 'public'), // If running from root
];
// Find the first path that actually exists.
// path.resolve() (not just path.join) is important here — sendFile/readFileSync
// resolve symlinks differently than fs.existsSync in some setups (notably npm
// global installs under nvm, which symlink the package into node_modules).
// Fully resolving up front avoids that mismatch entirely.
let publicDir = possiblePublicPaths
    .map(p => path_1.default.resolve(p))
    .find(p => fs_1.default.existsSync(p));
if (!publicDir) {
    publicDir = path_1.default.resolve(__dirname, '..', 'public');
    console.warn(`⚠️ Public directory not found. Using: ${publicDir}`);
}
console.log(`📁 Serving static files from: ${publicDir}`);
const indexPath = path_1.default.join(publicDir, 'index.html');
// Read index.html into memory ONCE at startup instead of re-resolving/
// re-reading it on every SPA fallback request. This is both faster and
// sidesteps the res.sendFile() resolution issue entirely — readFileSync
// doesn't do the same internal realpath/root checks that were failing
// under the nvm symlinked global install.
let indexHtml = null;
try {
    indexHtml = fs_1.default.readFileSync(indexPath, 'utf-8');
    console.log(`✅ index.html loaded from: ${indexPath}`);
}
catch (err) {
    console.warn(`⚠️ index.html NOT FOUND at: ${indexPath} (${err.message})`);
}
// Serve static files (JS/CSS/images/etc from the build output)
app.use(express_1.default.static(publicDir));
// ── SPA fallback ─────────────────────────────────────────────────
app.use((req, res, next) => {
    // Skip API and health check routes
    if (req.path.startsWith('/api/') || req.path === '/health') {
        return next();
    }
    // Skip if the request is for a static asset — let express.static's
    // 404 (or a real file) handle it instead of overwriting with HTML
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'];
    const ext = path_1.default.extname(req.path).toLowerCase();
    if (staticExtensions.includes(ext)) {
        return next();
    }
    console.log(`🔄 SPA fallback for: ${req.path}`);
    if (indexHtml) {
        res.set('Content-Type', 'text/html');
        res.send(indexHtml);
        return;
    }
    // index.html was never found/loaded at startup — try a fresh read
    // in case the dashboard was built AFTER the backend started.
    try {
        const freshHtml = fs_1.default.readFileSync(indexPath, 'utf-8');
        indexHtml = freshHtml; // cache it for next time
        res.set('Content-Type', 'text/html');
        res.send(freshHtml);
    }
    catch (err) {
        console.error(`❌ Failed to read index.html for ${req.path}:`, err.message);
        res.status(404).json({
            message: 'Dashboard not built yet.',
            hint: 'Run "npm run build" inside the dashboard/ folder, then restart the backend.',
            debug: {
                publicDir,
                indexPath,
                cwd: process.cwd(),
                exists: fs_1.default.existsSync(indexPath),
            },
        });
    }
});
// ── Error handler ────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});
// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🩺 React Doctor backend running on http://localhost:${PORT}`);
    console.log(`📁 Public directory: ${publicDir}`);
    console.log(`📄 index.html path: ${indexPath}`);
    console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
});
exports.default = app;
