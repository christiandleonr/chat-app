const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = 3000

// Difine paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public')

// Setup static directory
app.use(express.static(publicDirectoryPath))

let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', (options, callback) => {
        const {error, user} = addUser({id: socket.id, ...options})

        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))

        // Broadcast send the message to all the connected clients except you...
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))

        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?=${coords.latitude},${coords.longitude}`))

        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage(`${user.username} has left`))

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

// With out rooms
// socket.emit - send the acknowledgement to the client that detone this action
// io.emit - send the acknowledgement to all the client connected to the server
// socket.broadcast.emit - send the acknowledgement to all the client connected to the server except himself

// With room
// io.to.emit - send the acknowledgement to all the client connected to the same room
// socket.broadcast.to.emit - send the acknowledgement to all the clients connected to the same room except himself

// Start the server
// 3000 is the port that will use

server.listen(port, () => {
    console.log(`Server is up on port ${port}.`)
})