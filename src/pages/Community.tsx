import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { MessageSquare, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Community() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-syne font-bold text-6xl tracking-tight mb-4">
            Join the <span className="text-primary">Community</span>
          </h1>
          <p className="font-dm text-xl text-muted-foreground">
            Connect with other creators, share your videos, and learn new technical documentation techniques.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="neo-card p-8 bg-card border-2 flex flex-col items-center text-center">
            <MessageSquare className="w-12 h-12 text-[#5865F2] mb-6" />
            <h2 className="font-syne font-bold text-3xl mb-4">Discord Server</h2>
            <p className="font-dm text-muted-foreground mb-8 line-clamp-3">
              Our main hub for real-time chat, feature requests, and showcasing your latest cinematic tutorials.
            </p>
            <Button className="w-full font-syne font-bold text-lg py-6 bg-[#5865F2] hover:bg-[#4752C4]">
              Join Discord Server
            </Button>
          </div>

          <div className="neo-card p-8 bg-card border-2 flex flex-col items-center text-center">
            <Github className="w-12 h-12 text-foreground mb-6" />
            <h2 className="font-syne font-bold text-3xl mb-4">GitHub Discussions</h2>
            <p className="font-dm text-muted-foreground mb-8 line-clamp-3">
              The best place for bug reports, API integrations, and developer-focused conversations.
            </p>
            <Button className="w-full font-syne font-bold text-lg py-6 shadow-offset">
              View Discussions
            </Button>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
