const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyToken = require('../middleware/auth');

// Generate a random 5-digit enrolment code
const generateEnrolmentCode = () => {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
};

// CREATE A COURSE (Lecturer only)
router.post('/create', verifyToken, async (req, res) => {
  const { course_code, course_title } = req.body;

  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can create courses.' });
  }

  if (!course_code || !course_title) {
    return res.status(400).json({ error: 'Course code and title are required.' });
  }

  try {
    const enrolment_code = generateEnrolmentCode();

    const { data, error } = await supabase
      .from('courses')
      .insert([{
        lecturer_id: req.user.id,
        course_code,
        course_title,
        enrolment_code,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Course created successfully.', course: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while creating course.' });
  }
});

// GET ALL COURSES FOR LOGGED IN LECTURER
router.get('/my-courses', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can view their courses.' });
  }

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('lecturer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ courses: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching courses.' });
  }
});

// JOIN A COURSE (Student only)
router.post('/join', verifyToken, async (req, res) => {
  const { enrolment_code } = req.body;

  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can join courses.' });
  }

  if (!enrolment_code) {
    return res.status(400).json({ error: 'Enrolment code is required.' });
  }

  try {
    // Find the course with this enrolment code
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('enrolment_code', enrolment_code.toUpperCase())
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Invalid enrolment code. Please check and try again.' });
    }

    // Check if student is already enrolled
    const { data: existing } = await supabase
      .from('enrolments')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('course_id', course.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You are already enrolled in this course.' });
    }

    // Enrol the student
    const { error: enrolError } = await supabase
      .from('enrolments')
      .insert([{
        student_id: req.user.id,
        course_id: course.id,
      }]);

    if (enrolError) throw enrolError;

    res.status(201).json({ message: `Successfully joined ${course.course_title}.`, course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while joining course.' });
  }
});

// GET ALL COURSES A STUDENT IS ENROLLED IN
router.get('/enrolled', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can view enrolled courses.' });
  }

  try {
    const { data, error } = await supabase
      .from('enrolments')
      .select('course_id, courses(*)')
      .eq('student_id', req.user.id);

    if (error) throw error;

    const courses = data.map(e => e.courses);
    res.json({ courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching enrolled courses.' });
  }
});

// GET ENROLLED STUDENTS FOR A COURSE (Lecturer only)
router.get('/:courseId/students', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can view enrolled students.' });
  }

  try {
    const { data, error } = await supabase
      .from('enrolments')
      .select('student_id, users(id, name, title, matric_number, department)')
      .eq('course_id', req.params.courseId);

    if (error) throw error;

    const students = data.map(e => e.users);
    res.json({ students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching students.' });
  }
});

// REMOVE A STUDENT FROM A COURSE (Lecturer only)
router.delete('/:courseId/students/:studentId', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can remove students.' });
  }

  try {
    const { error } = await supabase
      .from('enrolments')
      .delete()
      .eq('course_id', req.params.courseId)
      .eq('student_id', req.params.studentId);

    if (error) throw error;

    res.json({ message: 'Student removed from course successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while removing student.' });
  }
});

// SEND ANNOUNCEMENT TO COURSE (Lecturer only)
router.post('/:courseId/announcements', verifyToken, async (req, res) => {
  if (req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Only lecturers can send announcements.' });
  }

  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        course_id: req.params.courseId,
        sender_id: req.user.id,
        sender_name: req.user.name,
        sender_title: req.user.title,
        message: message.trim(),
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Announcement sent.', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while sending announcement.' });
  }
});

// GET ANNOUNCEMENTS FOR A COURSE
router.get('/:courseId/announcements', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('course_id', req.params.courseId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ announcements: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching announcements.' });
  }
});

// GET UNREAD COUNT FOR A COURSE (Student only)
router.get('/:courseId/unread-count', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can check unread counts.' });
  }

  try {
    // Get all messages for this course
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('course_id', req.params.courseId);

    if (messagesError) throw messagesError;

    if (messages.length === 0) {
      return res.json({ count: 0 });
    }

    // Get read messages for this student
    const { data: reads, error: readsError } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('student_id', req.user.id)
      .in('message_id', messages.map(m => m.id));

    if (readsError) throw readsError;

    const unreadCount = messages.length - reads.length;
    res.json({ count: unreadCount > 0 ? unreadCount : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching unread count.' });
  }
});

// GET TOTAL UNREAD COUNT ACROSS ALL COURSES (Student only)
router.get('/total-unread', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can check unread counts.' });
  }

  try {
    // Get all courses this student is enrolled in
    const { data: enrolments, error: enrolmentsError } = await supabase
      .from('enrolments')
      .select('course_id')
      .eq('student_id', req.user.id);

    if (enrolmentsError) throw enrolmentsError;

    if (enrolments.length === 0) {
      return res.json({ count: 0 });
    }

    const courseIds = enrolments.map(e => e.course_id);

    // Get all messages for these courses
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .in('course_id', courseIds);

    if (messagesError) throw messagesError;

    if (messages.length === 0) {
      return res.json({ count: 0 });
    }

    // Get read messages for this student
    const { data: reads, error: readsError } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('student_id', req.user.id)
      .in('message_id', messages.map(m => m.id));

    if (readsError) throw readsError;

    const unreadCount = messages.length - reads.length;
    res.json({ count: unreadCount > 0 ? unreadCount : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching total unread count.' });
  }
});

// MARK ALL MESSAGES IN A COURSE AS READ (Student only)
router.post('/:courseId/mark-read', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can mark messages as read.' });
  }

  try {
    // Get all messages for this course
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('course_id', req.params.courseId);

    if (messagesError) throw messagesError;

    if (messages.length === 0) {
      return res.json({ message: 'No messages to mark as read.' });
    }

    // Insert read records for unread messages
    const reads = messages.map(m => ({
      message_id: m.id,
      student_id: req.user.id,
    }));

    const { error: readsError } = await supabase
      .from('message_reads')
      .upsert(reads, { onConflict: 'message_id,student_id' });

    if (readsError) throw readsError;

    res.json({ message: 'All messages marked as read.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while marking messages as read.' });
  }
});

// MARK A SINGLE MESSAGE AS READ (Student only)
router.post('/message/:messageId/read', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can mark messages as read.' });
  }

  try {
    const { error } = await supabase
      .from('message_reads')
      .upsert([{
        message_id: req.params.messageId,
        student_id: req.user.id,
      }], { onConflict: 'message_id,student_id' });

    if (error) throw error;

    res.json({ message: 'Message marked as read.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while marking message as read.' });
  }
});

module.exports = router;