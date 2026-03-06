import { describe, it, expect } from 'vitest';
import {
  validateAgentsConfig,
  validateOpenClawConfig,
  syncAgentsConfigToOpenClaw,
} from './agentsConfigValidation';

describe('agentsConfigValidation utils', () => {
  describe('validateAgentsConfig', () => {
    it('rejects non-object values', () => {
      expect(validateAgentsConfig(null)).toEqual({
        isValid: false,
        errors: ['Agents config must be a valid JSON object'],
      });
    });

    it('validates a minimal correct agents config', () => {
      const config = {
        leadership: [{ id: 'ceo', title: 'CEO', label: 'agent:ceo:main', status: 'active' }],
        departments: [{ id: 'eng', name: 'Engineering', leadId: 'ceo', subagents: ['dev1'] }],
        subagents: [{ id: 'dev1', displayName: 'Dev One', label: 'agent:dev1:main' }],
      };

      expect(validateAgentsConfig(config)).toEqual({ isValid: true, errors: [] });
    });

    it('reports leadership shape issues and reference errors', () => {
      const result = validateAgentsConfig({
        leadership: [
          {
            id: 'ceo',
            title: 'CEO',
            label: 'agent:ceo:main',
            status: 'bad-status',
            reportsTo: 123,
          },
          { id: 'ceo', title: 999, reportsTo: 'missing' },
        ],
        departments: [],
        subagents: [],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'leadership[0] (ceo): status must be one of: human, scaffolded, deprecated, active',
      );
      expect(result.errors).toContain('leadership[0] (ceo): reportsTo must be a string or null');
      expect(result.errors).toContain('leadership[1]: duplicate id "ceo"');
      expect(result.errors).toContain('leadership[1] (ceo): title must be a string if provided');
      expect(result.errors).toContain(
        'leadership[1] (ceo): label is required and must be a string',
      );
      expect(result.errors).toContain(
        'leadership[1] (ceo): reportsTo "missing" does not reference a valid leadership id',
      );
    });

    it('validates an agents config without title (title is optional)', () => {
      const config = {
        leadership: [{ id: 'bot1', label: 'agent:bot1:main', status: 'active' }],
        departments: [],
        subagents: [],
      };

      expect(validateAgentsConfig(config)).toEqual({ isValid: true, errors: [] });
    });

    it('allows forward leadership reportsTo references', () => {
      const result = validateAgentsConfig({
        leadership: [
          { id: 'cto', title: 'CTO', label: 'agent:cto:main', reportsTo: 'ceo' },
          { id: 'ceo', title: 'CEO', label: 'agent:ceo:main' },
        ],
        departments: [],
        subagents: [],
      });

      expect(result).toEqual({ isValid: true, errors: [] });
    });

    it('reports department and subagent validation errors', () => {
      const result = validateAgentsConfig({
        leadership: [{ id: 'ceo', title: 'CEO', label: 'agent:ceo:main' }],
        departments: [
          { id: 'eng', name: 'Engineering', leadId: 'missing', subagents: ['unknown-subagent'] },
          { id: 'eng', name: 42, leadId: null, subagents: 'not-array' },
        ],
        subagents: [
          { id: 'dev1', label: 1 },
          { id: 'dev1', displayName: 'Dev One' },
        ],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'departments[0] (eng): leadId "missing" does not reference a valid leadership id',
      );
      expect(result.errors).toContain('departments[1]: duplicate id "eng"');
      expect(result.errors).toContain(
        'departments[1] (eng): name is required and must be a string',
      );
      expect(result.errors).toContain(
        'departments[1] (eng): leadId is required and must be a string',
      );
      expect(result.errors).toContain('departments[1] (eng): subagents must be an array');
      expect(result.errors).toContain(
        'subagents[0] (dev1): displayName is required and must be a string',
      );
      expect(result.errors).toContain(
        'subagents[0] (dev1): label is required and must be a string',
      );
      expect(result.errors).toContain('subagents[1]: duplicate id "dev1"');
      expect(result.errors).toContain(
        'subagents[1] (dev1): label is required and must be a string',
      );
      expect(result.errors).toContain(
        'departments[0] (eng): subagents[0] references unknown subagent id "unknown-subagent"',
      );
    });

    it('reports top-level array type errors', () => {
      const result = validateAgentsConfig({
        leadership: 'bad',
        departments: 'bad',
        subagents: 'bad',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('leadership must be an array');
      expect(result.errors).toContain('departments must be an array');
      expect(result.errors).toContain('subagents must be an array');
    });
  });

  describe('validateOpenClawConfig', () => {
    it('rejects non-object and invalid agent structures', () => {
      expect(validateOpenClawConfig(undefined)).toEqual({
        isValid: false,
        errors: ['OpenClaw config must be a valid JSON object'],
      });

      expect(validateOpenClawConfig({})).toEqual({
        isValid: false,
        errors: ['agents object is required'],
      });

      expect(validateOpenClawConfig({ agents: {} })).toEqual({
        isValid: false,
        errors: ['agents.list must be an array'],
      });
    });

    it('validates agent ids and duplicates', () => {
      const result = validateOpenClawConfig({
        agents: {
          list: [{ id: 'ceo' }, { id: 'ceo' }, { id: 123 }],
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('agents.list[1]: duplicate id "ceo"');
      expect(result.errors).toContain('agents.list[2]: id is required and must be a string');
    });
  });

  describe('syncAgentsConfigToOpenClaw', () => {
    it('creates/updates non-human agents and keeps humans skipped', () => {
      const config = {
        leadership: [
          {
            id: 'ceo',
            title: 'CEO',
            displayName: 'Chief Exec',
            status: 'active',
            description: 'Runs org',
          },
          { id: 'hr', title: 'HR', status: 'human' },
        ],
      };

      const openclaw = {
        agents: {
          list: [{ id: 'ceo', identity: { name: 'Old Name' }, orgChart: { legacy: true } }],
        },
      };

      const updated = syncAgentsConfigToOpenClaw(config, openclaw);

      expect(updated).not.toBe(openclaw);
      expect(updated.agents.list).toHaveLength(1);
      expect(updated.agents.list[0]).toMatchObject({
        id: 'ceo',
        identity: { name: 'Chief Exec' },
      });
      expect(updated.agents.list[0].orgChart).toBeUndefined();
    });

    it('initializes missing agents structure and creates stub agent defaults', () => {
      const updated = syncAgentsConfigToOpenClaw(
        {
          leadership: [{ id: 'cto', title: 'CTO', status: 'scaffolded', description: 'Tech lead' }],
        },
        {},
      );

      expect(updated.agents.list).toHaveLength(1);
      expect(updated.agents.list[0]).toMatchObject({
        id: 'cto',
        workspace: '/home/node/.openclaw/workspace-cto',
        identity: {
          name: 'CTO',
          theme: 'Tech lead',
        },
        model: {
          primary: 'openrouter/anthropic/claude-sonnet-4.5',
          fallbacks: [],
        },
      });
    });

    it('creates stub agent from leadership entry without title', () => {
      const updated = syncAgentsConfigToOpenClaw(
        {
          leadership: [
            {
              id: 'builder',
              displayName: 'BuilderBot',
              status: 'scaffolded',
              description: 'Builds things',
            },
          ],
        },
        {},
      );

      expect(updated.agents.list).toHaveLength(1);
      expect(updated.agents.list[0]).toMatchObject({
        id: 'builder',
        identity: {
          name: 'BuilderBot',
          theme: 'Builds things',
        },
      });
    });

    it('normalizes non-array agents.list and creates identity when missing', () => {
      const updated = syncAgentsConfigToOpenClaw(
        {
          leadership: [
            { id: 'cmo', title: 'CMO', displayName: 'Marketing Lead', status: 'active' },
          ],
        },
        { agents: { list: {} } },
      );

      expect(Array.isArray(updated.agents.list)).toBe(true);
      expect(updated.agents.list[0].identity.name).toBe('Marketing Lead');
    });
  });
});
