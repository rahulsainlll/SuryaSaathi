"use client";

import { buttonVariants, linkVariants } from "@heroui/styles";
import NextLink from "next/link";
import type { ComponentProps } from "react";

const link = linkVariants();

/** A Next.js link styled as a HeroUI Link (the pattern HeroUI documents for routers). */
export function AppLink({ className, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} className={`${link.base()} ${className ?? ""}`} />;
}

/** A Next.js link styled as a HeroUI Button, for navigation and calls to action. */
export function ButtonLink({
  variant = "secondary",
  size = "sm",
  fullWidth,
  className,
  ...props
}: ComponentProps<typeof NextLink> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  return (
    <NextLink
      {...props}
      className={`${buttonVariants({ variant, size, fullWidth })} ${className ?? ""}`}
    />
  );
}
