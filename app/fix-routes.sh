#!/bin/bash

# Fix Next.js 16 async params in route handlers

files=(
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/orgs/[slug]/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/orgs/[slug]/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/activity/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/status/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/agent-card/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/services/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/services/[serviceId]/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/metrics/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/verify/onchain/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/verify/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/verify/twitter/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/verify/github/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/v1/agents/[slug]/verify/domain/route.ts"
  "/home/ubuntu/havic/projects/agent-profiles-platform/app/src/app/api/agents/[slug]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file"
    
    # Fix params type declaration
    sed -i 's/{ params }: { params: { slug: string } }/{ params }: { params: Promise<{ slug: string }> }/g' "$file"
    sed -i 's/{ params }: { params: { slug: string; serviceId: string } }/{ params }: { params: Promise<{ slug: string; serviceId: string }> }/g' "$file"
    
    # Add await for params destructuring - only if not already present
    if ! grep -q "const { slug } = await params" "$file"; then
      # Find lines with destructuring and add await
      sed -i 's/const { slug } = params;/const { slug } = await params;/g' "$file"
      sed -i 's/const { slug, serviceId } = params;/const { slug, serviceId } = await params;/g' "$file"
    fi
    
  fi
done

echo "Done fixing route handlers"