import { Request, Response, NextFunction } from "express";

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const keyHeader = req.headers["x-api-key"];
  const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
  const expectedKey = process.env.API_KEY?.trim();
  
  // Debug log
  console.log(`[Auth] Received: "${key}", Expected: "${expectedKey}"`);
  
  if (!key || key.trim() !== expectedKey) {
    console.warn(`[Auth] API key mismatch!`);
    res.status(401).json({ error: "Unauthorized — invalid or missing API key" });
    return;
  }
  next();
}