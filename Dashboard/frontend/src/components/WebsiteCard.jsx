import React, { useState } from "react";

// === Helper Functions ===
const calculateRiskScore = (analysis) => {
  if (!analysis?.critical_points || analysis.critical_points.length === 0)
    return 0;
  const riskValues = { HIGH: 100, MEDIUM: 60, LOW: 20, NEUTRAL: 0 };
  const sum = analysis.critical_points.reduce((acc, point) => {
    return acc + (riskValues[point.risk_level?.toUpperCase()] || 0);
  }, 0);
  return Math.round(sum / analysis.critical_points.length);
};

const getDisplayName = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return "Invalid URL";
  }
};

const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString();
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return "Invalid Date";
  }
};

const shortenSummary = (summary, maxLength = 100) => {
  if (!summary) return "No summary available.";
  if (summary.length <= maxLength) return summary;
  return summary.substring(0, maxLength) + "...";
};

const getRiskColor = (riskLevel) => {
  switch ((riskLevel || "NEUTRAL").toUpperCase()) {
    case "HIGH":
      return "#d9534f"; // Red
    case "MEDIUM":
      return "#f0ad4e"; // Orange
    case "LOW":
      return "#5cb85c"; // Green
    default:
      return "#5bc0de"; // Blue
  }
};

// === Main Component ===
export default function WebsiteCard({ analysis }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const riskScore = calculateRiskScore(analysis);
  const displayName = getDisplayName(analysis.url);
  const lastAnalyzed = formatDate(analysis.updatedAt || analysis.createdAt);

  const scoreColorClass =
    riskScore > 60
      ? "bg-red-100 text-red-700"
      : riskScore > 30
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(analysis.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const handleViewDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleAnalyzeLink = () => {
    window.open(analysis.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-4 hover:shadow-lg transition flex flex-col justify-between">
      {/* === Top Section === */}
      <div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <p
                className="text-sm text-gray-500 truncate max-w-[200px]"
                title={analysis.url}
              >
                {analysis.url}
              </p>
              <button
                onClick={handleCopyUrl}
                className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Last analyzed: {lastAnalyzed}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${scoreColorClass}`}
          >
            {riskScore}%
          </div>
        </div>

        {/* === Shortened Summary === */}
        <p className="mt-3 text-sm text-gray-700">
          <span className="font-semibold">Summary:</span>{" "}
          {shortenSummary(analysis.summary)}
        </p>
      </div>

      {/* === Details Section (Expandable) === */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-gray-200 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Critical Points:
          </h4>
          {analysis.critical_points && analysis.critical_points.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 text-xs">
              {analysis.critical_points.map((p, index) => (
                <li key={index} style={{ color: getRiskColor(p.risk_level) }}>
                  <strong>{p.category || "Point"}:</strong>
                  <span className="text-gray-600 ml-1">{p.explanation}</span>
                  {p.original_snippet && (
                    <p
                      className="text-gray-400 italic text-xs ml-4 truncate"
                      title={p.original_snippet}
                    >
                      Original: "{p.original_snippet}"
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">No critical points found.</p>
          )}
        </div>
      )}

      {/* === Buttons Section === */}
      <div className="mt-4 flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={handleViewDetails}
          className="text-sm px-3 py-1 bg-turquoise/10 text-turquoise rounded-md hover:bg-turquoise/20 transition"
        >
          {showDetails ? "Hide Details" : "View Details"}
        </button>
        <button
          onClick={handleAnalyzeLink}
          className="text-sm px-3 py-1 bg-coral/10 text-coral rounded-md hover:bg-coral/20 transition"
        >
          Go to Site
        </button>
      </div>
    </div>
  );
}
