"use client";

import { Database, Lock, MessageSquare, Shield, Zap } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { motion } from "framer-motion";

export function BentoGrid() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-background">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-linear-to-r text-[#3d3436] bg-clip-text">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to store, manage, and retrieve your data in a
            decentralized way
          </p>
        </motion.div>

        <ul className="grid grid-cols-1 grid-rows-none gap-6 md:grid-cols-12 md:grid-rows-3 lg:gap-6 xl:max-h-fit xl:grid-rows-2 ">
          <GridItem
            area="md:[grid-area:2/1/3/7] xl:[grid-area:1/1/3/5]"
            icon={<Database className="h-5 w-5" />}
            iconGradient="from-blue-500 to-cyan-500"
            title="Storarc"
            description="Storarc is a decentralized, AI-powered knowledge engine that gives you permanent, verifiable, and privacy-preserving control over your data. Using Walrus for decentralized storage and Sui for on-chain provenance, every document is hashed, immutably stored, and provably owned by you. Storarc enhances your files with OpenAI embeddings and an optimized RAG pipeline, enabling natural language search and context-aware answers from your own documents. Privacy is reinforced through client-side encryption powered by SEAL, ensuring your data remains secure even before it reaches decentralized storage. With support for multiple file formats, intelligent chunking, vector indexing, and permanent chat histories, Storarc becomes your personal or team-based, censorship-resistant knowledge vault. Whether you’re a developer, researcher, or organization, Storarc delivers a transparent, encrypted, and AI-augmented way to preserve information forever—independent of any centralized cloud."/>

          <GridItem
            area="md:[grid-area:1/1/2/7] xl:[grid-area:1/5/2/8]"
            icon={<Lock className="h-5 w-5" />}
            iconGradient="from-orange-500 to-red-500"
            title="Blockchain Verified"
            description="Every upload is registered on Sui blockchain for immutable proof of ownership and authenticity."
          />

          <GridItem
            area="md:[grid-area:1/7/2/13] xl:[grid-area:2/5/3/8]"
            icon={<MessageSquare className="h-5 w-5" />}
            iconGradient="from-purple-500 to-pink-500"
            title="AI-Powered Search"
            description="Query your documents using natural language with RAG technology. Ask questions, get instant answers from your data."
          />

          <GridItem
            area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
            icon={<Zap className="h-5 w-5" />}
            iconGradient="from-yellow-500 to-orange-500"
            title="Lightning Fast"
            description="Retrieve documents instantly with Storarc’s distributed edge caching and optimized vector search, which accelerate content delivery across the network. Even large, encrypted datasets become quickly accessible, enabling fast, context-aware retrieval powered by AI—no matter where your data is stored within the decentralized storage layer."
          />

          <GridItem
            area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
            icon={<Shield className="h-5 w-5" />}
            iconGradient="from-green-500 to-emerald-500"
            title="Enterprise Security"
            description="End-to-end encryption with granular access control ensures every document is protected from the moment it’s uploaded. With SEAL-powered client-side encryption and permissioned access layers, your data stays private, secure, and readable only by authorized users—never exposed to intermediaries, storage providers, or the network."
          />
        </ul>
      </div>
    </section>
  );
}

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  iconGradient: string;
  title: string;
  description: React.ReactNode;
}

const GridItem = ({
  area,
  icon,
  iconGradient,
  title,
  description,
}: GridItemProps) => {
  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className={`min-h-56 list-none ${area}`}
    >
      <div className="relative h-full rounded-2xl border border-border p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          spread={50}
          glow={true}
          disabled={false}
          proximity={80}
          inactiveZone={0.01}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl bg-[#feb47b] p-8 md:p-8 shadow-lg">
          <div className="relative flex flex-1 flex-col justify-between gap-4">
            <div
              className={`w-fit rounded-xl bg-linear-to-br ${iconGradient} p-3 shadow-lg`}
            >
              <div className="text-white">{icon}</div>
            </div>
            <div className="space-y-3">
              <h3 className="font-sans text-2xl font-bold text-[#3d3436] md:text-2xl">
                {title}
              </h3>
              <div className="font-sans text-base leading-relaxed text-black">
                {description}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
};
