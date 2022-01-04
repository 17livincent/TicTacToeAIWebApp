#!/bin/bash
# This script creates and starts the Docker container.
cd TicTacToeGameAI
make clean
cd ..
docker build -t tictactoeai-image .
docker rm -f tictactoeai-cont
docker run -d -p 3002:3002 --restart=always --name tictactoeai-cont tictactoeai-image
docker system prune