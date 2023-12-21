import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Livepeer } from "livepeer";
import Replicate from "replicate";
import dotenv from "dotenv";
import { TypeT } from "livepeer/dist/models/components/index.js";
import crypto from "crypto";
import forge from "node-forge";

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

// Function to import the public key
const importPublicKey = async (pemKey) => {
  console.log("Received PEM Key:", pemKey); // Log the received PEM key

  try {
    const forgeKey = forge.pki.publicKeyFromPem(pemKey);
    const spkiKey = forge.asn1
      .toDer(forge.pki.publicKeyToAsn1(forgeKey))
      .getBytes();
    const spkiArrayBuffer = new Uint8Array(spkiKey.length);
    for (let i = 0; i < spkiKey.length; ++i) {
      spkiArrayBuffer[i] = spkiKey.charCodeAt(i);
    }

    return await crypto.webcrypto.subtle.importKey(
      "spki",
      spkiArrayBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );
  } catch (error) {
    console.error("Error in importPublicKey:", error);
    throw error; // Rethrow the error for further handling
  }
};
const reformatPublicKey = (pemKey) => {
  // Extract the Base64-encoded part of the PEM key
  const base64Encoded = pemKey.match(
    /-----BEGIN PUBLIC KEY-----(.*)-----END PUBLIC KEY-----/s,
  );
  if (!base64Encoded || base64Encoded.length < 2) {
    throw new Error("Invalid PEM key format");
  }

  // Decode and re-encode the key
  const decoded = Buffer.from(base64Encoded[1], "base64").toString("binary");
  const reencoded = Buffer.from(decoded, "binary").toString("base64");

  return `-----BEGIN PUBLIC KEY-----\n${reencoded}\n-----END PUBLIC KEY-----`;
};

const handleEncryption = async (fileName, livePeerPublicKey) => {
  // Reformat the public key to proper PEM format
  const formattedPublicKey = reformatPublicKey(livePeerPublicKey);

  // Import the formatted public key
  const importedPublicKey = await importPublicKey(formattedPublicKey);

  // Generate a random 256-bit encryption key
  const encryptionKey = crypto.randomBytes(32); // 256 bits

  // Encrypt using the imported public key
  const encryptedKeyBuffer = await crypto.webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedPublicKey,
    encryptionKey,
  );

  // Convert the encrypted key to Base64
  const encryptedKey = Buffer.from(encryptedKeyBuffer).toString("base64");

  return { encryptedKey, fileName };
};

// Endpoint to handle the upload request
app.post("/request-upload-url", async (req, res) => {
  try {
    const { fileName, livePeerPublicKey, livePeerApiKey } = req.body;
    const { encryptedKey } = await handleEncryption(
      fileName,
      livePeerPublicKey,
    );

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
    console.error("Error in handleEncryption:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
