import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";

export default function App() {
  const [user, setUser] = useState(null);
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: isAuth0Loading,
    logout,
  } = useAuth0();

  // This logic is correct and stays the same
  useEffect(() => {
    if (!isAuth0Loading && isAuthenticated && auth0User) {
      setUser({ email: auth0User.email, isReal: true });
    } else if (!isAuth0Loading && !isAuthenticated) {
      setUser((currentUser) => {
        if (currentUser && currentUser.isReal) {
          return null;
        }
        return currentUser;
      });
    }
  }, [auth0User, isAuthenticated, isAuth0Loading]);

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    if (user && user.isReal) {
      logout({ logoutParams: { returnTo: `${window.location.origin}/login` } });
    } else {
      setUser(null);
    }
  };

  // --- THIS IS THE NEW, SMARTER LOADING LOGIC ---
  // We are loading if Auth0 is loading
  // OR if Auth0 is authenticated but our local `user` state hasn't caught up yet.
  const isLoading = isAuth0Loading || (isAuthenticated && !user);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Loading...
      </div>
    );
  }

  // --- THIS IS THE NEW, SMARTER ROUTER ---
  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/login"
          // This new logic prevents seeing the login page if you're already logged in
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
