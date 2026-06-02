import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'
import { envConfig } from "../config/env.config.js";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

UserSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const pepper = envConfig.PEPPER_SECRET || "";
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password + pepper, salt);
});

UserSchema.methods.comparePassword = async function(plainPassword) {
  const pepper = envConfig.PEPPER_SECRET || "";
  return bcrypt.compare(plainPassword + pepper, this.password);
};

UserSchema.methods.generateJwtToken = function () {
  return jwt.sign(
    { id: this._id.toString() },
    envConfig.JWT_SECRET_KEY,
    {
      expiresIn: "1d"
    }
  )
}

export default mongoose.models.User || mongoose.model("User", UserSchema);