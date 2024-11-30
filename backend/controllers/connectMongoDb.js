const mongoose = require("mongoose");
require("dotenv").config();

const dbConnect =()=> {
  const CON_SRING = `${process.env.MONGODB_CONNECTION_STRING}`
  mongoose
    .connect(CON_SRING
    )
    .then(() => {
      console.log("Connected to mongoDB");
    })
    .catch((error) => {
      console.log("Unable to connect to mongoDB");
      console.log(error);
    });
}

module.exports = { dbConnect };
