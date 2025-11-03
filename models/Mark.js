import mongoose from 'mongoose';

const markSchema = new mongoose.Schema({
    reg_no: { type: String, required: true },
    semester: { type: Number, required: true },
    subject_code: String,
    subject_name: String,
    marks: {
        ia: Number,
        theory: Number,
        practical: Number
    },
    result: String,
    credits: Number,
    grade: String,
    exam_year: Number,
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Mark', markSchema);