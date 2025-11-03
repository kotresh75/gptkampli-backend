import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import models
import Student from "../models/Student.js";
import Mark from "../models/Mark.js";
import ResultSummary from "../models/ResultSummary.js";

const router = express.Router();

// Enhanced multer configuration with security
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, Date.now() + '-' + sanitizedName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }
});

// 🔹 Upload Students Data
router.post("/upload-students", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const results = [];
        let processed = 0;
        let errors = [];

        console.log("Starting student data import...");

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Processing ${results.length} student records...`);

                for (const row of results) {
                    try {
                        // Map CSV columns to database fields
                        const studentData = {
                            reg_no: (row['Reg. No.'] || row['Reg No'] || row['Registration Number']).toString().trim(),
                            student_name: (row['Student Name'] || row['Name']).toString().trim(),
                            father_name: (row['Father Name'] || row['Father\'s Name']).toString().trim(),
                            dob: (row['Date of birth'] || row['DOB'] || row['Date of Birth']).toString().trim(),
                            gender: (row['Gender'] || '').toString().trim(),
                            mobile: (row['Mobile No.'] || row['Mobile'] || '').toString().trim(),
                            email: (row['Email'] || '').toString().trim(),
                            address: {
                                village: (row['village'] || row['Village'] || '').toString().trim(),
                                city: (row['city'] || row['City'] || '').toString().trim(),
                                taluk: (row['taluk'] || row['Taluk'] || '').toString().trim(),
                                district: (row['district'] || row['District'] || '').toString().trim(),
                                pincode: (row['pin code'] || row['Pincode'] || '').toString().trim()
                            },
                            program: (row['Program'] || 'Computer Science').toString().trim(),
                            institution: (row['Institution'] || 'Government Polytechnic Kampli').toString().trim()
                        };

                        // Validate required fields
                        if (!studentData.reg_no || !studentData.student_name || !studentData.father_name || !studentData.dob) {
                            throw new Error('Missing required fields (Reg No, Name, Father Name, or DOB)');
                        }

                        // Upsert student data
                        await Student.findOneAndUpdate(
                            { reg_no: studentData.reg_no },
                            studentData,
                            { upsert: true, new: true, runValidators: true }
                        );
                        processed++;

                        if (processed % 50 === 0) {
                            console.log(`Processed ${processed} students...`);
                        }
                    } catch (error) {
                        errors.push({
                            row: processed + 1,
                            reg_no: row['Reg. No.'] || 'Unknown',
                            error: error.message,
                            data: row
                        });
                        console.error(`Error processing row ${processed + 1}:`, error.message);
                    }
                }

                // Clean up uploaded file
                try {
                    fs.unlinkSync(req.file.path);
                } catch (error) {
                    console.log('Error deleting file:', error.message);
                }

                console.log(`Student import completed: ${processed} processed, ${errors.length} errors`);

                res.json({
                    message: `Student data import completed`,
                    summary: {
                        totalRecords: results.length,
                        processed: processed,
                        errors: errors.length,
                        errorDetails: errors
                    }
                });
            })
            .on('error', (error) => {
                console.error('CSV processing error:', error);
                res.status(500).json({ error: "Error processing CSV file: " + error.message });
            });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Upload Marks Data
router.post("/upload-marks", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const results = [];
        let processed = 0;
        let errors = [];

        console.log("Starting marks data import...");

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Processing ${results.length} marks records...`);

                for (const row of results) {
                    try {
                        const markData = {
                            reg_no: (row['Reg. No.'] || row['Reg No']).toString().trim(),
                            semester: parseInt(row['Sem Sr'] || row['Semester'] || row['Sem']),
                            subject_code: (row['QP-CODE'] || row['Subject Code']).toString().trim(),
                            subject_name: (row['SUBJECT NAME'] || row['Subject Name']).toString().trim(),
                            marks: {
                                ia: parseFloat(row['Marks (IA/Tr/Pr)']?.split('/')[0]) || 0,
                                theory: parseFloat(row['Marks (IA/Tr/Pr)']?.split('/')[1]) || 0,
                                practical: parseFloat(row['Marks (IA/Tr/Pr)']?.split('/')[2]) || 0
                            },
                            result: (row['Result'] || '').toString().trim(),
                            credits: parseInt(row['Credit']) || 0,
                            grade: (row['Grade'] || '').toString().trim(),
                            exam_year: parseInt(row['Exam Year']) || 2024
                        };

                        // Validate required fields
                        if (!markData.reg_no || !markData.semester || !markData.subject_code) {
                            throw new Error('Missing required fields (Reg No, Semester, or Subject Code)');
                        }

                        await Mark.findOneAndUpdate(
                            {
                                reg_no: markData.reg_no,
                                semester: markData.semester,
                                subject_code: markData.subject_code
                            },
                            markData,
                            { upsert: true, new: true, runValidators: true }
                        );
                        processed++;

                    } catch (error) {
                        errors.push({
                            row: processed + 1,
                            reg_no: row['Reg. No.'] || 'Unknown',
                            error: error.message,
                            data: row
                        });
                    }
                }

                try {
                    fs.unlinkSync(req.file.path);
                } catch (error) {
                    console.log('Error deleting file:', error.message);
                }

                console.log(`Marks import completed: ${processed} processed, ${errors.length} errors`);

                res.json({
                    message: `Marks data import completed`,
                    summary: {
                        totalRecords: results.length,
                        processed: processed,
                        errors: errors.length,
                        errorDetails: errors
                    }
                });
            });

    } catch (err) {
        console.error('Marks upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Upload Results Summary Data
router.post("/upload-results", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const results = [];
        let processed = 0;
        let errors = [];

        console.log("Starting results summary import...");

        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Processing ${results.length} result summary records...`);

                for (const row of results) {
                    try {
                        const resultData = {
                            reg_no: (row['Reg. No.'] || row['Reg No']).toString().trim(),
                            semester: parseInt(row['Semester'] || row['Sem'] || '4'),
                            total_credits_applied: parseInt(row['Total Credit Applied'] || row['Credit Applied'] || '0'),
                            total_credits_earned: parseInt(row['Total Credit Earned'] || row['Credit Earned'] || '0'),
                            total_grade_points: parseFloat(row['Total Grade Points'] || row['Grade Points'] || '0'),
                            sgpa: parseFloat(row['SGPA'] || row['SGPA (Attempts)']?.split('(')[0] || '0'),
                            attempts: parseInt(row['Attempts'] || '1'),
                            overall_cgpa: (row['CGPA (Overall)'] || row['CGPA'] || '').toString().trim(),
                            final_result: (row['Final Result (Overall)'] || row['Final Result'] || '').toString().trim(),
                            pending_subjects: row['Pending Subjects'] ? row['Pending Subjects'].split(';').map(s => s.trim()) : []
                        };

                        // Validate required fields
                        if (!resultData.reg_no || !resultData.semester) {
                            throw new Error('Missing required fields (Reg No or Semester)');
                        }

                        await ResultSummary.findOneAndUpdate(
                            {
                                reg_no: resultData.reg_no,
                                semester: resultData.semester
                            },
                            resultData,
                            { upsert: true, new: true, runValidators: true }
                        );
                        processed++;

                    } catch (error) {
                        errors.push({
                            row: processed + 1,
                            reg_no: row['Reg. No.'] || 'Unknown',
                            error: error.message,
                            data: row
                        });
                    }
                }

                try {
                    fs.unlinkSync(req.file.path);
                } catch (error) {
                    console.log('Error deleting file:', error.message);
                }

                console.log(`Results import completed: ${processed} processed, ${errors.length} errors`);

                res.json({
                    message: `Results summary data import completed`,
                    summary: {
                        totalRecords: results.length,
                        processed: processed,
                        errors: errors.length,
                        errorDetails: errors
                    }
                });
            });

    } catch (err) {
        console.error('Results upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Get Data Statistics
router.get("/statistics", async (req, res) => {
    try {
        const studentCount = await Student.countDocuments();
        const marksCount = await Mark.countDocuments();
        const resultsCount = await ResultSummary.countDocuments();

        // Count by semester
        const semesterStats = await Mark.aggregate([
            {
                $group: {
                    _id: "$semester",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get recent students
        const recentStudents = await Student.find()
            .sort({ created_at: -1 })
            .limit(5)
            .select('reg_no student_name program');

        res.json({
            students: studentCount,
            marks: marksCount,
            results: resultsCount,
            semesterStats: semesterStats,
            recentStudents: recentStudents
        });
    } catch (err) {
        console.error('Statistics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Search Students
router.get("/search-students", async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.json([]);
        }

        const students = await Student.find({
            $or: [
                { reg_no: { $regex: query, $options: 'i' } },
                { student_name: { $regex: query, $options: 'i' } }
            ]
        })
            .limit(50)
            .select('reg_no student_name father_name dob program institution');

        res.json(students);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Delete Student Data
router.delete("/student/:regNo", async (req, res) => {
    try {
        const { regNo } = req.params;

        console.log(`Deleting student data for: ${regNo}`);

        const studentDelete = await Student.deleteOne({ reg_no: regNo });
        const marksDelete = await Mark.deleteMany({ reg_no: regNo });
        const resultsDelete = await ResultSummary.deleteMany({ reg_no: regNo });

        console.log(`Deleted: Student=${studentDelete.deletedCount}, Marks=${marksDelete.deletedCount}, Results=${resultsDelete.deletedCount}`);

        res.json({
            message: `Student data for ${regNo} deleted successfully`,
            details: {
                students: studentDelete.deletedCount,
                marks: marksDelete.deletedCount,
                results: resultsDelete.deletedCount
            }
        });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Manual Data Insertion (for single records)
router.post("/manual-student", async (req, res) => {
    try {
        const studentData = req.body;

        // Validate required fields
        if (!studentData.reg_no || !studentData.student_name || !studentData.father_name || !studentData.dob) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const student = await Student.findOneAndUpdate(
            { reg_no: studentData.reg_no },
            studentData,
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            message: "Student data saved successfully",
            student: student
        });
    } catch (err) {
        console.error('Manual student insert error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;