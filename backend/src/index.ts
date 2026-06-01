import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import reportRoutes from './routes/reports';
import db from './db';

dotenv.config();

// Debug: Check if API_KEY is loaded
console.log(`[Debug] API_KEY loaded: ${process.env.API_KEY ? '✓' : '✗'}`);
console.log(`[Debug] API_KEY value: ${process.env.API_KEY || 'NOT SET'}`);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── SECURITY AND PARSING MIDDLEWARE ──────────────────────────────────────────
app.use(helmet()); // adds security headers
app.use(cors());   // allows dashboard to call the API
app.use(express.json({ limit: '50mb' })); // reports can be large (screenshots)

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Use only ONE path (plural is REST convention)
app.use('/api/reports', reportRoutes);

// ─── HEALTH CHECK - NO AUTH, USED TO VERIFY SERVER IS UP ──────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});


// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ─── START THE SERVER ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`React Doctor backend running on http://localhost:${PORT}`);
});