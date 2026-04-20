const User = require("../models/user");

// Euclidean distance between two embeddings
const calculateDistance = (embedding1, embedding2) => {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

// Register a face embedding for a user
const registerFace = async (req, res) => {
  try {
    const { username, faceEmbedding } = req.body;

    console.log("Register Face Request:", {
      username,
      faceEmbeddingLength: faceEmbedding ? faceEmbedding.length : 0,
    });

    if (!username || !faceEmbedding || !Array.isArray(faceEmbedding)) {
      console.error("Invalid request data:", {
        hasUsername: !!username,
        hasFaceEmbedding: !!faceEmbedding,
        isArray: Array.isArray(faceEmbedding),
      });
      return res.status(400).json({
        error: "Username and valid face embedding are required",
      });
    }

    const user = await User.findOneAndUpdate(
      { username: username },
      { faceEmbedding: faceEmbedding },
      { new: true },
    );

    console.log("Updated user:", user ? user.username : "User not found");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Face registered successfully",
      user: { username: user.username, member_id: user.member_id },
    });
  } catch (err) {
    console.error("Face registration error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error: " + err.message });
  }
};

// Recognize a face and find matching user
const recognizeFace = async (req, res) => {
  try {
    const { faceEmbedding } = req.body;

    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      return res
        .status(400)
        .json({ error: "Valid face embedding is required" });
    }

    // Find all users with registered face embeddings
    const users = await User.find({
      faceEmbedding: { $exists: true, $ne: null },
    });

    if (users.length === 0) {
      return res
        .status(404)
        .json({ error: "No users with registered faces found" });
    }

    // Calculate distances and find the closest match
    let bestMatch = null;
    let bestDistance = Infinity;
    const DISTANCE_THRESHOLD = 0.5; // Adjust based on how strict you want matching to be

    for (const user of users) {
      const distance = calculateDistance(faceEmbedding, user.faceEmbedding);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = user;
      }
    }

    // If best match is below threshold, return the user
    if (bestDistance < DISTANCE_THRESHOLD) {
      return res.status(200).json({
        message: "Face recognized",
        user: {
          username: bestMatch.username,
          member_id: bestMatch.member_id,
          name: bestMatch.name,
          account: bestMatch.account,
          picture: bestMatch.picture,
          age: bestMatch.age,
        },
      });
    } else {
      return res.status(401).json({
        error:
          "Face not recognized. Please register your face or use username/password login.",
      });
    }
  } catch (err) {
    console.error("Face recognition error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  registerFace,
  recognizeFace,
};
