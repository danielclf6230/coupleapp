import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "../styles/Album.css";
import imageCompression from "browser-image-compression";

const baseURL = process.env.REACT_APP_API_URL;

const Album = () => {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("July-2025");
  const [selectedTypeForUpload, setSelectedTypeForUpload] = useState("");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  const fileInput = useRef();
  const cancelUploadRef = useRef(false);

  const fetchPhotos = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/album`);
      setPhotos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelUploadHandler = () => {
    cancelUploadRef.current = true;
    setUploading(false);
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

        if (cancelUploadRef.current) break;

        const formData = new FormData();
        formData.append("image", compressedFile);
        formData.append("date", new Date().toISOString().slice(0, 10));
        formData.append("type", selectedTypeForUpload);

        await axios.post(`${baseURL}/api/album/upload`, formData);
      }

      if (!cancelUploadRef.current) {
        fetchPhotos();
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      setSelectedTypeForUpload("");
      fileInput.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${baseURL}/api/album/${id}`);
      fetchPhotos();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  return (
    <div className="album-root">
      <div className="album-wrapper">
        <div className="album-header">
          <div>
            <h3>📸 My Album</h3>
            <p>Upload your memories</p>
          </div>
          <div className="album-controls">
            <label htmlFor="type">Type:</label>
            <select
              id="type"
              className="type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="July-2025">July-2025</option>
              <option value="Feb-2025">Feb-2025</option>
              <option value="Nov-2024">Nov-2024</option>
              <option value="Sep-2024">Sep-2024</option>
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

              <h3 className="upload-popup-title">Select type</h3>

              <div className="upload-popup-controls">
                <select
                  className="upload-popup-select"
                  value={selectedTypeForUpload}
                  onChange={(e) => setSelectedTypeForUpload(e.target.value)}
                >
                  <option value="">-- Choose Type --</option>
                  <option value="July-2025">July-2025</option>
                  <option value="Feb-2025">Feb-2025</option>
                  <option value="Nov-2024">Nov-2024</option>
                  <option value="Sep-2024">Sep-2024</option>
                </select>

                <button
                  className="upload-popup-continue-btn"
                  disabled={!selectedTypeForUpload}
                  onClick={() => {
                    setShowTypeSelector(false);
                    fileInput.current.click();
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="album-frame">
          <div className="album-grid">
            {photos
              .filter((photo) => !selectedType || photo.a_type === selectedType)
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
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this photo?"
                          )
                        ) {
                          handleDelete(photo.id);
                        }
                      }}
                      title="Delete"
                    >
                      ❌
                    </button>
                  </div>
                  <p>{photo.a_type}</p>
                </div>
              ))}
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
      </div>

      {uploading && (
        <div className="upload-overlay">
          <div className="upload-popup">
            <p>📤 Uploading images...</p>
            <button onClick={cancelUploadHandler}>❌ Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Album;
