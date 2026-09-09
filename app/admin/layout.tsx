import { Arimo } from "next/font/google";
import "./theme.css";

const arimo = Arimo({ subsets: ["latin"], weight: ["400", "500", "700"] });

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${arimo.className} tt-admin`}>{children}</div>;
}
