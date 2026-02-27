import 'dotenv/config';
import express, { type Request, type Response } from 'express';

import { supabase } from './lib/supabase';

const app = express();

// Global JSON body parsing middleware
app.use(express.json());

/**
 * Health check endpoint.
 *
 * Route: GET /api/health
 *
 * Behaviour:
 * - Performs a live Supabase read from the `clients` table to verify DB connectivity.
 * - Always returns HTTP 200.
 * - Response shape on success:
 *     {
 *       "status": "ok",
 *       "supabase": "connected",
 *       "timestamp": "<ISO 8601 string>"
 *     }
 * - Response shape on Supabase error:
 *     {
 *       "status": "ok",
 *       "supabase": "error",
 *       "error": "<error message>",
 *       "timestamp": "<ISO 8601 string>"
 *     }
 */
app.get('/api/health', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[health] Supabase error during health check', {
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return res.status(200).json({
        status: 'ok',
        supabase: 'error',
        error: error.message,
        timestamp,
      });
    }

    return res.status(200).json({
      status: 'ok',
      supabase: 'connected',
      timestamp,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[health] Unexpected error during health check', err);

    return res.status(200).json({
      status: 'ok',
      supabase: 'error',
      error: err instanceof Error ? err.message : String(err),
      timestamp,
    });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});

