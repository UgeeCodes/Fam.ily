import * as faceapi from "@vladmandic/face-api";
import React, { useState, useRef } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const FaceRegistration = ({ username, onSuccess, onSkip }) => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captureVideo, setCaptureVideo] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [descriptorCaptured, setDescriptorCaptured] = useState(false);

  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);
  const videoHeight = 400;
  const videoWidth = 500;
  const intervalRef = useRef(null);
  const isDetectingRef = useRef(false);
  const currentDescriptorRef = useRef(null);

  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = (process.env.PUBLIC_URL || "") + "/models";
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
        setError("Failed to load face detection models.");
      }
    };
    loadModels();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startVideo = () => {
    setError("");
    setCaptureVideo(true);
    navigator.mediaDevices
      .getUserMedia({ video: { width: 300 } })
      .then((stream) => {
        streamRef.current = stream; // <--- SAVE IT HERE
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch((err) => {
        console.error("Camera error:", err);
        setError("Unable to access camera. Please check permissions.");
        setCaptureVideo(false);
      });
  };

  const detectFace = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (isDetectingRef.current || !modelsLoaded) {
        return;
      }

      try {
        if (
          canvasRef.current &&
          videoRef.current &&
          videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
        ) {
          isDetectingRef.current = true;

          canvasRef.current.innerHTML = "";

          const displaySize = {
            width: videoWidth,
            height: videoHeight,
          };

          faceapi.matchDimensions(canvasRef.current, displaySize);

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

          if (detections.length > 0) {
            setFaceDetected(true);
            // Store the descriptor for registration
            currentDescriptorRef.current = Array.from(detections[0].descriptor);
          } else {
            setFaceDetected(false);
            currentDescriptorRef.current = null;
          }
        }
      } catch (err) {
        console.error("Face detection error:", err);
      } finally {
        isDetectingRef.current = false;
      }
    }, 100);
  };

  const closeWebcam = () => {
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
    setDescriptorCaptured(false);
    currentDescriptorRef.current = null;
  };

  const captureFaceDescriptor = async () => {
    console.log("Capture Descriptor clicked", {
      hasDescriptor: !!currentDescriptorRef.current,
      descriptorLength: currentDescriptorRef.current?.length,
    });

    if (!currentDescriptorRef.current) {
      setError("No face detected. Please ensure your face is visible.");
      return;
    }

    setDescriptorCaptured(true);
    setError("");
    console.log("Face descriptor captured successfully");

    // Immediately trigger the database save and redirect
    await registerFace();
  };

  const registerFace = async () => {
    if (!currentDescriptorRef.current) {
      setError("No face detected. Please ensure your face is visible.");
      return;
    }

    setIsRegistering(true);
    setError("");

    try {
      console.log("Sending face registration request:", {
        username,
        descriptorLength: currentDescriptorRef.current.length,
        apiUrl: `${API_BASE_URL}/register-face`,
      });

      const payload = {
        username: username,
        faceEmbedding: currentDescriptorRef.current,
      };

      console.log("Payload:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/register-face`,
        payload,
      );

      console.log("Registration response:", response);
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      // Success on 200 or 201
      if (response.status === 200 || response.status === 201) {
        console.log("Face registration succeeded");
        setSuccess(true);
        setError(""); // Clear any previous errors

        setTimeout(() => {
          closeWebcam();
          if (onSuccess) {
            console.log("Calling onSuccess callback");
            onSuccess();
          }
        }, 1500);
      } else {
        setError("Unexpected response from server. Please try again.");
        setIsRegistering(false);
      }
    } catch (err) {
      console.error("Registration error:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      console.error("Error message:", err.message);
      console.error("Error status:", err.response?.status);

      let errorMessage = "Failed to register face. Please try again.";

      if (err.response?.status === 404) {
        errorMessage = "User not found. Please register with correct username.";
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid face data. Please try capturing again.";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message === "Network Error") {
        errorMessage = "Network error. Make sure backend is running.";
      }

      setError(errorMessage);
      setIsRegistering(false);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#f9f9f9",
        borderRadius: "10px",
      }}
    >
      <h2>Optional: Register Your Face for Easy Login</h2>
      <p>
        Capture your face to enable automatic login. You can skip this and use
        your username/password to login later.
      </p>

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

      {success && (
        <div
          style={{
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            color: "#155724",
            padding: "10px",
            marginBottom: "15px",
            borderRadius: "5px",
            fontSize: "14px",
          }}
        >
          ✓ Face registered successfully! Redirecting...
        </div>
      )}

      {!captureVideo ? (
        <button
          onClick={startVideo}
          disabled={!modelsLoaded}
          style={{
            cursor: modelsLoaded ? "pointer" : "not-allowed",
            backgroundColor: modelsLoaded ? "green" : "#ccc",
            color: "white",
            padding: "12px 30px",
            fontSize: "16px",
            border: "none",
            borderRadius: "5px",
            marginBottom: "15px",
            opacity: modelsLoaded ? 1 : 0.6,
          }}
        >
          {modelsLoaded ? "Start Webcam" : "Loading Models..."}
        </button>
      ) : success ? null : (
        <>
          {modelsLoaded && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px",
                marginBottom: "15px",
                position: "relative",
              }}
            >
              <video
                ref={videoRef}
                height={videoHeight}
                width={videoWidth}
                onPlay={detectFace}
                style={{ borderRadius: "10px" }}
                autoPlay
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  marginLeft: "-250px",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}

          {!descriptorCaptured && faceDetected && (
            <p style={{ color: "green", fontSize: "16px", fontWeight: "bold" }}>
              ✓ Face detected!
            </p>
          )}
          {descriptorCaptured && (
            <p style={{ color: "blue", fontSize: "16px", fontWeight: "bold" }}>
              ✓ Face descriptor captured! Registering...
            </p>
          )}
          {!faceDetected && !descriptorCaptured && (
            <p style={{ color: "orange", fontSize: "16px" }}>
              No face detected - please ensure your face is visible
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "15px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={closeWebcam}
              style={{
                cursor: "pointer",
                backgroundColor: "#dc3545",
                color: "white",
                padding: "10px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Close Webcam
            </button>

            <button
              onClick={captureFaceDescriptor}
              disabled={!faceDetected || isRegistering}
              style={{
                cursor:
                  faceDetected && !isRegistering ? "pointer" : "not-allowed",
                backgroundColor:
                  faceDetected && !isRegistering ? "#007bff" : "#ccc",
                color: "white",
                padding: "10px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "5px",
                opacity: faceDetected && !isRegistering ? 1 : 0.6,
              }}
            >
              {isRegistering
                ? "Registering & Redirecting..."
                : "Capture & Register"}
            </button>
          </div>
        </>
      )}

      <button
        onClick={() => {
          closeWebcam();
          onSkip();
        }}
        style={{
          cursor: "pointer",
          backgroundColor: "#6c757d",
          color: "white",
          padding: "10px 20px",
          fontSize: "14px",
          border: "none",
          borderRadius: "5px",
          marginTop: "10px",
        }}
      >
        Skip Face Registration
      </button>
    </div>
  );
};

export default FaceRegistration;
