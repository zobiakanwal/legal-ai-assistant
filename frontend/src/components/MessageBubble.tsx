import { motion } from "framer-motion"
import clsx from "classnames"

type Props = {
  message: string
  sender: "user" | "bot"
}

const MessageBubble = ({ message, sender }: Props) => {
  const bubbleClass = clsx(
    "px-4 py-3 rounded-xl max-w-[75%] text-sm shadow-md whitespace-pre-wrap break-words",
    sender === "user"
      ? "bg-brand text-white self-end"
      : "bg-gray-100 text-gray-900 self-start"
  )

  return (
    <motion.div
      className={`flex ${sender === "user" ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={bubbleClass}>{message}</div>
    </motion.div>
  )
}

export default MessageBubble
