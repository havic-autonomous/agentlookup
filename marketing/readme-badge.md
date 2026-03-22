# README Badge System

## Badge Concept

Een markdown badge die developers in hun eigen repository README kunnen plaatsen om te laten zien dat hun agent op AgentLookup staat.

## Badge Markdown
```markdown
[![Listed on AgentLookup](https://agentlookup.ai/badge/YOUR-SLUG.svg)](https://agentlookup.ai/agent/YOUR-SLUG)
```

## Implementation Details

### SVG Endpoint
- **URL pattern**: `https://agentlookup.ai/badge/{agent-slug}.svg`
- **Dynamic generation**: Badge toont agent naam + trust score
- **Caching**: Browser cache voor performance, server cache voor kostenbesparing

### Badge Design
- **Style**: Clean, professional, GitHub-badges compatible
- **Colors**: 
  - Background: #1a1a1a (dark) of #f6f8fa (light) 
  - Text: White of dark gray
  - Accent: AgentLookup brand color (#00ff88 of vergelijkbaar)
- **Content**: "Listed on AgentLookup" + optionele trust score indicator

### Badge Variations
1. **Basic**: Alleen "Listed on AgentLookup"
2. **With Score**: "AgentLookup | Trust: 4.8/5"
3. **Status**: "AgentLookup | Verified" (voor volledig geverifieerde agents)

### Technical Implementation
```typescript
// Endpoint: GET /badge/:slug.svg
// Returns: SVG image with agent status
// Fallback: Generic "Listed" badge als agent niet bestaat
```

### Security Considerations
- **Rate limiting**: Prevent badge-farming attacks
- **Cache invalidation**: Update badge when agent status changes
- **Fallback handling**: Graceful degradation als agent niet meer bestaat

### Developer Experience

#### Auto-generation
Na registratie krijgen developers automatisch de badge code:

```
🎉 Agent registered successfully!

Add this badge to your README:
[![Listed on AgentLookup](https://agentlookup.ai/badge/my-agent.svg)](https://agentlookup.ai/agent/my-agent)
```

#### Documentation
- Badge generator tool op website
- Verschillende formats (Markdown, HTML, reStructuredText)
- Preview met verschillende GitHub themes (light/dark)

## Marketing Value
- **Viral coefficient**: Elke README met badge = gratis marketing
- **Social proof**: Developers zien AgentLookup in andere repos
- **Quality signal**: Badge impliceert kwaliteit/legitimiteit
- **Network effects**: Meer badges = meer awareness = meer adoptie

## Analytics Opportunities
- Track badge click-through rates
- Identify most popular agents (meeste badge clicks)
- Measure conversion from badge view to registration
- A/B test badge designs voor betere CTR

## Competitive Analysis
Vergelijkbaar met:
- npm package download badges
- GitHub workflow status badges  
- Code coverage badges
- License badges

Verschil: Onze badge linkt naar ons platform, niet naar statische info.