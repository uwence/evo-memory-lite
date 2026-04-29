export class NormativeGating {
  /**
   * Evaluate a proposed action against core axioms.
   * In a real implementation without LLM calls inside this sync method, 
   * this would apply deterministic checks. Given our scope, we can simulate 
   * or implement a regex-based / rule-based gate, or just provide the structure.
   */
  evaluate(proposedAction, coreAxioms) {
    const axiomTrail = [];
    let approved = true;
    let reason = '';
    let correctionPrompt = null;

    // Parse the proposed action into a structured JSON object if it's a string
    let parsedAction = proposedAction;
    if (typeof proposedAction === 'string') {
       try {
          parsedAction = JSON.parse(proposedAction);
       } catch (e) {
          // Can't parse, treat as raw text
       }
    }

    // Example deep structured gating
    for (const axiom of coreAxioms) {
      if (axiom.type === 'Absolute Prohibition') {
        const checkStr = JSON.stringify(parsedAction).toLowerCase();
        const bannedKeys = axiom.keywords || [];
        for (const kw of bannedKeys) {
          if (checkStr.includes(kw.toLowerCase())) {
             approved = false;
             reason = `Action violates prohibition on keyword '${kw}'`;
             correctionPrompt = axiom.correction || `Please refine your tool call to avoid using forbidden term: ${kw}.`;
             axiomTrail.push(`[Rule ${axiom.id}: ${axiom.type}] -> Failed`);
             return { approved, reason, axiomTrail, correctionPrompt };
          }
        }
      } else if (axiom.type === 'Schema Constraint' && typeof parsedAction === 'object') {
        // Deep Tool-Call check
        // e.g. axiom = { type: 'Schema Constraint', target: 'command', matchPattern: 'rm -rf', correction: 'Do not use rm -rf' }
        if (parsedAction && parsedAction.name === axiom.targetFunction) {
           const argToCheck = parsedAction.arguments ? parsedAction.arguments[axiom.targetArgument] : null;
           if (argToCheck && typeof argToCheck === 'string' && argToCheck.match(new RegExp(axiom.matchPattern, 'i'))) {
               approved = false;
               reason = `Argument '${axiom.targetArgument}' in function '${axiom.targetFunction}' violated pattern: ${axiom.matchPattern}`;
               correctionPrompt = axiom.correction || `Review your argument formulation: ${reason}.`;
               axiomTrail.push(`[Rule ${axiom.id}: Schema Constraint] -> Failed`);
               return { approved, reason, axiomTrail, correctionPrompt };
           }
        }
      }
      
      axiomTrail.push(`[Rule ${axiom.id || 'N/A'}: ${axiom.type}] -> Passed`);
    }

    return { approved, reason: 'Passed all gating checks', axiomTrail, correctionPrompt: null };
  }
}
