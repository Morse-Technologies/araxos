import { ConsoleShell } from "@/features/shell/ConsoleShell";

export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
