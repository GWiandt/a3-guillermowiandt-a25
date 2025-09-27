Anime Tracker (A3)
Live Application Link
You can view and test the live application here:

(https://a3-guillermowiandt-a25.onrender.com/)
Project Overview: What It Does
This application is designed to help users keep a persistent, organized list of the anime they are watching, have completed, or plan to watch. It's a full-stack, two-tier web app that demonstrates user authentication and full CRUD (Create, Read, Update, Delete) functionality with a MongoDB database.

The Goal: To provide a single, dynamic page where a logged-in user can manage their anime list in real-time.

Key Functionality
All core features communicate with the server using the Fetch API, ensuring the list updates dynamically without needing a page refresh (Single Page Application feel).

Feature

Description

Authentication

Users can create an account or log in with a username and password. Sessions are securely managed by the server.

CRUD (Form/Entry)

Users can Add new entries, Modify (Edit) existing ones by clicking a row in the table, and Delete records.

Derived Fields (Server-Side)

The server calculates and returns two crucial fields for every entry: Progress (percentage of episodes watched) and Category (Short, Medium, or Long, based on total episodes).

Client-Side Filtering

The main results table can be filtered dynamically by Status (e.g., "Watching" or "Completed") without hitting the database again.

Persistent Storage

All user data (including hashed passwords and the anime list) is stored securely in a MongoDB database.

Technical Details
Authentication Strategy
I chose a Local Session Authentication strategy using express-session and connect-mongo.

Why this choice? It is a secure, server-managed way to handle authentication. It is robust for a self-contained application and allows the server full control over session data, which is securely stored in the MongoDB database, not just in memory.

Password Security: The bcrypt library is used to hash all user passwords before they are stored, ensuring that even if the database is compromised, passwords cannot be recovered.

CSS Framework
The application uses the Bootstrap 5 framework.

Why this choice? It provides a clean, responsive, and mobile-friendly foundation for forms, tables, and navigation right out of the box, saving development time.

Customization: I applied a custom CSS file (public/css/main.css) to override Bootstrap's default styling, giving the application a darker, high-contrast theme appropriate for an "Anime Tracker."

Express Middleware Packages
The following packages are essential for the server's function:

Package

Purpose

dotenv

Loads configuration variables (like the MongoDB URI and Session Secret) from the local .env file during development.

express.json()

Automatically parses incoming request bodies with JSON payloads (used for all CRUD operations).

express.urlencoded()

Parses incoming requests with URL-encoded payloads.

express.static("public")

Serves all client-side files (HTML, CSS, JS) from the /public directory.

express-session

Manages sessions, creating a unique session ID for each authenticated user.

connect-mongo

A session store that saves the session data persistently into the MongoDB database.

bcrypt

Used to generate and compare secure hash values for user passwords.

helmet

(Used for security) Sets various HTTP headers to help protect the application from common web vulnerabilities.

Major Development Challenge
The biggest challenge encountered was a persistent EADDRINUSE: address already in use :::8000 error, even after attempting to kill the process on the previous port (4000). This was resolved by bypassing nodemon and launching the server directly with node server.js, which confirmed and stopped a persistent zombie process that was incorrectly holding the port open. As well as the MongoDb deployment
