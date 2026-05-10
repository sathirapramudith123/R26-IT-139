import "./globals.css";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";

export const metadata = {
  title: "Lanka-Link | Micro-Merchant ERP",
  description: "Digital agency banking and smart procurement for rural Sri Lanka"
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
