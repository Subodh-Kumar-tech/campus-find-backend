const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: ["campus", "organization"],
      default: "campus",
    },
    // Campus specific fields
    registrationNo: {
      type: String,
      unique: true,
      sparse: true, // Allows null/missing values for organization users
    },
    department: {
      type: String,
    },
    collegeName: {
      type: String,
    },
    // Organization specific fields
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    designation: {
      type: String,
    },
    companyName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
