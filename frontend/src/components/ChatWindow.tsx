import { useState, useRef, useEffect } from "react"
import MessageBubble from "./MessageBubble"
import CategoryOptions from "./CategoryOptions"
import InputBar from "./InputBar"
import api from "../lib/api" // Adjust the path if needed

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
  const [awaitingUserInput, setAwaitingUserInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [docDownloadUrl, setDocDownloadUrl] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCategorySelect = async (value: string, label: string) => {
    setSelectedCategory(label)
    setSelectedCategoryValue(value)
    setMessages((prev) => [...prev, { sender: "user", text: label }])

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
    if (!text.trim()) return

    if (!selectedSubtype || !selectedCategoryValue) return

    setMessages((prev) => [...prev, { sender: "user", text }])
    setChatMessages((prev) => [...prev, { role: "user", content: text }])
    setAwaitingUserInput(false)
    setLoading(true)

    try {
      if (!selectedTemplateName) {
        const res = await api.post("/api/ai/start", {
          category: selectedCategoryValue,
          subtype: selectedSubtype,
          user_input: text,
        })

        const data = res.data
        setSelectedTemplateName(data.filename)

        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Perfect. I’ve selected the right letter for your case." },
          { sender: "bot", text: data.question },
        ])

        setChatMessages([
          { role: "user", content: selectedCategory! },
          { role: "user", content: text },
          { role: "assistant", content: data.question },
        ])

        setAwaitingUserInput(true)
      } else {
        const res = await api.post("/api/ai/next", {
          category: selectedCategoryValue,
          filename: selectedTemplateName,
          messages: [...chatMessages, { role: "user", content: text }],
        })

        const reply = res.data.reply
        console.log("➡️ GPT Reply:", JSON.stringify(reply))
        const newChatMessages = [
          ...chatMessages,
          { role: "user", content: text },
          { role: "assistant", content: reply }
        ]

        setMessages((prev) => [...prev, { sender: "bot", text: reply }])
        setChatMessages(newChatMessages)

        const isFollowUp =
          reply.trim().endsWith("?") || reply.toLowerCase().includes("please provide")

        if (reply.trim().includes("__COMPLETE__")) {
          console.log("📥 Triggering /api/ai/complete for download...")

          try {
            const completeRes = await api.post(
              "/api/ai/complete",
              {
                category: selectedCategoryValue,
                filename: selectedTemplateName,
                messages: newChatMessages,
              },
              { responseType: "blob" }
            )

            const blob = new Blob([completeRes.data], {
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            })

            const url = window.URL.createObjectURL(blob)
            setDocDownloadUrl(url)
            console.log("📎 Blob URL:", url)

            // Auto-trigger download immediately
            const a = document.createElement("a")
            a.href = url
            a.download = "Your_Legal_Document.docx"
            document.body.appendChild(a)
            a.click()
            a.remove()

            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: "✅ Your letter is ready! Download should begin automatically. If not, click the button below." },
            ])
          } catch (err) {
            console.error("❌ Download failed:", err)
            setMessages((prev) => [
              ...prev,
              { sender: "bot", text: "⚠️ Letter generation failed. Please try again." },
            ])
          } finally {
            setAwaitingUserInput(true)
          }
        } else {
          setAwaitingUserInput(isFollowUp)
        }
      }
    } catch (err) {
      console.error("❌ Chat error:", err)
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Something went wrong. Please try again." },
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

        {!selectedCategory && <CategoryOptions onSelect={handleCategorySelect} />}

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

        {loading && (
          <div className="text-center text-sm text-gray-500 py-2">⏳ Loading...</div>
        )}

        {docDownloadUrl && (
          <div className="text-center mt-4 border-2 border-red-500 p-4 rounded-lg">
            <a
              href={docDownloadUrl}
              download="Your_Legal_Document.docx"
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
            >
              Download Letter
            </a>
          </div>
        )}

        <div ref={bottomRef}></div>
      </div>

      {awaitingUserInput && (
        <InputBar onSend={handleUserMessage} inputRef={inputRef} disabled={loading} />
      )}
    </div>
  )
}

export default ChatWindow
