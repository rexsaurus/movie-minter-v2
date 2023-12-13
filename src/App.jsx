import React, { useState } from "react";
import "./App.css";

export default function App() {
  const [apiKeys, setApiKeys] = useState({ replicateKey: "", livePeerKey: "" });
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");

  function handleInputChange(e) {
    const { name, value } = e.target;
    setApiKeys((prevState) => ({ ...prevState, [name]: value }));
  }

  function handlePromptChange(e) {
    setPrompt(e.target.value);
  }

  async function handleGenerateClick() {
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/replicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replicateApiKey: apiKeys.replicateKey, // Send the Replicate API key
          prompt: prompt, // Send the prompt
        }),
      });

      const data = await response.json();
      setVideoSrc(data.output); // Assuming the output is the URL to the video
    } catch (error) {
      console.error("Failed to generate video:", error);
    }

    setLoading(false);
  }

  async function handleStoreOnLivePeerClick() {
    // Implement storing the video on LivePeer
  }

  async function handleMintAsNFTClick() {
    // Implement minting the video as an NFT
  }

  return (
    <div className="app">
      <header className="header">
        <h1>LivePeer Generative AI Movie Builder</h1>
        <button
          onClick={() => {
            /* Connect Wallet Function */
          }}
        >
          Connect Wallet
        </button>
      </header>
      <div className="content">
        <div className="form">
          <input
            name="replicateKey"
            placeholder="Replicate API Key"
            value={apiKeys.replicateKey}
            onChange={handleInputChange}
          />
          <input
            name="livePeerKey"
            placeholder="LivePeer API Key"
            value={apiKeys.livePeerKey}
            onChange={handleInputChange}
          />
          <textarea
            placeholder="Prompt"
            value={prompt}
            onChange={handlePromptChange}
          />
          <button onClick={handleGenerateClick}>Generate</button>
        </div>
        <div className="video-container">
          {loading ? (
            <p>Loading...</p>
          ) : (
            videoSrc && <video src={videoSrc} controls />
          )}
        </div>
      </div>
      <footer className="footer">
        <button onClick={handleStoreOnLivePeerClick}>Store on LivePeer</button>
        <button onClick={handleMintAsNFTClick}>Mint as NFT</button>
      </footer>
    </div>
  );
}
