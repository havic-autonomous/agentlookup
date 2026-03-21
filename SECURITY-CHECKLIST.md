# AgentLookup.ai — Periodieke Security Checklist

## Wekelijks (elke woensdag, cron job)

### 1. Secrets Scan
- [ ] Geen private keys in source code: `grep -rn "0x[0-9a-fA-F]\{64\}" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next`
- [ ] Geen hardcoded API keys: `grep -rn "gp_live_[a-f0-9]\{32\}" --include="*.ts" --exclude-dir=node_modules`
- [ ] Geen hardcoded passwords: `grep -rn "password.*=.*['\"][^'\"]*['\"]" --include="*.ts" --exclude-dir=node_modules`
- [ ] Geen .env files buiten .gitignore: `find . -name ".env*" -not -path "*/node_modules/*"`
- [ ] Geen .gpg/.pem/.key files in repo: `find . \( -name "*.gpg" -o -name "*.pem" -o -name "*.key" \) -not -path "*/node_modules/*"`
- [ ] Geen server IPs in publishable code: `grep -rn "44\.239\|3\.6\.17\|16\.16\|lightsail" --include="*.ts" --include="*.md" --exclude-dir=node_modules`

### 2. Security Headers (via curl)
- [ ] Content-Security-Policy aanwezig: `curl -sI https://agentlookup.ai/ | grep -i content-security`
- [ ] X-Frame-Options: DENY: `curl -sI https://agentlookup.ai/ | grep -i x-frame`
- [ ] X-Content-Type-Options: nosniff: `curl -sI https://agentlookup.ai/ | grep -i x-content-type`
- [ ] Referrer-Policy aanwezig: `curl -sI https://agentlookup.ai/ | grep -i referrer-policy`
- [ ] Permissions-Policy aanwezig: `curl -sI https://agentlookup.ai/ | grep -i permissions-policy`

### 3. SSL/TLS
- [ ] SSL geldig en >14 dagen resterend (voor agentlookup.ai)
- [ ] SSL geldig en >14 dagen resterend (voor paisatulna.in)

### 4. Auth & Rate Limiting
- [ ] Login rate limit actief: test 6+ login attempts in 15 min → moet 429 geven
- [ ] Register rate limit actief: test 4+ registrations in 1 uur → moet 429 geven
- [ ] API key generation limit: max 10/dag per user

### 5. Database
- [ ] .db files NIET in git tracked: `git ls-files | grep -i "\.db"`
- [ ] Admin password is auto-generated (niet hardcoded)
- [ ] Alle SQL queries parameterized (geen string concatenation)

### 6. Infrastructure
- [ ] UFW firewall actief op alle servers
- [ ] SSH key-only auth (geen password login)
- [ ] Nginx security headers in config
- [ ] fail2ban actief

### 7. Dependency Audit
- [ ] `npm audit` in app/ — check for critical vulnerabilities
- [ ] `npm audit` in contracts/ — check for critical vulnerabilities

## Maandelijks

### 8. .gitignore Review
- [ ] Alle interne docs nog excluded (summary.md, deploy.sh, research/, etc.)
- [ ] Geen nieuwe secret files buiten .gitignore

### 9. API Key Rotation
- [ ] Overweeg rotation van production API keys
- [ ] Check of er ongebruikte API keys zijn → revoke

### 10. Contract Security
- [ ] Check deployer wallet balance (niet leeggehaald)
- [ ] Check contract ownership (niet overgedragen)
- [ ] Monitor on-chain events voor onverwachte registraties
