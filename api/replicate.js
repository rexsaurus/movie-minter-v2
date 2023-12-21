import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Livepeer } from "livepeer";
import Replicate from "replicate";
import dotenv from "dotenv";
import { TypeT } from "livepeer/dist/models/components/index.js";
import crypto from "crypto";
import axios from "axios";

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

// Utility function to handle the encryption process
async function handleEncryption(fileName, livePeerApiKey) {
  const encryptionKey = crypto.randomBytes(32); // 256 bits
  const livepeerPublicKeyResponse = await axios.get(
    "https://livepeer.studio/api/access-control/public-key",
    { headers: { Authorization: `Bearer ${livePeerApiKey}` } },
  );
  const livepeerPublicKey = livepeerPublicKeyResponse.data.spki_public_key;

  // Convert Base64 encoded public key to buffer
  const publicKeyBuffer = Buffer.from(livepeerPublicKey, "base64");
  const importedPublicKey = await crypto.webcrypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encryptedKeyBuffer = await crypto.webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedPublicKey,
    encryptionKey,
  );
  const encryptedKey = Buffer.from(encryptedKeyBuffer).toString("base64");

  return { encryptedKey, fileName };
}

app.post("/request-upload-url", async (req, res) => {
  try {
    const { fileName, livePeerApiKey } = req.body;
    const { encryptedKey } = await handleEncryption(fileName, livePeerApiKey);

    const livepeer = new Livepeer({ apiKey: livePeerApiKey });
    const response = await livepeer.asset.create({
      name: fileName,
      staticMp4: true,
      playbackPolicy: {
        type: TypeT.Jwt,
        webhookId: "3e02c844-d364-4d48-b401-24b2773b5d6c",
      },
      creatorId: "string", // Replace with actual creator ID
      storage: {}, // Replace with actual storage details if necessary
      url: `https://s3.amazonaws.com/my-bucket/path/${fileName}`,
      encryption: { encryptedKey },
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Error requesting asset upload:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
