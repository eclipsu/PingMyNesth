"use client";

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/cn";

export type ComboboxProps<T> = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** A suggestion was chosen (click, or Enter on a highlighted row). */
  onPick: (item: T) => void;
  /** Returns suggestions for the (debounced) query; return [] while loading. */
  suggest: (query: string) => T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
};

// The trie lookup is sub-millisecond; the pause just keeps the list from
// flickering while someone types a word.
const SUGGEST_DEBOUNCE_MS = 120;

/**
 * Text input with a keyboard-accessible suggestion list (ARIA combobox).
 * Enter with nothing highlighted falls through to the parent form.
 */
export function Combobox<T>({
  id,
  value,
  onChange,
  onPick,
  suggest,
  itemKey,
  renderItem,
  placeholder,
  autoFocus,
  ariaLabel,
  className,
  inputClassName,
}: ComboboxProps<T>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = useDebouncedValue(value, SUGGEST_DEBOUNCE_MS);
  const items = useMemo(() => (query.trim() ? suggest(query) : []), [suggest, query]);
  const showList = open && items.length > 0 && value.trim() !== "";

  const pick = (item: T) => {
    setOpen(false);
    setActive(-1);
    onPick(item);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && showList && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Enter") {
      // let the form submit, and get the list out of the way of the results
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className={inputClassName}
      />

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 max-h-[22rem] overflow-y-auto rounded-md border border-line bg-surface py-1 text-left text-ink shadow-[var(--shadow-float)]"
        >
          {items.map((item, i) => (
            <li
              key={itemKey(item)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // keep focus in the input so blur doesn't close the list before the click lands
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-baseline gap-3 border-l-4 px-3 py-2.5",
                i === active ? "border-accent bg-subtle" : "border-transparent",
              )}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
