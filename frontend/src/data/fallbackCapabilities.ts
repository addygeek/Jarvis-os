import type { AgentCapabilityCategory } from "@/types";

/** Static PRD + backend-shaped catalog when GET /api/agent/capabilities fails. */
export const FALLBACK_AGENT_CAPABILITIES: AgentCapabilityCategory[] = [
  {
    id: "browser",
    name: "Browser",
    capabilities: [
      {
        id: "browser-open-chrome",
        name: "Open Chrome",
        description: "Launch Google Chrome on your Mac.",
        category: "browser",
        examplePrompt: "Open Chrome",
        enabled: true,
      },
      {
        id: "browser-acl",
        name: "ACL Anthology",
        description: "Open Chrome and navigate to ACL Anthology.",
        category: "browser",
        examplePrompt: "Open Chrome and navigate to ACL Anthology",
        enabled: true,
      },
      {
        id: "browser-open-url",
        name: "Open URL",
        description: "Open any URL in your default browser.",
        category: "browser",
        examplePrompt: "Open https://arxiv.org in my browser",
        enabled: true,
      },
      {
        id: "browser-search",
        name: "Google search",
        description: "Search Google and open results in Chrome.",
        category: "browser",
        examplePrompt: "Search Google for multilingual healthcare NLP papers",
        enabled: true,
      },
      {
        id: "browser-safari",
        name: "Open Safari",
        description: "Launch Safari, optionally with a URL.",
        category: "browser",
        examplePrompt: "Open Safari to https://scholar.google.com",
        enabled: true,
      },
      {
        id: "browser-tabs",
        name: "Manage tabs",
        description: "List, switch, or close browser tabs.",
        category: "browser",
        examplePrompt: "List my open Chrome tabs and switch to the ACL tab",
        enabled: true,
      },
    ],
  },
  {
    id: "files",
    name: "Files",
    capabilities: [
      {
        id: "files-summarize-downloads",
        name: "Summarize Downloads",
        description: "List and summarize everything in Downloads.",
        category: "files",
        examplePrompt: "Summarize everything in my Downloads folder",
        enabled: true,
      },
      {
        id: "files-find-paper",
        name: "Find AACL paper",
        description: "Search Desktop, Downloads, and Documents by name.",
        category: "files",
        examplePrompt: "Find my AACL paper on the Desktop and in Downloads",
        enabled: true,
      },
      {
        id: "files-healthcare-pdfs",
        name: "Find healthcare PDFs",
        description: "Locate healthcare research PDFs across your Mac.",
        category: "files",
        examplePrompt: "Find all healthcare research PDFs on my Mac",
        enabled: true,
      },
      {
        id: "files-organize",
        name: "Organize Downloads",
        description: "Scan, classify, and move files into folders.",
        category: "files",
        examplePrompt: "Organize my Downloads folder by file type",
        enabled: true,
      },
      {
        id: "files-list-downloads",
        name: "List Downloads",
        description: "Show files in your Downloads folder.",
        category: "files",
        examplePrompt: "What's in my Downloads folder?",
        enabled: true,
      },
      {
        id: "files-scan-pdfs",
        name: "Scan for PDFs",
        description: "Find PDF files in a folder with metadata.",
        category: "files",
        examplePrompt: "Find PDF files in Downloads",
        enabled: true,
      },
      {
        id: "files-deep-scan",
        name: "Deep folder scan",
        description: "Recursively scan a folder for large or old files.",
        category: "files",
        examplePrompt: "Scan my Desktop for large files over 100MB",
        enabled: true,
      },
      {
        id: "files-read",
        name: "Read file",
        description: "Read a text file from disk.",
        category: "files",
        examplePrompt: "Read ~/Documents/notes.txt",
        enabled: true,
      },
      {
        id: "files-move",
        name: "Move & rename",
        description: "Move or rename files safely.",
        category: "files",
        examplePrompt: "Move all PDFs from Desktop to ~/Documents/Papers",
        enabled: true,
      },
    ],
  },
  {
    id: "apps",
    name: "Apps",
    capabilities: [
      {
        id: "apps-chrome",
        name: "Launch Chrome",
        description: "Open Google Chrome.",
        category: "apps",
        examplePrompt: "Open Chrome",
        enabled: true,
      },
      {
        id: "apps-vscode",
        name: "Open VS Code",
        description: "Launch VS Code on a project folder.",
        category: "apps",
        examplePrompt: "Open VS Code in ~/Coding/test/google gemini",
        enabled: true,
      },
      {
        id: "apps-slack",
        name: "Open Slack",
        description: "Bring Slack to the foreground.",
        category: "apps",
        examplePrompt: "Open Slack",
        enabled: true,
      },
      {
        id: "apps-terminal",
        name: "Focus Terminal",
        description: "Switch to Terminal and focus the front window.",
        category: "apps",
        examplePrompt: "Switch to Terminal and focus the front window",
        enabled: true,
      },
      {
        id: "apps-open-file",
        name: "Open file in app",
        description: "Launch an app with a specific file.",
        category: "apps",
        examplePrompt: "Open my thesis draft in VS Code",
        enabled: true,
      },
    ],
  },
  {
    id: "system",
    name: "System",
    capabilities: [
      {
        id: "system-cleanup",
        name: "Clean desktop",
        description: "Tidy Desktop and Downloads with a summary report.",
        category: "system",
        examplePrompt: "Clean my desktop and group loose files into folders",
        enabled: true,
      },
      {
        id: "system-dark-mode",
        name: "Dark mode",
        description: "Enable or disable macOS dark mode.",
        category: "system",
        examplePrompt: "Turn on dark mode",
        enabled: true,
      },
      {
        id: "system-volume",
        name: "Set volume",
        description: "Set macOS output volume (0–100%).",
        category: "system",
        examplePrompt: "Set volume to 50%",
        enabled: true,
      },
      {
        id: "system-wifi",
        name: "WiFi settings",
        description: "Open Network Wi-Fi preferences.",
        category: "system",
        examplePrompt: "Open WiFi settings",
        enabled: true,
      },
      {
        id: "system-git",
        name: "Git status",
        description: "Run git status in a project directory.",
        category: "system",
        examplePrompt: "Run git status in my JarvisOS project",
        enabled: true,
      },
      {
        id: "system-node",
        name: "Check Node version",
        description: "Run node -v in the terminal.",
        category: "system",
        examplePrompt: "Check node version in terminal",
        enabled: true,
      },
    ],
  },
  {
    id: "research",
    name: "Research",
    capabilities: [
      {
        id: "research-read-pdf",
        name: "Read PDF",
        description: "Extract text from a PDF document.",
        category: "research",
        examplePrompt: "Read the latest healthcare PDF in Downloads",
        enabled: true,
      },
      {
        id: "research-summarize-pdf",
        name: "Summarize PDF",
        description: "Summarize a single PDF with key points.",
        category: "research",
        examplePrompt: "Summarize ~/Downloads/paper.pdf",
        enabled: true,
      },
      {
        id: "research-summarize-five",
        name: "Summarize five PDFs",
        description: "Summarize multiple papers with gaps and findings.",
        category: "research",
        examplePrompt: "Summarize these five PDFs and list research gaps",
        enabled: true,
      },
      {
        id: "research-find",
        name: "Find research papers",
        description: "Locate papers by topic across Desktop and Downloads.",
        category: "research",
        examplePrompt: "Find all ACL papers on my Mac",
        enabled: true,
      },
      {
        id: "research-deck",
        name: "Build deck",
        description: "Generate a presentation from notes or papers.",
        category: "research",
        examplePrompt: "Create a 10-slide deck from my ACL paper summary",
        enabled: false,
      },
    ],
  },
  {
    id: "productivity",
    name: "Productivity",
    capabilities: [
      {
        id: "prod-notes-create",
        name: "Create note",
        description: "Save a note in Jarvis knowledge base.",
        category: "productivity",
        examplePrompt: "Create a note titled Meeting prep with today's agenda",
        enabled: true,
      },
      {
        id: "prod-notes-search",
        name: "Search notes",
        description: "Search saved notes by title, body, or tags.",
        category: "productivity",
        examplePrompt: "Search my notes for transformer architecture",
        enabled: true,
      },
      {
        id: "prod-calendar",
        name: "Create meeting",
        description: "Create a Calendar event.",
        category: "productivity",
        examplePrompt: "Create a calendar event tomorrow at 2pm titled Lab sync",
        enabled: true,
      },
      {
        id: "prod-email",
        name: "Draft email",
        description: "Draft an email in Mail or save as .eml.",
        category: "productivity",
        examplePrompt: "Draft an email to my advisor summarizing today's progress",
        enabled: true,
      },
    ],
  },
  {
    id: "presentations",
    name: "Presentations",
    capabilities: [
      {
        id: "pres-create",
        name: "Create presentation",
        description: "Generate an HTML slide deck in JarvisOS folder.",
        category: "presentations",
        examplePrompt: "Create a presentation about neural retrieval",
        enabled: true,
      },
      {
        id: "pres-list",
        name: "List presentations",
        description: "List saved presentation folders.",
        category: "presentations",
        examplePrompt: "Show my saved presentations",
        enabled: true,
      },
    ],
  },
  {
    id: "tasks",
    name: "Multi-step tasks",
    capabilities: [
      {
        id: "tasks-chrome-acl",
        name: "Chrome + ACL search",
        description: "Plan and run a multi-step browser task.",
        category: "tasks",
        examplePrompt:
          "Open Chrome and navigate to ACL Anthology, then search for my paper title",
        enabled: true,
      },
      {
        id: "tasks-organize-summarize",
        name: "Organize then summarize",
        description: "Organize a folder then summarize PDFs found.",
        category: "tasks",
        examplePrompt: "Organize Downloads then summarize any new PDFs",
        enabled: true,
      },
      {
        id: "tasks-reminder",
        name: "Save reminder",
        description: "Record a follow-up task as a note.",
        category: "tasks",
        examplePrompt: "Remind me to email the professor tomorrow",
        enabled: true,
      },
    ],
  },
];

/** Quick-launch chips shown at top of Agent page and in Chat examples. */
export const QUICK_AGENT_EXAMPLES = [
  { label: "Open Chrome", prompt: "Open Chrome" },
  { label: "ACL Anthology", prompt: "Open Chrome and navigate to ACL Anthology" },
  { label: "Summarize Downloads", prompt: "Summarize everything in my Downloads folder" },
  { label: "Find healthcare PDFs", prompt: "Find all healthcare research PDFs on my Mac" },
  { label: "Organize Downloads", prompt: "Organize my Downloads folder by file type" },
  { label: "Clean desktop", prompt: "Clean my desktop and group loose files into folders" },
  { label: "Open VS Code", prompt: "Open VS Code in ~/Coding/test/google gemini" },
  { label: "Dark mode", prompt: "Turn on dark mode" },
  { label: "Volume 50%", prompt: "Set volume to 50%" },
  { label: "Draft email", prompt: "Draft an email to my advisor summarizing today's progress" },
  { label: "Create meeting", prompt: "Create a calendar event tomorrow at 2pm titled Team standup" },
  { label: "Git status", prompt: "Run git status in my JarvisOS project" },
  { label: "Search notes", prompt: "Search my notes for ACL submission" },
  { label: "Open Slack", prompt: "Open Slack" },
  { label: "Google search", prompt: "Search Google for transformer attention papers" },
] as const;

export function countCapabilities(categories: AgentCapabilityCategory[]): number {
  return categories.reduce((n, c) => n + c.capabilities.length, 0);
}

export function filterCapabilities(
  categories: AgentCapabilityCategory[],
  query: string,
): AgentCapabilityCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return categories;

  return categories
    .map((cat) => ({
      ...cat,
      capabilities: cat.capabilities.filter(
        (cap) =>
          cap.name.toLowerCase().includes(q) ||
          cap.description.toLowerCase().includes(q) ||
          cap.examplePrompt.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q),
      ),
    }))
    .filter((cat) => cat.capabilities.length > 0);
}
