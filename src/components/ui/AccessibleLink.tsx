import Link from "next/link";
import type { ComponentProps } from "react";

// Explicit sequential focus includes links in WebKit's form-controls keyboard mode.
export function Anchor(props: ComponentProps<"a">) { return <a tabIndex={0} {...props} />; }
export function AppLink(props: ComponentProps<typeof Link>) { return <Link tabIndex={0} {...props} />; }
