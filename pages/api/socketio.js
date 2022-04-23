import { Server } from 'socket.io'
const user = new Map()
const roomId = 'room'
function getUserList() {
  const users = []
  user.forEach((val) => {
    users.push(val)
  })
  return users
}

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server)

    io.on('connection', (socket) => {
      user.set(socket.id, socket.handshake.query)
      socket.join(roomId)
      socket.broadcast.emit('refresh user list')
      socket.on('hello', (msg) => {
        socket.emit('hello', 'world!')
      })
      socket.on('userList', (msg) => {
        socket.emit('userList', getUserList())
      })
      socket.on('msg', (msg) => {
        console.log('msg', msg)
        socket.to(roomId).emit('chat', msg)
      })
      socket.on('peerconnectSignaling', (message) => {
        console.log('接收資料：', message)

        socket.to(roomId).emit('peerconnectSignaling', message)
      })
      socket.on('disconnect', () => {
        user.delete(socket.id)
        socket.broadcast.emit('refresh user list')
        console.log('server disconnect', user.size)
      })
    })

    res.socket.server.io = io
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default ioHandler
