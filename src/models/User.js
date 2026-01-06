import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model("User", UserSchema, "users");

export default User;
