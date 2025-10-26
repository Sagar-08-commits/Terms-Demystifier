// Load environment variables from .env file for local development.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cheerio = require('cheerio'); // ADDED: Cheerio for HTML parsing

const app = express();
const port = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable not set.");
    console.error("Please set it in Railway's 'Variables' tab or in your local .env file for development.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

const allowedOrigins = [
    "*", // TEMPORARY for hackathon.
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            callback(null, true);
        } else {
            console.warn(`[${new Date().toISOString()}] CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['POST', 'GET'],
    credentials: true,
}));

// Middleware to parse JSON request bodies. Increased limit for potentially large HTML payloads.
app.use(express.json({ limit: '10mb' })); 

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    console.log(`[${new Date().toISOString()}] Received GET request to / (Health Check)`);
    res.status(200).json({ status: 'AI Backend is running on Railway!', version: '1.0' });
});

// --- Main AI Processing Endpoint ---
app.post('/analyze-legal-text', async (req, res) => {
    try {
        let contentToAnalyze = req.body.text; // This can now be raw HTML (from linked pages) or plain text (from current page)
        const pageUrl = req.body.url;

        console.log(`\n--- [${new Date().toISOString()}] Incoming Request ---`);
        console.log(`  Path: /analyze-legal-text`);
        console.log(`  Method: POST`);
        console.log(`  Origin: ${req.headers.origin || 'N/A'}`);
        console.log(`  Content length: ${contentToAnalyze ? contentToAnalyze.length : 0}`);
        console.log(`  Page URL: ${pageUrl || 'N/A'}`);

        if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
            console.warn(`[${new Date().toISOString()}] Bad Request: No content provided for analysis.`);
            return res.status(400).json({ error: "No content provided for analysis." });
        }
        
        // --- REFINED HTML Stripping in the backend using Cheerio (MOST ROBUST VERSION) ---
        // Determine if the content looks like HTML (starts with '<' and ends with '>')
        if (contentToAnalyze.trim().startsWith('<') && contentToAnalyze.trim().endsWith('>')) {
            console.log(`[${new Date().toISOString()}] Content appears to be HTML. Stripping tags with Cheerio...`);
            const $ = cheerio.load(contentToAnalyze);

            // --- Aggressive removal of ALL non-content elements from the ENTIRE virtual DOM ---
            // This ensures <head> content (meta, link) and other clutter is gone before text extraction.
            $('script, style, noscript, meta, link, head, footer, header, nav, iframe, form, button, input, textarea, select, .ad, .advertisement, [aria-hidden="true"], [role="navigation"], [role="banner"], [role="contentinfo"]').remove();
            
            // --- CORE FIX: Explicitly get text ONLY from the body ---
            // This is the most reliable way to ensure only visible, human-readable text is processed.
            contentToAnalyze = $('body').text(); 
            
            // Further clean up whitespace (multiple spaces to single space, trim start/end)
            contentToAnalyze = contentToAnalyze.replace(/\s+/g, ' ').trim();
            console.log(`[${new Date().toISOString()}] Final HTML stripping complete. Cleaned text length: ${contentToAnalyze.length}`);
        } else {
            console.log(`[${new Date().toISOString()}] Content appears to be plain text (or already stripped by extension). Proceeding...`);
        }

        // After stripping, check if enough text remains for meaningful AI analysis
        if (contentToAnalyze.trim().length < 100) {
            console.warn(`[${new Date().toISOString()}] Warning: Cleaned text is very short (${contentToAnalyze.trim().length} chars). AI analysis might be limited.`);
            return res.status(400).json({ error: "No substantial human-readable text found after processing for AI analysis." });
        }


        // --- Gemini AI Prompt Engineering ---
        const prompt = `
        You are an AI assistant for a browser extension called 'Terms Demystifier'.
        Your task is to analyze the following legal text from a website and extract the MOST critical points related to data sharing, cancellation policies, hidden fees, liability, and dispute resolution.

        For each critical point found, provide the following details in a structured JSON object:
        - "category": (string, e.g., "Data Sharing", "Cancellation", "Fees", "Liability", "Dispute Resolution", "Content Ownership", "Data Retention", "Third-Party Services", "Service Availability"). Choose the best fitting category.
        - "explanation": (string, a clear, simplified explanation for a non-expert).
        - "risk_level": (string, one of "HIGH", "MEDIUM", "LOW", "NEUTRAL").
        - "reason": (string, a brief reason for the assigned risk level, e.g., "Allows data sale", "Difficult cancellation process").
        - "original_snippet": (string, the exact, short snippet of text from the original legal document that this point refers to. Max 200 characters. **Ensure this snippet is human-readable, not code or script data.**).

        If no critical points are found for a category, do not include that category.
        Ensure the entire response is valid JSON. Do not include any other text or markdown outside the JSON block.

        ---
        Legal Text to Analyze:\n${contentToAnalyze}
        ---
        `;

        // --- Call Gemini API ---
        console.log(`[${new Date().toISOString()}] Calling Gemini API...`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log(`[${new Date().toISOString()}] Raw Gemini API Response (text):`);
        console.log("----------------------------------------");
        console.log(responseText);
        console.log("----------------------------------------");

        let jsonString = responseText;
        if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
            jsonString = jsonString.substring(7, jsonString.length - 3).trim();
        } else {
             jsonString = jsonString.trim();
        }

        let parsedResult;
        try {
            parsedResult = JSON.parse(jsonString);
            console.log(`[${new Date().toISOString()}] Successfully Parsed Gemini JSON:`);
            console.log(JSON.stringify(parsedResult, null, 2));
        } catch (parseError) {
            console.error(`[${new Date().toISOString()}] FAILED to parse Gemini's JSON output:`, parseError);
            console.log("Raw Gemini Output that caused parse error:", responseText);
            return res.status(500).json({
                error: "AI could not generate valid structured JSON response.",
                rawAiOutput: responseText,
                summary: "AI analysis failed to provide structured data. Gemini's response was not valid JSON. Please try again or simplify the text for analysis."
            });
        }

        let finalResponseContent = {
            summary: "AI analysis complete. See critical points below.",
            critical_points: Array.isArray(parsedResult) ? parsedResult : []
        };

        finalResponseContent.critical_points = finalResponseContent.critical_points.map(point => ({
            category: point.category || 'Uncategorized',
            explanation: point.explanation || 'No explanation provided.',
            risk_level: (point.risk_level || 'NEUTRAL').toUpperCase(),
            reason: point.reason || 'N/A',
            original_snippet: (point.original_snippet || '').substring(0, 200).trim()
        }));

        console.log(`[${new Date().toISOString()}] Sending final response to frontend:`);
        console.log(JSON.stringify(finalResponseContent, null, 2));

        res.status(200).json(finalResponseContent);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Uncaught error in /analyze-legal-text endpoint:`, error);
        if (error.response && error.response.status) {
            console.error(`  Gemini API responded with status: ${error.response.status}`);
            console.error(`  Gemini API error data:`, error.response.data);
        }
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] AI Backend listening on port ${port}`);
    console.log(`[${new Date().toISOString()}] Health check available at /`);
    console.log(`[${new Date().toISOString()}] AI analysis endpoint: POST /analyze-legal-text`);
});