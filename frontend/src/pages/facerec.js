import * as faceapi from "@vladmandic/face-api";
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api";
function Facerec() {
  let navigate = useNavigate();

  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  const [captureVideo, setCaptureVideo] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [faceDetected, setFaceDetected] = React.useState(false);
  const [cameraError, setCameraError] = React.useState("");

  const videoRef = React.useRef();
  const streamRef = React.useRef(null);
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = React.useRef();
  const intervalRef = React.useRef(null);
  const isDetectingRef = React.useRef(false);
  const lastRecognitionAttemptRef = React.useRef(0);

  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + "/models";

        // Explicitly initialize the WebGL backend before loading models
        await faceapi.tf.setBackend("webgl");
        await faceapi.tf.ready();

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model loading error:", err);
        setCameraError(
          "Failed to load face detection models. Please refresh the page.",
        );
      }
    };
    loadModels();

    // Cleanup on unmount
    return () => {
      isDetectingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Use the streamRef here for safety!
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startVideo = () => {
    setCameraError("");
    setCaptureVideo(true);
    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then((stream) => {
        streamRef.current = stream;
        let video = videoRef.current;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error("Camera error:", err);
        setCameraError(
          "Unable to access camera. Please check permissions and try again.",
        );
        setCaptureVideo(false);
      });
  };

  const HandleVideoOnPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (isDetectingRef.current) {
        return;
      }

      if (!modelsLoaded) {
        return;
      }

      try {
        if (
          canvasRef &&
          canvasRef.current &&
          videoRef &&
          videoRef.current &&
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
        ) {
          isDetectingRef.current = true;

          // Clear previous canvas
          canvasRef.current.innerHTML = "";

          const displaySize = {
            width: videoWidth,
            height: videoHeight,
          };

          faceapi.matchDimensions(canvasRef.current, displaySize);

          // Extract face with descriptors
          const detections = await faceapi
            .detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions(),
            )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptors();

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize,
          );

          canvasRef.current
            .getContext("2d")
            .clearRect(0, 0, videoWidth, videoHeight);

          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceExpressions(
            canvasRef.current,
            resizedDetections,
          );

          setFaceDetected(detections.length > 0);

          // Try to recognize face if detected and enough time has passed
          if (
            detections.length > 0 &&
            Date.now() - lastRecognitionAttemptRef.current > 2000
          ) {
            lastRecognitionAttemptRef.current = Date.now();
            const descriptor = Array.from(detections[0].descriptor);

            // Attempt to recognize the face
            try {
              const response = await axios.post(
                `${API_BASE_URL}/recognize-face`,
                { faceEmbedding: descriptor },
              );

              if (response.status === 200) {
                const userData = response.data.user;
                // Auto-login
                localStorage.setItem("member_id", userData.member_id);
                localStorage.setItem("name", userData.name);
                localStorage.setItem("account", userData.account);
                localStorage.setItem("picture", userData.picture);
                localStorage.setItem("age", userData.age);

                // 🛑 TURN OFF THE CAMERA HERE
                closeWebcam();

                navigate("/dashboard");
              }
            } catch (recognitionErr) {
              console.log(
                "Face recognition error:",
                recognitionErr.response?.data?.error || "Unknown error",
              );
              setError(
                recognitionErr.response?.data?.error ||
                  "Face not recognized. Please enter your credentials.",
              );
            }
          }
        }
      } catch (err) {
        console.error("Face detection error:", err);
      } finally {
        isDetectingRef.current = false;
      }
    }, 100);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setError("");
    setIsLoading(true);

    axios
      .post(`${API_BASE_URL}/login`, {
        username: username,
        password: password,
      })
      .then((res) => {
        if (res.status === 200) {
          localStorage.setItem("member_id", res.data.member_id);
          localStorage.setItem("name", res.data.name);
          localStorage.setItem("account", res.data.account);
          localStorage.setItem("picture", res.data.picture);
          localStorage.setItem("age", res.data.age);
          console.log(res.data.member_id);
          console.log(localStorage);
          navigate("/dashboard");
        }
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);

        if (err.response) {
          const status = err.response.status;
          if (status === 404) {
            setError("Username not found. Please check your username.");
          } else if (status === 400) {
            setError("Incorrect password. Please try again.");
          } else if (status === 500) {
            setError("Server error. Please try again later.");
          } else {
            setError("Login failed. Please try again.");
          }
        } else {
          setError(
            "Unable to connect to the server. Please check your connection.",
          );
        }
      });
  };

  const handleInputChange = (value, setter) => {
    setter(value);
    setError("");
  };
  const closeWebcam = () => {
    isDetectingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Safely turn off the hardware stream directly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCaptureVideo(false);
    setFaceDetected(false);
  };

  return (
    <div>
      <div style={{ textAlign: "center", padding: "10px" }}>
        {cameraError && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              color: "#721c24",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "5px",
              fontSize: "14px",
              maxWidth: "500px",
              margin: "0 auto 15px auto",
            }}
          >
            {cameraError}
          </div>
        )}
        {captureVideo && modelsLoaded ? (
          <button
            onClick={closeWebcam}
            style={{
              cursor: "pointer",
              backgroundColor: "green",
              color: "white",
              padding: "15px",
              fontSize: "25px",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Close Webcam
          </button>
        ) : (
          <button
            onClick={startVideo}
            style={{
              cursor: "pointer",
              backgroundColor: "green",
              color: "white",
              padding: "15px",
              fontSize: "25px",
              border: "none",
              borderRadius: "10px",
            }}
          >
            Open Webcam
          </button>
        )}
      </div>
      {captureVideo ? (
        modelsLoaded ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px",
              }}
            >
              <video
                ref={videoRef}
                height={videoHeight}
                width={videoWidth}
                onPlay={HandleVideoOnPlay}
                onLoadedMetadata={HandleVideoOnPlay}
                style={{ borderRadius: "10px" }}
                autoPlay
              />
              <canvas ref={canvasRef} style={{ position: "absolute" }} />
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "10px",
                marginTop: "20px",
              }}
            >
              {faceDetected && (
                <p
                  style={{
                    color: "green",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  ✓ Face detected!
                </p>
              )}
              {!faceDetected && (
                <p style={{ color: "orange", fontSize: "18px" }}>
                  No face detected - please ensure your face is visible
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>loading...</div>
        )
      ) : (
        <></>
      )}

      <div
        style={{
          textAlign: "center",
          padding: "20px",
          maxWidth: "500px",
          margin: "0 auto",
        }}
      >
        <h2>Login with Webcam</h2>
        {error && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              border: "1px solid #f5c6cb",
              color: "#721c24",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "5px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "15px", textAlign: "left" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => handleInputChange(e.target.value, setUsername)}
              placeholder="Enter your username"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px", textAlign: "left" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => handleInputChange(e.target.value, setPassword)}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                fontSize: "16px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              cursor: isLoading ? "not-allowed" : "pointer",
              backgroundColor: isLoading ? "#7fd9b8" : "#5eb193",
              color: "white",
              padding: "12px 30px",
              fontSize: "16px",
              border: "none",
              borderRadius: "5px",
              width: "100%",
              opacity: isLoading ? 0.9 : 1,
            }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "15px" }}>
          <Link
            to="/login"
            style={{
              color: "#5eb193",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Back to Regular Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Facerec;
