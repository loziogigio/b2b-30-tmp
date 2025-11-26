import { AiOutlineSend, AiOutlineLoading3Quarters } from 'react-icons/ai'
import { useState, FormEvent, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface EliaInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function EliaInput({ onSend, disabled }: EliaInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Describe what you're looking for..."
        rows={3}
        className={cn(
          "w-full px-4 py-3 pr-12 border rounded-lg resize-none",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:bg-gray-50 disabled:cursor-not-allowed",
          "placeholder:text-gray-400"
        )}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className={cn(
          "absolute right-2 bottom-2 p-2 rounded-lg",
          "bg-blue-600 text-white transition-all",
          "hover:bg-blue-700",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {disabled ? (
          <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
        ) : (
          <AiOutlineSend className="w-5 h-5" />
        )}
      </button>
    </form>
  )
}
