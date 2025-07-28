import React from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import Login from "./pages/Login";
import Header from "./components/Header";
import Album from "./pages/Album";
import Movies from "./pages/Movies";
import CountDowns from "./pages/CountDowns";
import Notes from "./pages/Notes";

axios.defaults.withCredentials = true;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/album"
          element={
            <ProtectedRoute>
              <>
                <Header />
                <Album />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/movies"
          element={
            <ProtectedRoute>
              <>
                <Header />
                <Movies />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/countdowns"
          element={
            <ProtectedRoute>
              <>
                <Header />
                <CountDowns />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <>
                <Header />
                <Notes />
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
// deploy test
