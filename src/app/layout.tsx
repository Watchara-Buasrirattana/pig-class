import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "Pig Class",
  description: "A sample course website with Next.js 13",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
