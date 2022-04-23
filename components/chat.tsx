export const Chat = ({
  msg,
  img,
  time,
}: {
  msg: string
  img: string
  time: number
}) => {
  return (
    <div className="chat-message">
      <div className="flex items-end">
        <div className="order-2 mx-2 flex max-w-xs flex-col items-start space-y-2 text-xs">
          <div>
            <span className="inline-block rounded-lg rounded-bl-none bg-gray-300 px-4 py-2 text-gray-600">
              {msg}
            </span>
          </div>
        </div>
        <img
          src={img}
          alt="My profile"
          className="order-1 h-6 w-6 rounded-full"
        />
        <div className="order-3 text-xs text-gray-400">{new Date(time).toLocaleTimeString()}</div>
      </div>
    </div>
  )
}
