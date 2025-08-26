// Test script to demonstrate the Deal Companion functionality

console.log(`
================================================================================
DEAL COMPANION TEST SCENARIOS
================================================================================

The Deal Review now acts as your companion to optimize deals until profitable!

SCENARIO 1: Unprofitable Deal
----------------------------
Input: "1000 SIMs in UK, Belgium and Netherlands, 1GB at €1.50/month"

Expected: The companion will:
- Calculate it's not profitable
- Suggest specific fixes:
  * Increase price to €X.XX
  * Remove expensive countries
  * Add usage limits (e.g., "80% Netherlands, 20% roaming")
  * Increase volume for better rates

SCENARIO 2: Adding Usage Limits
-------------------------------
Input: "Add 70% Netherlands usage limit"

Expected: The companion will:
- Recalculate with weighted costs (70% NL rates, 30% average of others)
- Show improved margin
- Suggest further optimizations if still not profitable

SCENARIO 3: Iterative Optimization
----------------------------------
Flow:
1. "500 SIMs Belgium and UK, 2GB at €3"
2. If not profitable → "Remove UK"
3. If still not profitable → "Change price to €4"
4. If still not profitable → "Add 90% Belgium usage"
5. Continue until APPROVED ✅

SCENARIO 4: Volume Negotiation
------------------------------
Input: "What if we increase to 5000 SIMs?"

Expected: 
- Apply volume discounts
- Recalculate with better rates
- Show how volume improves margin

KEY FEATURES:
============
✓ Companion mindset - helps until deal is profitable
✓ Specific actionable suggestions
✓ Usage percentage calculations for cost optimization
✓ Remembers context for iterative improvements
✓ Clear "copy-paste" commands for quick actions

TRY IT NOW at http://localhost:5173 → Deal Review tab
================================================================================
`);