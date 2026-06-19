const supabase = require('../utils/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

const SALT_ROUNDS = 12;

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { username, password, uid } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let passwordMatch;
    const isBcrypt = user.password.startsWith('$2');
    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = password === user.password;
      if (passwordMatch) {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        await supabase.from('app_users').update({ password: hashed }).eq('id', user.id);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.uid !== uid) {
      return res.status(401).json({ message: 'UID mismatch' });
    }

    const { data: passkeys } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', user.id);

    if (passkeys && passkeys.length > 0) {
      return res.json({
        passkey_required: true,
        user_id: user.id,
        username: user.username
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, uid: user.uid },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { username: user.username, role: user.role, uid: user.uid }
    });
  } catch (err) {
    console.error('[ABI] Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generateUID = (role) => {
  const random = Math.floor(1000 + Math.random() * 9000);
  const suffix = role === 'ADMIN' ? 'A' : 'S';
  return `G2TC-AS-${random}-${suffix}`;
};

exports.createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  let { username, password, role, uid } = req.body;

  if (!uid || !uid.startsWith('G2TC-AS-')) {
    uid = generateUID(role);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const { data, error } = await supabase
      .from('app_users')
      .insert([{ username, password: hashedPassword, role, uid }])
      .select();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'Username or UID already exists' });
      throw error;
    }
    res.status(201).json({ message: 'User created successfully', user: data[0] });
  } catch (err) {
    console.error('[ABI] Create user error:', err);
    res.status(500).json({ message: 'Error creating user' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, username, role, uid, created_at');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const { error } = await supabase
      .from('app_users')
      .update({ password: hashedPassword })
      .eq('id', id);
    if (error) throw error;
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};
