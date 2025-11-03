import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    reg_no: { type: String, required: true, unique: true },
    student_name: { type: String, required: true },
    father_name: { type: String, required: true },
    dob: { type: String, required: true },
    gender: String,
    mobile: String,
    email: String,
    address: {
        village: String,
        city: String,
        taluk: String,
        district: String,
        pincode: String
    },
    program: String,
    institution: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

export default mongoose.model('Student', studentSchema);