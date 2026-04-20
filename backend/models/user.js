const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    bucket_list: String,
    post: [],
    member_id: Number,
    faceEmbedding: {
      type: [Number],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

//below code succesfully uses bcrypt to hash now just need to dehash stored string when veryfing user

const User = mongoose.model("User", userSchema);

module.exports = User;

// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//   },
//   password: {
//     type: String,
//   },
//   email: {
//     type: String,
//   },
//   bucket_list: {
//     type: String,
//   },
//   post: [],
//   member_id: {
//     type: Number,
//   },
// });
// const User = mongoose.model("User", userSchema);

// module.exports = User;
