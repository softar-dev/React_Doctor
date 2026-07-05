import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import reportRoutes from './routes/reports';
import db from './db';

// Load .env from the backend folder, not from cwd
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "react-doctor-secret-key-change-this";

// Make API_KEY available globally so auth middleware can use it
process.env.API_KEY = API_KEY;

// ── Security headers ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── API routes ───────────────────────────────────────────────────
app.use('/api/reports', reportRoutes);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve the built dashboard ────────────────────────────────────
// Try multiple possible paths for the public directory
const possiblePublicPaths = [
  path.join(__dirname, '..', 'public'),                     // Normal: backend/public
  path.join(__dirname, '..', '..', 'dashboard', 'public'),  // Dashboard is in dashboard folder
  path.join(__dirname, '..', '..', 'frontend', 'dist'),     // Old: frontend/dist
  path.join(__dirname, 'public'),                           // Alternative: backend/dist/public
  path.join(__dirname, '..', '..', 'public'),                // If backend is in a subfolder
  path.join(process.cwd(), 'public'),                        // Current working directory
  path.join(process.cwd(), 'backend', 'public'),             // If running from root
];

// Find the first path that actually exists.
// path.resolve() (not just path.join) is important here — sendFile/readFileSync
// resolve symlinks differently than fs.existsSync in some setups (notably npm
// global installs under nvm, which symlink the package into node_modules).
// Fully resolving up front avoids that mismatch entirely.
let publicDir = possiblePublicPaths
  .map(p => path.resolve(p))
  .find(p => fs.existsSync(p));

if (!publicDir) {
  publicDir = path.resolve(__dirname, '..', 'public');
  console.warn(`⚠️ Public directory not found. Using: ${publicDir}`);
}

console.log(`📁 Serving static files from: ${publicDir}`);

const indexPath = path.join(publicDir, 'index.html');

// Read index.html into memory ONCE at startup instead of re-resolving/
// re-reading it on every SPA fallback request. This is both faster and
// sidesteps the res.sendFile() resolution issue entirely — readFileSync
// doesn't do the same internal realpath/root checks that were failing
// under the nvm symlinked global install.
let indexHtml: string | null = null;
try {
  indexHtml = fs.readFileSync(indexPath, 'utf-8');
  console.log(`✅ index.html loaded from: ${indexPath}`);
} catch (err: any) {
  console.warn(`⚠️ index.html NOT FOUND at: ${indexPath} (${err.message})`);
}

// Serve static files (JS/CSS/images/etc from the build output)
app.use(express.static(publicDir));

// ── SPA fallback ─────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip API and health check routes
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }

  // Skip if the request is for a static asset — let express.static's
  // 404 (or a real file) handle it instead of overwriting with HTML
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'];
  const ext = path.extname(req.path).toLowerCase();
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
    const freshHtml = fs.readFileSync(indexPath, 'utf-8');
    indexHtml = freshHtml; // cache it for next time
    res.set('Content-Type', 'text/html');
    res.send(freshHtml);
  } catch (err: any) {
    console.error(`❌ Failed to read index.html for ${req.path}:`, err.message);
    res.status(404).json({
      message: 'Dashboard not built yet.',
      hint: 'Run "npm run build" inside the dashboard/ folder, then restart the backend.',
      debug: {
        publicDir,
        indexPath,
        cwd: process.cwd(),
        exists: fs.existsSync(indexPath),
      },
    });
  }
});

// ── Error handler ────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
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

export default app;