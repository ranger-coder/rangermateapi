const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Account = require('./models/Account');
const User = require('./models/User');
const Subscription = require('./models/Subscription');
const Point = require('./models/Point');
const {
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
} = require('./models/TenantSchemas');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swaggerSpec');

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'rangermate_secret';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-db']
}));
app.use(express.json({ limit: '10mb' }));

// Swagger Documentation at /docs and /api/docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'mCode API Documentation'
}));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'mCode API Documentation'
}));

// Helper: Generate clean database name for an account (e.g. school)
function generateDbName(nameOrEmail) {
  const clean = nameOrEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `rm_acc_${clean}`;
}

// Helper: Get mongoose models for a specific tenant account database
function getTenantModels(databaseName) {
  const db = mongoose.connection.useDb(databaseName, { useCache: true });
  return {
    Class: db.model('Class', classSchema, 'classes'),
    Homework: db.model('Homework', homeworkSchema, 'homeworks'),
    Credential: db.model('Credential', credentialSchema, 'credentials'),
    // Explicit schoolInfo and teacherClasses collections
    SchoolInfo: db.model('SchoolInfo', schoolInfoSchema, 'schoolInfo'),
    TeacherClass: db.model('TeacherClass', teacherClassSchema, 'teacherClasses'),
    Student: db.model('Student', studentSchema, 'students'),
    Teacher: db.model('Teacher', teacherSchema, 'teachers'),
    AdminUser: db.model('AdminUser', adminSchema, 'admins'),
    Setting: db.model('Setting', settingSchema, 'settings'),
    UserInfo: db.model('UserInfo', userInfoSchema, 'userInfo'),
    LeaveRequest: db.model('LeaveRequest', leaveRequestSchema, 'leaveRequests'),
    Notification: db.model('Notification', notificationSchema, 'notifications'),
    Announcement: db.model('Announcement', announcementSchema, 'announcements'),
    ChatMessage: db.model('ChatMessage', chatMessageSchema, 'chatMessages'),
    SlideDeck: db.model('SlideDeck', slideDeckSchema, 'slideDecks'),
    Document: db.model('Document', documentSchema, 'documents'),
    Spreadsheet: db.model('Spreadsheet', spreadsheetSchema, 'spreadsheets'),
    Form: db.model('Form', formSchema, 'forms'),
    Attendance: db.model('Attendance', attendanceSchema, 'attendances')
  };
}

// Provision user's/school's dedicated database and seed required collections
async function provisionAccountDatabase(dbName, accountInfo, isInitialSeed = false) {
  try {
    const models = getTenantModels(dbName);

    // 1. Settings & schoolInfo Collections
    const existingSetting = await models.Setting.findOne();
    if (!existingSetting) {
      await models.Setting.create({
        schoolName: accountInfo.name || 'Rangermate Academy',
        term: 'Fall 2026',
        academicYear: '2026-2027',
        theme: 'dark',
        allowStudentLeaveRequests: true
      });
    }

    // schoolInfo Collection (Dedicated table for school metadata)
    const existingSchoolInfo = await models.SchoolInfo.findOne();
    if (!existingSchoolInfo) {
      await models.SchoolInfo.create({
        schoolName: accountInfo.name || 'Rangermate Academy',
        schoolCode: 'RMA-2026',
        databaseName: dbName,
        principalName: 'Dr. Arthur Vance',
        contactEmail: accountInfo.email || 'admin@rangermate.com',
        phone: '+1 (555) 342-8900',
        address: '450 University Parkway, Science & Tech Wing',
        academicYear: '2026-2027',
        term: 'Fall Semester',
        theme: 'dark',
        allowStudentLeaveRequests: true
      });
    }

    // Only populate default demo users, classes, and announcements if explicitly running as the initial demo seed
    if (isInitialSeed) {
      // 2. Credentials & Separate Role Collections (Teacher, Student, Admin)
      let defaultTeacher = await models.Credential.findOne({ role: 'teacher' });
      if (!defaultTeacher) {
        const salt = await bcrypt.genSalt(10);
        const teacherPass = await bcrypt.hash('teacher123', salt);
        defaultTeacher = await models.Credential.create({
          username: 'prof.morris',
          email: 'morris@rangermate.com',
          password: teacherPass,
          role: 'teacher',
          firstName: 'Elena',
          lastName: 'Morris',
          status: 'active'
        });

        // Separate Teachers collection document
        await models.Teacher.create({
          credentialId: String(defaultTeacher._id),
          username: defaultTeacher.username,
          email: defaultTeacher.email,
          firstName: defaultTeacher.firstName,
          lastName: defaultTeacher.lastName,
          subject: 'Human Anatomy & Physiology',
          assignedClasses: ['MED-101'],
          status: 'active'
        });

        // UserInfo for teacher
        await models.UserInfo.create({
          credentialId: String(defaultTeacher._id),
          username: defaultTeacher.username,
          email: defaultTeacher.email,
          firstName: defaultTeacher.firstName,
          lastName: defaultTeacher.lastName,
          department: 'Science & Medicine',
          bio: 'Senior Faculty in Cellular Biology & Human Anatomy',
          appData: { notes: [], flashcards: [], studyStreak: 45 }
        });
      }

      let defaultStudent = await models.Credential.findOne({ email: accountInfo.email.toLowerCase() });
      if (!defaultStudent) {
        const salt = await bcrypt.genSalt(10);
        const studentPass = await bcrypt.hash('admin@rangermate', salt);
        defaultStudent = await models.Credential.create({
          username: accountInfo.email.split('@')[0],
          email: accountInfo.email.toLowerCase(),
          password: studentPass,
          role: 'student',
          firstName: accountInfo.name ? accountInfo.name.split(' ')[0] : 'Zayan',
          lastName: accountInfo.name ? accountInfo.name.split(' ').slice(1).join(' ') : 'Ahmed',
          status: 'active'
        });

        // Separate Students collection document
        await models.Student.create({
          credentialId: String(defaultStudent._id),
          username: defaultStudent.username,
          email: defaultStudent.email,
          firstName: defaultStudent.firstName,
          lastName: defaultStudent.lastName,
          grade: 'Pre-Med Scholar Year 2',
          enrolledClasses: ['MED-101', 'CHEM-204'],
          status: 'active'
        });

        // UserInfo for student
        await models.UserInfo.create({
          credentialId: String(defaultStudent._id),
          username: defaultStudent.username,
          email: defaultStudent.email,
          firstName: defaultStudent.firstName,
          lastName: defaultStudent.lastName,
          department: 'Pre-Med Scholar',
          bio: 'Pre-Med Candidate concentrating in Neurobiology & Diagnostics.',
          appData: {
            notes: [{ title: 'Biochemistry Intro', content: 'Enzymatic kinetics review' }],
            flashcards: [{ deck: 'Pathology 101', count: 48 }],
            studyStreak: 14
          }
        });
      }

      // 3. Announcements Collection (Seeded with institutional updates)
      const announcementCount = await models.Announcement.countDocuments();
      if (announcementCount === 0) {
        await models.Announcement.create({
          title: 'Midterm Examination Schedule & Lab Amphitheater Bookings',
          content: 'Fall 2026 midterm clinical evaluations and biochemistry practical assessments will commence next Monday. Review class syllabi in the faculty portal.',
          authorName: 'Academic Affairs & Dean',
          authorRole: 'admin',
          targetAudience: 'all',
          pinned: true,
          priority: 'High'
        });
        await models.Announcement.create({
          title: 'New Pathology & Bioenergetics Library Resources Available',
          content: 'Digital anatomical models and research monographs have been integrated into the study workstation tools.',
          authorName: 'Prof. Morris',
          authorRole: 'teacher',
          targetAudience: 'students',
          pinned: false,
          priority: 'Normal'
        });
      }

      // 4. Classes Collection & teacherClasses Collection
      const classCount = await models.Class.countDocuments();
      if (classCount === 0) {
        const bioClass = await models.Class.create({
          name: 'Human Anatomy & Physiology',
          code: 'MED-101',
          subject: 'Medicine',
          teacherName: defaultTeacher ? `${defaultTeacher.firstName} ${defaultTeacher.lastName}` : 'Prof. Morris',
          teacherId: defaultTeacher ? String(defaultTeacher._id) : '',
          room: 'Lab Amphitheater 3B',
          schedule: 'Mon / Wed / Fri 10:00 AM'
        });

        const chemClass = await models.Class.create({
          name: 'Organic Chemistry & Mechanisms',
          code: 'CHEM-204',
          subject: 'Chemistry',
          teacherName: 'Dr. Watson',
          teacherId: '',
          room: 'Chemistry Wing 104',
          schedule: 'Tue / Thu 02:00 PM'
        });

        // Seed teacherClasses collection (data of which teacher is assigned to each class)
        await models.TeacherClass.deleteMany({});
        await models.TeacherClass.create({
          teacherId: bioClass.teacherId,
          teacherName: bioClass.teacherName,
          teacherEmail: defaultTeacher ? defaultTeacher.email : 'morris@rangermate.com',
          classId: String(bioClass._id),
          className: bioClass.name,
          classCode: bioClass.code,
          subject: bioClass.subject,
          room: bioClass.room,
          schedule: bioClass.schedule
        });

        await models.TeacherClass.create({
          teacherId: chemClass.teacherId || '',
          teacherName: chemClass.teacherName,
          teacherEmail: 'watson@rangermate.com',
          classId: String(chemClass._id),
          className: chemClass.name,
          classCode: chemClass.code,
          subject: chemClass.subject,
          room: chemClass.room,
          schedule: chemClass.schedule
        });

        // 5. Homeworks Collection (for each class)
        await models.Homework.create({
          classId: String(bioClass._id),
          className: bioClass.name,
          title: 'Cranial Nerve Innervations Chart',
          description: 'Prepare a 1-page synthetic anatomical map of cranial nerves VII through XII.',
          assignedByTeacherName: bioClass.teacherName,
          dueDate: 'Friday, 11:59 PM',
          priority: 'High'
        });

        await models.Homework.create({
          classId: String(chemClass._id),
          className: chemClass.name,
          title: 'Electrophilic Addition Mechanism Set',
          description: 'Complete problem sets 4.1 to 4.15 in chapter 4.',
          assignedByTeacherName: chemClass.teacherName,
          dueDate: 'Next Monday, 09:00 AM',
          priority: 'Medium'
        });
      }
    }

    console.log(`[Provisioned] Account DB "${dbName}" initialized.`);
    return true;
  } catch (err) {
    console.error(`[Provision Error] Could not initialize database "${dbName}":`, err);
    return false;
  }
}

// Seed default regular user / account and ensure super admin exists
async function seedDefaultUser() {
  try {
    const defaultEmail = 'zayan@rangermate.com';
    const defaultPassword = 'admin@rangermate';
    const defaultDbName = 'rm_acc_rangermate_academy';

    let existingAccount = await Account.findOne({ email: defaultEmail });
    if (!existingAccount) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      existingAccount = new Account({
        email: defaultEmail,
        password: hashedPassword,
        name: 'Rangermate Main Academy',
        role: 'Institution / School',
        databaseName: defaultDbName
      });
      await existingAccount.save();
      console.log(`[Seed] Default account created: ${defaultEmail} with database: ${defaultDbName}`);
    } else if (!existingAccount.databaseName) {
      existingAccount.databaseName = defaultDbName;
      await existingAccount.save();
    }

    await provisionAccountDatabase(existingAccount.databaseName || defaultDbName, existingAccount, true);

    // Ensure dedicated school admin exists inside the default account's database for demonstration
    const models = getTenantModels(existingAccount.databaseName || defaultDbName);
    let schoolAdmin = await models.Credential.findOne({ role: 'admin' });
    if (!schoolAdmin) {
      const salt = await bcrypt.genSalt(10);
      const schoolAdminPass = await bcrypt.hash('schoolAdmin123', salt);
      schoolAdmin = await models.Credential.create({
        username: 'school.admin',
        email: 'schooladmin@rangermate.com',
        password: schoolAdminPass,
        role: 'admin',
        firstName: 'School',
        lastName: 'Administrator',
        status: 'active'
      });

      // Dedicated Separate Admin Users Collection (admins)
      await models.AdminUser.create({
        credentialId: String(schoolAdmin._id),
        username: schoolAdmin.username,
        email: schoolAdmin.email,
        firstName: schoolAdmin.firstName,
        lastName: schoolAdmin.lastName,
        permissions: ['manage_classes', 'manage_teachers', 'manage_students'],
        status: 'active'
      });

      await models.UserInfo.create({
        credentialId: String(schoolAdmin._id),
        username: schoolAdmin.username,
        email: schoolAdmin.email,
        firstName: schoolAdmin.firstName,
        lastName: schoolAdmin.lastName,
        department: 'School Administration',
        bio: 'Local School Administrator for Rangermate Main Academy'
      });
      console.log('[Seed] Dedicated school admin created: schooladmin@rangermate.com');
    }
  } catch (err) {
    console.error('[Seed Error] Failed to seed default user:', err.message);
  }
}

// ====================== AUTH & ADMIN MIDDLEWARE ======================
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Admin authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && !decoded.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token.' });
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

// ====================== ADMIN ROUTES ======================

// 1. Admin Hardcoded Login (maintained for backward compatibility)
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (
    (username === 'admin@rangermate.com' && password === 'admin@rangermate') ||
    (username === 'admin' && password === 'rangermateAdmin')
  ) {
    const token = jwt.sign(
      { role: 'admin', isSuperAdmin: true, username: 'admin@rangermate.com', email: 'admin@rangermate.com' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: {
        username: 'admin@rangermate.com',
        email: 'admin@rangermate.com',
        role: 'admin',
        isSuperAdmin: true,
        name: 'Super System Administrator'
      }
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
});

// 2. Admin: Get all accounts (schools)
// If Super Admin: returns all accounts
// If School Admin: returns only their school account
// 2. Admin: Get all accounts (schools)
// If Super Admin: returns all accounts
// If School Admin: returns only their school account
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    let query = {};
    if (!req.admin.isSuperAdmin) {
      if (req.admin.accountId) {
        query._id = req.admin.accountId;
      } else if (req.admin.databaseName) {
        query.databaseName = req.admin.databaseName;
      }
    }
    const accounts = await Account.find(query).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: accounts.length, users: accounts, isSuperAdmin: !!req.admin.isSuperAdmin });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch accounts.' });
  }
});

// 3. Admin: Create new account (school) with its dedicated database
// Only Super Admin can provision new school accounts
app.post('/api/admin/create-account', requireAdmin, async (req, res) => {
  try {
    if (!req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Administrators can provision new school accounts.' });
    }

    const { email, password, name, role, customDbName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = await Account.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const dedicatedDbName = customDbName?.trim()
      ? customDbName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : generateDbName(name || trimmedEmail);

    const newAccount = new Account({
      email: trimmedEmail,
      password: hashedPassword,
      name: name?.trim() || 'New School Academy',
      role: role?.trim() || 'Institution',
      databaseName: dedicatedDbName
    });

    const savedAccount = await newAccount.save();
    await provisionAccountDatabase(dedicatedDbName, savedAccount);

    res.status(201).json({
      success: true,
      message: `Account created successfully with dedicated database "${dedicatedDbName}".`,
      user: {
        id: savedAccount._id,
        _id: savedAccount._id,
        email: savedAccount.email,
        name: savedAccount.name,
        role: savedAccount.role,
        databaseName: savedAccount.databaseName,
        createdAt: savedAccount.createdAt
      }
    });
  } catch (err) {
    console.error('[Create Account Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create user account and database.' });
  }
});

// 4. Admin: Edit Account (update school name, email, databaseName, role)
app.put('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.admin.isSuperAdmin && String(req.admin.accountId) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Permission denied. You can only edit your own school account.' });
    }

    const { name, email, role, databaseName } = req.body;

    const account = await Account.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (name) account.name = name.trim();
    if (email) account.email = email.trim().toLowerCase();
    if (role && req.admin.isSuperAdmin) account.role = role.trim();
    if (databaseName && req.admin.isSuperAdmin) {
      account.databaseName = databaseName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    await account.save();

    // Ensure database and collections exist if database name changed
    await provisionAccountDatabase(account.databaseName, account);

    res.json({
      success: true,
      message: 'Account updated successfully.',
      user: {
        id: account._id,
        _id: account._id,
        email: account.email,
        name: account.name,
        role: account.role,
        databaseName: account.databaseName,
        createdAt: account.createdAt
      }
    });
  } catch (err) {
    console.error('[Edit Account Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update account.' });
  }
});

// 5. Admin: Delete Account
app.delete('/api/admin/accounts/:id', requireAdmin, async (req, res) => {
  try {
    if (!req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Administrators can delete school accounts.' });
    }
    const { id } = req.params;
    const account = await Account.findByIdAndDelete(id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    res.json({ success: true, message: `Account "${account.name}" deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete account.' });
  }
});

// 6. Admin: Get all users across accounts or filtered by accountId
// If Super Admin: sees users across all accounts (or filtered account)
// If School Admin: locked to only their school account
app.get('/api/admin/all-users', requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.query;
    let targetAccountId = accountId;

    if (!req.admin.isSuperAdmin) {
      targetAccountId = req.admin.accountId;
    }

    let query = {};
    if (targetAccountId && targetAccountId !== 'ALL') {
      query._id = targetAccountId;
    }

    const accounts = await Account.find(query);
    const combinedUsers = [];

    for (const acc of accounts) {
      if (!acc.databaseName) continue;
      try {
        const models = getTenantModels(acc.databaseName);
        const credentials = await models.Credential.find().sort({ createdAt: -1 });
        const userInfos = await models.UserInfo.find();

        for (const cred of credentials) {
          const uInfo = userInfos.find(u => String(u.credentialId) === String(cred._id) || u.email === cred.email);
          combinedUsers.push({
            id: String(cred._id),
            _id: String(cred._id),
            accountId: String(acc._id),
            accountName: acc.name,
            accountDatabase: acc.databaseName,
            username: cred.username,
            email: cred.email,
            role: cred.role,
            firstName: cred.firstName || (uInfo ? uInfo.firstName : ''),
            lastName: cred.lastName || (uInfo ? uInfo.lastName : ''),
            department: uInfo ? uInfo.department : '',
            status: cred.status,
            createdAt: cred.createdAt
          });
        }
      } catch (e) {
        console.error(`Error loading users from DB ${acc.databaseName}:`, e.message);
      }
    }

    res.json({
      success: true,
      count: combinedUsers.length,
      users: combinedUsers,
      isSuperAdmin: !!req.admin.isSuperAdmin,
      scopedSchoolName: req.admin.accountName || null
    });
  } catch (err) {
    console.error('[Admin All Users Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users across accounts.' });
  }
});

// 7. Admin: Create user inside an account's dedicated database
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    let { accountId, username, email, password, role, firstName, lastName, department } = req.body;

    if (!req.admin.isSuperAdmin) {
      accountId = req.admin.accountId;
    }

    if (!accountId || !email || !username || !password) {
      return res.status(400).json({ success: false, message: 'Account, email, username, and password are required.' });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const models = getTenantModels(account.databaseName);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newCred = await models.Credential.create({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      firstName: firstName || '',
      lastName: lastName || '',
      status: 'active'
    });

    const newUserInfo = await models.UserInfo.create({
      credentialId: String(newCred._id),
      username: newCred.username,
      email: newCred.email,
      firstName: newCred.firstName,
      lastName: newCred.lastName,
      department: department || (role === 'teacher' ? 'Faculty' : role === 'admin' ? 'School Admin' : 'Student Body'),
      bio: '',
      appData: { notes: [], flashcards: [], studyStreak: 1 }
    });

    // Populate separate role-specific collection (students, teachers, admins)
    if (role === 'teacher') {
      await models.Teacher.create({
        credentialId: String(newCred._id),
        username: newCred.username,
        email: newCred.email,
        firstName: newCred.firstName,
        lastName: newCred.lastName,
        subject: department || 'General Science',
        assignedClasses: [],
        status: 'active'
      });
    } else if (role === 'admin') {
      await models.AdminUser.create({
        credentialId: String(newCred._id),
        username: newCred.username,
        email: newCred.email,
        firstName: newCred.firstName,
        lastName: newCred.lastName,
        status: 'active'
      });
    } else {
      await models.Student.create({
        credentialId: String(newCred._id),
        username: newCred.username,
        email: newCred.email,
        firstName: newCred.firstName,
        lastName: newCred.lastName,
        grade: department || 'Year 1 Scholar',
        status: 'active'
      });
    }

    res.status(201).json({
      success: true,
      message: `User created in account "${account.name}".`,
      user: {
        id: String(newCred._id),
        accountId: String(account._id),
        accountName: account.name,
        accountDatabase: account.databaseName,
        username: newCred.username,
        email: newCred.email,
        role: newCred.role,
        firstName: newCred.firstName,
        lastName: newCred.lastName,
        department: newUserInfo.department,
        createdAt: newCred.createdAt
      }
    });
  } catch (err) {
    console.error('[Admin Create User Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create user in account database.' });
  }
});

// 8. Admin: Edit user inside an account's dedicated database
app.put('/api/admin/users/:accountId/:userId', requireAdmin, async (req, res) => {
  try {
    const { accountId, userId } = req.params;

    if (!req.admin.isSuperAdmin && String(req.admin.accountId) !== String(accountId)) {
      return res.status(403).json({ success: false, message: 'Permission denied. You can only edit users of your own school.' });
    }

    const { firstName, lastName, role, status, email, department } = req.body;

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const models = getTenantModels(account.databaseName);
    const cred = await models.Credential.findById(userId);
    if (!cred) {
      return res.status(404).json({ success: false, message: 'User not found in account database.' });
    }

    if (firstName !== undefined) cred.firstName = firstName.trim();
    if (lastName !== undefined) cred.lastName = lastName.trim();
    if (role !== undefined) cred.role = role;
    if (status !== undefined) cred.status = status;
    if (email !== undefined) cred.email = email.trim().toLowerCase();
    await cred.save();

    let uInfo = await models.UserInfo.findOne({ credentialId: userId });
    if (uInfo) {
      if (firstName !== undefined) uInfo.firstName = firstName.trim();
      if (lastName !== undefined) uInfo.lastName = lastName.trim();
      if (email !== undefined) uInfo.email = email.trim().toLowerCase();
      if (department !== undefined) uInfo.department = department.trim();
      await uInfo.save();
    }

    // Sync in role-specific collections
    await models.Student.findOneAndUpdate(
      { credentialId: userId },
      { firstName: cred.firstName, lastName: cred.lastName, status: cred.status, email: cred.email }
    );
    await models.Teacher.findOneAndUpdate(
      { credentialId: userId },
      { firstName: cred.firstName, lastName: cred.lastName, status: cred.status, email: cred.email }
    );
    await models.AdminUser.findOneAndUpdate(
      { credentialId: userId },
      { firstName: cred.firstName, lastName: cred.lastName, status: cred.status, email: cred.email }
    );

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    console.error('[Admin Edit User Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// 9. Admin: Delete user from an account's database
app.delete('/api/admin/users/:accountId/:userId', requireAdmin, async (req, res) => {
  try {
    const { accountId, userId } = req.params;

    if (!req.admin.isSuperAdmin && String(req.admin.accountId) !== String(accountId)) {
      return res.status(403).json({ success: false, message: 'Permission denied. You can only delete users of your own school.' });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const models = getTenantModels(account.databaseName);
    await models.Credential.findByIdAndDelete(userId);
    await models.UserInfo.findOneAndDelete({ credentialId: userId });
    await models.Student.findOneAndDelete({ credentialId: userId });
    await models.Teacher.findOneAndDelete({ credentialId: userId });
    await models.AdminUser.findOneAndDelete({ credentialId: userId });

    res.json({ success: true, message: 'User deleted from account database.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// ====================== SUBSCRIPTION ROUTES ======================

// 10. Admin: Get all student subscriptions (Super Admin only)
app.get('/api/admin/subscriptions', requireAdmin, async (req, res) => {
  try {
    if (!req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Administrators can manage subscriptions.' });
    }

    const subscriptions = await Subscription.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: subscriptions.length,
      subscriptions
    });
  } catch (err) {
    console.error('[Get Subscriptions Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions.' });
  }
});

// 11. Admin: Update subscription plan (Free <-> Paid)
app.put('/api/admin/subscriptions/:id/plan', requireAdmin, async (req, res) => {
  try {
    if (!req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Administrators can update subscriptions.' });
    }

    const { id } = req.params;
    const { planType } = req.body;

    if (!['free', 'paid'].includes(planType)) {
      return res.status(400).json({ success: false, message: 'Invalid plan type. Must be "free" or "paid".' });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription record not found.' });
    }

    subscription.planType = planType;
    subscription.updatedBy = req.admin.email || 'superadmin';
    if (planType === 'paid') {
      subscription.restrictions = {
        productivityToolsAllowed: true,
        maxNotes: -1,
        maxHomeworks: -1,
        aiAssistantQuota: -1
      };
    } else {
      subscription.restrictions = {
        productivityToolsAllowed: false,
        maxNotes: 5,
        maxHomeworks: 10,
        aiAssistantQuota: 10
      };
    }

    await subscription.save();

    res.json({
      success: true,
      message: `Subscription successfully updated to ${planType.toUpperCase()}.`,
      subscription
    });
  } catch (err) {
    console.error('[Update Subscription Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update subscription.' });
  }
});

// 12. Public: Student Self-Registration (Only for Students, starts on Free Plan)
app.post('/api/auth/register-student', async (req, res) => {
  try {
    const { email, password, username, firstName, lastName, gradeLevel } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, message: 'Email, username, and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (trimmedUsername.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 alphanumeric characters.' });
    }

    // Check if user exists in master accounts
    const existingMaster = await User.findOne({
      $or: [{ email: trimmedEmail }]
    });
    if (existingMaster) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check across databases for existing email or username in Credential collections
    const allAccounts = await User.find();
    for (const acc of allAccounts) {
      if (!acc.databaseName) continue;
      try {
        const models = getTenantModels(acc.databaseName);
        const existingCred = await models.Credential.findOne({
          $or: [{ email: trimmedEmail }, { username: trimmedUsername }]
        });
        if (existingCred) {
          return res.status(409).json({ success: false, message: 'Username or email is already registered.' });
        }
      } catch (e) {
        // Continue check
      }
    }

    // Provision dedicated personal workspace database for student
    const studentDbName = `rm_std_${trimmedUsername}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const studentFullName = `${firstName || ''} ${lastName || ''}`.trim() || trimmedUsername;

    // Create entry in master User table (role: student)
    const masterStudent = new User({
      email: trimmedEmail,
      password: hashedPassword,
      name: studentFullName,
      role: 'student',
      databaseName: studentDbName
    });
    const savedMaster = await masterStudent.save();

    // Provision tenant workspace database for student
    const models = getTenantModels(studentDbName);

    // Initial student settings
    await models.Setting.create({
      schoolName: `${studentFullName}'s Workspace`,
      term: 'Fall 2026',
      academicYear: '2026-2027',
      theme: 'dark',
      allowStudentLeaveRequests: false
    });

    // Create Credential
    const newCred = await models.Credential.create({
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword,
      role: 'student',
      firstName: firstName || trimmedUsername,
      lastName: lastName || '',
      status: 'active'
    });

    // Create Student model
    await models.Student.create({
      credentialId: String(newCred._id),
      username: trimmedUsername,
      email: trimmedEmail,
      firstName: firstName || trimmedUsername,
      lastName: lastName || '',
      gradeLevel: gradeLevel || 'Year 1',
      enrolledClasses: [],
      status: 'active'
    });

    // Create initial Point record in points table
    await Point.create({
      userId: String(newCred._id),
      email: trimmedEmail,
      username: trimmedUsername,
      studentName: studentFullName,
      databaseName: studentDbName,
      points: 0
    });

    // Create UserInfo
    await models.UserInfo.create({
      credentialId: String(newCred._id),
      username: trimmedUsername,
      email: trimmedEmail,
      firstName: firstName || trimmedUsername,
      lastName: lastName || '',
      department: 'Student Workspace',
      grade: gradeLevel || 'Year 1',
      avatar: 'student-avatar',
      bio: 'Rangermate Student Scholar',
      appData: {
        notes: [
          {
            id: 'welcome-note-01',
            title: 'Welcome to Rangermate!',
            content: 'Welcome to your Rangermate workspace. You are currently on the Free Student Plan.',
            tags: ['Welcome'],
            category: 'General',
            pinned: true,
            createdAt: new Date()
          }
        ],
        flashcards: [],
        studyStreak: 1
      }
    });

    // Create initial Free Subscription record in subscriptions table
    const newSubscription = await Subscription.create({
      userId: String(newCred._id),
      email: trimmedEmail,
      username: trimmedUsername,
      studentName: studentFullName,
      databaseName: studentDbName,
      planType: 'free',
      status: 'active',
      restrictions: {
        productivityToolsAllowed: false,
        maxNotes: 5,
        maxHomeworks: 10,
        aiAssistantQuota: 10
      },
      updatedBy: 'self-registration'
    });

    // Generate JWT token for immediate access
    const token = jwt.sign({
      userId: String(newCred._id),
      email: trimmedEmail,
      username: trimmedUsername,
      name: studentFullName,
      role: 'student',
      isSuperAdmin: false,
      databaseName: studentDbName,
      accountId: String(savedMaster._id),
      accountName: `${studentFullName}'s Workspace`,
      planType: 'free'
    }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully on the Free Plan.',
      token,
      user: {
        id: String(newCred._id),
        email: trimmedEmail,
        username: trimmedUsername,
        name: studentFullName,
        role: 'student',
        isSuperAdmin: false,
        accountId: String(savedMaster._id),
        accountName: `${studentFullName}'s Workspace`,
        databaseName: studentDbName
      },
      subscription: newSubscription
    });
  } catch (err) {
    console.error('[Student Registration Error]', err);
    res.status(500).json({ success: false, message: 'Failed to complete student registration.' });
  }
});

// 13. Student / User: Get my active subscription & restrictions
app.get('/api/subscription/me', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email?.toLowerCase();
    let sub = await Subscription.findOne({ email: userEmail });

    // If student user but no subscription record yet, create free subscription fallback
    if (!sub && req.user.role === 'student') {
      sub = await Subscription.create({
        userId: req.user.userId || String(req.user.id),
        email: userEmail,
        username: req.user.username || userEmail.split('@')[0],
        studentName: req.user.name || 'Student',
        databaseName: req.user.databaseName || generateDbName(userEmail),
        planType: 'free',
        status: 'active',
        restrictions: {
          productivityToolsAllowed: false,
          maxNotes: 5,
          maxHomeworks: 10,
          aiAssistantQuota: 10
        },
        updatedBy: 'system-fallback'
      });
    }

    // Admins and Teachers are unrestricted
    if (req.user.role !== 'student') {
      return res.json({
        success: true,
        planType: 'paid',
        isRestricted: false,
        restrictions: {
          productivityToolsAllowed: true,
          maxNotes: -1,
          maxHomeworks: -1,
          aiAssistantQuota: -1
        }
      });
    }

    const isRestricted = sub ? sub.planType === 'free' : true;

    res.json({
      success: true,
      subscription: sub,
      planType: sub ? sub.planType : 'free',
      isRestricted,
      restrictions: sub ? sub.restrictions : {
        productivityToolsAllowed: false,
        maxNotes: 5,
        maxHomeworks: 10,
        aiAssistantQuota: 10
      }
    });
  } catch (err) {
    console.error('[Subscription Me Error]', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve subscription status.' });
  }
});

// ====================== TENANT / USER ROUTES ======================

// Unified Login: Supports Super Admin, School Admin, Teacher, Student, and School Accounts
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const trimmedIdentifier = email.trim().toLowerCase();

    // A. Check Super Admin Credentials (admin@rangermate.com / admin@rangermate)
    if (
      (trimmedIdentifier === 'admin@rangermate.com' && password === 'admin@rangermate') ||
      (trimmedIdentifier === 'admin' && password === 'rangermateAdmin')
    ) {
      const token = jwt.sign({
        userId: 'super-admin-01',
        role: 'admin',
        isSuperAdmin: true,
        username: 'admin@rangermate.com',
        email: 'admin@rangermate.com',
        name: 'Super System Administrator'
      }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Super Admin login successful',
        token,
        user: {
          id: 'super-admin-01',
          email: 'admin@rangermate.com',
          name: 'Super System Administrator',
          role: 'admin',
          isSuperAdmin: true
        }
      });
    }

    // B. Search across account databases for matching Credential (student, teacher, or school admin)
    const allAccounts = await Account.find();
    for (const acc of allAccounts) {
      if (!acc.databaseName) continue;
      try {
        const models = getTenantModels(acc.databaseName);
        let cred = await models.Credential.findOne({
          $or: [{ email: trimmedIdentifier }, { username: trimmedIdentifier }]
        });

        if (cred) {
          const isMatch = await bcrypt.compare(password, cred.password);
          if (isMatch) {
            let userSub = null;
            if (cred.role === 'student') {
              userSub = await Subscription.findOne({ email: cred.email.toLowerCase() });
            }

            const token = jwt.sign({
              userId: String(cred._id),
              email: cred.email,
              username: cred.username,
              name: `${cred.firstName || ''} ${cred.lastName || ''}`.trim() || cred.username,
              role: cred.role,
              isSuperAdmin: false,
              databaseName: acc.databaseName,
              accountId: String(acc._id),
              accountName: acc.name,
              planType: userSub ? userSub.planType : (cred.role === 'student' ? 'free' : 'paid')
            }, JWT_SECRET, { expiresIn: '7d' });

            return res.json({
              success: true,
              message: 'Login successful',
              token,
              user: {
                id: String(cred._id),
                email: cred.email,
                username: cred.username,
                name: `${cred.firstName || ''} ${cred.lastName || ''}`.trim() || cred.username,
                role: cred.role,
                isSuperAdmin: false,
                accountId: String(acc._id),
                accountName: acc.name,
                databaseName: acc.databaseName,
                planType: userSub ? userSub.planType : (cred.role === 'student' ? 'free' : 'paid')
              }
            });
          }
        }
      } catch (e) {
        // Continue to check other databases
      }
    }

    // C. Check if it matches an Account master user (e.g. school registration)
    const masterAccount = await Account.findOne({ email: trimmedIdentifier });
    if (masterAccount) {
      const isMatch = await masterAccount.comparePassword(password);
      if (isMatch) {
        const token = jwt.sign({
          userId: String(masterAccount._id),
          email: masterAccount.email,
          name: masterAccount.name,
          role: 'admin', // School master account acts as school admin
          isSuperAdmin: false,
          accountId: String(masterAccount._id),
          accountName: masterAccount.name,
          databaseName: masterAccount.databaseName
        }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
          success: true,
          message: 'School Admin login successful',
          token,
          user: {
            id: String(masterAccount._id),
            email: masterAccount.email,
            name: masterAccount.name,
            role: 'admin',
            isSuperAdmin: false,
            accountId: String(masterAccount._id),
            accountName: masterAccount.name,
            databaseName: masterAccount.databaseName
          }
        });
      }
    }

    // D. Check student in users collection
    const studentUser = await User.findOne({
      $or: [{ email: trimmedIdentifier }, { username: trimmedIdentifier }]
    });
    if (studentUser) {
      const isMatch = await studentUser.comparePassword(password);
      if (isMatch) {
        const userSub = await Subscription.findOne({ email: studentUser.email });
        const token = jwt.sign({
          userId: String(studentUser._id),
          email: studentUser.email,
          username: studentUser.username,
          name: studentUser.name,
          role: 'student',
          isSuperAdmin: false,
          accountId: String(studentUser._id),
          accountName: `${studentUser.name}'s Workspace`,
          databaseName: studentUser.databaseName,
          planType: userSub ? userSub.planType : 'free'
        }, JWT_SECRET, { expiresIn: '7d' });

        return res.json({
          success: true,
          message: 'Student login successful',
          token,
          user: {
            id: String(studentUser._id),
            email: studentUser.email,
            username: studentUser.username,
            name: studentUser.name,
            role: 'student',
            isSuperAdmin: false,
            accountId: String(studentUser._id),
            accountName: `${studentUser.name}'s Workspace`,
            databaseName: studentUser.databaseName,
            planType: userSub ? userSub.planType : 'free'
          }
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials. User not found or wrong password.' });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Helper to determine databaseName from token or header
function resolveTenantDb(req) {
  return req.headers['x-tenant-db'] || (req.user && req.user.databaseName) || 'rm_acc_rangermate_academy';
}

// ====================== SETTINGS & USER INFO ROUTES ======================

// GET User Settings & Profile
app.get('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      // Create fallback userInfo
      userInfo = await models.UserInfo.create({
        credentialId: req.user.userId,
        username: req.user.email.split('@')[0],
        email: req.user.email,
        firstName: req.user.name ? req.user.name.split(' ')[0] : '',
        lastName: req.user.name ? req.user.name.split(' ').slice(1).join(' ') : '',
        department: req.user.role === 'teacher' ? 'Faculty' : 'Pre-Med Scholar'
      });
    }

    const schoolSetting = await models.Setting.findOne() || {};

    res.json({
      success: true,
      userInfo,
      schoolSetting,
      databaseName: dbName
    });
  } catch (err) {
    console.error('[Settings Fetch Error]', err);
    res.status(500).json({ success: false, message: 'Failed to load user settings.' });
  }
});

// PUT Update User Info / Profile
app.put('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { firstName, lastName, username, email, phone, bio, department, grade } = req.body;

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      userInfo = new models.UserInfo({
        credentialId: req.user.userId,
        username: username || req.user.email.split('@')[0],
        email: email || req.user.email
      });
    }

    if (firstName !== undefined) userInfo.firstName = firstName;
    if (lastName !== undefined) userInfo.lastName = lastName;
    if (username !== undefined) userInfo.username = username;
    if (email !== undefined) userInfo.email = email;
    if (phone !== undefined) userInfo.phone = phone;
    if (bio !== undefined) userInfo.bio = bio;
    if (department !== undefined) userInfo.department = department;
    if (grade !== undefined) userInfo.grade = grade;
    userInfo.updatedAt = new Date();

    await userInfo.save();

    // Also sync Credential record if it exists
    const cred = await models.Credential.findById(req.user.userId);
    if (cred) {
      if (firstName !== undefined) cred.firstName = firstName;
      if (lastName !== undefined) cred.lastName = lastName;
      if (username !== undefined) cred.username = username;
      if (email !== undefined) cred.email = email;
      await cred.save();
    }

    res.json({
      success: true,
      message: 'Profile settings saved successfully.',
      userInfo
    });
  } catch (err) {
    console.error('[Settings Save Error]', err);
    res.status(500).json({ success: false, message: 'Failed to update profile settings.' });
  }
});

// ====================== BLOOKET STORE & GAMIFICATION POINTS ROUTES ======================

// Catalog of Blooket-style Packs and Collectible Blooks
const BLOOK_PACKS = [
  {
    id: 'starter-box',
    name: 'Starter Box',
    price: 25,
    description: 'Classic starter pack with friendly companion blooks.',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    blooks: [
      { name: 'Dog', rarity: 'Common', dropRate: 40, icon: '🐶' },
      { name: 'Cat', rarity: 'Common', dropRate: 35, icon: '🐱' },
      { name: 'Rabbit', rarity: 'Uncommon', dropRate: 15, icon: '🐰' },
      { name: 'Fox', rarity: 'Rare', dropRate: 8, icon: '🦊' },
      { name: 'Dragon', rarity: 'Legendary', dropRate: 2, icon: '🐲' }
    ]
  },
  {
    id: 'space-box',
    name: 'Space Box',
    price: 50,
    description: 'Explore the cosmos with planetary astronauts and celestial blooks.',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    blooks: [
      { name: 'Astronaut', rarity: 'Common', dropRate: 38, icon: '👨‍🚀' },
      { name: 'Alien', rarity: 'Common', dropRate: 32, icon: '👽' },
      { name: 'Rocket', rarity: 'Uncommon', dropRate: 18, icon: '🚀' },
      { name: 'UFO', rarity: 'Rare', dropRate: 9, icon: '🛸' },
      { name: 'Supernova Golem', rarity: 'Chroma', dropRate: 3, icon: '☄️' }
    ]
  },
  {
    id: 'safari-box',
    name: 'Safari Box',
    price: 50,
    description: 'Roam the wild plains with powerful apex animal blooks.',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    blooks: [
      { name: 'Tiger', rarity: 'Common', dropRate: 35, icon: '🐯' },
      { name: 'Lion', rarity: 'Common', dropRate: 35, icon: '🦁' },
      { name: 'Panda', rarity: 'Uncommon', dropRate: 18, icon: '🐼' },
      { name: 'Owl', rarity: 'Rare', dropRate: 9, icon: '🦉' },
      { name: 'Golden Griffin', rarity: 'Legendary', dropRate: 3, icon: '🦅' }
    ]
  },
  {
    id: 'cyber-vault',
    name: 'Cyber Vault',
    price: 100,
    description: 'Ultra-rare futuristic cyborgs, quantum neural intelligences, and mechs.',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    blooks: [
      { name: 'Cyborg Falcon', rarity: 'Uncommon', dropRate: 35, icon: '🤖' },
      { name: 'Quantum Core', rarity: 'Rare', dropRate: 30, icon: '🔮' },
      { name: 'Holo Samurai', rarity: 'Epic', dropRate: 20, icon: '⚔️' },
      { name: 'Nanotech Titan', rarity: 'Legendary', dropRate: 12, icon: '👾' },
      { name: 'Chroma Matrix Lord', rarity: 'Chroma', dropRate: 3, icon: '👑' }
    ]
  }
];

// Helper: Pick a Blook based on weighted drop probabilities
function rollBlook(blooks) {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const b of blooks) {
    cumulative += b.dropRate;
    if (rand <= cumulative) {
      return b;
    }
  }
  return blooks[0];
}

// GET Store Packs & Catalog
app.get('/api/store/packs', requireAuth, (req, res) => {
  const formattedPacks = BLOOK_PACKS.map(p => ({
    id: p.id,
    name: p.name,
    cost: p.price,
    description: p.description,
    badge: p.id === 'cyber-vault' ? 'MYTHIC' : (p.id === 'starter-box' ? 'STARTER' : 'POPULAR'),
    color: p.id === 'starter-box' ? '#10b981' : (p.id === 'space-box' ? '#6366f1' : (p.id === 'safari-box' ? '#f59e0b' : '#ec4899')),
    blooks: p.blooks.map(b => ({
      name: b.name,
      rarity: b.rarity,
      chance: b.dropRate,
      avatar: b.icon,
      description: `${b.rarity} tier Blook from the ${p.name}`
    }))
  }));
  res.json({ success: true, packs: formattedPacks });
});

// GET Student Store Profile (tokens, points, unlocked blooks, active blook)
app.get('/api/store/profile', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      userInfo = await models.UserInfo.create({
        credentialId: req.user.userId || req.user.id || 'usr-' + Date.now(),
        username: req.user.email.split('@')[0],
        email: req.user.email,
        firstName: req.user.name?.split(' ')[0] || '',
        lastName: req.user.name?.split(' ').slice(1).join(' ') || '',
        department: req.user.role === 'teacher' ? 'Faculty' : 'Pre-Med Scholar',
        appData: {
          points: 0,
          tokens: 0,
          blooks: ['Astronaut'],
          activeBlook: 'Astronaut',
          packsOpened: 0
        }
      });
    }

    // Read dedicated Point collection in master DB
    let pointDoc = await Point.findOne({ email: req.user.email.toLowerCase() });
    if (!pointDoc) {
      pointDoc = await Point.create({
        userId: String(req.user.userId || userInfo.credentialId || req.user.id),
        email: req.user.email.toLowerCase(),
        points: userInfo.appData?.points || 0
      });
    }

    const appData = userInfo.appData || {};
    const points = pointDoc.points ?? appData.points ?? 0;
    const tokens = appData.tokens ?? 0;
    const blooks = appData.blooks || ['Character A', 'Character B', 'Astronaut'];
    const activeBlook = appData.activeBlook || 'Character A';
    const packsOpened = appData.packsOpened || 0;
    const customAvatar = appData.customAvatar || null;
    const unlockedEquipments = appData.unlockedEquipments || [];

    res.json({
      success: true,
      profile: {
        points,
        tokens,
        blooks,
        activeBlook,
        packsOpened,
        customAvatar,
        unlockedEquipments
      }
    });
  } catch (err) {
    console.error('[Store Profile Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to load store profile.', error: err.message });
  }
});

// GET My Points (dedicated endpoint for points table)
app.get('/api/points/me', requireAuth, async (req, res) => {
  try {
    let pointDoc = await Point.findOne({ email: req.user.email.toLowerCase() });
    if (!pointDoc) {
      pointDoc = await Point.create({
        userId: String(req.user.userId || req.user.id),
        email: req.user.email.toLowerCase(),
        points: 0
      });
    }
    res.json({ success: true, points: pointDoc.points, history: pointDoc.history || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load points.' });
  }
});

// POST Open a Pack (Spend Tokens to unlock a new Blook!)
app.post('/api/store/open-pack', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { packId } = req.body;

    const pack = BLOOK_PACKS.find(p => p.id === packId);
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Pack not found in store.' });
    }

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const currentTokens = userInfo.appData?.tokens ?? 0;
    if (currentTokens < pack.price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient tokens! You need ${pack.price} tokens to open ${pack.name}, but only have ${currentTokens}. Earn more tokens by completing quizzes!`
      });
    }

    // Roll random blook
    const pulledBlook = rollBlook(pack.blooks);

    // Deduct tokens, increment packsOpened, add to unlocked blooks if not present
    const updatedTokens = currentTokens - pack.price;
    const userBlooks = Array.isArray(userInfo.appData?.blooks) ? [...userInfo.appData.blooks] : ['Character A', 'Character B', 'Astronaut'];
    const isNew = !userBlooks.includes(pulledBlook.name);
    if (isNew) {
      userBlooks.push(pulledBlook.name);
    }

    userInfo.appData = {
      ...(userInfo.appData || {}),
      tokens: updatedTokens,
      blooks: userBlooks,
      packsOpened: (userInfo.appData?.packsOpened || 0) + 1
    };
    userInfo.markModified('appData');
    await userInfo.save();

    res.json({
      success: true,
      message: `You unlocked ${pulledBlook.name}!`,
      pack: { id: pack.id, name: pack.name },
      blook: {
        name: pulledBlook.name,
        rarity: pulledBlook.rarity,
        avatar: pulledBlook.icon,
        description: `${pulledBlook.rarity} tier Blook from the ${pack.name}`
      },
      isNew,
      remainingTokens: updatedTokens,
      blooks: userBlooks
    });
  } catch (err) {
    console.error('[Open Pack Error]', err);
    res.status(500).json({ success: false, message: 'Failed to open pack.' });
  }
});

// POST Buy / Unlock an In-Build Avatar
app.post('/api/store/buy-avatar', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { avatarName, price } = req.body;

    if (!avatarName) {
      return res.status(400).json({ success: false, message: 'Avatar name is required.' });
    }

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const currentTokens = userInfo.appData?.tokens ?? 0;
    const cost = Number(price) || 0;

    if (currentTokens < cost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient tokens! You need ${cost} tokens to unlock ${avatarName}, but only have ${currentTokens}.`
      });
    }

    const userBlooks = Array.isArray(userInfo.appData?.blooks) ? [...userInfo.appData.blooks] : ['Character A', 'Character B', 'Astronaut'];
    if (!userBlooks.includes(avatarName)) {
      userBlooks.push(avatarName);
    }

    userInfo.appData = {
      ...(userInfo.appData || {}),
      tokens: currentTokens - cost,
      blooks: userBlooks,
      activeBlook: avatarName
    };
    userInfo.markModified('appData');
    await userInfo.save();

    res.json({
      success: true,
      message: `Unlocked and equipped ${avatarName}!`,
      activeBlook: avatarName,
      remainingTokens: userInfo.appData.tokens,
      blooks: userBlooks
    });
  } catch (err) {
    console.error('[Buy Avatar Error]', err);
    res.status(500).json({ success: false, message: 'Failed to purchase avatar.' });
  }
});

// POST Save Custom Created Avatar
app.post('/api/store/save-avatar', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { customAvatar } = req.body;

    if (!customAvatar) {
      return res.status(400).json({ success: false, message: 'Avatar configuration is required.' });
    }

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    userInfo.appData = {
      ...(userInfo.appData || {}),
      customAvatar,
      activeBlook: customAvatar.name || 'Custom Character'
    };
    userInfo.markModified('appData');
    await userInfo.save();

    res.json({
      success: true,
      message: 'Custom avatar saved and equipped successfully!',
      activeBlook: userInfo.appData.activeBlook,
      customAvatar
    });
  } catch (err) {
    console.error('[Save Avatar Error]', err);
    res.status(500).json({ success: false, message: 'Failed to save avatar.' });
  }
});

// POST Equip Active Blook or Avatar
app.post('/api/store/equip-blook', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { blookName } = req.body;

    if (!blookName) {
      return res.status(400).json({ success: false, message: 'Avatar name is required.' });
    }

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userBlooks = userInfo.appData?.blooks || [];
    if (!userBlooks.includes(blookName) && blookName !== 'Custom Character') {
      return res.status(400).json({ success: false, message: 'You have not unlocked this avatar yet!' });
    }

    userInfo.appData = {
      ...(userInfo.appData || {}),
      activeBlook: blookName
    };
    userInfo.markModified('appData');
    await userInfo.save();

    res.json({ success: true, message: `Equipped ${blookName} as your active avatar!`, activeBlook: blookName });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to equip avatar.' });
  }
});

// POST Earn Points & Tokens (e.g. from answering quiz questions, study streaks)
app.post('/api/rewards/add-points', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { points, tokens, pointsEarned, tokensEarned, reason } = req.body;

    const pAdd = Number(pointsEarned ?? points) || 0;
    const tAdd = Number(tokensEarned ?? tokens) || (pAdd > 0 ? pAdd : 0);

    let userInfo = await models.UserInfo.findOne({
      $or: [{ credentialId: req.user.userId }, { email: req.user.email.toLowerCase() }]
    });

    if (!userInfo) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const currPoints = userInfo.appData?.points || 0;
    const currTokens = userInfo.appData?.tokens || 0;

    userInfo.appData = {
      ...(userInfo.appData || {}),
      points: currPoints + pAdd,
      tokens: currTokens + tAdd
    };
    userInfo.markModified('appData');
    await userInfo.save();

    // Also update dedicated Point collection in master DB
    let pointDoc = await Point.findOne({ email: req.user.email.toLowerCase() });
    if (!pointDoc) {
      pointDoc = new Point({
        userId: String(req.user.userId || userInfo.credentialId || req.user.id),
        email: req.user.email.toLowerCase(),
        points: currPoints + pAdd,
        history: [{ points: pAdd, reason: reason || 'study achievement' }]
      });
    } else {
      pointDoc.points = (pointDoc.points || 0) + pAdd;
      pointDoc.history.push({ points: pAdd, reason: reason || 'study achievement' });
    }
    await pointDoc.save();

    res.json({
      success: true,
      message: `+${pAdd} Points & +${tAdd} Tokens rewarded for ${reason || 'study achievement'}!`,
      points: pointDoc.points,
      tokens: userInfo.appData.tokens
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add reward points.' });
  }
});

// ====================== TEACHER PORTAL & CLASSES / HOMEWORK ROUTES ======================

// GET Classes
app.get('/api/classes', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const classes = await models.Class.find().sort({ createdAt: -1 });
    res.json({ success: true, count: classes.length, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch classes.' });
  }
});

// POST Create Class (Admin or Teacher can create and assign teacher)
app.post('/api/classes', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { name, code, subject, room, schedule, teacherId, teacherName } = req.body;

    let assignedTeacherName = teacherName?.trim() || req.user.name || 'Instructor';
    let assignedTeacherId = teacherId || req.user.userId;

    if (teacherId) {
      const teacherCred = await models.Credential.findById(teacherId);
      if (teacherCred) {
        assignedTeacherName = `${teacherCred.firstName} ${teacherCred.lastName}`.trim() || teacherCred.username;
      }
    }

    const newClass = await models.Class.create({
      name: name.trim(),
      code: code.trim(),
      subject: subject || 'General',
      teacherName: assignedTeacherName,
      teacherId: assignedTeacherId,
      room: room || 'Room 101',
      schedule: schedule || 'Mon/Wed 10:00 AM'
    });

    // Also update Teacher's assignedClasses
    if (assignedTeacherId) {
      await models.Teacher.findOneAndUpdate(
        { credentialId: assignedTeacherId },
        { $addToSet: { assignedClasses: newClass.code } }
      );
    }

    // Keep teacherClasses collection synchronized (tracks which teacher is assigned to each class)
    let teacherEmail = '';
    if (assignedTeacherId) {
      const tCred = await models.Credential.findById(assignedTeacherId);
      if (tCred) teacherEmail = tCred.email;
    }
    await models.TeacherClass.findOneAndUpdate(
      { classId: String(newClass._id) },
      {
        teacherId: assignedTeacherId || '',
        teacherName: assignedTeacherName,
        teacherEmail: teacherEmail,
        classId: String(newClass._id),
        className: newClass.name,
        classCode: newClass.code,
        subject: newClass.subject,
        room: newClass.room,
        schedule: newClass.schedule,
        assignedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, class: newClass });
  } catch (err) {
    console.error('[Create Class Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create class.' });
  }
});

// PUT Assign / Reassign Class to Teacher
app.put('/api/classes/:id', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { teacherId, teacherName, name, room, schedule } = req.body;

    const cls = await models.Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    let teacherEmail = '';
    if (teacherId) {
      const teacherCred = await models.Credential.findById(teacherId);
      cls.teacherId = teacherId;
      cls.teacherName = teacherCred ? `${teacherCred.firstName} ${teacherCred.lastName}`.trim() || teacherCred.username : (teacherName || 'Assigned Teacher');
      if (teacherCred) teacherEmail = teacherCred.email;
      await models.Teacher.findOneAndUpdate(
        { credentialId: teacherId },
        { $addToSet: { assignedClasses: cls.code } }
      );
    } else if (teacherName) {
      cls.teacherName = teacherName;
    }

    if (name) cls.name = name.trim();
    if (room) cls.room = room.trim();
    if (schedule) cls.schedule = schedule.trim();

    await cls.save();

    // Synchronize teacherClasses collection
    await models.TeacherClass.findOneAndUpdate(
      { classId: String(cls._id) },
      {
        teacherId: cls.teacherId || '',
        teacherName: cls.teacherName || 'Assigned Teacher',
        teacherEmail: teacherEmail,
        classId: String(cls._id),
        className: cls.name,
        classCode: cls.code,
        subject: cls.subject,
        room: cls.room,
        schedule: cls.schedule,
        assignedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Class updated and assigned successfully.', class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update class.' });
  }
});

// DELETE Class
app.delete('/api/classes/:id', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    await models.Class.findByIdAndDelete(req.params.id);
    // Remove from teacherClasses collection
    await models.TeacherClass.findOneAndDelete({ classId: req.params.id });
    res.json({ success: true, message: 'Class deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete class.' });
  }
});

// GET Teacher-Class assignments (data of which teacher is assigned to each class)
app.get('/api/teacher-classes', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const teacherClasses = await models.TeacherClass.find().sort({ className: 1 });
    res.json({ success: true, count: teacherClasses.length, teacherClasses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch teacher classes.' });
  }
});

// GET School Info (institution metadata)
app.get('/api/school-info', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    let schoolInfo = await models.SchoolInfo.findOne();
    if (!schoolInfo) {
      schoolInfo = await models.SchoolInfo.create({
        schoolName: 'Rangermate Academy',
        schoolCode: 'RMA-2026',
        databaseName: dbName,
        principalName: 'Dr. Arthur Vance',
        contactEmail: 'admin@rangermate.com',
        phone: '+1 (555) 342-8900',
        address: '450 University Parkway, Science & Tech Wing',
        academicYear: '2026-2027',
        term: 'Fall Semester'
      });
    }
    res.json({ success: true, schoolInfo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch school info.' });
  }
});


// ====================== ANNOUNCEMENTS ROUTES ======================

// GET Announcements
app.get('/api/announcements', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const announcements = await models.Announcement.find().sort({ pinned: -1, createdAt: -1 });
    res.json({ success: true, count: announcements.length, announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch announcements.' });
  }
});

// POST Create Announcement (Admin or Teacher)
app.post('/api/announcements', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { title, content, targetAudience, pinned, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const announcement = await models.Announcement.create({
      title: title.trim(),
      content: content.trim(),
      authorName: req.user.name || 'Administration',
      authorRole: req.user.role || 'admin',
      targetAudience: targetAudience || 'all',
      pinned: !!pinned,
      priority: priority || 'Normal'
    });

    res.status(201).json({ success: true, message: 'Announcement published successfully.', announcement });
  } catch (err) {
    console.error('[Create Announcement Error]', err);
    res.status(500).json({ success: false, message: 'Failed to publish announcement.' });
  }
});

// DELETE Announcement
app.delete('/api/announcements/:id', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    await models.Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete announcement.' });
  }
});

// ====================== PRODUCTIVITY TOOLS ROUTES (CHAT, SLIDES, DOCS, SHEETS, FORMS) ======================

// CHAT: GET Messages
app.get('/api/productivity/chat', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { channelId } = req.query;
    const targetChannel = channelId || 'study-group';

    let messages = await models.ChatMessage.find({ channelId: targetChannel }).sort({ createdAt: 1 }).limit(100);
    
    // Seed default messages if channel is empty
    if (messages.length === 0) {
      const defaultMsgs = [
        {
          channelId: targetChannel,
          senderId: 'faculty-01',
          senderName: 'Prof. Elena Morris',
          senderRole: 'teacher',
          text: 'Good morning scholars. Please review the cranial nerve chart prior to tomorrow\'s lab examination.'
        },
        {
          channelId: targetChannel,
          senderId: 'student-02',
          senderName: 'Marcus Vance',
          senderRole: 'student',
          text: 'Will the test include parasympathetic pathways for CN III and VII as well?'
        }
      ];
      messages = await models.ChatMessage.insertMany(defaultMsgs);
    }

    res.json({ success: true, count: messages.length, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat messages.' });
  }
});

// CHAT: POST Send Message
app.post('/api/productivity/chat', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { text, channelId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const newMsg = await models.ChatMessage.create({
      channelId: channelId || 'study-group',
      senderId: req.user.userId,
      senderName: req.user.name || 'Scholar',
      senderRole: req.user.role || 'student',
      text: text.trim()
    });

    res.status(201).json({ success: true, message: newMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

// SLIDES: GET & PUT User Slides Presentation
app.get('/api/productivity/slides', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    let deck = await models.SlideDeck.findOne({ userId: req.user.userId });
    if (!deck) {
      deck = await models.SlideDeck.create({
        userId: req.user.userId,
        title: 'Biochemistry & Cellular Mechanisms',
        slides: [
          {
            id: 1,
            title: 'Cellular Respiration & ATP Synthesis',
            subtitle: 'Glycolysis, Krebs Cycle & Oxidative Phosphorylation',
            content: 'Overview of biochemical bioenergetics and ATP synthase electrochemical gradients.',
            bullets: [
              'Glycolysis generates 2 net ATP and 2 NADH in cytosol',
              'Pyruvate dehydrogenase complex bridges glycolysis to TCA cycle in matrix',
              'Electron transport chain builds proton motive force across inner mitochondrial membrane'
            ],
            theme: 'gradient-blue'
          },
          {
            id: 2,
            title: 'Enzyme Kinetics & Michaelis-Menten',
            subtitle: 'Vmax, Km & Catalytic Efficiency',
            content: 'Mathematical modeling of single-substrate enzymatic reaction velocities.',
            bullets: [
              'Km is the substrate concentration at half-maximal velocity (Vmax/2)',
              'Competitive inhibitors increase apparent Km without altering Vmax',
              'Non-competitive inhibitors lower Vmax while maintaining unchanged Km'
            ],
            theme: 'gradient-emerald'
          }
        ]
      });
    }
    res.json({ success: true, deck });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch slides.' });
  }
});

app.put('/api/productivity/slides', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { title, slides } = req.body;

    let deck = await models.SlideDeck.findOne({ userId: req.user.userId });
    if (!deck) {
      deck = new models.SlideDeck({ userId: req.user.userId });
    }

    if (title !== undefined) deck.title = title;
    if (slides !== undefined) deck.slides = slides;
    deck.updatedAt = new Date();
    await deck.save();

    res.json({ success: true, message: 'Slides presentation saved to database.', deck });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save presentation.' });
  }
});

// DOCS: GET & PUT User Research Document
app.get('/api/productivity/docs', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    let doc = await models.Document.findOne({ userId: req.user.userId });
    if (!doc) {
      doc = await models.Document.create({
        userId: req.user.userId,
        title: 'Clinical Research Protocol & Diagnostic Criteria',
        content: `# Clinical Research Protocol & Diagnostic Criteria\n\n## 1. Study Objective & Hypothesis\nThe primary objective of this clinical investigation is to evaluate the therapeutic efficacy and safety profile of targeted enzymatic inhibitors in patients diagnosed with metabolic dysfunction-associated steatotic liver disease (MASLD).\n\n### Secondary Endpoints:\n- Reduction in serum alanine aminotransferase (ALT) and aspartate aminotransferase (AST) over a 24-week observational period.\n- Non-invasive fibrosis biomarker regression measured via transient elastography (FibroScan).\n- Glycemic stabilization and insulin resistance index (HOMA-IR) optimization.\n\n## 2. Patient Inclusion Criteria\n1. Confirmed histological or elastographic steatosis grade >= 2.\n2. Stable body mass index (BMI) between 25.0 and 38.0 kg/m² for >= 3 months.`
      });
    }
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch document.' });
  }
});

app.put('/api/productivity/docs', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { title, content } = req.body;

    let doc = await models.Document.findOne({ userId: req.user.userId });
    if (!doc) {
      doc = new models.Document({ userId: req.user.userId });
    }

    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    doc.updatedAt = new Date();
    await doc.save();

    res.json({ success: true, message: 'Document saved to database.', document: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save document.' });
  }
});

// SHEETS: GET & PUT User Spreadsheet Data
app.get('/api/productivity/sheets', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    let sheet = await models.Spreadsheet.findOne({ userId: req.user.userId });
    if (!sheet) {
      sheet = await models.Spreadsheet.create({
        userId: req.user.userId,
        title: 'Clinical Chemistry Lab Results - Cohort 1',
        gridData: {
          'A1': 'Patient ID',
          'B1': 'Fasting Glucose',
          'C1': 'HbA1c (%)',
          'D1': 'Total Cholesterol',
          'E1': 'HDL (mg/dL)',
          'F1': 'LDL (mg/dL)',
          'G1': 'Triglycerides',
          'H1': 'Diagnostic Status',
          'A2': 'PT-10029',
          'B2': '92 mg/dL',
          'C2': '5.4%',
          'D2': '178 mg/dL',
          'E2': '58 mg/dL',
          'F2': '98 mg/dL',
          'G2': '110 mg/dL',
          'H2': 'Normal'
        }
      });
    }
    res.json({ success: true, sheet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sheet.' });
  }
});

app.put('/api/productivity/sheets', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { title, gridData } = req.body;

    let sheet = await models.Spreadsheet.findOne({ userId: req.user.userId });
    if (!sheet) {
      sheet = new models.Spreadsheet({ userId: req.user.userId });
    }

    if (title !== undefined) sheet.title = title;
    if (gridData !== undefined) sheet.gridData = gridData;
    sheet.updatedAt = new Date();
    await sheet.save();

    res.json({ success: true, message: 'Spreadsheet saved to database.', sheet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save spreadsheet.' });
  }
});

// FORMS: GET & PUT & SUBMIT User Forms
app.get('/api/productivity/forms', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    let form = await models.Form.findOne({ userId: req.user.userId });
    if (!form) {
      form = await models.Form.create({
        userId: req.user.userId,
        title: 'Clinical Skills Self-Assessment & Rotation Feedback',
        description: 'Please complete this evaluation regarding your recent clinical rotations and laboratory simulations.',
        questions: [
          { id: 1, title: 'Full Name & Scholar ID', type: 'short', required: true },
          { id: 2, title: 'Primary Clinical Specialty / Department Rotation', type: 'multiple_choice', options: ['Cardiology & Thoracic', 'General Surgery & Trauma', 'Neurology & Diagnostics', 'Pediatrics & Neonatal'], required: true },
          { id: 3, title: 'Confidence Rating in Electrocardiogram (ECG) Interpretation', type: 'multiple_choice', options: ['Highly Confident (Independent)', 'Moderate (Requires Supervised Review)', 'Needs Additional Clinical Practice'], required: true }
        ],
        responses: [
          { respondentName: 'Zayan Ahmed (ID: ZA-881)', submittedAt: 'Today at 02:14 PM' },
          { respondentName: 'Elena Rostova (ID: ER-702)', submittedAt: 'Yesterday at 04:30 PM' }
        ]
      });
    }
    res.json({ success: true, form });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch form.' });
  }
});

app.put('/api/productivity/forms', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { title, description, questions, responses } = req.body;

    let form = await models.Form.findOne({ userId: req.user.userId });
    if (!form) {
      form = new models.Form({ userId: req.user.userId });
    }

    if (title !== undefined) form.title = title;
    if (description !== undefined) form.description = description;
    if (questions !== undefined) form.questions = questions;
    if (responses !== undefined) form.responses = responses;
    form.updatedAt = new Date();
    await form.save();

    res.json({ success: true, message: 'Form saved to database.', form });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save form.' });
  }
});

// GET Homeworks (all or by classId)
app.get('/api/homeworks', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { classId } = req.query;
    const filter = classId ? { classId } : {};
    const homeworks = await models.Homework.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: homeworks.length, homeworks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch homeworks.' });
  }
});

// POST Assign Homework (Teacher portal)
app.post('/api/homeworks', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { classId, className, title, description, dueDate, priority } = req.body;

    if (!classId || !title) {
      return res.status(400).json({ success: false, message: 'Class and homework title are required.' });
    }

    const homework = await models.Homework.create({
      classId,
      className: className || 'Enrolled Class',
      title: title.trim(),
      description: description || '',
      assignedByTeacherId: req.user.userId,
      assignedByTeacherName: req.user.name || 'Teacher',
      dueDate: dueDate || 'Next Session',
      priority: priority || 'Medium'
    });

    // Notify students
    await models.Notification.create({
      recipientRole: 'student',
      title: `New Homework Assigned: ${title}`,
      message: `Teacher ${req.user.name || ''} assigned a new task for ${className}. Due: ${dueDate || 'Soon'}.`,
      type: 'homework'
    });

    res.status(201).json({ success: true, message: 'Homework assigned successfully.', homework });
  } catch (err) {
    console.error('[Assign Homework Error]', err);
    res.status(500).json({ success: false, message: 'Failed to assign homework.' });
  }
});

// ====================== ATTENDANCE ROUTES ======================

// GET Students for Class (for taking attendance)
app.get('/api/attendance/students', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { classId } = req.query;

    let students = await models.Student.find({ status: 'active' });
    if (students.length === 0) {
      // Fallback: look up in credentials where role is student
      const studentCreds = await models.Credential.find({ role: 'student' });
      students = studentCreds.map(c => ({
        credentialId: String(c._id),
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        username: c.username,
        email: c.email,
        gradeLevel: 'Undergraduate',
        attendanceRate: 95
      }));
    }

    res.json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch class students.' });
  }
});

// GET Attendance Records (by classId and optional date)
app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { classId, date } = req.query;

    const filter = {};
    if (classId) filter.classId = classId;
    if (date) filter.date = date;

    const attendances = await models.Attendance.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, count: attendances.length, attendances });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
  }
});

// POST Save / Mark Attendance
app.post('/api/attendance', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { classId, className, date, records } = req.body;

    if (!classId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Class, date, and student records are required.' });
    }

    let existing = await models.Attendance.findOne({ classId, date });
    if (existing) {
      existing.records = records;
      existing.recordedByTeacherId = req.user.userId;
      existing.recordedByTeacherName = req.user.name || 'Faculty Teacher';
      await existing.save();
      return res.json({ success: true, message: 'Attendance updated successfully.', attendance: existing });
    }

    const newAttendance = await models.Attendance.create({
      classId,
      className: className || 'Enrolled Course',
      date,
      records,
      recordedByTeacherId: req.user.userId,
      recordedByTeacherName: req.user.name || 'Faculty Teacher'
    });

    res.status(201).json({ success: true, message: 'Attendance recorded successfully.', attendance: newAttendance });
  } catch (err) {
    console.error('[Attendance Save Error]', err);
    res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
});

// ====================== LEAVE REQUESTS & NOTIFICATIONS ======================

// GET Leave Requests
app.get('/api/leaves', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const leaves = await models.LeaveRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leave requests.' });
  }
});

// POST Student applies for leave
app.post('/api/leaves', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { reason, startDate, endDate, teacherName } = req.body;

    if (!reason || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Reason, start date, and end date are required.' });
    }

    const leave = await models.LeaveRequest.create({
      studentId: req.user.userId,
      studentName: req.user.name || 'Student',
      studentEmail: req.user.email,
      teacherName: teacherName || 'Course Instructors',
      reason,
      startDate,
      endDate,
      status: 'Pending'
    });

    // Send high-priority notification to the teacher
    await models.Notification.create({
      recipientRole: 'teacher',
      title: `Leave Request from ${req.user.name || 'Student'}`,
      message: `${req.user.name} applied for leave from ${startDate} to ${endDate}. Reason: "${reason}".`,
      type: 'leave_request'
    });

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully. Notification sent to teacher.',
      leave
    });
  } catch (err) {
    console.error('[Leave Apply Error]', err);
    res.status(500).json({ success: false, message: 'Failed to submit leave application.' });
  }
});

// PUT Teacher approves or rejects leave
app.put('/api/leaves/:id', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);
    const { status } = req.body; // 'Approved' or 'Rejected'

    const leave = await models.LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    leave.status = status;
    leave.reviewedAt = new Date();
    await leave.save();

    // Notify the student
    await models.Notification.create({
      recipientId: leave.studentId,
      recipientRole: 'student',
      title: `Leave Application ${status}`,
      message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been ${status.toLowerCase()} by faculty.`,
      type: 'leave_response'
    });

    res.json({ success: true, message: `Leave request marked as ${status}.`, leave });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update leave request.' });
  }
});

// GET Notifications for user
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const dbName = resolveTenantDb(req);
    const models = getTenantModels(dbName);

    const isTeacher = req.user.role === 'teacher';
    const notifications = await models.Notification.find({
      $or: [
        { recipientId: req.user.userId },
        { recipientRole: isTeacher ? 'teacher' : 'student' }
      ]
    }).sort({ createdAt: -1 }).limit(20);

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

// Connect Database & Start Server
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[MongoDB] Connected successfully to MongoDB Atlas.');
    await seedDefaultUser();
    app.listen(PORT, () => {
      console.log(`[Server] Rangermate backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB Error] Database connection failed:', err);
    process.exit(1);
  });
