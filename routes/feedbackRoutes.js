import express from "express";
import Feedback from "../models/Feedback.js";

const router = express.Router();

// 🔹 Submit feedback
router.post("/", async (req, res) => {
    try {
        const { name, email, message } = req.body;
        const newFeedback = new Feedback({ name, email, message });
        await newFeedback.save();
        res.json({ message: "Feedback submitted successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Get all feedbacks
router.get("/", async (req, res) => {
    const feedbacks = await Feedback.find();
    res.json(feedbacks);
});

export default router;
