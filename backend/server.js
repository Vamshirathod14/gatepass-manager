 require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Connection error:', err));

// Twilio configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : 
  null;

console.log('Twilio Configuration:', {
  configured: !!twilioClient,
  accountSid: process.env.TWILIO_ACCOUNT_SID ? '***REDACTED***' : 'MISSING',
  authToken: process.env.TWILIO_AUTH_TOKEN ? '***REDACTED***' : 'MISSING',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'MISSING'
});

// Auth Middleware
const authenticateIncharge = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.incharge = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const authenticateAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ message: 'Admin access required' });
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Schemas
const inchargeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  year: { type: String, required: true, enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'] },
  branch: { type: String, required: true, enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'] },
  isAdmin: { type: Boolean, default: false }
});

inchargeSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Incharge = mongoose.model('Incharge', inchargeSchema);

const decisionHistorySchema = new mongoose.Schema({
  gatepassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gatepass', required: true },
  action: { type: String, required: true, enum: ['Submitted', 'ApprovedByIncharge', 'RejectedByIncharge', 'ApprovedByHOD', 'RejectedByHOD', 'Exit', 'Entry'] },
  actor: { type: String, required: true, default: 'System' },
  remarks: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const DecisionHistory = mongoose.model('DecisionHistory', decisionHistorySchema);

const gatepassSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  hallTicket: { type: String, required: true, index: true },
  year: { type: String, required: true },
  branch: { type: String, required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    default: 'Pending', 
    enum: ['Pending', 'ApprovedByIncharge', 'RejectedByIncharge', 'ApprovedByHOD', 'RejectedByHOD', 'InUse', 'Completed'] 
  },
  rejectionReason: { type: String, default: '' },
  assignedIncharge: { type: mongoose.Schema.Types.ObjectId, ref: 'Incharge' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  exitTime: { type: Date },
  entryTime: { type: Date }
});

const Gatepass = mongoose.model('Gatepass', gatepassSchema);

const studentSchema = new mongoose.Schema({
  hallTicket: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  year: { type: String, required: true },
  branch: { type: String, required: true },
  parentPhone: { type: String, required: true }
});

const Student = mongoose.model('Student', studentSchema);

const securityLogSchema = new mongoose.Schema({
  gatepassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gatepass' },
  studentName: String,
  hallTicket: String,
  action: { type: String, enum: ['Exit', 'Entry'] },
  time: { type: Date, default: Date.now }
});

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);

// Helper Functions
const getStartOfDay = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getFirstDayOfMonth = () => {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
};

const logDecision = async (gatepassId, action, actor, remarks = '') => {
  const history = new DecisionHistory({ gatepassId, action, actor, remarks });
  await history.save();
};

// Student Validation Endpoint
app.get('/api/students/:hallTicket', async (req, res) => {
  try {
    const student = await Student.findOne({ hallTicket: req.params.hallTicket });
    if (!student) {
      return res.status(404).json({ 
        valid: false,
        message: 'Hall ticket number not found in student database' 
      });
    }
    res.json({
      valid: true,
      student: {
        name: student.name,
        year: student.year,
        branch: student.branch,
        parentPhone: student.parentPhone
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update your /api/admin/upload-students endpoint
app.post('/api/admin/upload-students', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const results = [];
    const errors = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        // Validate required fields
        if (!data.hallTicket || !data.name || !data.year || !data.branch || !data.parentPhone) {
          errors.push(`Skipping row - missing required fields: ${JSON.stringify(data)}`);
          return;
        }
        
        results.push({
          hallTicket: data.hallTicket.trim(),
          name: data.name.trim(),
          year: data.year.trim(),
          branch: data.branch.trim(),
          parentPhone: data.parentPhone.trim().replace(/\D/g, '') // Clean phone number
        });
      })
      .on('end', async () => {
        try {
          // Delete existing students
          await Student.deleteMany({});
          
          // Insert new students
          const inserted = await Student.insertMany(results);
          fs.unlinkSync(req.file.path); // Delete temp file
          
          res.json({
            success: true,
            message: `Uploaded ${inserted.length} students successfully`,
            count: inserted.length,
            students: inserted,
            errors: errors.length > 0 ? errors : undefined
          });
        } catch (dbError) {
          console.error('Database error:', dbError);
          res.status(500).json({ 
            success: false,
            message: 'Error saving student data to database',
            error: dbError.message
          });
        }
      })
      .on('error', (streamError) => {
        console.error('CSV stream error:', streamError);
        res.status(500).json({
          success: false,
          message: 'Error processing CSV file',
          error: streamError.message
        });
      });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      success: false,
      message: 'File processing failed',
      error: err.message
    });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await Incharge.findOne({ email, isAdmin: true }).select('+password');
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, name: admin.name, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, name: admin.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Security Routes
app.get('/api/security/check-gatepass/:hallTicket', async (req, res) => {
  try {
    const gatepass = await Gatepass.findOne({
      hallTicket: req.params.hallTicket,
      status: 'ApprovedByHOD'
    });
    
    if (!gatepass) {
      return res.status(404).json({ 
        valid: false,
        message: 'No approved gatepass found for this hall ticket number' 
      });
    }
    
    res.json({
      valid: true,
      gatepass: {
        _id: gatepass._id,
        studentName: gatepass.studentName,
        hallTicket: gatepass.hallTicket,
        year: gatepass.year,
        branch: gatepass.branch,
        reason: gatepass.reason,
        status: gatepass.status,
        createdAt: gatepass.createdAt
      }
    });
  } catch (err) {
    console.error('Check gatepass error:', err);
    res.status(500).json({ 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.post('/api/security/mark-exit/:gatepassId', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.gatepassId)) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid gatepass ID format' 
    });
  }

  try {
    const gatepass = await Gatepass.findById(req.params.gatepassId);
    if (!gatepass) {
      return res.status(404).json({ 
        success: false,
        message: 'Gatepass not found' 
      });
    }
    
    if (gatepass.status !== 'ApprovedByHOD') {
      return res.status(400).json({
        success: false,
        message: 'Gatepass must be approved by HOD before marking exit'
      });
    }

    const exitTime = new Date();
    gatepass.exitTime = exitTime;
    gatepass.status = 'InUse';
    await gatepass.save();
    
    const student = await Student.findOne({ hallTicket: gatepass.hallTicket });
    let smsStatus = 'Not sent (no parent phone)';
    
    if (student?.parentPhone) {
      const phoneNumber = `+91${student.parentPhone.replace(/\D/g, '')}`;
      console.log('Attempting to send SMS to:', phoneNumber);
      
      if (twilioClient) {
        try {
          const message = await twilioClient.messages.create({
            body: `హెచ్చరిక: ${student.name} (${gatepass.hallTicket}) విద్యార్థి ${exitTime.toLocaleString()} సమయంలో క్యాంపస్‌ను విడిచారు. కారణం: ${gatepass.reason}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });

          console.log('Twilio Message SID:', message.sid);
          smsStatus = 'Sent successfully';
        } catch (twilioErr) {
          console.error('Twilio Error:', {
            code: twilioErr.code,
            message: twilioErr.message,
            moreInfo: twilioErr.moreInfo
          });
          smsStatus = `Failed: ${twilioErr.message}`;
        }
      } else {
        smsStatus = 'Twilio not configured';
      }
    }

    await SecurityLog.create({
      gatepassId: gatepass._id,
      studentName: gatepass.studentName,
      hallTicket: gatepass.hallTicket,
      action: 'Exit',
      time: exitTime
    });

    await logDecision(
      gatepass._id,
      'Exit',
      'Security',
      `Student exited campus. SMS: ${smsStatus}`
    );
    
    res.json({ 
      success: true,
      message: 'Exit recorded successfully',
      smsStatus,
      exitTime,
      gatepass: {
        studentName: gatepass.studentName,
        hallTicket: gatepass.hallTicket
      }
    });
  } catch (err) {
    console.error('Exit recording error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error recording exit',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Add this test endpoint for SMS debugging
app.get('/test-sms', async (req, res) => {
  if (!twilioClient) {
    return res.status(400).json({ 
      error: 'Twilio not configured',
      details: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? '***REDACTED***' : 'MISSING',
        authToken: process.env.TWILIO_AUTH_TOKEN ? '***REDACTED***' : 'MISSING',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'MISSING'
      }
    });
  }

  try {
    const testNumber = '+919014243908'; // Replace with your test number
    const testMsg = await twilioClient.messages.create({
      body: 'This is a test SMS from your Gatepass system',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: testNumber
    });
    
    res.json({ 
      success: true,
      message: 'Test SMS sent successfully',
      sid: testMsg.sid,
      to: testNumber
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to send test SMS',
      details: {
        code: err.code,
        message: err.message,
        moreInfo: err.moreInfo,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    });
  }
});

app.post('/api/security/mark-entry/:gatepassId', async (req, res) => {
  try {
    const gatepass = await Gatepass.findById(req.params.gatepassId);
    if (!gatepass) {
      return res.status(404).json({ message: 'Gatepass not found' });
    }
    
    if (gatepass.status !== 'InUse') {
      return res.status(400).json({
        message: 'Gatepass must be in "InUse" status before marking entry'
      });
    }

    const entryTime = new Date();
    gatepass.entryTime = entryTime;
    gatepass.status = 'Completed';
    await gatepass.save();
    
    await SecurityLog.create({
      gatepassId: gatepass._id,
      studentName: gatepass.studentName,
      hallTicket: gatepass.hallTicket,
      action: 'Entry',
      time: entryTime
    });

    await logDecision(
      gatepass._id,
      'Entry',
      'Security',
      'Student returned to campus'
    );
    
    res.json({ 
      success: true,
      message: 'Entry recorded successfully',
      entryTime,
      gatepass: {
        studentName: gatepass.studentName,
        hallTicket: gatepass.hallTicket
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/security/recent-entries', async (req, res) => {
  try {
    const logs = await SecurityLog.find()
      .sort({ time: -1 })
      .limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Incharge Routes
app.post('/api/incharges/register', async (req, res) => {
  try {
    const incharge = new Incharge(req.body);
    await incharge.save();
    res.status(201).json(incharge);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/incharges/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const incharge = await Incharge.findOne({ email }).select('+password');
    
    if (!incharge) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, incharge.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      {
        id: incharge._id,
        name: incharge.name || 'Incharge',
        year: incharge.year,
        branch: incharge.branch
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    incharge.password = undefined;
    res.json({ 
      token, 
      name: incharge.name, 
      year: incharge.year, 
      branch: incharge.branch 
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      message: err.message || 'Server error during login',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Gatepass Routes
app.post('/api/gatepasses', async (req, res) => {
  try {
    const { hallTicket, year, branch } = req.body;
    
    const student = await Student.findOne({ hallTicket });
    if (!student) {
      return res.status(400).json({ 
        type: 'INVALID_STUDENT',
        message: 'Hall ticket number not found in student database'
      });
    }

    if (student.year !== year || student.branch !== branch) {
      return res.status(400).json({
        type: 'DATA_MISMATCH',
        message: 'Year or branch does not match student records'
      });
    }

    const todayStart = getStartOfDay();
    const todaysPass = await Gatepass.findOne({
      hallTicket,
      createdAt: { $gte: todayStart },
      status: { $nin: ['RejectedByIncharge', 'RejectedByHOD'] }
    });
    if (todaysPass) {
      return res.status(400).json({ 
        type: 'DAILY_LIMIT',
        message: 'Only 1 gatepass allowed per day',
        resetTime: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      });
    }

    const monthlyCount = await Gatepass.countDocuments({
      hallTicket,
      createdAt: { $gte: getFirstDayOfMonth() },
      status: { $nin: ['RejectedByIncharge', 'RejectedByHOD'] }
    });
    if (monthlyCount >= 3) {
      return res.status(400).json({ 
        type: 'MONTHLY_LIMIT',
        message: 'Monthly limit reached (3/3)',
        resetTime: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      });
    }

    const incharge = await Incharge.findOne({ year, branch });
    if (!incharge) {
      return res.status(400).json({ 
        type: 'NO_INCHARGE',
        message: 'No incharge assigned for this class'
      });
    }

    const newGatepass = new Gatepass({ 
      ...req.body,
      studentName: student.name,
      assignedIncharge: incharge._id 
    });
    await newGatepass.save();
    await logDecision(newGatepass._id, 'Submitted', 'Student', 'Gatepass submitted');

    res.status(201).json({
      success: true,
      message: 'Gatepass submitted successfully',
      gatepass: newGatepass
    });
  } catch (err) {
    console.error('Gatepass creation error:', err);
    res.status(400).json({ 
      type: 'SERVER_ERROR',
      message: err.message || 'Error creating gatepass'
    });
  }
});

// Get all gatepass history (for admin/incharge)
app.get('/api/admin/gatepasses', authenticateAdmin, async (req, res) => {
  try {
    const gatepasses = await Gatepass.find().sort({ createdAt: -1 });
    res.json(gatepasses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get gatepasses for specific student
app.get('/api/gatepasses/:hallTicket', async (req, res) => {
  try {
    if (!req.params.hallTicket) {
      return res.status(400).json({ message: 'Hall ticket number is required' });
    }

    const gatepasses = await Gatepass.find({ 
      hallTicket: req.params.hallTicket 
    }).sort({ createdAt: -1 });
    
    res.json(gatepasses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get gatepass history for admin/incharge
app.get('/api/gatepasses/history', authenticateIncharge, async (req, res) => {
  try {
    const gatepasses = await Gatepass.find({
      year: req.incharge.year,
      branch: req.incharge.branch,
      status: { $in: ['ApprovedByIncharge', 'RejectedByIncharge', 'ApprovedByHOD', 'RejectedByHOD'] }
    })
    .sort({ updatedAt: -1 })
    .populate('assignedIncharge', 'name')
    .lean();

    const gatepassIds = gatepasses.map(gp => gp._id);
    const histories = await DecisionHistory.find({
      gatepassId: { $in: gatepassIds }
    }).sort({ timestamp: -1 });

    const enrichedHistory = gatepasses.map(gatepass => {
      const relatedHistory = histories.filter(h => h.gatepassId.equals(gatepass._id));
      return {
        ...gatepass,
        history: relatedHistory
      };
    });

    res.json(enrichedHistory);
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch gatepass history',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Incharge-specific routes
app.get('/api/gatepasses/pending/incharge', authenticateIncharge, async (req, res) => {
  try {
    const gatepasses = await Gatepass.find({
      status: 'Pending',
      year: req.incharge.year,
      branch: req.incharge.branch
    }).sort({ createdAt: -1 });
    res.json(gatepasses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/gatepasses/:id/incharge-approve', authenticateIncharge, async (req, res) => {
  try {
    const gatepass = await Gatepass.findOne({
      _id: req.params.id,
      year: req.incharge.year,
      branch: req.incharge.branch,
      status: 'Pending'
    });

    if (!gatepass) {
      return res.status(403).json({ 
        message: 'Gatepass not found or not authorized for approval'
      });
    }

    const updatedGatepass = await Gatepass.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'ApprovedByIncharge',
        updatedAt: Date.now() 
      },
      { new: true }
    );

    await DecisionHistory.create({
      gatepassId: updatedGatepass._id,
      action: 'ApprovedByIncharge',
      actor: req.incharge.name || 'Incharge',
      remarks: `Approved by ${req.incharge.year} ${req.incharge.branch} incharge`,
      timestamp: new Date()
    });

    res.json(updatedGatepass);
  } catch (err) {
    console.error('Approval error:', err);
    res.status(400).json({ 
      message: 'Approval failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.patch('/api/gatepasses/:id/incharge-reject', authenticateIncharge, async (req, res) => {
  try {
    const gatepass = await Gatepass.findOneAndUpdate(
      { 
        _id: req.params.id,
        year: req.incharge.year,
        branch: req.incharge.branch 
      },
      { 
        status: 'RejectedByIncharge',
        rejectionReason: req.body.rejectionReason,
        updatedAt: Date.now() 
      },
      { new: true }
    );
    
    if (!gatepass) return res.status(404).json({ message: 'Gatepass not found or not authorized' });

    await logDecision(
      gatepass._id, 
      'RejectedByIncharge', 
      req.incharge.name, 
      req.body.rejectionReason || `Rejected by ${req.incharge.year} ${req.incharge.branch} incharge`
    );
    
    res.json(gatepass);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// HOD Routes
app.get('/api/gatepasses/pending/hod', async (req, res) => {
  try {
    const gatepasses = await Gatepass.find({ status: 'ApprovedByIncharge' }).sort({ createdAt: -1 });
    res.json(gatepasses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/gatepasses/:id/hod-approve', async (req, res) => {
  try {
    const gatepass = await Gatepass.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'ApprovedByHOD',
        updatedAt: Date.now() 
      },
      { new: true }
    );
    
    await logDecision(
      gatepass._id, 
      'ApprovedByHOD', 
      'HOD', 
      'Approved by HOD'
    );
    
    res.json(gatepass);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch('/api/gatepasses/:id/hod-reject', async (req, res) => {
  try {
    const gatepass = await Gatepass.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'RejectedByHOD',
        rejectionReason: req.body.rejectionReason,
        updatedAt: Date.now() 
      },
      { new: true }
    );
    
    await logDecision(
      gatepass._id, 
      'RejectedByHOD', 
      'HOD', 
      req.body.rejectionReason || 'Rejected by HOD'
    );
    
    res.json(gatepass);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get gatepass history for a specific gatepass
app.get('/api/gatepasses/history/:id', async (req, res) => {
  try {
    const history = await DecisionHistory.find({ gatepassId: req.params.id })
      .sort({ timestamp: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get monthly count for a student
app.get('/api/gatepasses/monthly-count/:hallTicket', async (req, res) => {
  try {
    const count = await Gatepass.countDocuments({
      hallTicket: req.params.hallTicket,
      createdAt: { $gte: getFirstDayOfMonth() },
      status: { $nin: ['RejectedByIncharge', 'RejectedByHOD'] }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));