import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "GLEE | Study builder",
  description: "Build serious game evaluation studies with the GLEE framework.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <body>
        <Providers>{children}</Providers>
      </body>
  </html>;
}
