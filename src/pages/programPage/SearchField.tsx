import { X as CloseIcon, Search } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { ja } from "../../locales/ja";

export function SearchField({
  value,
  isSearching,
  placeholder,
  onCommit,
}: {
  value: string;
  isSearching: boolean;
  placeholder: string;
  onCommit: (nextValue: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const lastCommittedValueRef = useRef(value);

  useEffect(() => {
    if (value !== lastCommittedValueRef.current) {
      lastCommittedValueRef.current = value;
      setDraftValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (draftValue === lastCommittedValueRef.current) return;

    const timeoutId = window.setTimeout(() => {
      lastCommittedValueRef.current = draftValue;
      startTransition(() => {
        onCommit(draftValue);
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [draftValue, onCommit]);

  const showClearButton = draftValue.length > 0 || value.length > 0 || isSearching;

  function handleClear() {
    setDraftValue("");
    if (lastCommittedValueRef.current === "") return;
    lastCommittedValueRef.current = "";
    startTransition(() => {
      onCommit("");
    });
  }

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        id="program-search"
        name="program-search"
        placeholder={placeholder}
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        inputMode="search"
        enterKeyHint="search"
        className={`w-full rounded-full border border-gray-300 py-2 pl-9 text-sm outline-none focus:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${showClearButton ? "pr-10" : "pr-4"}`}
      />
      {showClearButton && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label={ja.clearSearch}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
