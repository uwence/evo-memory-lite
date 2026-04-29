export class ContextCurator {
  static estimateTokens(text) {
    if (!text) return 0;
    // rough estimation: 1 token = ~4 chars
    return Math.ceil(text.length / 4);
  }

  /**
   * Assemble context within a token budget.
   * Priority: Identity > Sensorium > Hot Memory > CBR & Search Results
   */
  static assembleContext({ identity, sensorium, hotMemories, cbrResults, searchResults, maxTokens = 4000 }) {
    let currentTokens = 0;
    const finalContext = [];

    const addSection = (title, content) => {
      if (!content || content.trim().length === 0) return false;
      const sectionText = `[${title}]\n${content}`;
      const tokens = this.estimateTokens(sectionText);
      
      if (currentTokens + tokens <= maxTokens) {
        finalContext.push(sectionText);
        currentTokens += tokens;
        return true;
      } else {
        // Truncate
        const budget = maxTokens - currentTokens;
        if (budget > 10) { // arbitrary small buffer
           const charBudget = budget * 4;
           const truncated = sectionText.substring(0, charBudget - 3) + '...';
           finalContext.push(truncated);
           currentTokens += this.estimateTokens(truncated);
        }
        return false;
      }
    };

    addSection('Identity (Level 1)', identity);
    addSection('Sensorium (Level 2)', sensorium);

    const hotMemText = hotMemories && hotMemories.length > 0 
      ? hotMemories.map(m => m.content).join('\n---\n') 
      : '';
    addSection('Hot Memory (Level 3)', hotMemText);

    let level4Text = '';
    if (cbrResults && cbrResults.length > 0) {
      level4Text += cbrResults.map(c => `Problem: ${c.problem}\nSolution: ${c.solution}\nOutcome: ${c.outcome}`).join('\n---\n');
      level4Text += '\n\n';
    }
    if (searchResults && searchResults.length > 0) {
      level4Text += searchResults.map(s => s.content).join('\n---\n');
    }
    addSection('CBR & Search Results (Level 4)', level4Text.trim());

    return finalContext.join('\n\n');
  }
}
