import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

export const metadata = {
  title: "Lanka-Link | Smart Merchant Platform",
  description: "Agency banking, procurement, and ML insights for rural Sri Lankan merchants",
};

// runs before the page paints — prevents the light-mode flash
const themeScript = `
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var theme = saved || system;
      if (theme === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="mx-auto min-h-screen max-w-7xl px-4 py-6">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}