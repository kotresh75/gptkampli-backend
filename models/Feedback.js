import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
});

export default mongoose.model("Feedback", feedbackSchema);
