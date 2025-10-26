import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  return (
    <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-turquoise to-coral flex items-center justify-center text-white font-bold">
          TD
        </div>
        <Link to="/dashboard" className="font-semibold text-gray-800">
          Terms Demystifier
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {user && <span className="text-sm text-gray-600">{user.email}</span>}
        {user ? (
          <button
            onClick={onLogout}
            className="text-sm text-white bg-gradient-to-r from-turquoise to-coral px-3 py-1 rounded-md"
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="text-sm text-gray-700">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
