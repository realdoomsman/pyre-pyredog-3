import { useId } from "react";
import { cx } from "./cx";

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface OptionGridProps {
  /** Group label, rendered as the fieldset legend. */
  legend: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A single-choice row of chip-sized controls. Built on real radio inputs, so arrow keys,
 * labels and focus rings come from the platform rather than from `aria-*` guesswork.
 */
export function OptionGrid({ legend, value, options, onChange, className }: OptionGridProps) {
  const name = useId();
  return (
    <fieldset className={cx("min-w-0", className)}>
      <legend className="mb-2 text-sm text-ink-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            className={cx(
              "relative inline-flex h-8 cursor-pointer items-center rounded-card border border-border bg-surface px-3 text-sm",
              "text-ink-muted transition-colors hover:border-border-strong hover:text-ink",
              "has-[:checked]:border-violet has-[:checked]:bg-violet-soft has-[:checked]:text-violet",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet",
              "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-40",
            )}
            key={option.value}
          >
            <input
              checked={value === option.value}
              /* Sits invisibly over the whole chip so the input itself is the hit target. */
              className="absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
              disabled={option.disabled}
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
