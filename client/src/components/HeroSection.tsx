/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { motion } from "framer-motion";
import { HoleBackground } from "./animate-ui/components/backgrounds/hole";
import { Space_Grotesk, Ubuntu } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-ubuntu',
});

export function HeroSection() {
  return (
    <div className="relative min-h-screen flex items-center overflow-hidden">
      
      {/* Hole Background */}
      <div
        className="absolute inset-0 h-full"
        style={{ width: "150%", left: 0 }}
      >
        <HoleBackground className="w-full h-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight`}
            >
              <span className={`block text-foreground ${spaceGrotesk.variable}`}>The Future of</span>
              <span className="block text-[#feb47b] bg-clip-text">
                Intelligent Storage
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className={`text-xl text-muted-foreground ${spaceGrotesk.variable}`}
            >
              Storarc combines the power of decentralized storage with
              AI-powered retrieval. Store your data on Walrus, query it with
              natural language, and let blockchain ensure your ownership.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button className="px-8 py-4 rounded-full bg-[#feb47b] text-[#3d3436] font-semibold text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105">
                Get Started Free
              </button>

              <button className="px-8 py-4 rounded-full border-2 border-border bg-background/50 backdrop-blur-sm text-foreground font-semibold text-lg hover:bg-accent transition-all duration-300 hover:scale-105">
                View Documentation
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-3 gap-6 pt-12"
            >
              <div>
                <div className="text-3xl sm:text-4xl font-bold bg-clip-text text-[#3d3436]">
                  100%
                </div>
                <div className="text-sm text-[#b35340] mt-1">
                  Decentralized
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold bg-clip-text text-[#3d3436]">
                  Instant
                </div>
                <div className="text-sm text-[#b35340] mt-1">
                  AI Retrieval
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold bg-clip-text text-[#3d3436]">
                  Secure
                </div>
                <div className="text-sm text-[#b35340] mt-1">
                  Blockchain Verified
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center p-2"
        >
          <motion.div className="w-1 h-3 bg-linear-to-b from-blue-500 to-purple-600 rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}
