const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config(); // Loads .env file
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Auth0 Auth ---
// Import the new package
const { auth } = require("express-oauth2-jwt-bearer");

// --- Import your Mongoose Model ---
const Analysis = require("./models/Analysis");

// --- Setup ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Auth0 Middleware Configuration ---
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_ISSUER_BASE_URL}/`, // Note the trailing slash
  tokenSigningAlg: "RS256",
});

// --- Database Connection ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => console.error("MongoDB connection error:", err));

// --- API ROUTES ---

/**
 * ENDPOINT 1: /api/analyze
 */
app.post(
  "/api/analyze",
  checkJwt, // 1. Check if the user is logged in (using Auth0)
  async (req, res) => {
    let aiResult; // <-- Declare aiResult OUTSIDE the inner try block

    try {
      // Outer try block for the whole request
      console.log("[server.js] req.auth object:", req.auth);
      const userId = req.auth.payload.sub;
      if (!userId) {
        console.error(
          "[server.js] CRITICAL: userId (req.auth.sub) is missing!"
        );
        throw new Error(
          "User ID could not be determined from authentication token."
        );
      }

      const { text, url } = req.body;

      if (!text || !url) {
        return res.status(400).json({ error: "Text and URL are required." });
      }

      // --- Create the prompt for Gemini ---
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Or your preferred model
      const prompt = `
        Analyze the following legal text from ${url}.
        Provide a brief, one-paragraph summary.
        Then, provide a list of critical points as a JSON array.
        Each object in the array must have:
        - "category": (e.g., "Data Collection", "Data Sharing", "User Rights")
        - "explanation": (A simple explanation of the point)
        - "risk_level": (A single word: "HIGH", "MEDIUM", "LOW", or "NEUTRAL")
        - "original_snippet": (The exact snippet from the text, max 150 chars)

        Respond ONLY with a single valid JSON object. Do not use markdown (like \`\`\`json).
        The JSON object must have this exact structure:
        {
          "summary": "...",
          "critical_points": [
            { "category": "...", "explanation": "...", "risk_level": "...", "original_snippet": "..." }
          ]
        }

        LEGAL TEXT:
        "${text.substring(0, 8000)}" 
      `; // Truncate text if needed

      // --- Call the AI ---
      console.log("[server.js] Calling Gemini API...");
      const result = await model.generateContent(prompt);
      const response = result.response; // Get the response object

      // --- Check if Gemini blocked the request or had an error ---
      if (!response || !response.text) {
        console.error(
          "[server.js] Gemini response was empty or invalid:",
          response
        );
        if (
          response &&
          response.promptFeedback &&
          response.promptFeedback.blockReason
        ) {
          throw new Error(
            `Gemini blocked the prompt: ${response.promptFeedback.blockReason}`
          );
        }
        throw new Error("Gemini did not return a valid text response.");
      }

      const responseText = response.text();
      console.log("[server.js] Raw Gemini response received:", responseText);

      // --- Parse the AI's JSON response ---
      try {
        aiResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "[server.js] Failed to parse JSON from AI:",
          responseText
        );
        throw new Error(`AI returned invalid JSON: ${parseError.message}`);
      }

      // --- Validate AI result structure ---
      if (
        !aiResult ||
        typeof aiResult !== "object" ||
        !aiResult.summary ||
        !Array.isArray(aiResult.critical_points)
      ) {
        console.error(
          "[server.js] Parsed AI result is missing required fields:",
          aiResult
        );
        throw new Error(
          "AI result was parsed but is missing required summary or critical_points fields."
        );
      }

      console.log("[server.js] AI Result parsed successfully.");

      // --- Save/Update the analysis in MongoDB ---
      const updatedAnalysis = await Analysis.findOneAndUpdate(
        { userId: userId, url: url }, // Find criteria
        {
          summary: aiResult.summary,
          critical_points: aiResult.critical_points,
        },
        {
          new: true, // Return the updated document
          upsert: true, // Create if doesn't exist
          setDefaultsOnInsert: true, // Apply schema defaults if inserting
        }
      );

      console.log(
        `[server.js] Analysis saved/updated for user ${userId} at ${url}`
      );

      // --- Send the analysis back ---
      res.status(201).json(aiResult);
    } catch (error) {
      // Outer catch block
      console.error("Error in /api/analyze:", error);
      res.status(500).json({
        error: "Failed to analyze text",
        details: error.message || "An unknown error occurred",
      });
    }
  }
);

/**
 * ENDPOINT 2: /api/dashboard
 */
app.get(
  "/api/dashboard",
  checkJwt, // 1. Check if the user is logged in
  async (req, res) => {
    try {
      // *** ADD LOG ***
      console.log("[server.js /api/dashboard] req.auth object:", req.auth);

      const userId = req.auth.payload.sub; // 2. Get the user ID

      // *** ADD LOG ***
      console.log(
        `[server.js /api/dashboard] Attempting to find analyses for userId: ${userId}`
      );

      if (!userId) {
        console.error("[server.js /api/dashboard] User ID is missing!");
        return res.status(401).json({ error: "User ID missing from token." });
      }

      // 3. Find all analyses in the DB that match this user
      const analyses = await Analysis.find({ userId: userId }).sort({
        createdAt: -1, // Use createdAt (from timestamps)
      });

      // *** ADD LOG ***
      console.log(
        `[server.js /api/dashboard] Found ${analyses.length} analyses for user ${userId}.`
      );

      // 4. Send the list of analyses back to the frontend
      res.status(200).json(analyses);
    } catch (error) {
      // *** ADD LOG ***
      console.error("Error in /api/dashboard:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        details: error.message,
      });
    }
  }
);

// --- Start Server ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
