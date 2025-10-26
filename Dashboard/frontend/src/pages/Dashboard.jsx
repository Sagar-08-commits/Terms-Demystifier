import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import WebsiteCard from "../components/WebsiteCard";

// === Dummy Data (for demo/non-real users) ===
const DUMMY_WEBSITES = [
  {
    _id: "d1",
    name: "LeetCode",
    url: "https://leetcode.com/",
    lastAnalyzed: "2025-10-25",
    riskScore: 72,
    summary:
      "Data Sharing: Third Party Advertisements on the service can collect your Information.",
    language: "English",
  },
  {
    _id: "d2",
    name: "Amazon",
    url: "https://www.amazon.in",
    lastAnalyzed: "2025-10-20",
    riskScore: 53,
    summary:
      "Dispute Resolution: Any disputes or claims must be resolved through binding arbitration, not in court.",
    language: "English",
  },
  {
    _id: "d3",
    name: "Facebook",
    url: "https://www.facebook.com",
    lastAnalyzed: "2025-10-24",
    riskScore: 62,
    summary:
      "Data Retention: Even if you delete your account or content, full deletion can take up to 90 days.",
    language: "English",
  },
  {
    _id: "d4",
    name: "X",
    url: "https://x.com",
    lastAnalyzed: "2025-10-24",
    riskScore: 43,
    summary:
      "Cancellation: X reserves the right to terminate your account or stop providing services at any time, for any or no reason.",
    language: "English",
  },
];

export default function Dashboard({ user }) {
  const [websites, setWebsites] = useState([]); // Hold RAW analyses
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    if (user && user.isReal) {
      const fetchDashboardData = async () => {
        setIsLoading(true);
        setError(null);
        console.log(
          "[Dashboard.jsx] Starting fetch for REAL user:",
          user.email
        );

        try {
          const token = await getAccessTokenSilently();
          console.log(
            "[Dashboard.jsx] Got token:",
            token
              ? `Token received (length: ${token.length})`
              : "Token is null/undefined!"
          );

          const res = await fetch("http://localhost:8080/api/dashboard", {
            headers: { Authorization: `Bearer ${token}` },
          });

          console.log("[Dashboard.jsx] Fetch response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            console.error(
              "[Dashboard.jsx] Fetch failed! Status:",
              res.status,
              "Body:",
              errorText
            );
            throw new Error(`Failed to fetch: ${res.status} - ${errorText}`);
          }

          const rawData = await res.json();
          console.log(
            "[Dashboard.jsx] Raw data received from backend:",
            rawData
          );

          // No processing — use raw data directly
          setWebsites(rawData);
        } catch (e) {
          console.error("[Dashboard.jsx] Error during fetch or processing:", e);
          setError(e.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchDashboardData();
    } else if (user) {
      console.log("[Dashboard.jsx] Loading DUMMY data for user:", user.email);
      setWebsites(DUMMY_WEBSITES);
      setIsLoading(false);
    } else {
      console.warn("[Dashboard.jsx] User object is null.");
      setIsLoading(false);
    }
  }, [user, getAccessTokenSilently]);

  // === Loading State ===
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <h1 className="text-2xl font-semibold text-gray-700 animate-pulse">
          Loading Dashboard...
        </h1>
      </div>
    );
  }

  // === Error State ===
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-3xl font-bold text-red-600">Error</h1>
        <p className="text-gray-700">{error}</p>
      </div>
    );
  }

  // === Avg Risk Calculation (direct from raw analyses) ===
  const calculateAvgRisk = (analyses) => {
    if (!analyses || analyses.length === 0) return 0;
    const riskValues = { HIGH: 100, MEDIUM: 60, LOW: 20, NEUTRAL: 0 };
    let totalScoreSum = 0;
    let validAnalysesCount = 0;

    analyses.forEach((analysis) => {
      if (analysis.critical_points && analysis.critical_points.length > 0) {
        const sum = analysis.critical_points.reduce((acc, point) => {
          return acc + (riskValues[point.risk_level?.toUpperCase()] || 0);
        }, 0);
        totalScoreSum += sum / analysis.critical_points.length;
        validAnalysesCount++;
      }
    });

    return validAnalysesCount > 0
      ? Math.round(totalScoreSum / validAnalysesCount)
      : 0;
  };

  const avgRisk = calculateAvgRisk(websites);

  // === Render Dashboard ===
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header + Stats */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Overview of recent website analyses
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">Analyses</p>
              <p className="text-xl font-semibold text-gray-800">
                {websites.length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-500">Avg. Risk</p>
              <p className="text-xl font-semibold text-gray-800">{avgRisk}%</p>
            </div>
          </div>
        </div>

        {/* Website Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {websites.length > 0 ? (
            websites.map((analysis) => (
              <WebsiteCard key={analysis._id} analysis={analysis} />
            ))
          ) : (
            <p className="text-gray-600 col-span-full text-center">
              {user && !user.isReal
                ? "Showing demo data. Sign in for real analyses!"
                : "Your dashboard is empty. Use the browser extension to analyze a website!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
