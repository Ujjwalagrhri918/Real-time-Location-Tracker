// Import required modules
const express = require('express');         // Express framework for building web applications
const http = require('http');              // Core Node.js HTTP module to create the server
const path = require('path');              // Built-in module to handle file paths
const socketio = require('socket.io');     // Socket.IO library for real-time communication

// Initialize the Express app
const app = express();

// Create an HTTP server instance using the Express app
// This allows us to attach both Express routes and Socket.IO to the same server
const server = http.createServer(app);

// Attach Socket.IO to the server instance
const io = socketio(server);

// ------------------- Express Setup -------------------

// Set EJS as the template engine
// This tells Express to use EJS (.ejs files) for rendering views
app.set("view engine", "ejs");

// Serve static files (JS, CSS, images) from the "public" directory
// So if we request '/script.js', it will be fetched from '/public/script.js'
app.use(express.static(path.join(__dirname, "public")));

// Define a route for the root URL
// When someone visits http://localhost:3000/, render the "index.ejs" file
app.get('/', (req, res) => {
    res.render('index');  // Views are looked for inside the "/views" folder by default
});

// ------------------- Socket.IO Setup -------------------

// Listen for incoming client connections
io.on('connection', (socket) => {
    // Log when a user connects, identified by a unique socket ID
    console.log('User connected:', socket.id);

    // Listen for "send-location" event from the client
    socket.on('send-location', (data) => {
        // Log the received location data
        console.log('Location Received from', socket.id, ":", data);

        // Broadcast the location to all connected clients (including the sender)
        io.emit('receive-location', {
            id: socket.id,   // Include sender's socket ID
            ...data          // Spread latitude and longitude from data object
        });
    });

    // Listen for the disconnect event (when a user closes the tab or leaves)
    socket.on('disconnect', () => {
        // Log which user disconnected
        console.log("User disconnected:", socket.id);

        // Notify all clients to remove the disconnected user's marker
        io.emit('user-disconnected', socket.id);
    });
});

// ------------------- Start the Server -------------------

// Define the port number to listen on
const PORT = 3000;

// Start the server and log a message to the console
server.listen(PORT, () => {
    console.log(`✅ Server is listening on http://localhost:${PORT}`);
});
