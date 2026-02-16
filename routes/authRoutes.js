const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto"); // For generating reset tokens

const router = express.Router();

/* =========================
   UPDATE PROFILE DETAILS (TEXT ONLY)
========================= */
router.put("/update-details", async (req, res) => {
  console.log("🔥 HIT /api/auth/update-details 🔥");
  console.log("Body:", req.body);
  try {
    const { email, fullName, registrationNo, department, collegeName } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (registrationNo) user.registrationNo = registrationNo;
    if (department) user.department = department;
    if (collegeName) user.collegeName = collegeName;

    await user.save();

    res.json({
      message: "Profile details updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        registrationNo: user.registrationNo,
        department: user.department,
        collegeName: user.collegeName,
        profilePhoto: user.profilePhoto, // Keep existing photo
      },
    });
  } catch (error) {
    console.error("Error updating profile details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   SIGN UP (NEW USER)
========================= */
router.post("/signup", async (req, res) => {
  try {
    const {
      userType, // 'campus' or 'organization'
      fullName,
      email,
      password,
      // Campus specific
      registrationNo,
      department,
      collegeName,
      // Organization specific
      employeeId,
      designation,
      companyName,
    } = req.body;

    // Check common required fields
    if (!fullName || !email || !password || !userType) {
      return res.status(400).json({ message: "Full name, email, password and user type are required" });
    }

    // Check type-specific required fields
    if (userType === "campus") {
      if (!registrationNo || !department || !collegeName) {
        return res.status(400).json({ message: "Campus users require registration number, department, and college name" });
      }
    } else if (userType === "organization") {
      if (!employeeId || !designation || !companyName) {
        return res.status(400).json({ message: "Organization users require employee ID, designation, and company name" });
      }
    } else {
      return res.status(400).json({ message: "Invalid user type" });
    }

    // Check if user exists
    const query = { $or: [{ email }] };
    if (userType === "campus") {
      query.$or.push({ registrationNo });
    } else {
      query.$or.push({ employeeId });
    }

    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(400).json({ message: "User with this email or ID already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user object
    const newUser = {
      userType,
      fullName,
      email,
      password: hashedPassword,
    };

    if (userType === "campus") {
      newUser.registrationNo = registrationNo;
      newUser.department = department;
      newUser.collegeName = collegeName;
    } else {
      newUser.employeeId = employeeId;
      newUser.designation = designation;
      newUser.companyName = companyName;
    }

    // Create user
    const user = await User.create(newUser);

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   LOGIN (EXISTING USER)
========================= */
const loginHandler = async (req, res) => {
  console.log("🔥 LOGIN ATTEMPT 🔥", req.body.email);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    // 👑 SECURE MULTI-ADMIN CONFIG
    const admins = [
      { email: "subodhk@campusfind.com", password: "subodh@123", name: "Subodh", id: "admin-subodh" },
      { email: "karanv@campusfind.com", password: "karan@123", name: "Karan", id: "admin-karan" },
      { email: "uttams@campusfind.com", password: "uttam@123", name: "Uttam", id: "admin-uttam" },
      { email: "prashantc@campusfind.com", password: "prashant@123", name: "Prashant", id: "admin-prashant" },
      // 👑 SUPER ADMIN
      { email: "admin@gmail.com", password: "admin@123", name: "System Administrator", id: "admin-super", role: "super_admin" }
    ];

    const admin = admins.find(a => a.email === email && a.password === password);

    if (admin) {
      return res.json({
        message: "Admin login successful",
        token: `admin-token-${admin.id}`, // Mock token for admin
        user: {
          _id: admin.id,
          fullName: admin.name, // This simple name will be used in Audit Logs
          email: admin.email,
          role: admin.role || "admin",
          profilePhoto: ""
        },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userType: user.userType,
        fullName: user.fullName,
        email: user.email,
        registrationNo: user.registrationNo,
        department: user.department,
        collegeName: user.collegeName,
        employeeId: user.employeeId,
        designation: user.designation,
        companyName: user.companyName,
        profilePhoto: user.profilePhoto,
        role: "user",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

router.post("/login", loginHandler);
router.post("/signin", loginHandler); // 🔥 Legacy alias for deployed frontend compatibility


/* =========================
   UPDATE PROFILE PHOTO
========================= */
const upload = require("../config/multer");
router.post("/update-profile", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.file) {
      user.profilePhoto = req.file.path;
    }

    // Update other fields if provided
    if (req.body.fullName) user.fullName = req.body.fullName;
    if (req.body.registrationNo) user.registrationNo = req.body.registrationNo;
    if (req.body.department) user.department = req.body.department;
    if (req.body.collegeName) user.collegeName = req.body.collegeName;
    if (req.body.employeeId) user.employeeId = req.body.employeeId;
    if (req.body.designation) user.designation = req.body.designation;
    if (req.body.companyName) user.companyName = req.body.companyName;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        userType: user.userType,
        fullName: user.fullName,
        email: user.email,
        registrationNo: user.registrationNo,
        department: user.department,
        collegeName: user.collegeName,
        employeeId: user.employeeId,
        designation: user.designation,
        companyName: user.companyName,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   UPDATE PROFILE DETAILS (TEXT ONLY)
========================= */
router.put("/update-details", async (req, res) => {
  try {
    const { email, fullName, registrationNo, department, collegeName, employeeId, designation, companyName } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (registrationNo) user.registrationNo = registrationNo;
    if (department) user.department = department;
    if (collegeName) user.collegeName = collegeName;
    if (employeeId) user.employeeId = employeeId;
    if (designation) user.designation = designation;
    if (companyName) user.companyName = companyName;

    await user.save();

    res.json({
      message: "Profile details updated successfully",
      user: {
        id: user._id,
        userType: user.userType,
        fullName: user.fullName,
        email: user.email,
        registrationNo: user.registrationNo,
        department: user.department,
        collegeName: user.collegeName,
        employeeId: user.employeeId,
        designation: user.designation,
        companyName: user.companyName,
        profilePhoto: user.profilePhoto, // Keep existing photo
      },
    });
  } catch (error) {
    console.error("Error updating profile details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   FORGOT PASSWORD
========================= */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and save to DB
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 10 minutes
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // In a real app, send email here.
    // For now, return the token/link so we can test it.
    const resetUrl = `http://localhost:4321/reset-password?token=${resetToken}`;

    console.log("==================================================");
    console.log("🔥 PASSWORD RESET LINK (SIMULATED EMAIL) 🔥");
    console.log(resetUrl);
    console.log("==================================================");

    res.json({ message: "Email sent (check backend console for link)" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   RESET PASSWORD
========================= */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password required" });
    }

    // Hash the token to compare with DB
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
