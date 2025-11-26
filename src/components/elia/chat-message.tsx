import { cn } from '@/lib/utils'
import { AiOutlineUser, AiOutlineRobot } from 'react-icons/ai'
import type { ChatMessage } from '@/lib/elia/types'

interface ChatMessageProps extends ChatMessage {
  onSuggestionClick?: (suggestion: string) => void
}

export function ChatMessageComponent({
  role,
  content,
  suggestions = [],
  onSuggestionClick
}: ChatMessageProps) {
  return (
    <div className={cn(
      "flex gap-3 transition-all duration-300",
      role === 'user' ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        role === 'assistant' ? "bg-blue-600" : "bg-gray-600"
      )}>
        {role === 'assistant' ? (
          <AiOutlineRobot className="w-4 h-4 text-white" />
        ) : (
          <AiOutlineUser className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 space-y-2",
        role === 'user' ? 'items-end' : 'items-start'
      )}>
        {/* Message bubble */}
        <div className={cn(
          "rounded-lg px-4 py-2 max-w-[85%]",
          role === 'user'
            ? 'bg-blue-600 text-white ml-auto'
            : 'bg-white border border-gray-200 text-gray-900'
        )}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
