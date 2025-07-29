import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import "../styles/Movies.css";
import imageCompression from "browser-image-compression";

const baseURL = process.env.REACT_APP_API_URL;

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const fileInput = useRef();
  const cancelUploadRef = useRef(false);

  const fetchMovies = useCallback(async () => {
    try {
      const res = await axios.get(`${baseURL}/api/movies`, {
        params: { search },
      });
      setMovies(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [search]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleUpload = async () => {
    if (!editingMovie) return;

    setUploading(true);
    cancelUploadRef.current = false;

    try {
      const file = fileInput.current.files?.[0];
      const formData = new FormData();

      if (file) {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        formData.append("poster", compressedFile);
      }

      formData.append("id", editingMovie.id ?? "");
      formData.append("m_name", editingMovie.m_name);
      formData.append("m_status", editingMovie.m_status);
      formData.append(
        "m_watched_date",
        editingMovie.m_watched_date?.trim() === ""
          ? ""
          : editingMovie.m_watched_date
      );
      await axios.post(`${baseURL}/api/movies/upload`, formData);
      setEditingMovie(null);
      setSearch(""); // refresh state
      await fetchMovies();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleFormChange = (key, value) => {
    setEditingMovie((prev) => ({ ...prev, [key]: value }));
  };

  const handleDelete = async () => {
    if (!editingMovie?.id) return;

    if (window.confirm("Are you sure you want to delete this movie?")) {
      try {
        await axios.delete(`${baseURL}/api/movies/${editingMovie.id}`);
        setEditingMovie(null);
        setSearch(""); // refresh state
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  return (
    <div className="movie-root">
      <div className="movie-wrapper">
        <div className="movie-header">
          <div>
            <h3>🎬 My Movies</h3>
            <p>Upload watched or to-watch movies</p>
          </div>
          <div className="movie-controls">
            <label htmlFor="search">Search:</label>
            <input
              type="text"
              id="search"
              className="movie-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movie name"
            />
            <button
              className="movie-upload-btn"
              onClick={() =>
                setEditingMovie({
                  id: null,
                  m_name: "",
                  m_status: 0,
                  m_watched_date: "",
                })
              }
            >
              ➕ Add New Movie
            </button>
          </div>
        </div>

        <div className="movie-frame">
          <div className="movie-grid">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="movie-card"
                onClick={() => setEditingMovie(movie)}
              >
                <div className="movie-image-wrapper">
                  <img src={movie.m_img} alt={movie.m_name} />
                  {movie.m_status === 1 && (
                    <div className="watched-badge">✔ Watched</div>
                  )}
                </div>
                <p>{movie.m_name}</p>
              </div>
            ))}
          </div>
        </div>

        {editingMovie && (
          <div className="movie-upload-overlay">
            <div className="movie-upload-popup">
              <button
                className="movie-close-button"
                onClick={() => setEditingMovie(null)}
              >
                ❌
              </button>
              <h4 className="movie-popup-title">
                {editingMovie.id ? "Edit Movie" : "Add New Movie"}
              </h4>

              {editingMovie.m_img && (
                <img
                  src={editingMovie.m_img}
                  alt={editingMovie.m_name}
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    marginBottom: "16px",
                  }}
                />
              )}

              <input
                className="movie-input"
                placeholder="Movie Name"
                value={editingMovie.m_name}
                onChange={(e) => handleFormChange("m_name", e.target.value)}
              />
              <input
                className="movie-input"
                type="date"
                value={
                  editingMovie.m_watched_date
                    ? editingMovie.m_watched_date.slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  handleFormChange("m_watched_date", e.target.value)
                }
              />
              <select
                className="movie-input"
                value={editingMovie.m_status}
                onChange={(e) =>
                  handleFormChange("m_status", parseInt(e.target.value))
                }
              >
                <option value={1}>Watched</option>
                <option value={0}>Not Watched</option>
              </select>
              <input type="file" ref={fileInput} accept="image/*" />

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="movie-upload-btn" onClick={handleUpload}>
                  Save
                </button>
                {editingMovie.id && (
                  <button
                    className="movie-upload-btn"
                    style={{ backgroundColor: "#ff6b6b" }}
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {uploading && (
          <div className="upload-overlay">
            <div className="upload-popup">
              <p>📤 Uploading poster...</p>
              <button onClick={() => (cancelUploadRef.current = true)}>
                ❌ Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;
