import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

// Create an express application
const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Define the port
const PORT = 5001;

// POST route to handle Replicate API calls
app.post("/generate-video", async (req, res) => {
  try {
    // Extract prompt and API key from the request body
    const { prompt, apiKey } = req.body;

    // Prepare the data for the POST request
    const postData = {
      version: "4e9283b2df49fad2dcf95755",
      input: {
        prompt: prompt,
        // Additional parameters can be added here
      },
    };

    // Make the API call to Replicate
    const response = await axios.post(
      "https://api.replicate.com/v1/predictions",
      postData,
      {
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Send the response back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
