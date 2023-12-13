import express from "express";
import Replicate from "replicate";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create an express application
const app = express();
app.use(bodyParser.json());

// Define the port
const PORT = 5001;

// POST route to handle Replicate API calls
app.post("/generate-video", async (req, res) => {
  try {
    // Extract prompt and API key from the request body
    const { prompt, apiKey } = req.body;

    // Initialize Replicate client with the provided API key
    const replicate = new Replicate({
      auth: apiKey,
    });

    // Make the API call to Replicate
    const output = await replicate.run(
      "cjwbw/damo-text-to-video:4e9283b2df49fad2dcf95755",
      {
        input: {
          prompt, // Use the prompt from the request
          // Set other parameters as needed
        }npm install dotenv,
      },
    );

    // Send the response back to the client
    res.status(200).json({ videoUrl: output });
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
