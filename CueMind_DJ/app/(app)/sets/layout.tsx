import { SetsLayoutShell } from "@/components/sets/sets-layout-shell";

export default function SetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SetsLayoutShell>{children}</SetsLayoutShell>;
}
