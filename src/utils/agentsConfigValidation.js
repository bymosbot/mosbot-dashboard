/**
 * Validation utilities for agents config and OpenClaw agent configurations
 */

/**
 * Validate agents.json structure
 * @param {object} config - The agents config object
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateAgentsConfig(config) {
  const errors = [];

  // Check if config is an object
  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['Agents config must be a valid JSON object'] };
  }

  // Validate leadership array
  const leadership = config.leadership || [];
  if (!Array.isArray(leadership)) {
    errors.push('leadership must be an array');
  } else {
    const leadershipIds = new Set();
    leadership.forEach((leader, idx) => {
      if (!leader.id || typeof leader.id !== 'string') {
        errors.push(`leadership[${idx}]: id is required and must be a string`);
      } else {
        if (leadershipIds.has(leader.id)) {
          errors.push(`leadership[${idx}]: duplicate id "${leader.id}"`);
        }
        leadershipIds.add(leader.id);
      }

      if (leader.title !== undefined && leader.title !== null && typeof leader.title !== 'string') {
        errors.push(
          `leadership[${idx}] (${leader.id || 'unknown'}): title must be a string if provided`,
        );
      }

      if (!leader.label || typeof leader.label !== 'string') {
        errors.push(
          `leadership[${idx}] (${leader.id || 'unknown'}): label is required and must be a string`,
        );
      }

      // Validate status if present
      if (
        leader.status &&
        !['human', 'scaffolded', 'deprecated', 'active'].includes(leader.status)
      ) {
        errors.push(
          `leadership[${idx}] (${leader.id || 'unknown'}): status must be one of: human, scaffolded, deprecated, active`,
        );
      }

      // Validate reportsTo if present
      if (leader.reportsTo !== null && leader.reportsTo !== undefined) {
        if (typeof leader.reportsTo !== 'string') {
          errors.push(
            `leadership[${idx}] (${leader.id || 'unknown'}): reportsTo must be a string or null`,
          );
        } else if (!leadershipIds.has(leader.reportsTo)) {
          // Check if reportsTo references a valid leadership id (may not be in set yet if forward reference)
          const referencedLeader = leadership.find((l) => l.id === leader.reportsTo);
          if (!referencedLeader) {
            errors.push(
              `leadership[${idx}] (${leader.id || 'unknown'}): reportsTo "${leader.reportsTo}" does not reference a valid leadership id`,
            );
          }
        }
      }
    });
  }

  // Validate departments array
  const departments = config.departments || [];
  if (!Array.isArray(departments)) {
    errors.push('departments must be an array');
  } else {
    const departmentIds = new Set();
    const leadershipIds = new Set((config.leadership || []).map((l) => l.id));

    departments.forEach((dept, idx) => {
      if (!dept.id || typeof dept.id !== 'string') {
        errors.push(`departments[${idx}]: id is required and must be a string`);
      } else {
        if (departmentIds.has(dept.id)) {
          errors.push(`departments[${idx}]: duplicate id "${dept.id}"`);
        }
        departmentIds.add(dept.id);
      }

      if (!dept.name || typeof dept.name !== 'string') {
        errors.push(
          `departments[${idx}] (${dept.id || 'unknown'}): name is required and must be a string`,
        );
      }

      if (!dept.leadId || typeof dept.leadId !== 'string') {
        errors.push(
          `departments[${idx}] (${dept.id || 'unknown'}): leadId is required and must be a string`,
        );
      } else if (!leadershipIds.has(dept.leadId)) {
        errors.push(
          `departments[${idx}] (${dept.id || 'unknown'}): leadId "${dept.leadId}" does not reference a valid leadership id`,
        );
      }

      if (!Array.isArray(dept.subagents)) {
        errors.push(`departments[${idx}] (${dept.id || 'unknown'}): subagents must be an array`);
      }
    });
  }

  // Validate subagents array
  const subagents = config.subagents || [];
  if (!Array.isArray(subagents)) {
    errors.push('subagents must be an array');
  } else {
    const subagentIds = new Set();
    subagents.forEach((agent, idx) => {
      if (!agent.id || typeof agent.id !== 'string') {
        errors.push(`subagents[${idx}]: id is required and must be a string`);
      } else {
        if (subagentIds.has(agent.id)) {
          errors.push(`subagents[${idx}]: duplicate id "${agent.id}"`);
        }
        subagentIds.add(agent.id);
      }

      if (!agent.displayName || typeof agent.displayName !== 'string') {
        errors.push(
          `subagents[${idx}] (${agent.id || 'unknown'}): displayName is required and must be a string`,
        );
      }

      if (!agent.label || typeof agent.label !== 'string') {
        errors.push(
          `subagents[${idx}] (${agent.id || 'unknown'}): label is required and must be a string`,
        );
      }
    });

    // Cross-check: ensure all department subagent references exist
    const departmentsArray = config.departments || [];
    departmentsArray.forEach((dept, deptIdx) => {
      if (Array.isArray(dept.subagents)) {
        dept.subagents.forEach((subagentId, subIdx) => {
          if (!subagentIds.has(subagentId)) {
            errors.push(
              `departments[${deptIdx}] (${dept.id || 'unknown'}): subagents[${subIdx}] references unknown subagent id "${subagentId}"`,
            );
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate openclaw.json structure (minimal check)
 * @param {object} config - The OpenClaw config object
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateOpenClawConfig(config) {
  const errors = [];

  // Check if config is an object
  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['OpenClaw config must be a valid JSON object'] };
  }

  // Validate agents.list
  if (!config.agents || typeof config.agents !== 'object') {
    errors.push('agents object is required');
  } else {
    const agentsList = config.agents.list;
    if (!Array.isArray(agentsList)) {
      errors.push('agents.list must be an array');
    } else {
      const agentIds = new Set();
      agentsList.forEach((agent, idx) => {
        if (!agent.id || typeof agent.id !== 'string') {
          errors.push(`agents.list[${idx}]: id is required and must be a string`);
        } else {
          if (agentIds.has(agent.id)) {
            errors.push(`agents.list[${idx}]: duplicate id "${agent.id}"`);
          }
          agentIds.add(agent.id);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sync agents config leadership to OpenClaw agents config
 * For each non-human leadership entry, ensure a matching agent exists in agents.list
 * @param {object} agentsConfig - The agents config
 * @param {object} openclawConfig - The OpenClaw config
 * @returns {object} Updated OpenClaw config
 */
export function syncAgentsConfigToOpenClaw(agentsConfig, openclawConfig) {
  const updatedConfig = JSON.parse(JSON.stringify(openclawConfig)); // Deep clone

  if (!updatedConfig.agents) {
    updatedConfig.agents = { list: [] };
  }
  if (!Array.isArray(updatedConfig.agents.list)) {
    updatedConfig.agents.list = [];
  }

  const leadership = agentsConfig.leadership || [];
  const agentsList = updatedConfig.agents.list;

  leadership.forEach((leader) => {
    // Skip human entries
    if (leader.status === 'human') {
      return;
    }

    // Find or create agent entry
    let agent = agentsList.find((a) => a.id === leader.id);

    if (!agent) {
      // Create stub agent
      agent = {
        id: leader.id,
        workspace: `/home/node/.openclaw/workspace-${leader.id}`,
        identity: {
          name: leader.displayName || leader.title || leader.id,
          theme: leader.description || '',
          emoji: '🤖',
        },
        model: {
          primary: 'openrouter/anthropic/claude-sonnet-4.5',
          fallbacks: [],
        },
      };
      agentsList.push(agent);
    }

    // Do NOT add orgChart to agent entries -- OpenClaw schema does not recognize it.
    // Agents config data lives exclusively in /agents.json.
    delete agent.orgChart;

    // Ensure identity matches
    if (!agent.identity) {
      agent.identity = {};
    }
    agent.identity.name = leader.displayName || leader.title || leader.id;
  });

  return updatedConfig;
}
