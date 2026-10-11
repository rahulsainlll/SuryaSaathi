"use client";

import { Label, ListBox, Select } from "@heroui/react";

export interface Option {
  id: string;
  label: string;
}

/** A labelled HeroUI select whose empty value is "All". */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const all: Option[] = [{ id: "", label: "All" }, ...options];
  return (
    <Select
      className="w-full min-w-40 sm:w-44"
      selectedKey={value}
      onSelectionChange={(key) => onChange(key === null ? "" : String(key))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={all}>
          {(o) => (
            <ListBox.Item id={o.id} textValue={o.label}>
              {o.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
