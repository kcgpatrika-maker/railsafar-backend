import express from 'express';
import cors from 'cors';
import { fetchRailStatus } from './rail-parser.mjs';

const app = express();
app.use(cors());
app.use(express.json());

// PORT CONFIG
const PORT = process.env.PORT || 3000;

// HEALTH CHECK
app.get('/', (req, res) => {
  res.send('RailSafar Backend Server is Running Live & Smoothly!');
});

// RAIL QUERY ENDPOINT
app.post('/rail-query', async (req, res) => {
  try {
    const { destination, train, station } = req.body;

    if (!train) {
      return res.status(400).json({ error: "ट्रेन का नाम या नंबर आवश्यक है।" });
    }

    console.log(`📥 Query Received -> Train: ${train}, Station: ${station}, Destination: ${destination}`);

    // Call Parser to fetch live details
    const trainData = await fetchRailStatus({ destination, train, station });

    if (!trainData) {
      return res.status(404).json({ error: "ट्रेन की जानकारी नहीं मिल पाई।" });
    }

    res.json(trainData);

  } catch (error) {
    console.error("❌ Server Error in /rail-query:", error.message);
    res.status(500).json({ error: "इंटरनल सर्वर एरर, कृपया पुनः प्रयास करें।" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
