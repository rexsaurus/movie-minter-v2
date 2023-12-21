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

// Function to fetch Livepeer's public key
const fetchLivepeerPublicKey = async (livePeerApiKey) => {
  const response = await axios.get(
    "https://livepeer.studio/api/access-control/public-key",
    { headers: { Authorization: `Bearer ${livePeerApiKey}` } },
  );
  return response.data.spki_public_key;
};

// Function to import the public key
const importPublicKey = async (pemKey) => {
  // Remove PEM header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  let rawBase64 = pemKey.replace(pemHeader, "").replace(pemFooter, "");
  rawBase64 = rawBase64.replace(/\s+/g, ""); // Remove whitespace

  // Convert Base64 to binary string
  const binaryStr = Buffer.from(rawBase64, "base64").toString("binary");

  // Convert binary string to an array of character codes
  const binaryDer = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    binaryDer[i] = binaryStr.charCodeAt(i);
  }

  // Import the public key
  return await crypto.webcrypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
};

// Main encryption function
const handleEncryption = async (
  fileName,
  livePeerApiKey,
  livePeerPublicKey,
) => {
  const encryptionKey = crypto.randomBytes(32); // 256 bits
  const livepeerPublicKeyBase64 = await fetchLivepeerPublicKey(livePeerApiKey);
  const livepeerPublicKey = await importPublicKey(livepeerPublicKeyBase64);

  const encryptedKeyBuffer = await crypto.webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    livepeerPublicKey,
    encryptionKey,
  );

  const encryptedKey = Buffer.from(encryptedKeyBuffer).toString("base64");
  return { encryptedKey, fileName };
};

app.post("/request-upload-url", async (req, res) => {
  try {
    const { fileName, livePeerApiKey, livePeerPublicKey } = req.body;
    const { encryptedKey } = await handleEncryption(
      fileName,
      livePeerApiKey,
      livePeerPublicKey,
    ); // Pass the public key

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
