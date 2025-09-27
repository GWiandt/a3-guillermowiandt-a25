require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs'); // Updated to bcryptjs
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8000; 

// Retrieve necessary environment variables
const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!MONGO_URI || !SESSION_SECRET) {
    console.error("FATAL ERROR: MONGO_URI or SESSION_SECRET not set.");
    process.exit(1);
}

// MongoDB Connection 
console.log("Attempting to connect to MongoDB...");

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    // Middleware 
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static("public"));

    // Define User Schema (required for login/register)
    const userSchema = new mongoose.Schema({
        username: { type: String, unique: true },
        password: String
    });
    const User = mongoose.model('User', userSchema);

    // Anime Schema
    const animeSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        episodes: { type: Number, required: true, min: 1 },
        watched: { type: Number, required: true, min: 0 },
        status: { type: String, enum: ['Watching', 'Completed', 'Plan to Watch', 'Dropped'], required: true },
    });
    const Anime = mongoose.model('Anime', animeSchema);


    // Session Setup 
    app.use(session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: MONGO_URI }),
      cookie: { 
            maxAge: 1000 * 60 * 60 * 24, 
            secure: true, 
            sameSite: 'none' 
        } 
    }));

    // Middleware to check authentication status
    const checkAuth = (req, res, next) => {
        if (!req.session.userId) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }
        next();
    };

    // Auth Routes 
    // Registration (also handles immediate login)
    app.post('/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            if (await User.findOne({ username })) {
                return res.status(400).json({ error: "Username already exists." });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ username, password: hashedPassword });
            await user.save();

            req.session.userId = user._id;
            res.json({ message: "Registered and logged in" });
        } catch (err) {
            res.status(500).json({ error: "Server error during registration" });
        }
    });

    // Login user
    app.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            const user = await User.findOne({ username });
            if (!user) return res.status(400).json({ error: "Invalid username or password" });

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(400).json({ error: "Invalid username or password" });

            req.session.userId = user._id;
            res.json({ message: "Login successful" });
        } catch (err) {
            res.status(500).json({ error: "Server error during login" });
        }
    });

    // Logout user
    app.post('/logout', (req, res) => {
        if (req.session) {
            req.session.destroy(err => {
                if (err) return res.status(500).json({ error: "Logout failed" });
                res.clearCookie('connect.sid');
                res.json({ message: "Logged out" });
            });
        } else {
            res.json({ message: "No active session" });
        }
    });

    // Middleware to redirect unauthenticated users from index.html
    app.get('/index.html', (req, res, next) => {
        if (!req.session.userId) {
            return res.redirect('/login.html');
        }
        next();
    });

    // Catch-all for the main app page route
    app.get('/app', (req, res) => {
        if (!req.session.userId) {
            return res.redirect('/login.html');
        }
        res.sendFile(__dirname + '/public/index.html');
    });

    // Redirect root to login
    app.get('/', (req, res) => {
        res.redirect('/login.html');
    });

    // Function to calculate derived fields
    function addDerivedFields(anime) {
        const episodes = anime.episodes;
        const watched = anime.watched;
        
        // Progress calculation
        const progress = episodes > 0 ? Math.min(100, Math.round((watched / episodes) * 100)) : 0;

        // Category calculation
        let category = "Short";
        if (episodes > 50) category = "Long";
        else if (episodes > 20) category = "Medium";

        return { ...anime.toObject(), progress, category };
    }

    // CRUD Routes (Protected) 

    // GET /results (READ)
    app.get('/results', checkAuth, async (req, res) => {
        try {
            const animeList = await Anime.find({ userId: req.session.userId });
            const enrichedList = animeList.map(addDerivedFields);
            res.json(enrichedList);
        } catch (err) {
            res.status(500).json({ error: "Error fetching data." });
        }
    });

    // POST /add (CREATE)
    app.post('/add', checkAuth, async (req, res) => {
        try {
            const { title, episodes, watched, status } = req.body;
            
            const newAnime = new Anime({
                userId: req.session.userId,
                title,
                episodes,
                watched,
                status
            });

            await newAnime.save();
            res.status(200).json({ message: "Anime added successfully." });
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to add anime." });
        }
    });

    // PUT /update (UPDATE)
    app.put('/update', checkAuth, async (req, res) => {
        try {
            const { _id, title, episodes, watched, status } = req.body;
            
            const updatedAnime = await Anime.findOneAndUpdate(
                { _id, userId: req.session.userId },
                { title, episodes, watched, status },
                { new: true, runValidators: true }
            );

            if (!updatedAnime) {
                return res.status(404).json({ error: "Anime not found or unauthorized." });
            }

            res.status(200).json({ message: "Anime updated successfully." });
        } catch (err) {
            res.status(400).json({ error: err.message || "Failed to update anime." });
        }
    });

    // POST /delete (DELETE)
    app.post('/delete', checkAuth, async (req, res) => {
        try {
            const { _id } = req.body; 
            
            const result = await Anime.deleteOne({ _id, userId: req.session.userId });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: "Anime not found or unauthorized." });
            }

            res.status(200).json({ message: "Anime deleted successfully." });
        } catch (err) {
            res.status(500).json({ error: err.message || "Failed to delete anime." });
        }
    });

    // Start server
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); 
  });
