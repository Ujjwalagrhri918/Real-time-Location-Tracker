// Wait until the HTML document has fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.IO and connect to the server
    const socket = io(); // Establishes a WebSocket connection with the server

    // Initialize the Leaflet map
    // Default view: latitude = 20, longitude = 0, zoom level = 2 (world view)
    const map = L.map("map").setView([20, 0], 2);

    // Set up the tile layer using OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors' // Required attribution
    }).addTo(map);

    // Object to store map markers for each user by their socket ID
    const markers = {};

    // Function to request the user's location once and then start tracking it
    function requestLocation() {
        console.log("📍 Requesting location");

        // Get current location (initial)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("✅ Initial location acquired");

                const { latitude, longitude } = position.coords;

                // Zoom the map into the user's current location
                map.setView([latitude, longitude], 13);

                // Add a marker for the current user (self)
                if (!markers['self']) {
                    markers['self'] = L.marker([latitude, longitude])
                        .bindPopup('📍 Your Location')
                        .addTo(map);
                } else {
                    // Update marker position if it already exists
                    markers['self'].setLatLng([latitude, longitude]);
                }

                // Start watching for continuous position updates
                navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        console.log("📡 Location update:", { latitude, longitude });

                        // Update user's marker position
                        if (markers['self']) {
                            markers['self'].setLatLng([latitude, longitude]);
                        }

                        // Emit location to the server
                        socket.emit("send-location", { latitude, longitude });
                    },
                    (error) => {
                        // Handle geolocation errors during tracking
                        console.error("❌ Error watching location:", error.message);
                        alert("Failed to get location updates: " + error.message);
                    },
                    {
                        enableHighAccuracy: true, // Use GPS if available
                        timeout: 5000,            // Wait max 5 seconds for location
                        maximumAge: 0             // Always request fresh location
                    }
                );
            },
            (error) => {
                // Handle geolocation errors during initial request
                console.error("❌ Error getting initial location:", error);
                alert("Could not retrieve location: " + error.message);
            }
        );
    }

    // Check if the browser supports geolocation
    if ("geolocation" in navigator) {
        console.log("🛰️ Geolocation is supported");
        requestLocation(); // Start tracking
    } else {
        alert("Your browser does not support geolocation.");
    }

    // Listen for incoming location updates from other users
    socket.on("receive-location", (data) => {
        const { id, latitude, longitude } = data;
        console.log("📨 Received location from", id, latitude, longitude);

        // Do not create a new marker for the current user (self)
        if (id !== socket.id) {
            if (markers[id]) {
                // Update existing marker's position
                markers[id].setLatLng([latitude, longitude]);
            } else {
                // Create a new marker for the other user
                markers[id] = L.marker([latitude, longitude])
                    .bindPopup('👤 Other User')
                    .addTo(map);
            }
        }
    });

    // Listen for when a user disconnects
    socket.on("user-disconnected", (id) => {
        console.log("🚫 User disconnected:", id);
        // Remove the disconnected user's marker from the map
        if (markers[id]) {
            map.removeLayer(markers[id]); // Remove marker from map
            delete markers[id];           // Remove it from the markers object
        }
    });
});
