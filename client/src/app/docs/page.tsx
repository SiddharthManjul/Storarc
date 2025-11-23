'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  BookOpen,
  Shield,
  Zap,
  Lock,
  Database,
  Code,
  GitBranch,
  Server,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { TracingBeam } from '@/components/ui/tracing-beam';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['intro', 'vision', 'security', 'getting-started', 'developer-guide'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  const sections = [
    { id: 'intro', title: 'Introduction', icon: BookOpen },
    { id: 'vision', title: 'The Vision', icon: AlertTriangle },
    { id: 'security', title: 'Enterprise Security', icon: Shield },
    { id: 'getting-started', title: 'Getting Started', icon: Zap },
    { id: 'developer-guide', title: 'Developer Guide', icon: Code },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 text-[#3d3436]">
            Storarc Documentation
          </h1>
          <p className="text-xl text-[#b35340]">
            Your complete guide to decentralized, AI-powered knowledge management
          </p>
        </motion.div>

        <div className="flex gap-12">
          {/* Left sidebar - Section navigation (35%) */}
          <div className="w-[35%] shrink-0">
            <div className="sticky top-24">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        activeSection === section.id
                          ? 'bg-[#feb47b] border-2 border-[#ff7e5f] text-[#3d3436] font-semibold shadow-md'
                          : 'text-[#3d3436]/60 hover:bg-[#feb47b]/30 border-2 border-transparent'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${activeSection === section.id ? 'text-[#ff7e5f]' : 'text-[#3d3436]/40'}`} />
                      <span>{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Right content area with tracing beam (60%) */}
          <div className="w-[60%]">
            <TracingBeam>
              <div className="space-y-16">
                {/* Introduction */}
                <section id="intro" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-[#3d3436] mb-6">What is Storarc?</h2>
                  <div className="space-y-4 text-[#3d3436] leading-relaxed">
                    <p>
                      Storarc is a <strong>decentralized, AI-powered knowledge engine</strong> that gives you permanent,
                      verifiable, and privacy-preserving control over your data. Built on cutting-edge blockchain technology,
                      Storarc combines the power of <strong>Walrus</strong> for decentralized storage and <strong>Sui blockchain</strong> for
                      on-chain provenance to create an unbreakable foundation for your documents.
                    </p>
                    <p>
                      Every document is hashed, immutably stored, and provably owned by you. Enhanced with OpenAI embeddings
                      and an optimized RAG (Retrieval-Augmented Generation) pipeline, Storarc enables natural language search
                      and context-aware answers from your own documents.
                    </p>
                  </div>
                </section>

                {/* Vision */}
                <section id="vision" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-[#3d3436] mb-6">The Vision: Why Decentralized AI?</h2>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold text-[#3d3436] mb-3">The Centralization Problem</h3>
                          <p className="text-[#3d3436]/90 leading-relaxed">
                            Modern cloud infrastructure creates <strong>single points of failure</strong> that can bring down
                            entire ecosystems. We&apos;ve witnessed this repeatedly:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 ml-16">
                        <div>
                          <h4 className="font-semibold text-[#3d3436] mb-2">🔴 CrowdStrike-Microsoft Outage (2024)</h4>
                          <p className="text-sm text-[#3d3436]/80">
                            A single faulty update brought down 8.5 million Windows machines globally, disrupting airlines,
                            hospitals, banks, and critical infrastructure. The cascading failure demonstrated how centralized
                            security systems can become a vulnerability rather than a defense.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-[#3d3436] mb-2">🔴 Cloudflare Incidents</h4>
                          <p className="text-sm text-[#3d3436]/80">
                            Multiple outages have taken down significant portions of the internet, affecting millions of websites
                            and services. When a centralized CDN fails, entire regions lose access to critical services.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-[#3d3436] mb-2">🔴 AWS Outages</h4>
                          <p className="text-sm text-[#3d3436]/80">
                            Amazon Web Services outages have repeatedly paralyzed large swaths of the internet, proving that
                            even the most robust centralized systems have fundamental vulnerabilities.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-semibold text-[#3d3436] mb-3">The Storarc Solution</h3>
                          <p className="text-[#3d3436]/90 leading-relaxed mb-4">
                            Storarc eliminates single points of failure through true decentralization:
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-3 text-[#3d3436]/90 ml-16">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>Distributed Storage:</strong> Your data lives across a global network of Walrus nodes,
                          not on a single server that can fail</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>Blockchain Verification:</strong> Sui blockchain ensures immutable proof of ownership
                          and data integrity</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>Censorship Resistance:</strong> No central authority can delete, modify, or restrict
                          access to your data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>99.99% Uptime:</strong> Distributed architecture ensures continuous availability even
                          if individual nodes fail</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Enterprise Security */}
                <section id="security" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-[#3d3436] mb-6">Enterprise-Grade Security</h2>

                  <div className="space-y-8">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center shrink-0">
                        <Lock className="w-6 h-6 text-[#ff7e5f]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#3d3436] mb-2">SEAL Encryption</h3>
                        <p className="text-[#3d3436]/80 leading-relaxed">
                          Client-side encryption powered by Microsoft SEAL (Simple Encrypted Application Library). Your data
                          is encrypted before it ever leaves your device, ensuring complete privacy even from storage providers.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center shrink-0">
                        <Shield className="w-6 h-6 text-[#ff7e5f]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#3d3436] mb-2">Granular Access Control</h3>
                        <p className="text-[#3d3436]/80 leading-relaxed">
                          Enterprise-level permissions managed on-chain. Grant and revoke access to specific users with
                          cryptographic guarantees. Every access control change is verifiable on the blockchain.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center shrink-0">
                        <Database className="w-6 h-6 text-[#ff7e5f]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#3d3436] mb-2">Private RAG Pipeline</h3>
                        <p className="text-[#3d3436]/80 leading-relaxed">
                          Your documents never leave your control. The RAG system processes encrypted data, ensuring that
                          AI-powered search maintains the same security guarantees as your storage.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#ff7e5f]/20 flex items-center justify-center shrink-0">
                        <Zap className="w-6 h-6 text-[#ff7e5f]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-[#3d3436] mb-2">Small Language Models (SLMs)</h3>
                        <p className="text-[#3d3436]/80 leading-relaxed">
                          Future support for on-device SLMs means your queries can be processed locally without sending data
                          to external APIs, perfect for air-gapped or high-security environments.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Getting Started */}
                <section id="getting-started" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-[#3d3436] mb-6">Getting Started: Using Storarc</h2>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-semibold text-[#3d3436] mb-4">Step 1: Connect Your Wallet</h3>
                      <p className="text-[#3d3436]/90 mb-3">
                        Storarc requires a Sui wallet to manage your documents on-chain. We recommend:
                      </p>
                      <ul className="space-y-2 text-[#3d3436]/80 ml-6 mb-3">
                        <li className="list-disc">Sui Wallet (Browser Extension)</li>
                        <li className="list-disc">Suiet Wallet</li>
                        <li className="list-disc">Ethos Wallet</li>
                      </ul>
                      <p className="text-sm text-[#3d3436]/70">
                        Click the &quot;Connect Wallet&quot; button in the top right corner and approve the connection.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-2xl font-semibold text-[#3d3436] mb-4">Step 2: Upload Documents</h3>
                      <ol className="space-y-4 text-[#3d3436]/90">
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">1.</span>
                          <div>
                            <strong>Navigate to Upload page</strong> - Click &quot;Upload&quot; in the navigation menu
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">2.</span>
                          <div>
                            <strong>Choose privacy mode:</strong>
                            <ul className="mt-2 space-y-2 ml-4 text-sm">
                              <li className="list-disc"><strong>Public:</strong> Faster, lower cost, anyone with link can access</li>
                              <li className="list-disc"><strong>Private:</strong> SEAL-encrypted, requires granted access, enterprise security</li>
                            </ul>
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">3.</span>
                          <div>
                            <strong>Upload your file</strong> - Drag & drop or click to browse. Supported formats: PDF, DOCX, TXT, MD, CSV, JSON, and more
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">4.</span>
                          <div>
                            <strong>Sign transaction</strong> - Approve the blockchain transaction (~0.002 SUI gas fee)
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">5.</span>
                          <div>
                            <strong>Get confirmation</strong> - Receive your Blob ID and transaction digest. Your document is now on Walrus!
                          </div>
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-2xl font-semibold text-[#3d3436] mb-4">Step 3: Chat with Your Documents</h3>
                      <ol className="space-y-4 text-[#3d3436]/90">
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">1.</span>
                          <div>
                            <strong>Create chat registry</strong> (one-time) - On your first visit to Chat page, create your
                            personal chat registry on Sui blockchain
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">2.</span>
                          <div>
                            <strong>Ask questions</strong> - Type natural language queries about your documents
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">3.</span>
                          <div>
                            <strong>Review sources</strong> - Each answer includes source citations with relevance scores
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">4.</span>
                          <div>
                            <strong>Manage chats</strong> - Star important conversations, delete old ones, view expiry dates
                          </div>
                        </li>
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-2xl font-semibold text-[#3d3436] mb-4">Step 4: Manage Access</h3>
                      <ol className="space-y-4 text-[#3d3436]/90">
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">1.</span>
                          <div>
                            <strong>Navigate to Documents page</strong> - View all your uploaded documents
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">2.</span>
                          <div>
                            <strong>Select a private document</strong> - Click on any document with a lock icon
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">3.</span>
                          <div>
                            <strong>Grant access</strong> - Enter a Sui wallet address to grant decryption access
                          </div>
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-[#ff7e5f]">4.</span>
                          <div>
                            <strong>Revoke access</strong> - Remove access from any user at any time
                          </div>
                        </li>
                      </ol>
                    </div>
                  </div>
                </section>

                {/* Developer Guide */}
                <section id="developer-guide" className="scroll-mt-24">
                  <h2 className="text-3xl font-bold text-[#3d3436] mb-6">Developer Guide: Running Locally</h2>

                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <GitBranch className="w-6 h-6 text-[#ff7e5f]" />
                        <h3 className="text-2xl font-semibold text-[#3d3436]">Clone the Repository</h3>
                      </div>
                      <div className="bg-[#3d3436] rounded-lg p-4 font-mono text-sm text-[#ffedea] overflow-x-auto">
                        <code>git clone https://github.com/SiddharthManjul/Storarc.git</code><br />
                        <code>cd Storarc</code>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Server className="w-6 h-6 text-[#ff7e5f]" />
                        <h3 className="text-2xl font-semibold text-[#3d3436]">Prerequisites</h3>
                      </div>
                      <ul className="space-y-2 text-[#3d3436]/90">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>Node.js</strong> v18 or higher</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>npm</strong> or <strong>yarn</strong> package manager</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>Sui Wallet</strong> (browser extension)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>OpenAI API Key</strong> (for embeddings & RAG)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>Walrus Testnet Access</strong></span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Code className="w-6 h-6 text-[#ff7e5f]" />
                        <h3 className="text-2xl font-semibold text-[#3d3436]">Installation Steps</h3>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <p className="text-[#3d3436] font-semibold mb-2">1. Install client dependencies:</p>
                          <div className="bg-[#3d3436] rounded-lg p-4 font-mono text-sm text-[#ffedea]">
                            <code>cd client</code><br />
                            <code>npm install</code>
                          </div>
                        </div>

                        <div>
                          <p className="text-[#3d3436] font-semibold mb-2">2. Configure environment variables:</p>
                          <div className="bg-[#3d3436] rounded-lg p-4 font-mono text-sm text-[#ffedea]">
                            <code>cp .env.example .env</code>
                          </div>
                          <p className="text-sm text-[#3d3436]/70 mt-2 mb-2">
                            Edit .env and add your API keys:
                          </p>
                          <div className="bg-[#3d3436] rounded-lg p-4 font-mono text-xs text-[#ffedea] overflow-x-auto">
                            <code>OPENAI_API_KEY=your_openai_key</code><br />
                            <code>NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space</code><br />
                            <code>NEXT_PUBLIC_SUI_NETWORK=testnet</code>
                          </div>
                        </div>

                        <div>
                          <p className="text-[#3d3436] font-semibold mb-2">3. Start the development server:</p>
                          <div className="bg-[#3d3436] rounded-lg p-4 font-mono text-sm text-[#ffedea]">
                            <code>npm run dev</code>
                          </div>
                        </div>

                        <div>
                          <p className="text-[#3d3436] font-semibold mb-2">4. Open your browser:</p>
                          <div className="bg-[#3d3436] rounded-lg p-4 font-mono text-sm text-[#ffedea]">
                            <code>http://localhost:3000</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                        <h3 className="text-2xl font-semibold text-[#3d3436]">Important Notes</h3>
                      </div>
                      <ul className="space-y-2 text-[#3d3436]/90 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span>Ensure you have SUI tokens on testnet for gas fees (get from faucet)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span>OpenAI API usage will incur costs based on your usage</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span>Vector store data is stored locally in development mode</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-600 font-bold">•</span>
                          <span>For production deployment, configure proper environment variables on Vercel</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-8 text-center">
                      <h3 className="text-2xl font-bold text-[#3d3436] mb-4">Explore the Source Code</h3>
                      <p className="text-[#3d3436]/80 mb-6">
                        Storarc is open source. Contribute, report issues, or fork for your own use.
                      </p>
                      <a
                        href="https://github.com/SiddharthManjul/Storarc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff7e5f] text-[#ffedea] rounded-lg hover:bg-[#ff9a76] transition-colors font-semibold shadow-md"
                      >
                        <GitBranch className="w-5 h-5" />
                        View on GitHub
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </section>
              </div>
            </TracingBeam>
          </div>
        </div>
      </div>
    </div>
  );
}
