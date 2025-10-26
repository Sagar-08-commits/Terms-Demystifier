# Universal Terms Demystifier

## 1. Project Description

The Universal Terms Demystifier is a project designed to simplify complex legal documents (like Terms of Service and Privacy Policies) using Generative AI. It consists of a Chrome browser extension for on-page analysis and a web dashboard for viewing saved analyses.

The system uses a Node.js/Express backend to securely interface with the Gemini API (gemini-2.5-flash), which performs the analysis. The AI extracts key clauses, provides simple-language explanations, and assigns a risk level (Critical, Medium, Neutral, No Risk). User data and past analyses are stored in a MongoDB database, and authentication is managed via Auth0.

## 2. Project Structure

This repository is a monorepo containing two main projects in distinct folders:

- `/Web-extension`: Contains the source code for the Chrome browser extension (manifest, content scripts, background scripts, and popup UI).
- `/Dashboard`: This folder contains the complete web application, which is split into two parts:
  - `/Dashboard/backend`: Contains the source code for the Node.js, Express, and MongoDB backend server that powers both the extension and the web app.
  - `/Dashboard/frontend`: Contains the source code for the frontend web dashboard (likely React/Vite), where users can review and manage their saved analyses.

You will need to run all three parts (backend, frontend, and extension) concurrently.

## 3. Setup and Running the Code

To run this project, you must set up and run the backend API first, followed by the frontend and extension.

### A. Backend API (`/Dashboard/backend`)

The backend server handles all AI processing and database operations.

1.  **Navigate to the directory:**
    ```bash
    cd Dashboard/backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create an environment file:**
    Create a `.env` file in the `/Dashboard/backend` root and add your secret keys.

    ```dotenv
    # .env

    GEMINI_API_KEY=your_gemini_api_key_here
    MONGO_URI=your_mongodb_connection_string

    # Auth0 Configuration
    AUTH0_DOMAIN=your-auth0-tenant.us.auth0.com
    AUTH0_AUDIENCE=https://your-api-identifier.com
    ```

4.  **Run the server:**
    ```bash
    npm start
    ```
    The API will typically be running on `http://localhost:3000`.

### B. Chrome Extension (`/Web-extension`)

The extension extracts text from the user's active tab and communicates with the backend.

1.  **Ensure the Backend API is running.**
2.  **Load the extension in Chrome:**
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" (usually a toggle in the top-right corner).
    - Click "Load unpacked".
    - Select the `/Web-extension` folder from this repository.
3.  **Configure API Endpoint (if needed):**
    You may need to update the fetch URL in the extension's scripts (e.g., `background.js`) to point to your running backend (e.g., `http://localhost:3000/api/analyze`).

---

**ATTENTION: Auth0 and Local Extension IDs**

You cannot simply clone this repo and have the authentication work. Auth0 secures applications by only allowing redirects to pre-approved URLs. A Chrome extension loaded locally ("unpacked") is assigned a unique, temporary ID by your browser (e.g., `oihkpefggjgoopgopgabcdefgihk`).

This project's original Auth0 configuration is tied to its specific developer's local ID and will not work for you.

**To run this project, you must configure your own Auth0 Application:**

1.  **Get Your Local Extension ID:**

    - Load the extension locally using the steps above.
    - Go to your `chrome://extensions` page.
    - Find the "Terms Demystifier" card.
    - Copy the ID (it will be a long string of letters).

2.  **Configure Auth0:**

    - Log in to your [Auth0 Dashboard](https://manage.auth0.com/).
    - Go to `Applications` -> `Applications` and select the application you are using for this project.
    - Go to the `Settings` tab.
    - **Add your extension's URL to the following fields:**
      - **Allowed Callback URLs:** `chrome-extension://YOUR-EXTENSION-ID-HERE/callback`
      - **Allowed Web Origins:** `chrome-extension://YOUR-EXTENSION-ID-HERE`
    - Replace `YOUR-EXTENSION-ID-HERE` with the ID you copied in step 1.

3.  **Update Extension Code (if needed):**
    - Ensure the `auth0-config.js` (or similar, referring to your `background.js`) file in the `/extension` folder uses your Auth0 Application's Domain and Client ID.

---

### C. Web Dashboard (`/Dashboard/frontend`)

The web dashboard provides a UI for viewing saved analyses. (These instructions assume a standard React/Vite setup).

1.  **Navigate to the directory:**
    ```bash
    cd Dashboard/frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create an environment file:**
    Create a `.env.local` file in the `/Dashboard/frontend` root for your frontend Auth0 credentials.

    ```dotenv
    # .env.local

    VITE_AUTH0_DOMAIN=your-auth0-tenant.us.auth0.com
    VITE_AUTH0_CLIENT_ID=your_auth0_spa_client_id
    VITE_API_URL=http://localhost:3000
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The web app will typically be available at `http://localhost:5173`.

