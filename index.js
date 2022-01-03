/**
 * Web server for the Tic Tac Toe application.
 * Interacts with the client via HTTP requests and socket comms.
 * Calls the play executable to host the Tic Tac Toe game.
 */
const { response } = require('express');
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const port = 3002;
const socket = new require('socket.io')(server);
const { spawn } = require('child_process');

app.use(express.static('client/build'));

app.get('/', (req, res) => {
    // Get root
    response.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    response.sendFile(path.join(__dirname, 'client/build/index.html'));
});

server.listen(port, () => {
    console.log(`Server listening to port ${port}.`);
});

socket.on('connection', (socket) => {
    console.log(`${socket.id}: Connected to client`);
    socket.emit('connection');  // ack

    // Variable holding the executable game file process
    let game = undefined;

    // Client submits opponent to play
    socket.on('play', (opponentDetails, callback) => {
        callback('Acknowleged submit');
        // Data in opponentDetails: type (player type) and option (tree depth, iterations, ...)

        // Start game with child process
        game = spawn('./TicTacToeGameAI/play', ['-pO', 'hp', '-pX', opponentDetails.type, opponentDetails.option]);
        game.stdin.setEncoding('utf-8');
        game.stdout.on('data', (data) => {  // Output from executable
            output = data.toString().trim();
            console.log(output);
            // If the move of player X is outputed ("<turn #> X:<r>,<c>")
            if(output[2] === 'X') {
                console.log(`${socket.id}: X made a move`);
                let xRow = output[4];
                let xCol = output[6];
                let xMove = { ...move };
                xMove.row = xRow;
                xMove.col = xCol;
                xMove.turn = parseInt(output[0]);
                socket.emit('opponent', xMove);
            }
            // If the move of player O is asked for ("\tO:")
            if(output.includes('O:')) {
                console.log(`${socket.id}: Requesting move`);
                socket.emit('request move');
            }
            // If the result of the game is given (1 if X won, 0 if draw, or -1 of O won)
            if(output.includes('Result:')) {
                let rI = output.indexOf('Result:');
                console.log(output[rI + 7]);
                if(output[rI + 7] === '1') {
                    console.log(`${socket.id}: X won`);
                    socket.emit('x won');
                }
                else if(output[rI + 7] === '0') {
                    console.log(`${socket.id}: Draw`);
                    socket.emit('draw');
                }
                else if(output[rI + 7] === '-') {
                    console.log(`${socket.id}: O won`);
                    socket.emit('o won');
                }
            }
            
        });
        game.stderr.on('data', (data) => {  // Errors
            console.log(`${socket.id}: Error:\n${data.toString()}`);
            // Send error message
            socket.emit('error');
        });
        game.on('close', (code) => {    // On termination
            console.log(`${socket.id}: Game concluded`);
            socket.emit('over');
        });
    });

    // Client plays a move
    socket.on('move', (move, callback) => {
        callback('Acknowledge move');
        console.log(`${socket.id}: O made a move`);
        // Data in move: row and col
        game.stdin.write(`${move.row.toString()},${move.col.toString()}\n`);
    });

    socket.on('disconnect', () => {
        console.log(`${socket.id}: Client disconnected`);
        socket.disconnect();
        // Terminate child process if running
        (game !== undefined) && setTimeout(() => game.kill('SIGINT'), 100);
    });
});

// Other backend stuff

// A dictionary used to represent a move
let move = {
    turn: 0,    // Turn number
    player: 'X',    // Client is player O
    row: -1,
    col: -1
}