const Member = require("../models/member");
const User = require("../models/user");
const mongoose = require("mongoose");

const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName, age } = req.body;
    console.log("Registering:", username);

    // 1. CHECK FOR DUPLICATES BEFORE DOING ANYTHING ELSE
    const existingUser = await User.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existingUser) {
      console.log("Registration failed: User already exists.");
      return res
        .status(400)
        .send({ error: "Username or Email is already taken." });
    }

    // 2. Generate a unique member_id (Properly awaited)
    let member_id;
    let is_exist = true;

    while (is_exist) {
      member_id = Math.floor(Math.random() * 1000);
      const check = await Member.findOne({ member_id: member_id });

      if (!check) {
        is_exist = false; // ID is unique, break the loop
      } else {
        console.log("member_id already exists, generating a new one...");
      }
    }

    // 2. Prepare the new documents
    const new_User = new User({
      username: username,
      password: password,
      email: email,
      bucket_list: "",
      post: [],
      member_id: member_id,
    });

    const new_Member = new Member({
      member_id: member_id,
      name: firstName + " " + lastName,
      age: age,
      picture:
        "https://t4.ftcdn.net/jpg/00/64/67/63/360_F_64676383_LdbmhiNM6Ypzb3FM4PPuFP9rHe7ri8Ju.jpg",
      account: username,
      parent: [],
      children: [],
      sibling: [],
      spouse: [],
    });

    // 3. Save to database synchronously
    await User.create(new_User);
    await Member.create(new_Member);

    // 4. Send exactly ONE response back to the React frontend
    console.log("It made it all the way cuhhhh");
    res.status(200).send({ message: "Signup successful" });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).send({ error: "Server error during signup" });
  }
};

module.exports = signUp;
