export const Video = ({
  myVideoRef,
  remoteVideoRef,
}: {
  myVideoRef: any
  remoteVideoRef: any
}) => {
  return (
    <div className="flex ">
      <div>
        me
        <video
          ref={myVideoRef}
          width="250"
          height="250"
          id="myVideo"
          muted
          autoPlay
          playsInline
        ></video>
      </div>
      <div>
        remote
        <video
          ref={remoteVideoRef}
          width="250"
          height="250"
          autoPlay
          id="remoteVideo"
          playsInline
        ></video>
      </div>
    </div>
  )
}
