import { AiOutlineSend, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useState, FormEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 300;

interface EliaInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function EliaInput({ onSend, disabled }: EliaInputProps) {
  const [input, setInput] = useState('');

  const trimmedInput = input.trim();
  const isValid =
    trimmedInput.length >= MIN_QUERY_LENGTH &&
    trimmedInput.length <= MAX_QUERY_LENGTH;
  const isTooShort =
    trimmedInput.length > 0 && trimmedInput.length < MIN_QUERY_LENGTH;
  const isTooLong = trimmedInput.length > MAX_QUERY_LENGTH;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isValid && !disabled) {
      onSend(trimmedInput);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Prevent typing beyond max length
    if (value.length <= MAX_QUERY_LENGTH + 10) {
      setInput(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Descrivi cosa stai cercando..."
        rows={2}
        className={cn(
          'w-full px-4 py-3 pr-12 border rounded-lg resize-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          'placeholder:text-gray-400',
          isTooLong && 'border-red-300 focus:ring-red-500',
        )}
      />

      {/* Character count */}
      <div className="absolute left-3 bottom-2 text-xs">
        <span
          className={cn(
            'transition-colors',
            isTooShort && 'text-orange-500',
            isTooLong && 'text-red-500',
            isValid && 'text-gray-400',
          )}
        >
          {trimmedInput.length}/{MAX_QUERY_LENGTH}
        </span>
      </div>

      <button
        type="submit"
        disabled={disabled || !isValid}
        className={cn(
          'absolute right-2 bottom-2 p-2 rounded-lg',
          'bg-blue-600 text-white transition-all',
          'hover:bg-blue-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {disabled ? (
          <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
        ) : (
          <AiOutlineSend className="w-5 h-5" />
        )}
      </button>
    </form>
  );
}
