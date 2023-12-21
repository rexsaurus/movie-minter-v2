import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Livepeer } from "livepeer";
import Replicate from "replicate";
import dotenv from "dotenv";
import { TypeT } from "livepeer/dist/models/components";

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

    res.status(200).json(prediction.output);
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/request-upload-url", async (req, res) => {
  try {
    const { fileName, livePeerApiKey } = req.body;

    const sdk = new Livepeer({
      apiKey: livePeerApiKey,
    });

    const response = await sdk.asset.create({
      name: fileName,
      staticMp4: true,
      playbackPolicy: {
        type: TypeT.Jwt,
        webhookId: "3e02c844-d364-4d48-b401-24b2773b5d6c",
        webhookContext: {
          //foo: "string",
        },
      },
      creatorId: "string", // Replace with actual creator ID
      storage: {
        //ipfs: "string", // Replace with actual IPFS string if used
      },
      url: `https://s3.amazonaws.com/my-bucket/path/${fileName}`,
      encryption: {
        //encryptedKey: "string", // Replace with actual encrypted key if used
      },
    });

    if (response.statusCode === 200) {
      res.status(200).json(response.data);
    } else {
      res.status(response.statusCode).json({ error: response.data });
    }
  } catch (error) {
    console.error("Error requesting asset upload:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
