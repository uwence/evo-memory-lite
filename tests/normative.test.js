import { describe, it, expect } from 'vitest';
import { NormativeGating } from '../src/normative.js';

describe('NormativeGating Deep Structured Gating', () => {
   const gating = new NormativeGating();
   
   it('parses and rejects based on advanced schema constraints', () => {
      const coreAxioms = [
         {
            type: 'Schema Constraint',
            targetFunction: 'executeCommand',
            targetArgument: 'cmd',
            matchPattern: 'rm -rf',
            correction: 'Do not delete critical paths.'
         }
      ];

      const proposedAction = JSON.stringify({
         name: 'executeCommand',
         arguments: { cmd: 'rm -rf /*' }
      });

      const res = gating.evaluate(proposedAction, coreAxioms);
      expect(res.approved).toBe(false);
      expect(res.correctionPrompt).toContain('Do not delete');
   });

   it('allows valid tool calls', () => {
      const coreAxioms = [
         {
            type: 'Schema Constraint',
            targetFunction: 'executeCommand',
            targetArgument: 'cmd',
            matchPattern: 'rm -rf'
         }
      ];

      const proposedAction = JSON.stringify({
         name: 'executeCommand',
         arguments: { cmd: 'ls -la' }
      });

      const res = gating.evaluate(proposedAction, coreAxioms);
      expect(res.approved).toBe(true);
   });
});
