export const OtherChat = ({
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
      <div className="flex items-end justify-end">
        <div className="pr-1 text-xs text-gray-400">
          {new Date(time).toLocaleTimeString()}
        </div>
        <div className="order-1 mx-2 flex max-w-xs flex-col items-end space-y-2 text-xs">
          <div>
            <span className="inline-block rounded-lg rounded-br-none bg-blue-600 px-4 py-2 text-white ">
              {msg}
            </span>
          </div>
        </div>
        <img
          src={img}
          alt="My profile"
          className="order-2 h-6 w-6 rounded-full"
        />
      </div>
    </div>
  )
}
