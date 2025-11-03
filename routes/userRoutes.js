import express from "express";
import User from "../models/User.js";

const router = express.Router();

// 🔹 Register user
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const newUser = new User({ name, email, password });
        await newUser.save();
        res.json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Login user
// 🔹 Login user (FIXED VERSION)
router.post("/login", async (req, res) => {
    try {
        console.log("LOGIN REQUEST RECEIVED");
        console.log("Request body:", req.body);

        const { email, password } = req.body;

        if (!email || !password) {
            console.log("Missing email or password");
            return res.status(400).json({ error: "Email and password required" });
        }

        console.log("Searching for user with email:", email);

        const user = await User.findOne({ email });
        console.log("User found:", user);

        if (!user) {
            console.log("User not found with email:", email);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("Checking password...");
        console.log("Input password:", password);
        console.log("Stored password:", user.password);

        if (user.password !== password) {
            console.log("Password mismatch");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("Login successful for:", email);
        res.json({
            message: "Login successful",
            user: {
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

// 🔹 Update profile
router.put("/update/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const { name, password } = req.body;
        const user = await User.findOneAndUpdate({ email }, { name, password }, { new: true });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ message: "Profile updated successfully", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// In User.js route file, add this route after login route
// 🔹 Get user profile by email
router.get("/profile/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
