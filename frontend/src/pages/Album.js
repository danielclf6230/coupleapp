import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import ConfirmDialog from "../components/ConfirmDialog";
import "../styles/Album.css";
import imageCompression from "browser-image-compression";

const baseURL = process.env.REACT_APP_API_URL;

const Album = () => {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [selectedAlbumIdForUpload, setSelectedAlbumIdForUpload] = useState("");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [creatingNewAlbum, setCreatingNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [previewImg, setPreviewImg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fileInput = useRef();
  const cancelUploadRef = useRef(false);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await axios.get(`${baseURL}/api/album`);
      setPhotos(res.data);
    } catch (err) {
      console.error("Error fetching photos:", err);
    }
  }, []);

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await axios.get(`${baseURL}/api/album/types`);
      setAlbums(res.data);
      if (!selectedAlbumId && res.data.length > 0) {
        setSelectedAlbumId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching albums:", err);
    }
  }, [selectedAlbumId]);

  useEffect(() => {
    fetchPhotos();
    fetchAlbums();
  }, [fetchPhotos, fetchAlbums]);

  const handleDelete = (photoId) => {
    setDeleteTargetId(photoId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;

    try {
      setDeletingId(deleteTargetId);
      await axios.delete(`${baseURL}/api/album/${deleteTargetId}`);
      setPhotos((prev) => prev.filter((photo) => photo.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete image");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploading(true);
    cancelUploadRef.current = false;

    try {
      for (const file of files) {
        if (cancelUploadRef.current) break;

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });

        const formData = new FormData();
        formData.append("image", compressedFile);
        formData.append("album_id", selectedAlbumIdForUpload);
        formData.append("date", new Date().toISOString().slice(0, 10));

        await axios.post(`${baseURL}/api/album/upload`, formData);
      }

      if (!cancelUploadRef.current) fetchPhotos();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      setSelectedAlbumIdForUpload("");
      fileInput.current.value = "";
    }
  };

  const handleCreateAlbum = async () => {
    try {
      await axios.post(`${baseURL}/api/album/create`, { name: newAlbumName });
      alert("Album created successfully!");
      setCreatingNewAlbum(false);
      setNewAlbumName("");
      fetchAlbums();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create album");
    }
  };

  return (
    <div className="album-root">
      <div className="album-wrapper">
        <div className="album-header">
          <div>
            <h3>📸 My Album</h3>
            <p>Upload your memories</p>
          </div>
          <div className="album-controls">
            <label htmlFor="album">Album:</label>
            <select
              id="album"
              className="type-select"
              value={selectedAlbumId || ""}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
            >
              <option value="">-- Select Album --</option>
              {albums.length > 0 ? (
                albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))
              ) : (
                <option disabled>Loading albums...</option>
              )}
            </select>

            <button
              className="upload-btn"
              onClick={() => setShowTypeSelector(true)}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "➕ Upload"}
            </button>

            <input
              type="file"
              ref={fileInput}
              multiple
              style={{ display: "none" }}
              onChange={handleUpload}
              accept="image/*"
            />
          </div>
        </div>

        {showTypeSelector && (
          <div className="upload-type-popup-overlay">
            <div className="upload-type-popup">
              <button
                className="upload-popup-close-btn"
                onClick={() => setShowTypeSelector(false)}
              >
                ❌
              </button>

              <h3 className="upload-popup-title">Select or Create Album</h3>

              <div className="upload-popup-controls">
                <select
                  className="upload-popup-select"
                  value={selectedAlbumIdForUpload}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__new__") setCreatingNewAlbum(true);
                    else {
                      setSelectedAlbumIdForUpload(val);
                      setCreatingNewAlbum(false);
                    }
                  }}
                >
                  <option value="">-- Choose Album --</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.name}
                    </option>
                  ))}
                  <option value="__new__">➕ Create New Album</option>
                </select>

                {creatingNewAlbum && (
                  <div className="create-new-album-section">
                    <input
                      type="text"
                      placeholder="Enter album name"
                      className="upload-popup-input"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                    />
                    <button
                      className="upload-popup-continue-btn"
                      disabled={!newAlbumName}
                      onClick={handleCreateAlbum}
                    >
                      Create
                    </button>
                  </div>
                )}

                {!creatingNewAlbum && (
                  <button
                    className="upload-popup-continue-btn"
                    disabled={!selectedAlbumIdForUpload}
                    onClick={() => {
                      setShowTypeSelector(false);
                      fileInput.current.click();
                    }}
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="album-frame">
          <div className="album-scroll">
            <div className="album-grid">
              {photos
                .filter(
                  (photo) =>
                    !selectedAlbumId ||
                    Number(photo.album_id) === Number(selectedAlbumId),
                )
                .map((photo) => (
                  <div key={photo.id} className="album-card">
                    <div className="album-image-wrapper">
                      <img
                        src={photo.a_img}
                        alt="memory"
                        onClick={() => setPreviewImg(photo.a_img)}
                        style={{ cursor: "pointer" }}
                      />

                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(photo.id)}
                        disabled={deletingId === photo.id}
                      >
                        {deletingId === photo.id ? "..." : "🗑"}
                      </button>
                    </div>
                    <p>{photo.album_name}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {previewImg && (
        <div className="preview-modal" onClick={() => setPreviewImg(null)}>
          <div
            className="preview-container"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={previewImg} alt="preview" />
          </div>
        </div>
      )}

      {uploading && (
        <div className="upload-overlay">
          <div className="upload-popup">
            <p>📤 Uploading images...</p>
            <button onClick={() => (cancelUploadRef.current = true)}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete image?"
        message="This image will be removed from the album."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
        disabled={deletingId !== null}
      />
    </div>
  );
};

export default Album;
