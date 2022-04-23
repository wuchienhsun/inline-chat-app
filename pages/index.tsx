import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import io, { Socket } from 'socket.io-client'
import { Chat } from '../components/chat'
import { OtherChat } from '../components/otherChat'
import { Video } from '../components/video'

export default () => {
  const [users, setUsers] = useState<
    { id: string; name: string; img: string }[]
  >([])
  const [name, setName] = useState<string>('')
  const [user, setUser] = useState<{ id: string; name: string; img: string }>()
  const [chat, setChat] = useState<
    { id: string; userId: string; msg: string; time: number; img: string }[]
  >([])
  const [msg, setMsg] = useState<string>('')
  const [ws, setWs] = useState<Socket | null>(null)
  const [chatBuffer, setChatBuffer] = useState<any[]>([])
  const [pc, setPc] = useState<any | null>(null)
  const [localstream, setLocalstream] = useState<MediaStream | null>(null)
  const myVideo = useRef<HTMLVideoElement>()
  const remoteVideo = useRef<HTMLVideoElement>()
  const [offer, setOffer] = useState<any | null>(null)
  const [openCamera, setOpenCamera] = useState<boolean>(false)
  const [openStreaming, setOpenStreaming] = useState<boolean>(false)

  const connectWebSocket = () => {
    if (ws === null) {
      fetch('/api/socketio').finally(() => {
        const socket = io({
          query: { name: user?.name, userId: user?.id, img: user?.img },
        })

        setWs(socket)
      })
    }
  }

  const initWebSocket = () => {
    ws?.on('connect', () => {
      console.log('connect')
      ws.emit('hello')
    })

    ws?.on('userList', (data) => {
      setUsers(data)
    })

    ws?.on('chat', (data) => {
      setChatBuffer([data])
    })
    ws?.on('peerconnectSignaling', async ({ desc, candidate }) => {
      await peerconnectSignaling({ desc, candidate })
    })

    ws?.on('refresh user list', () => {
      // need refresh userList
      ws.emit('userList')
    })

    ws?.on('disconnect', () => {
      ws.emit('disconnect')
    })
  }

  async function peerconnectSignaling({ desc, candidate }: any) {
    if (!pc) return
    // desc 指的是 Offer 與 Answer
    // currentRemoteDescription 代表的是最近一次連線成功的相關訊息
    if (desc && !pc.currentRemoteDescription) {
      console.log('desc => ', desc)

      await pc.setRemoteDescription(new RTCSessionDescription(desc))
      createSignal(desc.type === 'answer' ? true : false)
    } else if (candidate) {
      // 新增對方 IP 候選位置
      console.log('candidate =>', candidate)
      pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  async function createSignal(isOffer: boolean) {
    try {
      if (!pc) {
        console.log('尚未開啟視訊')
        return
      }
      const signalOption = {
        offerToReceiveAudio: 1, // 是否傳送聲音流給對方
        offerToReceiveVideo: 1, // 是否傳送影像流給對方
      }
      // 呼叫 peerConnect 內的 createOffer / createAnswer
      setOffer(await pc[`create${isOffer ? 'Offer' : 'Answer'}`](signalOption))

      // 設定本地流配置
      await pc.setLocalDescription(offer)
      sendSignalingMessage(pc.localDescription)
    } catch (err) {
      console.log(err)
    }
  }

  function sendSignalingMessage(desc: any) {
    ws?.emit('peerconnectSignaling', { desc })
  }

  async function createMedia() {
    // 儲存本地流到全域
    const ls = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
    setLocalstream(ls)

    myVideo.current!.srcObject = ls
  }

  function getAudioVideo() {
    if (localstream) {
      const video = localstream!.getVideoTracks()
      const audio = localstream!.getAudioTracks()

      if (video.length > 0) {
        console.log(`使用影像裝置 => ${video[0].label}`)
      }
      if (audio.length > 0) {
        console.log(`使用聲音裝置 => ${audio[0].label}`)
      }
    }
  }

  function createPeerConnection() {
    const configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302', // Google's public STUN server
        },
      ],
    }
    const PC = new RTCPeerConnection(configuration)
    setPc(PC)
  }

  function addLocalStream() {
    if (pc) {
      pc!.addStream(localstream)
    }
  }

  // 監聽 ICE Server
  function onIceCandidates() {
    // 找尋到 ICE 候選位置後，送去 Server 與另一位配對

    pc.onicecandidate = ({ candidate }: any) => {
      if (!candidate) {
        return
      }
      console.log('onIceCandidate => ', candidate)
      ws?.emit('peerconnectSignaling', { candidate })
    }
    setPc(pc)
  }

  // 監聽 ICE 連接狀態
  function onIceconnectionStateChange() {
    pc.oniceconnectionstatechange = (evt: any) => {
      console.log('ICE 伺服器狀態變更 => ', evt.target.iceConnectionState)
    }
    setPc(pc)
  }

  // 監聽是否有流傳入，如果有的話就顯示影像
  function onAddStream() {
    pc.onaddstream = (event: any) => {
      if (!remoteVideo.current!.srcObject && event.stream) {
        remoteVideo.current!.srcObject = event.stream
        console.log('接收流並顯示於遠端視訊！', event)
      }
    }
    setPc(pc)
  }

  async function initPeerConnection() {
    await createMedia()
  }

  const inituser = () => {
    if (name === '' || name.trim().length === 0) {
      setName('')
      return
    }
    const id = uuidv4()
    const u = { id, name, img: `https://ui-avatars.com/api/?name=${name}` }
    setUser(u)
    // add into local storage
    localStorage.setItem('userInfo', JSON.stringify(u))
  }

  const handelOpenCamera = () => {
    setOpenCamera(!openCamera)
  }

  const handelOpenStreaming = async () => {
    setOpenStreaming(!openStreaming)
    if (openStreaming) {
      handelOpenCamera()
    }
  }

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleMsg = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value)
  }

  const sendMsg = () => {
    if (ws === null) {
      return
    }
    if (msg === '' || msg.trim().length === 0) {
      return
    }
    const m = {
      id: uuidv4(),
      userId: user?.id!,
      msg,
      time: new Date().getTime(),
      img: user?.img!,
    }
    ws.emit('msg', m)
    setChatBuffer([m])
    setMsg('')
  }

  useEffect(() => {
    if (openCamera) {
      initPeerConnection()
      createPeerConnection()
    } else {
      // close connection
      localstream?.getTracks().forEach((track) => {
        track.stop()
      })
      if (pc) {
        pc.restartIce()
      }
    }
  }, [openCamera])

  useEffect(() => {
    const userInfoJson = localStorage.getItem('userInfo')
    if (userInfoJson) {
      const userInfo = JSON.parse(userInfoJson!)
      setUser(userInfo)
    }
  }, [])

  useEffect(() => {
    if (ws === null && user?.id && user?.name) {
      connectWebSocket()
    }
    if (ws && user?.id && user?.name) {
      console.log('success connect!')
      initWebSocket()
      ws.emit('userList')
    }
  }, [ws, user])

  useEffect(() => {
    if (chatBuffer.length > 0) {
      setChat([...chat, ...chatBuffer])
      setChatBuffer([])
    }
  }, [chatBuffer])

  useEffect(() => {
    if (localstream) {
      getAudioVideo()
    }
  }, [localstream])

  useEffect(() => {
    if (pc && openCamera && openStreaming) {
      onIceCandidates()
      onIceconnectionStateChange()
    }
  }, [pc, openCamera, openStreaming])

  useEffect(() => {
    if (pc && localstream && openCamera && openStreaming) {
      initWebSocket()
      addLocalStream()
      onAddStream()
      // 建立配對
      console.log('createSignal', offer)
      createSignal(openCamera)
    }
  }, [pc, localstream, openCamera, openStreaming])

  return (
    <>
      {!user ? (
        <div className="flex h-screen justify-center">
          <div className="flex flex-col items-center justify-center">
            <div>What's Your Name</div>
            <div>
              <input
                className="focus:shadow-outline my-3 appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
                placeholder="your name"
                type="text"
                onChange={handleName}
              />
            </div>
            <button
              className="w-full rounded-lg border border-[#878787] bg-[#878787] p-3 text-white"
              onClick={inituser}
            >
              Start
            </button>
          </div>
        </div>
      ) : (
        <div className="p:2 flex h-screen flex-1 flex-col justify-between sm:p-6">
          <div className="border-b-2 border-gray-200 py-3 sm:items-center">
            <div>Current Online</div>

            {users.map((user) => (
              <div key={user.id} className="py-3">
                <div className="flex items-center">
                  <img
                    className="mr-4 h-8 w-8 rounded-full"
                    src={user.img}
                    alt="avatar"
                  />
                  <div className="text-sm">{user.name}</div>
                </div>
              </div>
            ))}
            {openStreaming ? (
              <>
                {openCamera ? (
                  <Video myVideoRef={myVideo} remoteVideoRef={remoteVideo} />
                ) : null}
                {openCamera ? null : (
                  <div>
                    <button
                      onClick={handelOpenCamera}
                      className="borer w-full rounded-lg bg-gray-300 py-3 text-gray-900"
                    >
                      {openCamera ? 'Close' : 'Open'} camera
                    </button>
                  </div>
                )}
              </>
            ) : null}
            {openStreaming ? null : (
              <div className="my-3">
                <button
                  onClick={handelOpenStreaming}
                  className="borer w-full rounded-lg bg-gray-300 py-3 text-gray-900"
                >
                  {openStreaming ? 'Close' : 'Open'} streaming
                </button>
              </div>
            )}
          </div>
          <div
            id="messages"
            className="scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch flex flex-col space-y-4 overflow-y-auto p-3"
          >
            {chat.map((m) =>
              m.userId === user?.id ? (
                <OtherChat msg={m.msg} time={m.time} img={m.img} />
              ) : (
                <Chat msg={m.msg} time={m.time} img={m.img} />
              )
            )}
          </div>
          <div className="mb-2 border-t-2 border-gray-200 px-4 pt-4 sm:mb-0">
            <div className="relative flex">
              <input
                type="text"
                onChange={handleMsg}
                value={msg}
                placeholder="Write your message!"
                className="w-full rounded-md bg-gray-200 py-3 pl-3 text-gray-600 placeholder-gray-600 focus:placeholder-gray-400 focus:outline-none"
              />
              <div className="absolute inset-y-0 right-0 hidden items-center sm:flex">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-3 text-white transition duration-500 ease-in-out hover:bg-blue-400 focus:outline-none"
                  onClick={sendMsg}
                >
                  <span className="font-bold">Send</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="ml-2 h-6 w-6 rotate-90 transform"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
