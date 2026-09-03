const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyToken = require('../middleware/auth');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const QR_SECRET = process.env.JWT_SECRET;

const { calculateRiskScore } = require('../ml/riskModel');
const { sendAtRiskEmail } = require('../config/emailService');

// Haversine Formula - calculates distance between two GPS points in metres
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (val) => (val * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// START ATTENDANCE SESSION (Lecturer only)
router.post('/start-session', verifyToken, async (req, res) => {
  const { course_id, lecturer_lat, lecturer_lng, radius_m } = req.body;

  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can start attendance sessions.' });
  }

  if (!course_id || !lecturer_lat || !lecturer_lng) {
    return res.status(400).json({ error: 'Course ID and GPS coordinates are required.' });
  }

  try {
    // Verify the course belongs to this lecturer
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .eq('lecturer_id', req.user.id)
      .single();

    if (courseError || !course) {
      return res.status(403).json({ error: 'Course not found or access denied.' });
    }

    // Set expiry to 10 minutes from now
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const session_id = uuidv4();

    // Save session to database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        id: session_id,
        course_id,
        lecturer_lat,
        lecturer_lng,
        expires_at,
        radius_m: radius_m || 50,
      }])
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Encrypt QR payload
    const payload = JSON.stringify({ session_id, expires_at });
    const encryptedPayload = CryptoJS.AES.encrypt(payload, QR_SECRET).toString();

    res.status(201).json({
      message: 'Attendance session started.',
      qr_payload: encryptedPayload,
      expires_at,
      session_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while starting session.' });
  }
});

// SCAN QR CODE - THREE POINT VERIFICATION (Student only)
router.post('/scan', verifyToken, async (req, res) => {
  const { qr_payload, student_lat, student_lng, device_fingerprint } = req.body;

  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can scan QR codes.' });
  }

  if (!qr_payload || !student_lat || !student_lng || !device_fingerprint) {
    return res.status(400).json({ error: 'QR payload, GPS coordinates and device fingerprint are required.' });
  }

  try {
    // DECRYPT QR PAYLOAD
    let session_id, expires_at;
    try {
      const decrypted = CryptoJS.AES.decrypt(qr_payload, QR_SECRET).toString(CryptoJS.enc.Utf8);
      const parsed = JSON.parse(decrypted);
      session_id = parsed.session_id;
      expires_at = parsed.expires_at;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid QR code. Please scan again.' });
    }

    // CHECK 1 - IDENTITY (JWT already verified by verifyToken middleware)

    // CHECK 2 - TIME
    if (new Date() > new Date(expires_at)) {
      return res.status(400).json({ error: 'This QR code has expired. Ask your lecturer to generate a new one.' });
    }

    // Fetch session from database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // CHECK 3 - DISTANCE
    const distance = haversineDistance(
      session.lecturer_lat,
      session.lecturer_lng,
      parseFloat(student_lat),
      parseFloat(student_lng)
    );

    const allowedRadius = session.radius_m || 50;
    if (distance > allowedRadius) {
      return res.status(400).json({
        error: `You are too far from the lecturer. Distance: ${Math.round(distance)}m. Must be within ${allowedRadius}m.`,
        distance: Math.round(distance),
      });
    }

    // FRAUD CHECK - DEVICE FINGERPRINT
    const { data: existingFingerprint } = await supabase
      .from('attendance_logs')
      .select('student_id')
      .eq('session_id', session_id)
      .eq('device_fingerprint', device_fingerprint)
      .neq('student_id', req.user.id)
      .single();

    const is_flagged = !!existingFingerprint;

    // Check if student already scanned
    const { data: alreadyScanned } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('session_id', session_id)
      .eq('student_id', req.user.id)
      .single();

    if (alreadyScanned) {
      return res.status(400).json({ error: 'You have already marked attendance for this session.' });
    }

    // Check student is enrolled in this course
    const { data: enrolment } = await supabase
      .from('enrolments')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('course_id', session.course_id)
      .single();

    if (!enrolment) {
      return res.status(403).json({ error: 'You are not enrolled in this course.' });
    }

    // MARK ATTENDANCE
    const { error: logError } = await supabase
      .from('attendance_logs')
      .insert([{
        session_id,
        student_id: req.user.id,
        status: 'present',
        distance_m: Math.round(distance),
        device_fingerprint,
        is_flagged,
        scanned_at: new Date().toISOString(),
      }]);

    if (logError) throw logError;

    res.json({
      message: is_flagged
        ? 'Attendance marked but flagged for review. Your device was detected on another account.'
        : 'Attendance marked successfully. You are present!',
      distance: Math.round(distance),
      is_flagged,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during scan verification.' });
  }
});

// GET ATTENDANCE REPORT FOR A SESSION (Lecturer only)
router.get('/report/:sessionId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can view reports.' });
  }

  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, users(name, matric_number, department)')
      .eq('session_id', req.params.sessionId);

    if (error) throw error;

    res.json({ report: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching report.' });
  }
});

// GET ALL SESSIONS FOR A COURSE (Lecturer only)
router.get('/sessions/:courseId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can view sessions.' });
  }

  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', req.params.courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ sessions: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching sessions.' });
  }
});

// GET STUDENT'S OWN ATTENDANCE HISTORY
router.get('/my-history', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can view their history.' });
  }

  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, sessions(*, courses(course_code, course_title))')
      .eq('student_id', req.user.id)
      .order('scanned_at', { ascending: false });

    if (error) throw error;

    res.json({ history: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching history.' });
  }
});

// GET FULL COURSE ATTENDANCE REPORT (Lecturer only)
router.get('/full-report/:courseId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can view reports.' });
  }

  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', req.params.courseId)
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    const fullReport = [];

    for (const session of sessions) {
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*, users(name, matric_number, department)')
        .eq('session_id', session.id);

      if (logsError) throw logsError;

      fullReport.push({
        session,
        logs,
      });
    }

    res.json({ fullReport });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching full report.' });
  }
});

// GET RISK SCORES FOR ALL STUDENTS IN A COURSE (Lecturer only)
router.get('/risk-scores/:courseId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can view risk scores.' });
  }

  try {
    // Get all sessions for this course
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', req.params.courseId)
      .order('created_at', { ascending: true });

    if (sessionsError) throw sessionsError;

    const totalSessions = sessions.length;

    if (totalSessions < 4) {
      return res.json({
        riskScores: [],
        message: `Not enough sessions yet. Need at least 4 sessions to generate risk scores. Currently ${totalSessions} session(s).`,
      });
    }

    // Get all enrolled students
    const { data: enrolments, error: enrolmentsError } = await supabase
      .from('enrolments')
      .select('student_id, users(id, name, matric_number, department)')
      .eq('course_id', req.params.courseId);

    if (enrolmentsError) throw enrolmentsError;

    const riskScores = [];

    for (const enrolment of enrolments) {
      const student = enrolment.users;

      // Get all attendance logs for this student in this course
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*, sessions(created_at, expires_at)')
        .eq('student_id', student.id)
        .in('session_id', sessions.map(s => s.id));

      if (logsError) throw logsError;

      // Map logs with session info
      const mappedLogs = logs.map(log => ({
        ...log,
        session_start: log.sessions?.created_at,
        session_end: log.sessions?.expires_at,
      }));

      // Fill in absent sessions
      const allLogs = sessions.map(session => {
        const log = mappedLogs.find(l => l.session_id === session.id);
        return log || {
          status: 'absent',
          session_id: session.id,
          session_start: session.created_at,
          session_end: session.expires_at,
        };
      });

      const result = calculateRiskScore(allLogs, totalSessions);

      if (result) {
        riskScores.push({
          student,
          ...result,
        });
      }
    }

    // Sort by risk score descending
    riskScores.sort((a, b) => b.riskScore - a.riskScore);

    res.json({ riskScores, totalSessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while calculating risk scores.' });
  }
});

// END SESSION AND CHECK RISK SCORES (Lecturer only)
router.post('/end-session/:sessionId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can end sessions.' });
  }

  try {
    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', req.params.sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Get all sessions for this course
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', session.course_id)
      .order('created_at', { ascending: true });

    if (!allSessions || allSessions.length < 4) {
      return res.json({ message: 'Session ended. Not enough sessions yet for risk analysis.' });
    }

    // Get all enrolled students
    const { data: enrolments } = await supabase
      .from('enrolments')
      .select('student_id, users(id, name, matric_number)')
      .eq('course_id', session.course_id);

    // Get course and lecturer info
    const { data: course } = await supabase
      .from('courses')
      .select('course_code, course_title, lecturer_id')
      .eq('id', session.course_id)
      .single();

    const { data: lecturer } = await supabase
      .from('users')
      .select('name, email, title')
      .eq('id', req.user.id)
      .single();

    const atRiskStudents = [];

    for (const enrolment of enrolments) {
      const student = enrolment.users;

      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('*, sessions(created_at, expires_at)')
        .eq('student_id', student.id)
        .in('session_id', allSessions.map(s => s.id));

      const mappedLogs = (logs || []).map(log => ({
        ...log,
        session_start: log.sessions?.created_at,
        session_end: log.sessions?.expires_at,
      }));

      const allLogs = allSessions.map(s => {
        const log = mappedLogs.find(l => l.session_id === s.id);
        return log || {
          status: 'absent',
          session_id: s.id,
          session_start: s.created_at,
          session_end: s.expires_at,
        };
      });

      const result = calculateRiskScore(allLogs, allSessions.length);

      if (result && result.isAtRisk) {
        atRiskStudents.push({ student, result });
      }
    }

    // Send one email per at risk student per session
    for (const { student, result } of atRiskStudents) {
      try {
        // Check if email already sent for this student in this session
        const { data: alreadySent } = await supabase
          .from('risk_notifications')
          .select('id')
          .eq('student_id', student.id)
          .eq('session_id', req.params.sessionId)
          .single();

        if (alreadySent) continue;

        await sendAtRiskEmail(
          lecturer.email,
          `${lecturer.title} ${lecturer.name}`,
          student.name,
          student.matric_number,
          `${course.course_code} - ${course.course_title}`,
          result.attendanceRate,
          result.riskScore
        );

        // Record that email was sent
        await supabase
          .from('risk_notifications')
          .insert([{
            student_id: student.id,
            course_id: session.course_id,
            session_id: req.params.sessionId,
          }]);
      } catch (emailErr) {
        console.error('Failed to send at risk email:', emailErr);
      }
    }

    res.json({
      message: `Session ended. ${atRiskStudents.length} at-risk student(s) flagged.`,
      atRiskCount: atRiskStudents.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while ending session.' });
  }
});

// GET STUDENT'S ATTENDANCE HISTORY FOR A SPECIFIC COURSE
router.get('/student-history/:courseId', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can view their history.' });
  }

  try {
    // Get all sessions for this course
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('course_id', req.params.courseId)
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Get student's attendance logs for this course
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('student_id', req.user.id)
      .in('session_id', sessions.map(s => s.id));

    if (logsError) throw logsError;

    // Map sessions with attendance status
    const history = sessions.map(session => {
      const log = logs.find(l => l.session_id === session.id);
      return {
        session_id: session.id,
        session_date: session.created_at,
        status: log ? log.status : 'absent',
        scanned_at: log ? log.scanned_at : null,
        distance_m: log ? log.distance_m : null,
        is_flagged: log ? log.is_flagged : false,
      };
    });

    // Calculate summary
    const totalSessions = sessions.length;
    const present = history.filter(h => h.status === 'present').length;
    const absent = totalSessions - present;
    const attendanceRate = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0;

    res.json({
      history,
      summary: {
        totalSessions,
        present,
        absent,
        attendanceRate,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching attendance history.' });
  }
});

// DELETE ATTENDANCE RECORD (Lecturer only)
router.delete('/log/:logId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can delete attendance records.' });
  }

  try {
    const { error } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', req.params.logId);

    if (error) throw error;

    res.json({ message: 'Attendance record deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while deleting attendance record.' });
  }
});

module.exports = router;