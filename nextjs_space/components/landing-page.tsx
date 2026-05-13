"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Target, Film, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Target,
    title: "Strategy Engine",
    description: "Define your target audience and ad strategy"
  },
  {
    icon: Sparkles,
    title: "Style Engine",
    description: "Lock in visual style and character specs"
  },
  {
    icon: Zap,
    title: "Script Engine",
    description: "Create scene-by-scene scripts"
  },
  {
    icon: Film,
    title: "Image & Video Engine",
    description: "Generate images and video prompts"
  }
];

const features = [
  "5-step automated workflow",
  "Human approval gates",
  "Customizable master prompts",
  "AI-powered image generation",
  "Video JSON output for VEO/CapCut",
  "Multi-platform support"
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">AI Ad Workflow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Turn any product into viral ads</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">AI-Powered</span> Ads in Minutes
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Transform any product image into professional UGC, CGI, and viral video ads using our 5-step automated workflow with human approval gates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Start Creating <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {steps?.map((step, index) => {
              const Icon = step?.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors h-full">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                      {Icon && <Icon className="w-6 h-6 text-purple-400" />}
                    </div>
                    <div className="text-sm text-purple-400 mb-2">Step {index + 1}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step?.title ?? ""}</h3>
                    <p className="text-gray-400 text-sm">{step?.description ?? ""}</p>
                  </div>
                  {index < (steps?.length ?? 0) - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="w-6 h-6 text-gray-700" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {features?.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 bg-gray-900/30 border border-gray-800 rounded-lg p-4"
              >
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-gray-200">{feature ?? ""}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Viral Ads?</h2>
            <p className="text-gray-400 mb-8">Start your first ad project in minutes.</p>
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          © 2026 AI Ad Workflow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
