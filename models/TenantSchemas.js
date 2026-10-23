const mongoose = require('mongoose');

// Schemas for collections inside an Account (School) database:
// 1. classes
// 2. homeworks (for each class)
// 3. credentials (assigned with role like student or teacher)
// 4. settings
// 5. userInfo (contains data of apps for each user; each user has their own document)
// 6. leaveRequests (students apply for leave, sends notification to teacher)
// 7. notifications (notifications for teachers and students)

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  subject: { type: String, default: 'General' },
  teacherName: { type: String, default: 'Assigned Teacher' },
  teacherId: { type: String },
  room: { type: String, default: 'Room 101' },
  schedule: { type: String, default: 'Mon/Wed/Fri 10:00 AM' },
  createdAt: { type: Date, default: Date.now }
});

const homeworkSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  className: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedByTeacherId: { type: String },
  assignedByTeacherName: { type: String, default: 'Teacher' },
  dueDate: { type: String, default: 'Tomorrow' },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  createdAt: { type: Date, default: Date.now }
});

// Universal Credential Schema (used for all roles: student, teacher, admin)
const credentialSchema = new mongoose.Schema({
  username: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  gradeLevel: { type: String, default: 'Year 1' },
  department: { type: String, default: '' },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const settingSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'Rangermate Academy' },
  term: { type: String, default: 'Fall Semester' },
  academicYear: { type: String, default: '2026-2027' },
  theme: { type: String, default: 'dark' },
  allowStudentLeaveRequests: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

const userInfoSchema = new mongoose.Schema({
  credentialId: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  department: { type: String, default: 'Science & Medicine' },
  grade: { type: String, default: 'Grade 9' },
  avatar: { type: String, default: '' },
  // App data storage for each user
  appData: {
    notes: { type: Array, default: [] },
    flashcards: { type: Array, default: [] },
    timerStats: { type: Object, default: { completedSessions: 0, totalFocusMinutes: 0 } },
    studyStreak: { type: Number, default: 14 },
    points: { type: Number, default: 0 }, // Blooket-style Points / XP earned from quizzes and study
    tokens: { type: Number, default: 0 }, // Blooket-style Tokens used to open packs/boxes in the store
    blooks: { type: Array, default: ['Character A', 'Character B', 'Astronaut'] }, // Starter collectible avatars
    activeBlook: { type: String, default: 'Character A' },
    packsOpened: { type: Number, default: 0 },
    customAvatar: { type: Object, default: null }, // User-configured custom avatar (base, equipment, colors, etc.)
    unlockedEquipments: { type: Array, default: [] } // Purchased or unlocked equipment IDs
  },
  updatedAt: { type: Date, default: Date.now }
});

const leaveRequestSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  teacherId: { type: String, default: '' },
  teacherName: { type: String, default: 'All Class Teachers' },
  reason: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  recipientRole: { type: String, default: 'teacher' },
  recipientId: { type: String, default: '' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'leave_request' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
  credentialId: { type: String, required: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  grade: { type: String, default: 'Year 1' },
  status: { type: String, default: 'active' },
  enrolledClasses: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

const teacherSchema = new mongoose.Schema({
  credentialId: { type: String, required: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  subject: { type: String, default: 'General Science' },
  assignedClasses: { type: Array, default: [] },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  credentialId: { type: String, required: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  permissions: { type: Array, default: ['manage_classes', 'manage_teachers', 'manage_students'] },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  authorName: { type: String, default: 'Administration' },
  authorRole: { type: String, default: 'admin' }, // admin, teacher
  targetAudience: { type: String, enum: ['all', 'students', 'teachers'], default: 'all' },
  pinned: { type: Boolean, default: false },
  priority: { type: String, enum: ['High', 'Normal', 'Urgent'], default: 'Normal' },
  createdAt: { type: Date, default: Date.now }
});

// Features Schemas (Chat, Slides, Docs, Sheets, Forms)
const chatMessageSchema = new mongoose.Schema({
  channelId: { type: String, default: 'study-group' },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, default: 'student' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const slideDeckSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'New Presentation' },
  slides: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'Untitled Document' },
  content: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

const spreadsheetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'Untitled Spreadsheet' },
  gridData: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

const formSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'Untitled Form' },
  description: { type: String, default: '' },
  questions: { type: Array, default: [] },
  responses: { type: Array, default: [] },
  updatedAt: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  classId: { type: String, required: true },
  className: { type: String, default: '' },
  date: { type: String, required: true }, // YYYY-MM-DD
  records: [{
    studentId: { type: String, required: true },
    studentName: { type: String, default: '' },
    studentEmail: { type: String, default: '' },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], default: 'Present' },
    note: { type: String, default: '' }
  }],
  recordedByTeacherId: { type: String, default: '' },
  recordedByTeacherName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const schoolInfoSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'Rangermate Academy' },
  schoolCode: { type: String, default: 'RMA-2026' },
  appName: { type: String, default: 'mcode' },
  logoUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  databaseName: { type: String, default: '' },
  principalName: { type: String, default: 'Dr. Arthur Vance' },
  contactEmail: { type: String, default: 'admin@rangermate.com' },
  phone: { type: String, default: '+1 (555) 342-8900' },
  address: { type: String, default: '450 University Parkway, Science & Tech Wing' },
  academicYear: { type: String, default: '2026-2027' },
  term: { type: String, default: 'Fall Semester' },
  theme: { type: String, default: 'dark' },
  allowStudentLeaveRequests: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const teacherClassSchema = new mongoose.Schema({
  teacherId: { type: String, default: '' },
  teacherName: { type: String, required: true },
  teacherEmail: { type: String, default: '' },
  classId: { type: String, required: true },
  className: { type: String, required: true },
  classCode: { type: String, default: '' },
  subject: { type: String, default: 'General' },
  room: { type: String, default: 'Room 101' },
  schedule: { type: String, default: 'Mon/Wed/Fri 10:00 AM' },
  assignedAt: { type: Date, default: Date.now }
});

module.exports = {
  classSchema,
  homeworkSchema,
  credentialSchema,
  studentSchema,
  teacherSchema,
  adminSchema,
  settingSchema,
  schoolInfoSchema,
  teacherClassSchema,
  userInfoSchema,
  leaveRequestSchema,
  notificationSchema,
  announcementSchema,
  chatMessageSchema,
  slideDeckSchema,
  documentSchema,
  spreadsheetSchema,
  formSchema,
  attendanceSchema
};

