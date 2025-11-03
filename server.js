import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ================= SECURITY CONFIGURATION =================
// Add environment variable for admin key
const ADMIN_KEY = process.env.ADMIN_KEY || 'thekc';

// Rate limiting for admin routes
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use(cors());
app.use(bodyParser.json());

// ================= DATABASE CONNECTION =================
mongoose
    .connect("mongodb://127.0.0.1:27017/gptkampli", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));

// ================= MODEL IMPORTS =================
// Add these model imports (adjust paths as needed)
import Student from "./models/Student.js";
import Mark from "./models/Mark.js";
import ResultSummary from "./models/ResultSummary.js";

// ================= CREATE UPLOADS DIRECTORY =================
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created:', uploadsDir);
}

// ================= EXISTING USER ROUTES =================
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});

const User = mongoose.model("User", userSchema);

app.post("/api/users/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existing = await User.findOne({ email });
        if (existing)
            return res.json({ success: false, message: "Email already registered" });

        const user = new User({ name, email, password });
        await user.save();
        res.json({ success: true, message: "User registered successfully" });
    } catch (err) {
        res.json({ success: false, message: "Error registering user" });
    }
});

app.post("/api/users/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log("🔹 LOGIN ATTEMPT:", email);

        const user = await User.findOne({ email });

        if (!user) {
            console.log("❌ User not found:", email);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (user.password !== password) {
            console.log("❌ Password mismatch for:", email);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("✅ Login successful for:", email);

        res.json({
            message: "Login successful",
            user: {
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ================= PROFILE =================
app.get("/api/users/profile/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put("/api/users/update/:email", async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await User.findOneAndUpdate(
            { email: req.params.email },
            { name, password },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            message: "Profile updated successfully",
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= FEEDBACK =================
const feedbackSchema = new mongoose.Schema({
    email: String,
    message: String,
});
const Feedback = mongoose.model("Feedback", feedbackSchema);

app.post("/api/feedback", async (req, res) => {
    try {
        const { email, message } = req.body;
        const fb = new Feedback({ email, message });
        await fb.save();
        res.json({ message: "Feedback submitted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ================= STUDENT ROUTES =================
app.get("/api/students/:regNo", async (req, res) => {
    try {
        const { regNo } = req.params;
        const student = await Student.findOne({ reg_no: regNo });

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        res.json(student);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/students/verify", async (req, res) => {
    try {
        const { regNo, dob } = req.body;
        const student = await Student.findOne({
            reg_no: regNo,
            dob: dob
        });

        if (!student) {
            return res.status(404).json({ error: "Invalid registration number or date of birth" });
        }

        res.json({
            success: true,
            student: {
                name: student.student_name,
                father_name: student.father_name,
                program: student.program
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= MARKS ROUTES =================
app.get("/api/marks/:regNo/semester/:semester", async (req, res) => {
    try {
        const { regNo, semester } = req.params;
        const marks = await Mark.find({
            reg_no: regNo,
            semester: parseInt(semester)
        });

        res.json(marks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= RESULTS SUMMARY ROUTE =================
app.get("/api/results/:regNo/summary", async (req, res) => {
    try {
        const { regNo } = req.params;
        const results = await ResultSummary.find({ reg_no: regNo });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= ADMIN ROUTES =================
import AdminRoutes from "./routes/admin.js";
app.use("/api/admin", adminLimiter, AdminRoutes); // Apply rate limiting to admin routes

// ================= SERVER START =================
app.listen(5000, () => console.log("Server running on port 5000"));