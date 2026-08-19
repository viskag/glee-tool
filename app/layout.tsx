import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GLEE | Study builder",
  description: "Build serious game evaluation studies with the GLEE framework.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
