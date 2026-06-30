import "./globals.css";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

export const metadata = {
  title: "Lanka-Link | Smart Merchant Platform",
  description: "Agency banking, procurement, and ML insights for rural Sri Lankan merchants",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}