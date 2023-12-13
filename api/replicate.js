import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const port = 5000; // Backend server port

app.post("/api/replicate", async (req, res) => {
  const { replicateApiKey, prompt } = req.body;

  // Ensure API key and prompt are provided
  if (!replicateApiKey || !prompt) {
    return res.status(400).send("API key and prompt are required");
  }

  try {
    const replicateResponse = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: "4e9283b2df49fad2dcf95755", // This should be your model's version
        input: {
          prompt: prompt,
          // Add other parameters if needed
        },
      },
      {
        headers: {
          Authorization: `Token ${replicateApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Send the response from Replicate API back to the frontend
    res.json(replicateResponse.data);
  } catch (error) {
    console.error("Error calling Replicate API:", error);
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
