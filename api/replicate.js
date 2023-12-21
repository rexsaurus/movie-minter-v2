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

// Function to generate an encryption key
const generateEncryptionKey = () => {
  return crypto.randomBytes(32); // 256 bits
};

// Function to fetch Livepeer's public key
const fetchLivepeerPublicKey = async () => {
  const response = await axios.get(
    "https://livepeer.studio/api/access-control/public-key",
    {
      headers: { Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}` },
    },
  );
  return response.data.spki_public_key;
};

// Function to encrypt the encryption key using Livepeer's public key
const encryptKeyWithPublicKey = async (key, publicKey) => {
  // Convert Base64 encoded public key to buffer
  const publicKeyBuffer = Buffer.from(publicKey, "base64");

  // Import the public key
  const importedPublicKey = await crypto.webcrypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );

  // Encrypt the key
  const encryptedKeyBuffer = await crypto.webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedPublicKey,
    key,
  );

  return Buffer.from(encryptedKeyBuffer).toString("base64");
};

app.post("/request-upload-url", async (req, res) => {
  try {
    const { fileName, livePeerApiKey } = req.body;

    const sdk = new Livepeer({ apiKey: livePeerApiKey });

    const encryptionKey = generateEncryptionKey();
    const livepeerPublicKey = await fetchLivepeerPublicKey();
    const encryptedKey = await encryptKeyWithPublicKey(
      encryptionKey,
      livepeerPublicKey,
    );

    const response = await sdk.asset.create({
      name: fileName,
      staticMp4: true,
      playbackPolicy: {
        type: TypeT.Jwt,
        webhookId: "3e02c844-d364-4d48-b401-24b2773b5d6c",
        webhookContext: {},
      },
      creatorId: "string",
      storage: {},
      url: `https://s3.amazonaws.com/my-bucket/path/${fileName}`,
      encryption: {
        encryptedKey: encryptedKey,
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
