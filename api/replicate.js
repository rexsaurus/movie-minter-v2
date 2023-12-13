import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import Replicate from "replicate";

// Load environment variables
dotenv.config();

// Create an express application
const app = express();

// Use CORS middleware
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// Define the port
const PORT = process.env.PORT || 5001;

// POST route to handle video generation requests
app.post("/generate-video", async (req, res) => {
  try {
    // Extract prompt and API key from the request body
    const { prompt, apiKey } = req.body;

    // Initialize Replicate client with the provided API key
    const replicate = new Replicate({
      auth: apiKey,
    });

    // Create a prediction using the Replicate client
    let prediction = await replicate.deployments.predictions.create(
      "rexsaurus", // Replace with your actual deployment name
      "movie-minter-v2", // Replace with your actual version
      {
        input: { prompt },
      },
    );

    // Wait for the prediction to complete
    prediction = await replicate.wait(prediction);

    // Send the prediction output back to the client
    res.status(200).json(prediction.output);
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
