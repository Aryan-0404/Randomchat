const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    maxHttpBufferSize: 10e6 // 5 MB
});


// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch((err) => console.log('❌ MongoDB connection failed:', err));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Active users, waiting queue, and engaged pairs
let users = {}; 
let waitingUsers = []; 
let engagedUsers = {}; 

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🔌 New user connected: ${socket.id}`);

    socket.on('join', (data) => {
        users[socket.id] = { username: data.username, gender: data.gender, socketId: socket.id };
        console.log(`${data.username} joined as ${data.gender}`);

        matchUser(socket.id); // Try matching immediately
    });

    socket.on('newChat', () => {
        leaveCurrentChat(socket.id);
        matchUser(socket.id);
    });

    socket.on('sendMessage', (data) => {
        const partnerSocketId = engagedUsers[socket.id];
        if (partnerSocketId && users[partnerSocketId]) {
            io.to(partnerSocketId).emit('receiveMessage', { from: users[socket.id].username, message: data.message });
        }
    });

    socket.on('sendImage', (data) => {
        const partnerSocketId = engagedUsers[socket.id];
        if (partnerSocketId && users[partnerSocketId]) {
            io.to(partnerSocketId).emit('receiveImage', {
                from: users[socket.id].username,
                image: data.image, // Base64-encoded image
            });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        leaveCurrentChat(socket.id);
        delete users[socket.id];
    });
});

// Match a user with an available partner
function matchUser(socketId) {
    if (!users[socketId]) return;

    const currentUser = users[socketId];
    const availablePartner = findAvailablePartner(currentUser.gender);

    if (availablePartner) {
        // Pair them up
        engagedUsers[socketId] = availablePartner.socketId;
        engagedUsers[availablePartner.socketId] = socketId;

        io.to(socketId).emit('partnerFound', { username: availablePartner.username, socketId: availablePartner.socketId });
        io.to(availablePartner.socketId).emit('partnerFound', { username: currentUser.username, socketId });

        // Remove from waiting list
        waitingUsers = waitingUsers.filter(id => id !== socketId && id !== availablePartner.socketId);
    } else {
        // No partner available, add to waiting queue
        if (!waitingUsers.includes(socketId)) {
            waitingUsers.push(socketId);
        }
        io.to(socketId).emit('noPartnerFound', { message: "No users available. Please wait..." });
    }
}

// Remove user from chat and notify their partner
function leaveCurrentChat(socketId) {
    const partnerSocketId = engagedUsers[socketId];

    if (partnerSocketId && users[partnerSocketId]) {
        io.to(partnerSocketId).emit('partnerLeft', { message: "Your chat partner left. Finding a new match..." });
        delete engagedUsers[partnerSocketId];
        matchUser(partnerSocketId); // Re-match the partner
    }

    delete engagedUsers[socketId];
    waitingUsers = waitingUsers.filter(id => id !== socketId);
}

// Find an available partner (first opposite-gender, then same-gender)
function findAvailablePartner(gender) {
    return waitingUsers
        .map(id => users[id])
        .find(user => !engagedUsers[user.socketId] && user.socketId !== undefined);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
