"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const reports_1 = __importDefault(require("./routes/reports"));
dotenv_1.default.config();
// Debug: Check if API_KEY is loaded
console.log(`[Debug] API_KEY loaded: ${process.env.API_KEY ? '✓' : '✗'}`);
console.log(`[Debug] API_KEY value: ${process.env.API_KEY || 'NOT SET'}`);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ─── SECURITY AND PARSING MIDDLEWARE ──────────────────────────────────────────
app.use((0, helmet_1.default)()); // adds security headers
app.use((0, cors_1.default)()); // allows dashboard to call the API
app.use(express_1.default.json({ limit: '50mb' })); // reports can be large (screenshots)
// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Use only ONE path (plural is REST convention)
app.use('/api/reports', reports_1.default);
// ─── HEALTH CHECK - NO AUTH, USED TO VERIFY SERVER IS UP ──────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});
// ─── START THE SERVER ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`React Doctor backend running on http://localhost:${PORT}`);
});
