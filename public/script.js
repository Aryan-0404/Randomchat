const socket = io();

// Get DOM elements
const startChatButton = document.getElementById('startChat');
const newChatButton = document.getElementById('newChat');
const usernameInput = document.getElementById('username');
const genderSelect = document.getElementById('gender');
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const partnerName = document.getElementById('partnerName');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessage');
const chatBox = document.getElementById('chatBox');
const imageInput = document.getElementById('imageInput');

let username = '';
let gender = '';
let partnerSocketId = null;

// Handle 'Start Chat' button click
startChatButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    gender = genderSelect.value;

    if (username === '') {
        alert("Please enter a username.");
        return;
    }

    // Emit 'join' event to the server
    socket.emit('join', { username, gender });

    // Show the chat screen
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
});
// Handle when the partner leaves the chat
socket.on('partnerLeft', (data) => {
    alert(data.message); // Notify the user
    partnerSocketId = null; // Reset partner socket ID
    partnerName.innerText = "Partner left. Click 'New Chat' to find a new one.";
    chatBox.innerHTML = ''; // Clear the chat feed
});
// Handle 'New Chat' button click
newChatButton.addEventListener('click', () => {
    partnerSocketId = null; // Reset partner socket ID
    partnerName.innerText = "Searching for a new partner...";
    chatBox.innerHTML = '';
    socket.emit('newChat');
});

// Handle message sending
sendMessageButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Handle image upload
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && partnerSocketId) {
        if (file.size > 20 * 1024 * 1024) { // 5MB limit
            alert("Image is too large. Max size is 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            socket.emit('sendImage', { image: imageData, to: partnerSocketId });
            appendImage('You', imageData);
        };
        reader.readAsDataURL(file);
    }
});

// Function to send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '' || !partnerSocketId) return;

    // Emit 'sendMessage' event to server
    socket.emit('sendMessage', { message, to: partnerSocketId });
    messageInput.value = ''; // Clear input field
    appendMessage('You', message); // Show the message in the chat box
}

// Receive message from partner
socket.on('receiveMessage', (data) => {
    appendMessage(data.from, data.message);
});

// Receive image from partner
socket.on('receiveImage', (data) => {
    appendImage(data.from, data.image);
});

// Update partner name
socket.on('partnerFound', (partner) => {
    partnerName.innerText = `Chatting with: ${partner.username}`;
    partnerSocketId = partner.socketId;
});

// Handle when no opposite gender is available
socket.on('noPartnerFound', (data) => {
    alert(data.message); // Show message about waiting or same-gender match
    partnerName.innerText = "Waiting for a match...";
});

// Append messages to the chat box
function appendMessage(from, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.innerText = `${from}: ${message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
}

// Append images to the chat box
function appendImage(from, imageData) {
    const imageElement = document.createElement('img');
    imageElement.src = imageData;
    imageElement.classList.add('chat-image');
    const container = document.createElement('div');
    container.classList.add('chat-message');
    container.innerText = `${from}: `;
    container.appendChild(imageElement);
    chatBox.appendChild(container);
    chatBox.scrollTop = chatBox.scrollHeight;
}
