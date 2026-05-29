import { Github, Linkedin, Mail, Phone, Globe, Cpu, Bot, Layers, Sparkles, Send } from "lucide-react";

export function About() {
  return (
    <div className="mx-auto max-w-4xl overflow-y-auto pb-8 pr-1">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-jarvis-text">About Me</h1>
        <p className="text-sm text-jarvis-muted">Meet the Architect behind JarvisOS</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Column: Bio & Core Info */}
        <div className="space-y-6">
          {/* Main Professional Profile */}
          <section className="glass-panel p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent blur-md" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-cyan-600/10 ring-1 ring-jarvis-accent/30">
                <Sparkles className="h-5 w-5 text-jarvis-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-jarvis-text">Aditya Kumar</h2>
                <p className="text-xs text-jarvis-muted">AI Engineer | Founder | Agentic AI Architect</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-jarvis-subtle">
              I build real-world AI systems at scale — from multi-agent AI workflows to production SaaS platforms serving international clients.
            </p>
            <div className="mt-4 border-t border-jarvis-border/40 pt-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-400">Founder @ DarexAI</span>
              </div>
              <p className="mt-1 text-[11px] text-jarvis-muted">
                Building AI SaaS platforms, automation systems, and intelligent agents for global use-cases.
              </p>
            </div>
          </section>

          {/* Focus Areas */}
          <section className="glass-panel p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-jarvis-muted flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-jarvis-accent" />
              Focus Areas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FocusItem icon={Bot} text="Agentic AI & Autonomous Systems" />
              <FocusItem icon={Layers} text="Generative AI (LLMs + Diffusion)" />
              <FocusItem icon={Globe} text="Multilingual NLP (Indic AI)" />
              <FocusItem icon={Sparkles} text="RAG Systems & AI Pipelines" />
              <FocusItem icon={Cpu} text="Full Stack AI SaaS" />
            </div>
          </section>

          {/* What I Build */}
          <section className="glass-panel p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-jarvis-muted flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-jarvis-accent" />
              What I Build
            </h2>
            <ul className="space-y-2 text-xs text-jarvis-subtle">
              <li className="flex items-center gap-2">
                <span className="text-jarvis-accent">✨</span> Production AI Systems
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jarvis-accent">✨</span> AI SaaS Platforms
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jarvis-accent">✨</span> Multi-Agent Architectures
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jarvis-accent">✨</span> Voice + WhatsApp AI Agents
              </li>
              <li className="flex items-center gap-2">
                <span className="text-jarvis-accent">✨</span> End-to-End Automation Pipelines
              </li>
            </ul>
          </section>
        </div>

        {/* Right Column: Visuals & Socials */}
        <div className="space-y-6">
          {/* Card: Connect Me (New QR Code Close-up) */}
          <section className="glass-panel p-5 flex flex-col items-center">
            <h3 className="mb-3 text-xs font-semibold text-jarvis-text self-start flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-jarvis-accent" />
              Connect me
            </h3>
            <div className="relative group overflow-hidden rounded-xl border border-jarvis-border/60 shadow-lg bg-jarvis-bg p-3 max-w-[260px] w-full">
              <img 
                src="/aditya_qr_close.png" 
                alt="Aditya Kumar QR Code" 
                className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-3 text-[11px] text-center text-jarvis-muted font-medium">
              Scan this close-up QR code to connect with me.
            </p>
          </section>

          {/* Card 1: Business Card and QR code */}
          <section className="glass-panel p-4 flex flex-col items-center">
            <h3 className="mb-2 text-xs font-semibold text-jarvis-text self-start">Interactive Connect Card</h3>
            <div className="relative group overflow-hidden rounded-lg border border-jarvis-border/60 shadow-md">
              <img 
                src="/aditya_image_1.png" 
                alt="Aditya Kumar - CTO & Founder Card" 
                className="w-full max-w-sm transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <p className="mt-2.5 text-[10px] text-center text-jarvis-muted">
              Scan the QR code to instantly connect or view contact credentials.
            </p>
          </section>

          {/* Card 2: DarexAI Branding Banner */}
          <section className="glass-panel p-4 flex flex-col items-center">
            <h3 className="mb-2 text-xs font-semibold text-jarvis-text self-start">DarexAI Company Banner</h3>
            <div className="relative group overflow-hidden rounded-lg border border-jarvis-border/60 shadow-md">
              <img 
                src="/aditya_image_2.png" 
                alt="DarexAI Banner" 
                className="w-full max-w-sm transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          </section>

          {/* Social Links & Contact */}
          <section className="glass-panel p-5">
            <h2 className="mb-3.5 text-xs font-bold uppercase tracking-wider text-jarvis-muted">Get In Touch</h2>
            <div className="space-y-3">
              <a 
                href="https://github.com/addygeek" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg bg-jarvis-elevated/40 hover:bg-jarvis-elevated/80 border border-jarvis-border/40 hover:border-jarvis-border p-2.5 transition text-xs group"
              >
                <div className="flex items-center gap-2.5 text-jarvis-text">
                  <Github className="h-4 w-4 text-jarvis-muted group-hover:text-jarvis-text transition" />
                  <span>GitHub Profile</span>
                </div>
                <span className="text-[10px] text-jarvis-muted group-hover:text-jarvis-accent font-mono transition">/addygeek ↗</span>
              </a>

              <a 
                href="https://www.linkedin.com/in/aditya-kumar-learner/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg bg-jarvis-elevated/40 hover:bg-jarvis-elevated/80 border border-jarvis-border/40 hover:border-jarvis-border p-2.5 transition text-xs group"
              >
                <div className="flex items-center gap-2.5 text-jarvis-text">
                  <Linkedin className="h-4 w-4 text-jarvis-muted group-hover:text-jarvis-text transition" />
                  <span>LinkedIn Profile</span>
                </div>
                <span className="text-[10px] text-jarvis-muted group-hover:text-jarvis-accent font-mono transition">/in/aditya-kumar-learner ↗</span>
              </a>

              <div className="border-t border-jarvis-border/40 mt-4 pt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-jarvis-subtle">
                  <Mail className="h-3.5 w-3.5 text-jarvis-muted" />
                  <span>aditya@darexai.com</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-jarvis-subtle">
                  <Phone className="h-3.5 w-3.5 text-jarvis-muted" />
                  <span>+91 9119267828</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-jarvis-subtle">
                  <Globe className="h-3.5 w-3.5 text-jarvis-muted" />
                  <a href="https://darexai.com" target="_blank" rel="noopener noreferrer" className="hover:text-jarvis-accent hover:underline">
                    darexai.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FocusItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-jarvis-elevated/30 border border-jarvis-border/20 p-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-jarvis-accent/10">
        <Icon className="h-3.5 w-3.5 text-jarvis-accent" />
      </div>
      <span className="text-[11px] font-medium leading-tight text-jarvis-subtle">{text}</span>
    </div>
  );
}
