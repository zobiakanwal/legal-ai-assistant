import { useState } from "react"
import { FiSend } from "react-icons/fi"
import React from "react"

type InputBarProps = {
  onSend: (text: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  disabled?: boolean
}

const InputBar: React.FC<InputBarProps> = ({ onSend, inputRef, disabled = false }) => {
  const [text, setText] = useState("")

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text.trim())
    setText("")
  }

  return (
    <div className="p-4 border-t bg-white flex items-center gap-3">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        disabled={disabled}
        className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
        placeholder="Type your answer..."
      />
      <button
        onClick={handleSend}
        disabled={disabled}
        className="bg-brand text-white p-2 rounded-xl hover:bg-brand/90 transition disabled:opacity-50"
      >
        <FiSend />
      </button>
    </div>
  )
}

export default InputBar
