const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'mySecretKey', // Use .env in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // true if using HTTPS
    sameSite: 'none', // Cross-origin cookies
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  }
}));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  family: 4,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Schemas
const Image = mongoose.model('Image', new mongoose.Schema({
  data: String,
  username: String,
  caption: String,
  createdAt: { type: Date, default: Date.now },
}));

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String, // Hashed
  profilePic: String,
}));

// Registration (only needed once)
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const exists = await User.findOne({ username });
  if (exists) return res.status(400).send({ error: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.send({ message: 'User registered' });
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send({ error: 'Invalid credentials' });
  }

  req.session.user = user._id;
  res.send({ message: 'Login successful' });
});

// Check login status
app.get('/me', async (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });

  const user = await User.findById(req.session.user).select('username');
  if (!user) return res.json({ loggedIn: false });

  res.json({ loggedIn: true, username: user.username });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.send({ message: 'Logged out' });
});

// Middleware to protect routes
const auth = (req, res, next) => {
  if (!req.session.user) return res.status(401).send({ error: 'Unauthorized' });
  next();
};

// Upload image (only if logged in)
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', auth, upload.single('image'), async (req, res) => {
  const user = await User.findById(req.session.user);
  const base64Image = req.file.buffer.toString('base64');

  const image = new Image({
    data: base64Image,
    username: user.username,
    caption: req.body.caption || '',
  });

  await image.save();
  res.send({ message: 'Image uploaded successfully' });
});

// Get latest images (only if logged in)
app.get('/latest', auth, async (req, res) => {
  try {
    const latest = await Image.find().sort({ createdAt: -1 }).limit(2);
    res.send(latest);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).send({ error: 'Error fetching images' });
  }
});

app.get('/images', auth, async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = 2;
  const skip = (page - 1) * limit;

  try {
    const images = await Image.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // plain JS objects

    const usernames = images.map(img => img.username);
    const users = await User.find({ username: { $in: usernames } })
      .select('username profilePic')
      .lean();

    const userMap = {};
    users.forEach(u => { userMap[u.username] = u.profilePic; });

    const imagesWithPics = images.map(img => ({
      ...img,
      profilePic: userMap[img.username] || null,
    }));

    res.send(imagesWithPics);
  } catch (err) {
    res.status(500).send({ error: 'Error fetching images' });
  }
});
const uploadProfile = multer({ storage: multer.memoryStorage() });
app.post('/profile-pic', uploadProfile.single('profile'), async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).send({ error: 'User not found' });

  const base64Image = req.file.buffer.toString('base64');
  user.profilePic = base64Image;
  await user.save();

  res.send({ message: 'Profile picture updated' });
});

const Reaction = mongoose.model('Reaction', new mongoose.Schema({
  imageId: mongoose.Schema.Types.ObjectId,
  username: String,
  emoji: String,
}));

app.post('/react', auth, async (req, res) => {
  const { imageId, emoji } = req.body;
  const username = (await User.findById(req.session.user)).username;

  // Remove previous reaction (only one allowed per user)
  await Reaction.deleteOne({ imageId, username });

  // Save new reaction
  const reaction = new Reaction({ imageId, username, emoji });
  await reaction.save();
  res.send({ message: 'Reaction saved' });
});

app.post('/unreact', auth, async (req, res) => {
  const { imageId, emoji } = req.body;
  const username = (await User.findById(req.session.user)).username;

  await Reaction.deleteOne({ imageId, username, emoji });
  res.send({ message: 'Reaction removed' });
});

app.get('/reactions/:imageId', auth, async (req, res) => {
  const reactions = await Reaction.find({ imageId: req.params.imageId });
  res.send(reactions);
});



app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
