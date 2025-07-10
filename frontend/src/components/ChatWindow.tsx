import { useState, useRef, useEffect } from "react"
import MessageBubble from "./MessageBubble"
import CategoryOptions from "./CategoryOptions"
import InputBar from "./InputBar"

const ChatWindow = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello there 👋" },
    { sender: "bot", text: "How can I help you today?" },
  ])

  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCategoryValue, setSelectedCategoryValue] = useState<string>("")
  const [selectedSubtype, setSelectedSubtype] = useState<string | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [awaitingUserInput, setAwaitingUserInput] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCategorySelect = async (value: string, label: string) => {
    setSelectedCategory(label)
    setSelectedCategoryValue(value)

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: label },
    ])

    if (value === "possession") {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Is this for a Private Tenancy or a Local Authority Tenancy?" },
      ])
    } else {
      setSelectedSubtype("root")
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Please briefly describe your situation so I can find the most suitable letter template." },
      ])
      setAwaitingUserInput(true)
    }
  }

  const handleSubtypeSelect = (subtype: string) => {
    setSelectedSubtype(subtype)
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: subtype === "private" ? "Private Tenancy" : "Local Authority Tenancy" },
      { sender: "bot", text: "Please briefly describe your situation so I can find the most suitable letter template." },
    ])
    setAwaitingUserInput(true)
  }

  const handleUserMessage = async (text: string) => {
    if (!selectedSubtype || !selectedCategoryValue) return

    setMessages((prev) => [...prev, { sender: "user", text }])
    setAwaitingUserInput(false)

    try {
      setLoading(true)
      const res = await fetch("http://localhost:8000/api/ai/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategoryValue,
          subtype: selectedSubtype,
          user_input: text,
        }),
      })

      const data = await res.json()

      setSelectedTemplateName(data.filename)

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Perfect. I’ve selected the right letter for your case.` },
        { sender: "bot", text: data.question },
      ])

      setChatMessages([
        { role: "user", content: selectedCategory! },
        { role: "user", content: text },
        { role: "assistant", content: data.question },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Something went wrong. Please try again later." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white w-full max-w-2xl h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-200">
      <div className="bg-brand text-white py-4 px-6 text-xl font-bold flex items-center justify-center">
        <span className="text-accent">Tenant</span>Shield
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-[#F9FAFB]">
        {messages.map((msg, i) => (
  <MessageBubble
    key={i}
    message={msg.text}
    sender={msg.sender === "user" ? "user" : "bot"}
  />
))}

        {!selectedCategory && (
          <CategoryOptions onSelect={handleCategorySelect} />
        )}

        {selectedCategoryValue === "possession" && !selectedSubtype && (
          <div className="flex gap-4">
            <button
              onClick={() => handleSubtypeSelect("private")}
              className="bg-brand/90 text-white px-4 py-2 rounded-xl text-sm hover:bg-brand transition"
            >
              Private Tenancy
            </button>
            <button
              onClick={() => handleSubtypeSelect("local")}
              className="bg-brand/90 text-white px-4 py-2 rounded-xl text-sm hover:bg-brand transition"
            >
              Local Authority Tenancy
            </button>
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      {awaitingUserInput && (
        <InputBar onSend={handleUserMessage} inputRef={inputRef} />
      )}
    </div>
  )
}

export default ChatWindow
