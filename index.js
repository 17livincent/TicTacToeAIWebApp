/**
 * Web server for the application.
 */
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const port = 3003;
const socket = new require('socket.io')(server);

app.get('/', (req, res) => {
    // Get root

});

server.listen(port, () => {
    console.log(`Server listening to port ${port}.`);
});

socket.on('connection', (socket) => {
    console.log(`Connected to client # ${socket.id}`);
});