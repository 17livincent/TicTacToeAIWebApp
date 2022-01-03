import React from 'react';
import socketIOClient from "socket.io-client";

import './App.css';

// Constants
const EMPTY = " ";
const X_MARK = 'X';
const O_MARK = 'O';
const MINIMAX_PLAYER_TYPE = "mm";
const MONTECARLO_PLAYER_TYPE = "mc";
const MONTECARLO_ITERATIONS_MAX = 500;
const MONTECARLO_ITERATIONS_MIN = 1;
const MINIMAX_DEPTH_MAX = 9;
const MINIMAX_DEPTH_MIN = 1;
// Input error codes
const NO_ERRORS = 0b0;
const ERROR_NO_INPUTS = 0b1;
const ERROR_PLAYER_OPTION_NOT_INT = 0b10;
const ERROR_PLAYER_OPTION_UNDER = 0b100;
const ERROR_PLAYER_OPTION_OVER = 0b1000;

// A dictionary used to represent a move
let move = {
    turn: 0,    // Turn number
    player: 'O',    // Client is player O
    row: -1,
    col: -1
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.serverName = 'localhost:3002';
        this.socket = socketIOClient(this.serverName);  // Socket comms for exchanging game info

        this.state = {
            chosenPlayerType: "",   // The code of the chosen opponent type
            playerOption: "",   // Player option, which is depth for MM and iterations for mc
            playing: false, // If a game is in progress or is over
            currentTurn: 0, // The current turn #
            waitingForOpp: true,    // True when waiting for the opponent's move
            // The 3x3 game board
            board: Array.from([[EMPTY, EMPTY, EMPTY], [EMPTY, EMPTY, EMPTY], [EMPTY, EMPTY, EMPTY]]),
            // Array of played moves
            moveHistory: [],
            result: undefined   // -1 for loss, 1 for win, 0 for draw
        }

        this.submit = this.submit.bind(this);
        this.play = this.play.bind(this);
        this.renderBoard = this.renderBoard.bind(this);
        this.renderMoveHistory = this.renderMoveHistory.bind(this);
        this.renderResult = this.renderResult.bind(this);
    }

    componentDidMount() {
        // Socket events
        this.socket.on('connection', () => {
            console.log(`Connected to server with socket ID: ${this.socket.id}`);
        });
        this.socket.on('opponent', (opMove) => {    // Opponent made a move
            console.log(`Turn ${opMove.turn}: Opponent made move: r${opMove.row}, c${opMove.col}`);
            // Add move the moveHistory
            let newMoveHistory = Array.from(this.state.moveHistory);
            newMoveHistory.push(opMove);
            // Mark board
            let newBoard = Array.from(this.state.board);
            newBoard[opMove.row][opMove.col] = X_MARK;
            // Enable clicks on the open cells of the board.
            this.setState({currentTurn: opMove.turn, moveHistory: newMoveHistory, board: newBoard});
        });
        this.socket.on('request move', () => {  // Server requests client to make a move
            console.log('Server requests move.');
            this.setState({waitingForOpp: false});
            // Wait for client to choose a move
        });
        this.socket.on('x won', () => { // When opponent wins
            console.log('X (opponent) won game.');
            this.setState({result: -1});
        });
        this.socket.on('draw', () => {  // Game concludes in draw
            console.log('Draw.');
            this.setState({result: 0});
        });
        this.socket.on('o won', () => { // Client wins
            console.log('O (client) won game.');
            this.setState({result: 1});
        });
    }

    /**
     * Verifies the user inputs and returns error codes.
     */
    verifyInputs() {
        let valid = 0b0;   // A number that is a concatination of error codes

        // Check for invalid inputs
        if(this.state.chosenPlayerType !== "") {
            // Minimax player
            if(this.state.chosenPlayerType === MINIMAX_PLAYER_TYPE) {
                if(this.state.playerOption > MINIMAX_DEPTH_MAX) {
                    valid |= ERROR_PLAYER_OPTION_OVER;
                }
                if(this.state.playerOption < MINIMAX_DEPTH_MIN) {
                    valid |= ERROR_PLAYER_OPTION_UNDER;
                }
                if(!Number.isInteger(parseInt(this.state.playerOption))) {
                    valid |= ERROR_PLAYER_OPTION_NOT_INT;
                }
            }
            else if(this.state.chosenPlayerType === MONTECARLO_PLAYER_TYPE) {
                if(this.state.playerOption > MONTECARLO_ITERATIONS_MAX) {
                    valid |= ERROR_PLAYER_OPTION_OVER;
                }
                if(this.state.playerOption < MONTECARLO_ITERATIONS_MIN) {
                    valid |= ERROR_PLAYER_OPTION_UNDER;
                }
                if(!Number.isInteger(parseInt(this.state.playerOption))) {
                    valid |= ERROR_PLAYER_OPTION_NOT_INT;
                }
            }
        }
        else {
            valid |= ERROR_NO_INPUTS;
        }

        return valid;
    }

    /**
     * Accepts user inputs and verifies them.
     * If inputs are valid, start the game.
     * Otherwise, display some error messages.
     */
    submit() {
        let inputsValid = this.verifyInputs();

        if(inputsValid === NO_ERRORS) {
            // Send details to server, play game
            this.play();
        }
        else {
            // Notify of invalid inputs
            let errorMessage = "Invalid Inputs:\n";
            if((inputsValid & ERROR_NO_INPUTS) === ERROR_NO_INPUTS) {
                errorMessage += "\tInputs are empty.\n";
            }
            if((inputsValid & ERROR_PLAYER_OPTION_NOT_INT) === ERROR_PLAYER_OPTION_NOT_INT) {
                errorMessage += "\tThe player suboption must be an integer.\n";
            }
            if((inputsValid & ERROR_PLAYER_OPTION_OVER) === ERROR_PLAYER_OPTION_OVER) {
                errorMessage += "\tThe player suboption must be greater than or equal to its minimum excepted value.\n";
            }
            if((inputsValid & ERROR_PLAYER_OPTION_UNDER) === ERROR_PLAYER_OPTION_UNDER) {
                errorMessage += "\tThe player suboption must be less than or equal to its maximum excepted value.\n";
            }
            
            window.alert(errorMessage);
        }
    }

    /**
     * Start game by giving submissions to server
     */
    play() {
        console.log(`Starting game against ${this.state.chosenPlayerType} of ${this.state.playerOption}`);
        this.setState({playing: true});
	    this.socket.emit('play', {type: this.state.chosenPlayerType, option: this.state.playerOption}, (callback) => (console.log(callback)));
    }

    /**
     * Handles when the user clicks a box in the game grid.
     */
    clickBox(row, col) {
        // If the clicked box is empty, the move is valid
        // Otherwise, do nothing
        if((this.state.result == undefined) && this.state.playing && (this.state.board[row][col] === EMPTY) && (this.state.waitingForOpp === false)) {
            console.log(row, col);
            // Send move to server
            let oMove = { ...move };
            oMove.row = row;
            oMove.col = col;
            oMove.turn = this.state.currentTurn + 1;
            this.socket.emit('move', oMove, (callback) => {console.log(callback);
                // Add play to history
                let newMoveHistory = Array.from(this.state.moveHistory);
                newMoveHistory.push(oMove);
                // Update board
                let newBoard = Array.from(this.state.board);
                newBoard[oMove.row][oMove.col] = O_MARK;
                // Now, wait for opponent
                this.setState({currentTurn: this.state.currentTurn + 1, waitingForOpp: true, moveHistory: newMoveHistory, board: newBoard});
            });
            
        }
    }

    /**
     * Renders a list of the move history.
     */
    renderMoveHistory() {
        let history = this.state.moveHistory.map((m) => <>Turn {m.turn + 1}: {m.player} plays row {m.row}, col {m.col}<br /></>);

        return (
            <React.Fragment>
                Move History: 
                <br />
                {history}
            </React.Fragment>
        );
    }

    /**
     * Renders the complete game board.
     */
    renderBoard() {
        return (
            <React.Fragment>
                <table><thead>
                    <tr>
                        <td onClick={() => this.clickBox(0, 0)}>{this.state.board[0][0]}</td>
                        <td onClick={() => this.clickBox(0, 1)}>{this.state.board[0][1]}</td>
                        <td onClick={() => this.clickBox(0, 2)}>{this.state.board[0][2]}</td>
                    </tr>
                    <tr>
                        <td onClick={() => this.clickBox(1, 0)}>{this.state.board[1][0]}</td>
                        <td onClick={() => this.clickBox(1, 1)}>{this.state.board[1][1]}</td>
                        <td onClick={() => this.clickBox(1, 2)}>{this.state.board[1][2]}</td>
                    </tr>
                    <tr>
                        <td onClick={() => this.clickBox(2, 0)}>{this.state.board[2][0]}</td>
                        <td onClick={() => this.clickBox(2, 1)}>{this.state.board[2][1]}</td>
                        <td onClick={() => this.clickBox(2, 2)}>{this.state.board[2][2]}</td>
                    </tr>
                </thead></table>
            </React.Fragment>
        );
    }

    /**
     * Renders a message of the game result.
     */
    renderResult() {
        return (
            <div id='result'>
                {this.state.result === 1 && <h2>Player O won!</h2>}
                {this.state.result === 0 && <h2>Draw!</h2>}
                {this.state.result === -1 && <h2>Player X won!</h2>}
            </div>
        );
    }

    render() {
        let opponentSelect = <React.Fragment>
            <select id="opponentTypeDropdown" 
                disabled={this.state.playing}
                onChange={(t) => {console.log("Chose player type: " + t.target.value);
                this.setState({chosenPlayerType: t.target.value});}}>
                <option value="">
                    -- Opponent Type --
                </option>
                <option value={MINIMAX_PLAYER_TYPE}>
                    AI Minimax
                </option>
                <option value={MONTECARLO_PLAYER_TYPE}>
                    AI Monte Carlo
                </option>
            </select>
        </React.Fragment>

        let playerOptionSelect = <React.Fragment>
            {this.state.chosenPlayerType !== "" && this.state.chosenPlayerType === MINIMAX_PLAYER_TYPE && <>Suboption: Game Tree Depth (min: {MINIMAX_DEPTH_MIN}, max: {MINIMAX_DEPTH_MAX}): </>}
            {this.state.chosenPlayerType !== "" && this.state.chosenPlayerType === MONTECARLO_PLAYER_TYPE && <>Suboption: Iterations (min: {MONTECARLO_ITERATIONS_MIN}, max: {MONTECARLO_ITERATIONS_MAX}): </>}
            <input type="number" id="depth" min="1" max="9" step="1"
                disabled={this.state.playing}
                onChange={(s) => {
                    console.log('Chose player option: ' + s.target.value);
                    this.setState({playerOption: s.target.value});
                    }
                }
                value={this.state.playerOption}
                />
        </React.Fragment>

        let submitButton = <React.Fragment>
            <button id='submit' onClick={this.submit} disabled={this.state.playing}>
                Play Game
            </button>
        </React.Fragment>

        let game = <React.Fragment>
            <br />
            Click on an empty box to place a mark.            
            <br />
            {this.renderBoard()}
            <br />
            {this.renderResult()}
            <br />
            {this.renderMoveHistory()}
        </React.Fragment>

        return (
            <React.Fragment>
                <header className="App-header">
                    <h1>Tic Tac Toe AIs</h1>
                    <hr />
                </header>
                <div id='body'>
                    <p>Play a game of Tic Tac Toe against different types of AI players.
                        The selectable algorithms are of Minimax and Monte Carlo ST algorithms.</p>
                    <div id='inputForm'>
                        Choose Player X type: {opponentSelect}<br />
                        {(this.state.chosenPlayerType === MINIMAX_PLAYER_TYPE || this.state.chosenPlayerType === MONTECARLO_PLAYER_TYPE) && playerOptionSelect}
                        <br />
                        {submitButton}
                    <br />
                </div>
                <div id='gameBoard'>
                    {(this.state.playing) && game}
                </div>
                </div> 
                <footer>
                    <br />
                    <hr />
                    This website is a personal coding project focusing on AI and adversarial searches.  Check out the GitHub repository <a href='https://github.com/17livincent/TicTacToeAIWebApp' target='_blank' rel='noopener noreferrer'>here</a>.
                    <br />
                    <br />
                </footer>
            </React.Fragment>
        );
    }
}

export default App;