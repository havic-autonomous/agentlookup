import { apiClient, organizations as fallbackOrgs } from "@/lib/api";
import { normalizeOrganization } from "@/lib/types";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  try {
    const { organizations } = await apiClient.getOrganizations({ limit: 100 });
    return organizations.map((o) => ({ slug: o.slug }));
  } catch {
    return fallbackOrgs.map((o) => ({ slug: o.slug }));
  }
}

async function getOrganization(slug: string) {
  try {
    return await apiClient.getOrganization(slug);
  } catch (error) {
    console.warn(`Failed to fetch organization ${slug} from API, using fallback data:`, error);
    const fallbackOrg = fallbackOrgs.find((o) => o.slug === slug);
    return fallbackOrg ? normalizeOrganization(fallbackOrg) : null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganization(slug);
  if (!org) return {};
  return {
    title: `${org.name} — ${org.tagline} | AgentLookup`,
    description: org.description,
  };
}

export default async function OrgProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrganization(slug);
  if (!org) notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[var(--color-accent)]/10 rounded-lg flex items-center justify-center text-2xl shrink-0">🏢</div>
          <div>
            <h1 className="text-3xl font-bold">{org.name}</h1>
            <p className="text-[var(--color-muted)]">{org.tagline}</p>
            {org.website && (
              <a href={org.website} className="text-[var(--color-accent)] text-sm hover:underline mt-1 inline-block">{org.website}</a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-xl font-bold text-[var(--color-accent)]">{org.agents?.length || 0}</div>
          <div className="text-xs text-[var(--color-muted)]">Agents</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-xl font-bold text-[var(--color-accent)]">{org.founded || 'N/A'}</div>
          <div className="text-xs text-[var(--color-muted)]">Founded</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 text-center">
          <div className="text-xl font-bold text-[var(--color-accent)]">{org.sectors?.length || 0}</div>
          <div className="text-xs text-[var(--color-muted)]">Sectors</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
        <h2 className="font-bold text-lg mb-3">About</h2>
        <p className="text-[var(--color-muted)]">{org.description}</p>
        {org.sectors && org.sectors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {org.sectors.map((s) => (
              <span key={s} className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-sm">{s}</span>
            ))}
          </div>
        )}
      </div>

      {org.contact_email && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">Contact</h2>
          <p className="text-sm">
            <span className="font-medium">Email:</span>{' '}
            <a href={`mailto:${org.contact_email}`} className="text-[var(--color-accent)] hover:underline">
              {org.contact_email}
            </a>
          </p>
        </div>
      )}

      {org.agents && org.agents.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="font-bold text-lg mb-4">Agents ({org.agents.length})</h2>
          <div className="space-y-4">
            {org.agents.map((agent: any) => (
              <a key={agent.slug || agent} href={`/agent/${agent.slug || agent}`} className="flex items-start gap-4 p-4 rounded-lg hover:bg-[var(--color-bg)] transition">
                <div className="w-12 h-12 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center text-xl shrink-0">
                  {typeof agent === 'string' || agent.name === "Alex Claw" ? "🎩" : "💜"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{typeof agent === 'string' ? agent : agent.name}</h3>
                    {typeof agent !== 'string' && agent.verified && <span className="text-[var(--color-accent)] text-xs">✓ Verified</span>}
                  </div>
                  {typeof agent !== 'string' && (
                    <>
                      <p className="text-sm text-[var(--color-muted)]">{agent.role}</p>
                      <p className="text-sm mt-1">
                        {agent.bio && agent.bio.length > 120 ? `${agent.bio.substring(0, 120)}...` : agent.bio}
                      </p>
                      {agent.capabilities && agent.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.capabilities.slice(0, 3).map((cap: string) => (
                            <span key={cap} className="text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded-full">{cap}</span>
                          ))}
                          {agent.capabilities.length > 3 && (
                            <span className="text-xs text-[var(--color-muted)]">+{agent.capabilities.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}