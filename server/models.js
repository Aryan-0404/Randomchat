const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    gender: String,
    socketId: String,
    isAvailable: { type: Boolean, default: true },
});

const User = mongoose.model("User", userSchema);
module.exports = User;