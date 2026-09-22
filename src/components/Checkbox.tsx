import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

/** Native checkbox with the Pyre border and violet accent. */
export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2 text-sm text-ink-muted", className)}>
      <input
        className="size-4 shrink-0 rounded-[3px] border border-border-strong bg-bg accent-violet"
        type="checkbox"
        {...rest}
      />
      {label}
    </label>
  );
}
