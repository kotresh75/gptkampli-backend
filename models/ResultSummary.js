import mongoose from 'mongoose';

const resultSummarySchema = new mongoose.Schema({
    reg_no: { type: String, required: true },
    semester: { type: Number, required: true },
    total_credits_applied: Number,
    total_credits_earned: Number,
    total_grade_points: Number,
    sgpa: Number,
    attempts: Number,
    overall_cgpa: String,
    final_result: String,
    pending_subjects: [String],
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model('ResultSummary', resultSummarySchema);