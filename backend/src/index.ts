import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import reportRoutes from './routes/reports';
import db from './db';

// Load .env from the backend folder, not from cwd
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "react-doctor-secret-key-change-this";

// Make API_KEY available globally so auth middleware can use it
process.env.API_KEY = API_KEY;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api/reports', reportRoutes);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🩺 React Doctor backend running on http://localhost:${PORT}`);
});