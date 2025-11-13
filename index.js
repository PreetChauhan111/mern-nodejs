import express from 'express';
import bodyParser from 'body-parser';

import db from './mongoC.js'; // keep your current mongoC export; this code handles if it's undefined

const PORT = parseInt(process.env.PORT, 10) || 4000;
const app = express();

/**
 * Normalize repeated slashes in the incoming URL:
 * transforms //getUsers  -> /getUsers
 * transforms /api//v1/  -> /api/v1/
 */
app.use((req, _res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// CORS headers and preflight handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // tighten in production
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Parses the text as url encoded data
app.use(bodyParser.urlencoded({ extended: true }));
// Parses the text as json
app.use(bodyParser.json());

/** Helper to ensure DB is ready before using it */
function ensureDbAvailable(res) {
  if (!db) {
    res.status(503).json({ error: 'Database not connected' });
    return false;
  }
  return true;
}

/** Async wrapper to catch errors */
const wrap = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/', (_req, res) => {
  res.status(200).send('Hello World, from express');
});

app.post(
  '/addUser',
  wrap(async (req, res) => {
    if (!ensureDbAvailable(res)) return;

    const collection = db.collection('users');
    const newDocument = { ...(req.body || {}), date: new Date() };
    const result = await collection.insertOne(newDocument);

    // 201 Created and return inserted id
    res.status(201).json({ insertedId: result.insertedId });
  })
);

app.get(
  '/getUsers',
  wrap(async (_req, res) => {
    if (!ensureDbAvailable(res)) return;

    const collection = db.collection('users');
    const results = await collection.find({}).toArray();
    res.status(200).json(results);
  })
);

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening at port: ${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
});
