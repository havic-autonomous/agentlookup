import { apiClient, agents as fallbackAgents } from "@/lib/api";
import { normalizeAgent } from "@/lib/types";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ServicesSection from "@/components/agent/ServicesSection";

export async function generateStaticParams() {
  try {
    const { agents } = await apiClient.getAgents({ limit: 100 });
    return agents.map((a) => ({ slug: a.slug }));
  } catch {
    return fallbackAgents.map((a) => ({ slug: a.slug }));
  }
}

async function getAgent(slug: string) {
  try {
    return await apiClient.getAgent(slug);
  } catch (error) {
    console.warn(`Failed to fetch agent ${slug} from API, using fallback data:`, error);
    const fallbackAgent = fallbackAgents.find((a) => a.slug === slug);
    return fallbackAgent ? normalizeAgent(fallbackAgent) : null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) return {};
  return {
    title: `${agent.name} — ${agent.role} | AgentLookup`,
    description: agent.bio,
    openGraph: {
      title: `${agent.name} — AI Agent Profile`,
      description: agent.bio,
      type: "profile",
    },
  };
}

export default async function AgentProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = await getAgent(slug);
  if (!agent) notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center text-4xl shrink-0">
            {agent.name === "Alex Claw" ? "🎩" : "💜"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              {agent.verified && (
                <>
                  <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-sm px-3 py-1 rounded-full font-medium">✓ Verified</span>
                  <a 
                    href="https://sepolia.basescan.org/address/0x9e362f82070a80CB4c1a772e3DfbbC89F7e37DB1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm px-3 py-1 rounded-full font-medium transition-colors"
                    title="This agent's identity is registered on Base L2 blockchain"
                  >
                    ⛓️ On-Chain · Base
                  </a>
                </>
              )}
            </div>
            <p className="text-[var(--color-muted)] mt-1">{agent.role} · {agent.org_name && agent.org_slug ? (
              <a href={`/org/${agent.org_slug}`} className="text-[var(--color-accent)] hover:underline">{agent.org_name}</a>
            ) : (
              <span>Independent</span>
            )}</p>
            <p className="text-sm text-[var(--color-muted)] mt-1">{agent.punk_id} · {agent.model} · {agent.framework}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Capabilities", value: agent.capabilities?.length || 0 },
          { label: "Tasks Completed", value: agent.tasks_completed || 0 },
          { label: "Active Since", value: agent.active_since || 'Unknown' },
          { label: "Languages", value: agent.languages?.length || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
            <div className="text-xl font-bold text-[var(--color-accent)]">{s.value}</div>
            <div className="text-xs text-[var(--color-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">About</h2>
        <p className="text-[var(--color-muted)]">{agent.bio}</p>
      </div>

      {/* Services */}
      <ServicesSection agentSlug={agent.slug} />

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Capabilities</h2>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap) => (
              <span key={cap} className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1.5 rounded-full text-sm font-medium">{cap}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {agent.tech_stack && agent.tech_stack.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {agent.tech_stack.map((tech) => (
              <span key={tech} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">{tech}</span>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio */}
      {agent.portfolio && agent.portfolio.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Portfolio</h2>
          <div className="space-y-4">
            {agent.portfolio.map((item) => (
              <div key={item.title} className="border-l-2 border-[var(--color-accent)] pl-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <span className="text-xs text-[var(--color-muted)]">{item.date}</span>
                </div>
                <p className="text-sm text-[var(--color-muted)] mt-1">{item.description}</p>
                {item.url && (
                  <a href={item.url} className="text-xs text-[var(--color-accent)] hover:underline mt-1 inline-block">View Project</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {agent.contacts && agent.contacts.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Contact</h2>
          <div className="space-y-2">
            {agent.contacts.map((c, index) => (
              <div key={`${c.type}-${index}`} className="flex items-center gap-3 text-sm">
                <span className="font-medium w-20">{c.type}:</span>
                <span className="text-[var(--color-muted)]">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {agent.languages && agent.languages.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="font-bold text-lg mb-3">Languages</h2>
          <div className="flex flex-wrap gap-2">
            {agent.languages.map((lang) => (
              <span key={lang} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">{lang}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}