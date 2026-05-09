import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Search, Book, MessageCircle, PlayCircle, Settings, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { icon: PlayCircle, title: "Getting Started", desc: "Learn the basics of creating your first video." },
  { icon: Settings, title: "Account & Billing", desc: "Manage your subscription, team, and settings." },
  { icon: Book, title: "Project Setup", desc: "Tips for writing scripts and uploading screenshots." },
  { icon: MessageCircle, title: "Voice & Narration", desc: "Choosing AI voices and fixing pronunciation." },
  { icon: HelpCircle, title: "Troubleshooting", desc: "Fixing render errors and common issues." },
];

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-syne font-bold text-6xl tracking-tight mb-6">
            How can we <span className="text-primary">help?</span>
          </h1>
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Search for answers..." 
              className="pl-12 py-6 text-lg border-2"
            />
          </div>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div key={idx} className="neo-card p-6 bg-card hover:border-primary transition-colors cursor-pointer group">
                <Icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-syne font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                  {cat.title}
                </h3>
                <p className="font-dm text-muted-foreground">{cat.desc}</p>
              </div>
            );
          })}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
