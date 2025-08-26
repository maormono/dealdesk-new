# Multi-Tenant Platform Analysis Instructions

## Project Vision & Context

We have an existing sales service application built with Supabase that we want to transform into a **multi-tenant, AI-native business automation platform**. The key goals are:

1. **Multi-Tenant Architecture**: Support multiple businesses/organizations with complete data isolation
2. **Modular Service Design**: Separate services for Sales, Finance, Operations, each potentially maintained by different AI coding sessions
3. **AI-First Development**: Optimize the codebase structure for AI coding tools (Claude Code, Cursor, etc.)
4. **Git Repository Strategy**: Enable parallel development with separate repositories or Git worktrees for each service
5. **Scalable to SMBs**: Build a platform that small businesses can afford while delivering enterprise capabilities

### Why This Architecture Matters

**The Problem**: AI coding tools struggle with large, monolithic codebases. They work best with:
- **Smaller context windows** (under 100k tokens per service)
- **Clear service boundaries** (one AI agent per business domain)
- **Independent deployment units** (each service can be updated separately)
- **Clean separation of concerns** (AI can understand each service's purpose clearly)

**The Solution**: A modular architecture where each business function (Sales, Finance, Operations) is a separate service that can be developed by independent AI coding sessions, while sharing common infrastructure.

## Your Task

Analyze the existing codebase and infrastructure to provide a comprehensive gap analysis for converting this single-tenant sales application into a multi-tenant, multi-service business automation platform with optimal Git structure for AI development.

## Analysis Areas

### 1. Git Repository Structure Analysis

**Current Structure Assessment:**

```bash
# Analyze current Git setup
git remote -v
git branch -a
git log --oneline -10

# Check repository size and complexity
git count-objects -vH
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l

# Identify potential service boundaries
find . -type d -maxdepth 3 | grep -E "(sales|finance|operations|admin|api|services|features)"

# Check for existing monorepo tools
ls -la | grep -E "(turbo.json|nx.json|lerna.json|rush.json|pnpm-workspace.yaml)"
```

**Questions to answer:**
1. Is this currently a monorepo or single repository?
2. How large is the codebase (files, lines of code)?
3. Can the code be naturally split into services?
4. Are there clear module boundaries already?
5. Would a monorepo with packages work, or do we need separate repositories?

### 2. Service Separation Feasibility

**Identify natural service boundaries:**

```bash
# Look for domain-specific code
find . -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "invoice\|payment\|billing" | head -20
find . -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "shipping\|fedex\|ups\|logistics" | head -20
find . -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "quote\|pricing\|customer\|lead" | head -20

# Check for shared dependencies
grep -h "import.*from" $(find . -name "*.ts" -o -name "*.tsx") | grep -E "\.\.\/|@\/|~\/" | sort | uniq -c | sort -rn | head -20

# Identify tightly coupled code
find . -type f -name "*.ts" -o -name "*.tsx" -exec grep -l "sales" {} \; | xargs grep -l "invoice\|shipping"
```

**Questions to answer:**
1. What code is truly sales-specific?
2. What code would be shared across all services?
3. What are the main dependencies between modules?
4. Can we extract clean interfaces between services?
5. What would be the ideal service boundaries?

### 3. Proposed Git Strategy Evaluation

**We're considering three approaches:**

#### Option A: Monorepo with Turborepo
```
platform/
├── apps/
│   ├── admin-portal/
│   ├── tenant-portal/
│   └── api-gateway/
├── services/          # Each service is a package
│   ├── sales/
│   ├── finance/
│   └── operations/
├── packages/          # Shared code
│   ├── database/
│   ├── auth/
│   └── ui/
└── turbo.json
```

#### Option B: Polyrepo with Separate Services
```
platform-core/         # Main repository
platform-sales/        # Separate repo
platform-finance/      # Separate repo
platform-operations/   # Separate repo
platform-shared/       # Shared packages repo
```

#### Option C: Hybrid with Git Submodules
```
platform/
├── core/             # Main app
├── services/         # Git submodules
│   ├── sales/       (submodule)
│   ├── finance/     (submodule)
│   └── operations/  (submodule)
└── shared/          (submodule)
```

**Evaluate which approach based on:**
1. Current code coupling
2. Team structure (will different people work on different services?)
3. Deployment requirements
4. CI/CD complexity
5. AI coding tool compatibility

### 4. AI Development Optimization

**Assess AI-friendliness of current code:**

```bash
# Check file sizes (AI tools struggle with large files)
find . -type f -name "*.ts" -o -name "*.tsx" -exec wc -l {} \; | sort -rn | head -20

# Look for good documentation for AI context
find . -name "README.md" -o -name "*.md" | xargs wc -l

# Check for existing AI-friendly patterns
find . -type d -name ".claude" -o -name ".cursor" -o -name ".github"
ls -la | grep -E "(claude.md|cursor.md|.cursorrules|.clauude)"

# Identify complex business logic that needs documentation
find . -type f -name "*.ts" -exec grep -l "calculate\|process\|transform\|validate" {} \; | head -20
```

**Questions to answer:**
1. Are there huge files that need splitting?
2. Is business logic well-documented for AI understanding?
3. Are there clear patterns AI can follow?
4. What context would each AI agent need?
5. How can we optimize for parallel AI development?

### 5. Database Architecture for Multi-Service

**Analyze data dependencies:**

```sql
-- Check table relationships and foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';

-- Identify potential service-specific tables
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

**Questions to answer:**
1. Can database tables be cleanly assigned to services?
2. What tables would be shared across services?
3. Are there cross-service foreign keys?
4. Should each service have its own schema?
5. How would we handle cross-service data queries?

### 6. Development Workflow Analysis

**Understand current development process:**

```bash
# Check for existing development scripts
cat package.json | grep -A 20 '"scripts"'

# Look for environment configuration
ls -la .env* 
find . -name "*.env.example" -o -name "*.env.template"

# Check for existing CI/CD
ls -la .github/workflows/
ls -la .gitlab-ci.yml .circleci bitbucket-pipelines.yml

# Development tools
cat package.json | grep -E "(turbo|nx|lerna|concurrently|npm-run-all)"
```

**Questions to answer:**
1. How do developers currently run the app locally?
2. Can multiple services run simultaneously?
3. How are environment variables managed?
4. What would need to change for multi-service development?
5. How would AI agents test their changes?

## Service Architecture Design

### Proposed Service Breakdown

#### Core Platform Services
```typescript
// platform-core/
- Authentication & Authorization
- Tenant Management
- User Management  
- API Gateway
- Shared UI Components
```

#### Sales Service (Existing)
```typescript
// platform-sales/
- Quote Management
- Customer Management
- Pricing Engine
- Sales Reports
- CRM Integration
```

#### Finance Service (New)
```typescript
// platform-finance/
- Invoice Management
- Payment Processing
- Tax Calculations
- Financial Reports
- Accounting Integration
```

#### Operations Service (New)
```typescript
// platform-operations/
- Shipping Management (FedEx/UPS)
- Inventory Tracking
- Order Fulfillment
- Logistics Optimization
- Warehouse Integration
```

### Git Workflow for AI Development

**Proposed workflow for parallel AI development:**

```bash
# Developer/AI Agent 1 works on Finance
git worktree add ../platform-finance-feature feature/add-invoicing
cd ../platform-finance-feature
# Run Claude Code or Cursor here

# Developer/AI Agent 2 works on Operations  
git worktree add ../platform-operations-feature feature/add-shipping
cd ../platform-operations-feature
# Run separate AI session here

# Main developer reviews and merges
git worktree list
# Review changes from each service
```

## Gap Analysis Report Template

Please provide your findings in this format:

```markdown
# Multi-Tenant Platform Gap Analysis Report

## Current State Summary
- Repository Type: [Monorepo/Single/Poly]
- Framework: [e.g., Next.js 14]
- Database: Supabase (PostgreSQL)
- Lines of Code: [Total]
- Number of Files: [Count]
- Key Features: [List main features]

## Git Repository Strategy Recommendation

### Current Repository Structure
```
[Show current structure]
```

### Recommended Repository Strategy
- [ ] Option A: Monorepo with Turborepo (if code is tightly coupled)
- [ ] Option B: Polyrepo (if services are independent)
- [ ] Option C: Hybrid with Git Submodules (if mixed coupling)

### Justification
[Explain why this approach is best for your codebase]

### Migration Path
1. [Step 1 for Git restructuring]
2. [Step 2]
3. [Step 3]

## Service Separation Analysis

### Identified Service Boundaries
```
sales/
  ├── Features that stay in sales
  └── Features to extract

finance/ (new)
  ├── Features to build
  └── Shared dependencies

operations/ (new)
  ├── Features to build
  └── Integration points
```

### Code Extraction Complexity
| Service | Files to Move | Lines of Code | Complexity | Hours |
|---------|--------------|---------------|------------|-------|
| Sales   | X files      | Y lines       | Low/Med/High | Z    |
| Finance | New          | New           | N/A        | Z    |
| Operations | New       | New           | N/A        | Z    |

### Shared Code Analysis
```
packages/shared/
  ├── UI Components: [list]
  ├── Utilities: [list]
  ├── Types: [list]
  └── Database: [list]
```

## AI Development Readiness

### Current AI-Friendliness Score: X/10

### Issues for AI Development
1. **Large Files**: [List files over 500 lines]
2. **Missing Documentation**: [Areas lacking context]
3. **Complex Dependencies**: [Tightly coupled code]
4. **Unclear Patterns**: [Inconsistent code styles]

### AI Optimization Requirements
- [ ] Split large files into smaller modules
- [ ] Add comprehensive documentation
- [ ] Create .claude/rules for each service
- [ ] Define clear interfaces between services
- [ ] Establish consistent patterns

### Recommended AI Workflow
```bash
# Example commands for AI agents to run each service
```

## Database Multi-Service Strategy

### Service-Specific Tables
```sql
-- Sales Schema
sales.quotes
sales.customers
sales.products

-- Finance Schema  
finance.invoices
finance.payments
finance.tax_rules

-- Operations Schema
operations.shipments
operations.inventory
operations.warehouses
```

### Shared Tables
```sql
public.tenants
public.users
public.audit_logs
```

### Cross-Service Communication
[How services will share data]

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Add tenant support to existing code
- [ ] Implement basic RLS
- [ ] Set up Git repository structure
- [ ] Create shared packages

### Phase 2: Service Extraction (Week 3-4)
- [ ] Extract sales service
- [ ] Set up service communication
- [ ] Configure development environment
- [ ] Test multi-service setup

### Phase 3: New Services (Week 5-6)
- [ ] Build finance service structure
- [ ] Build operations service structure
- [ ] Implement service APIs
- [ ] Add AI integration points

## Repository Structure Decision

### If Monorepo (Recommended if coupling > 30%)
```yaml
# turbo.json configuration needed
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

### If Polyrepo (Recommended if coupling < 30%)
```bash
# Repository creation script
#!/bin/bash
repos=(
  "platform-core"
  "platform-sales"
  "platform-finance"
  "platform-operations"
  "platform-shared"
)

for repo in "${repos[@]}"; do
  gh repo create my-org/$repo --private
  # Setup code
done
```

## AI Agent Instructions

### For Sales Service AI Agent
```markdown
# .claude/sales-service.md
You are working on the sales service...
[Context specific to sales]
```

### For Finance Service AI Agent
```markdown
# .claude/finance-service.md
You are working on the finance service...
[Context specific to finance]
```

### For Operations Service AI Agent
```markdown
# .claude/operations-service.md
You are working on the operations service...
[Context specific to operations]
```

## Risk Assessment

### Git Restructuring Risks
- **High**: [List high-risk changes]
- **Medium**: [List medium-risk changes]
- **Low**: [List low-risk changes]

### Mitigation Strategies
1. [How to handle each risk]

## Estimated Timeline

### Git Restructuring
- Planning: [X days]
- Implementation: [Y days]
- Testing: [Z days]

### Service Development (Parallel with AI)
- Sales Service (existing): [X days to refactor]
- Finance Service (new): [Y days to build]
- Operations Service (new): [Z days to build]

## Next Steps

### Immediate Actions (Do Today)
1. [Specific action]
2. [Specific action]
3. [Specific action]

### Git Setup (Week 1)
1. [Repository setup steps]
2. [CI/CD configuration]
3. [Development environment]

### Service Extraction (Week 2)
1. [Extraction steps]
2. [Testing steps]
3. [Documentation steps]
```

## Additional Analysis Commands

### Repository Structure Analysis

```bash
# Analyze code coupling between potential services
#!/bin/bash

echo "=== Analyzing Code Coupling ==="

# Count cross-references between domains
echo "Sales -> Finance references:"
grep -r "invoice\|payment\|billing" $(find . -path "*sales*" -name "*.ts") | wc -l

echo "Sales -> Operations references:"  
grep -r "shipping\|delivery\|logistics" $(find . -path "*sales*" -name "*.ts") | wc -l

# Identify shared utilities
echo "=== Shared Code Analysis ==="
find . -path "*/utils/*" -o -path "*/lib/*" -o -path "*/helpers/*" | while read file; do
  echo "$file: $(grep -h "export" "$file" | wc -l) exports"
done

# Check for service-like structure already
echo "=== Existing Service Structure ==="
find . -type d -maxdepth 2 | while read dir; do
  ts_files=$(find "$dir" -maxdepth 1 -name "*.ts" -o -name "*.tsx" | wc -l)
  if [ $ts_files -gt 5 ]; then
    echo "$dir: $ts_files TypeScript files"
  fi
done
```

### Git Worktree Simulation

```bash
# Test if the codebase would work with Git worktrees
echo "=== Testing Git Worktree Compatibility ==="

# Check for absolute path dependencies
grep -r "$(pwd)" --include="*.ts" --include="*.json" --include="*.tsx"

# Check for hardcoded paths
grep -r "\.\.\/\.\.\/" --include="*.ts" --include="*.tsx" | head -20

# Verify no Git-specific dependencies
find . -name ".git" -type d | grep -v "^\.\/\.git$"
```

### AI Context Size Analysis

```bash
# Calculate context size for each potential service
echo "=== AI Context Window Analysis ==="

for domain in "sales" "finance" "operations" "admin"; do
  echo "Domain: $domain"
  find . -path "*${domain}*" -name "*.ts" -o -name "*.tsx" | xargs wc -c | tail -1
  echo "---"
done

# Find files too large for AI context
echo "=== Files Too Large for AI (>10KB) ==="
find . -name "*.ts" -o -name "*.tsx" -size +10k -exec ls -lh {} \;
```

## Final Instructions

1. **Analyze the current Git structure** and determine if it can be split
2. **Identify natural service boundaries** based on business logic
3. **Evaluate each Git strategy option** (monorepo vs polyrepo)
4. **Calculate the effort** to restructure for parallel AI development
5. **Provide specific examples** of how to split the code
6. **Create a migration script** for the chosen approach
7. **Document the workflow** for multiple AI agents
8. **Estimate timeline** for the complete transformation

## Critical Success Factors

The solution must enable:
- **Parallel AI Development**: Multiple Claude Code/Cursor instances working simultaneously
- **Clean Service Boundaries**: Each AI agent understands its domain completely
- **Independent Deployment**: Services can be updated without affecting others
- **Shared Infrastructure**: Common auth, database, UI components
- **Rapid Development**: AI agents can build new features quickly
- **Easy Testing**: Each service can be tested in isolation
- **Simple Local Development**: Developers can run any combination of services

This analysis will determine whether we can successfully transform the application into an AI-native, multi-tenant platform that can be developed efficiently using AI coding tools.