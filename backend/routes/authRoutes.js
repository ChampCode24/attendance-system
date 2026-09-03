const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
require('dotenv').config();

// SAVE USER PROFILE AFTER SUPABASE AUTH SIGNUP
router.post('/save-profile', async (req, res) => {
  const { id, role, title, name, first_name, middle_name, last_name, email, matric_number, department } = req.body;

  if (!id || !role || !title || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (existing) {
      return res.status(200).json({ message: 'Profile already exists.' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        id,
        role,
        title,
        name,
        first_name,
        middle_name,
        last_name,
        email,
        matric_number: role === 'student' ? matric_number : null,
        department: role === 'student' ? department : null,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Profile saved successfully.', user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while saving profile.' });
  }
});

// GET USER PROFILE
router.get('/profile/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json({ user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching profile.' });
  }
});

module.exports = router;