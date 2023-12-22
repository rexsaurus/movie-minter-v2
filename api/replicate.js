import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Livepeer } from "livepeer";
import Replicate from "replicate";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5001;

// POST route for video generation
app.post("/generate-video", async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const replicate = new Replicate({ auth: apiKey });

    let prediction = await replicate.deployments.predictions.create(
      "rexsaurus",
      "movie-minter-v2",
      { input: { prompt } },
    );
    prediction = await replicate.wait(prediction);

    // Extract the video URL from the prediction output
    const videoUrl = prediction.output.video_url;
    console.log("video created at url: " + videoUrl);
    res.status(200).json({ videoUrl });
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/request-upload-url", async (req, res) => {
  try {
    const { apiKey, videoUrl } = req.body;
    const livepeer = new Livepeer({ apiKey });

    const main = async () => {
      try {
        const { data } = await livepeer.asset.create({
          name: "Test Video Asset",
          staticMp4: true,
          playbackPolicy: {
            type: TypeT.Jwt,
            webhookId: "3e02c844-d364-4d48-b401-24b2773b5d6c",
          },
          creatorId: "movie-minter", // Replace with actual creator ID
          storage: {}, // Replace with actual storage details if necessary
          url: videoUrl, // Use the provided video URL
        });

        // Log the asset data
        console.log("Asset created:", data);

        // Respond with the asset URL in the response
        res.status(200).json({ replicateVideoUrl: data.playbackId });
      } catch (error) {
        console.error("Error LivePeer upload:", error);
        res.status(500).json({ error: "Error LivePeer upload" });
      }
    };

    main();
  } catch (error) {
    console.error("Error handling LivePeer upload:", error);
    res.status(500).json({ error: "Error handling LivePeer upload" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
