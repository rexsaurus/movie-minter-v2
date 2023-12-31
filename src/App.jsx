import React, { useState } from "react";
import "./App.css";

export default function App() {
  const [apiKeys, setApiKeys] = useState({ replicateKey: "", livePeerKey: "" });
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [replicateVideoUrl, setReplicateVideoUrl] = useState(""); // New state

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
      const response = await fetch("http://localhost:5001/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          apiKey: apiKeys.replicateKey,
        }),
      });
      const data = await response.json();
      setVideoSrc(data.output);
    } catch (error) {
      console.error("Failed to generate video:", error);
    }
    setLoading(false);
  }

  async function handleStoreOnLivePeerClick() {
    try {
      const response = await fetch("http://localhost:5001/request-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "test/testvideo.mp4", // Replace with your file name
          livePeerApiKey: apiKeys.livePeerKey,
        }),
      });
      const data = await response.json();
      console.log("Upload URL received:", data);
      // Additional code to handle video upload to LivePeer
    } catch (error) {
      console.error("Error storing video on LivePeer:", error);
    }
  }

  async function handleMintAsNFTClick() {
    // Implement minting the video as an NFT
  }

  async function handleTestLivePeerUploadClick() {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5001/test-livepeer-upload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeys.livePeerKey,
            videoUrl:
              "https://github.com/rexsaurus/live-peer-upload-bug/raw/main/testvideo.mp4",
          }),
        },
      );
      const data = await response.json();
      setReplicateVideoUrl(data.replicateVideoUrl);
    } catch (error) {
      console.error("Failed to test LivePeer upload:", error);
    }
    setLoading(false);
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
        <button onClick={handleStoreOnLivePeerClick}>
          Test LivePeer Upload
        </button>{" "}
        {/* New button */}
      </footer>
    </div>
  );
}
