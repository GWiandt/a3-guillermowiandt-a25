require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

//  Session Setup 
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));


//  Authentication Middleware 
// Checks if a user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next(); // User is authenticated, proceed
    } else {
        res.status(401).json({ error: "Unauthorized. Please log in." });
    }
}


//  Schemas and Models (Anime Schema uses userId) 

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Anime Data Schema
const animeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // CRITICAL for user filtering
    title: { type: String, required: true },
    episodes: { type: Number, min: 1, required: true },
    watched: { type: Number, min: 0, required: true },
    status: { type: String, enum: ['Watching', 'Completed', 'Plan to Watch', 'Dropped'], required: true },
});

// Composite index to prevent duplicate titles per user
animeSchema.index({ userId: 1, title: 1 }, { unique: true });
const Anime = mongoose.model('Anime', animeSchema);


//  Auth Routes (Login/Logout) - UNCHANGED 

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    if (!user) {
        const hashed = await bcrypt.hash(password, 10);
        user = new User({ username, password: hashed });
        await user.save();
        req.session.userId = user._id;
        return res.json({ message: `✅ New user created and logged in: ${username}` });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    req.session.userId = user._id;
    res.json({ message: "✅ Login successful" });
  } catch (err) {
    console.error("Login/Registration error:", err);
    res.status(500).json({ error: "Server error during login/registration" });
  }
});

app.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.clearCookie('connect.sid');
      res.json({ message: "✅ Logged out" });
    });
  } else {
    res.json({ message: "No active session" });
  }
});


//  Helper Function for Derived Fields (for the 'Achievements' and 'Results' marks) 
function calculateDerivedFields(item) {
    const progress = Math.round((item.watched / item.episodes) * 100);
    
    let category = "Short";
    if (item.episodes > 50) category = "Long";
    else if (item.episodes > 20) category = "Medium";

    return { 
        ...item._doc,
        progress: progress,
        category: category
    };
}


//  CRUD Routes (Protected) 
// READ - GET /results (Fulfills 'Results' requirement)
app.get('/results', isAuthenticated, async (req, res) => {
    try {
        const userAnime = await Anime.find({ userId: req.session.userId });
        const transformedData = userAnime.map(calculateDerivedFields);

        res.json(transformedData);
    } catch (err) {
        console.error("Error fetching results:", err);
        res.status(500).json({ error: "Failed to fetch user data" });
    }
});

// CREATE - POST /add
app.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { title, episodes, watched, status } = req.body;

        const newAnime = new Anime({
            userId: req.session.userId,
            title,
            episodes: parseInt(episodes),
            watched: parseInt(watched),
            status,
        });
        
        await newAnime.save();
        res.status(201).json({ message: "✅ Item added successfully" });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: "You already have an item with this title." });
        }
        console.error("Error adding item:", err);
        res.status(500).json({ error: "Failed to add data item" });
    }
});

// UPDATE - PUT /update (Fulfills 'Modify' requirement)
app.put('/update', isAuthenticated, async (req, res) => {
    try {
        const { _id, title, episodes, watched, status } = req.body;

        const result = await Anime.findOneAndUpdate(
            { _id: _id, userId: req.session.userId },
            { title, episodes, watched, status },
            { new: true, runValidators: true }
        );

        if (!result) {
            return res.status(404).json({ error: "Item not found or not authorized to modify" });
        }

        res.json({ message: "Item updated successfully" });
    } catch (err) {
        console.error("Error updating item:", err);
        res.status(500).json({ error: "Failed to update data item" });
    }
});



app.post('/delete', isAuthenticated, async (req, res) => {
    try {
        const { _id } = req.body; 

        const result = await Anime.deleteOne({ 
            userId: req.session.userId,
            _id: _id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Item not found or not authorized to delete" });
        }

        res.json({ message: "Item deleted successfully" });
    } catch (err) {
        console.error("Error deleting item:", err);
        res.status(500).json({ error: "Failed to delete data item" });
    }
});


//  Default Route Redirects - UNCHANGED 
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/app', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.redirect('/login.html');
    }
});

//  Start Server 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});