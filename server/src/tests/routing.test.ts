import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AIRouter } from '../ai/routing/ai.router.js';
import { AIModelTier } from '../ai/types/index.js';
import { AIConfigurationError } from '../ai/errors/ai.errors.js';
import { aiConfig } from '../ai/config/ai.config.js';

describe('Phase 23 WP-01: AIRouter Core Engine Unit Tests', () => {

  const createMockConfig = (
    anthropicKey = 'test-anthropic-key',
    geminiKey = 'test-gemini-key',
    primaryProvider = 'anthropic'
  ): typeof aiConfig => ({
    provider: primaryProvider,
    anthropic: {
      apiKey: anthropicKey,
      models: {
        fastJson: 'claude-3-haiku-20240307',
        deepContext: 'claude-3-sonnet-20240229',
      },
    },
    gemini: {
      apiKey: geminiKey,
      models: {
        fastJson: 'gemini-3.6-flash',
        deepContext: 'gemini-3.6-flash',
      },
    },
    models: {
      fastJson: 'claude-3-haiku-20240307',
      deepContext: 'claude-3-sonnet-20240229',
    },
    timeouts: {
      standard: 30000,
    },
  });

  it('1. FAST_JSON + both configured + primary anthropic -> gemini', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.strictEqual(decision.selectedProvider, 'gemini');
    assert.strictEqual(decision.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(decision.routingReasonCode, 'FAST_TIER_OPTIMAL_TARGET');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic', 'gemini']);
  });

  it('2. FAST_JSON + both configured + primary gemini -> gemini', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'gemini');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.strictEqual(decision.selectedProvider, 'gemini');
    assert.strictEqual(decision.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(decision.routingReasonCode, 'FAST_TIER_OPTIMAL_TARGET');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic', 'gemini']);
  });

  it('3. DEEP_CONTEXT + both configured + primary anthropic -> anthropic', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config);

    assert.strictEqual(decision.selectedProvider, 'anthropic');
    assert.strictEqual(decision.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(decision.routingReasonCode, 'DEEP_TIER_PRIMARY_TARGET');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic', 'gemini']);
  });

  it('4. DEEP_CONTEXT + both configured + primary gemini -> gemini', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'gemini');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config);

    assert.strictEqual(decision.selectedProvider, 'gemini');
    assert.strictEqual(decision.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(decision.routingReasonCode, 'DEEP_TIER_PRIMARY_TARGET');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic', 'gemini']);
  });

  it('5. Anthropic-only + FAST_JSON -> anthropic', () => {
    const config = createMockConfig('valid-anthropic', '', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.strictEqual(decision.selectedProvider, 'anthropic');
    assert.strictEqual(decision.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.strictEqual(decision.routingReasonCode, 'SINGLE_PROVIDER_AVAILABLE');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic']);
  });

  it('6. Anthropic-only + DEEP_CONTEXT -> anthropic', () => {
    const config = createMockConfig('valid-anthropic', '', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config);

    assert.strictEqual(decision.selectedProvider, 'anthropic');
    assert.strictEqual(decision.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.strictEqual(decision.routingReasonCode, 'SINGLE_PROVIDER_AVAILABLE');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic']);
  });

  it('7. Gemini-only + FAST_JSON -> gemini', () => {
    const config = createMockConfig('', 'valid-gemini', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.strictEqual(decision.selectedProvider, 'gemini');
    assert.strictEqual(decision.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.strictEqual(decision.routingReasonCode, 'SINGLE_PROVIDER_AVAILABLE');
    assert.deepStrictEqual(decision.candidateProviders, ['gemini']);
  });

  it('8. Gemini-only + DEEP_CONTEXT -> gemini', () => {
    const config = createMockConfig('', 'valid-gemini', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config);

    assert.strictEqual(decision.selectedProvider, 'gemini');
    assert.strictEqual(decision.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.strictEqual(decision.routingReasonCode, 'SINGLE_PROVIDER_AVAILABLE');
    assert.deepStrictEqual(decision.candidateProviders, ['gemini']);
  });

  it('9. Neither configured -> throws AIConfigurationError', () => {
    const config = createMockConfig('', '', 'anthropic');
    assert.throws(
      () => AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config),
      (err: Error) => err instanceof AIConfigurationError && err.message.includes('No configured AI providers available')
    );
  });

  it('10. Anthropic whitespace-only + Gemini valid -> only gemini candidate', () => {
    const config = createMockConfig('   ', 'valid-gemini', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config);

    assert.strictEqual(decision.selectedProvider, 'gemini');
    assert.strictEqual(decision.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.deepStrictEqual(decision.candidateProviders, ['gemini']);
  });

  it('11. Gemini whitespace-only + Anthropic valid -> only anthropic candidate', () => {
    const config = createMockConfig('valid-anthropic', '  \t\n ', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.strictEqual(decision.selectedProvider, 'anthropic');
    assert.strictEqual(decision.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.deepStrictEqual(decision.candidateProviders, ['anthropic']);
  });

  it('12. Both whitespace-only -> throws AIConfigurationError', () => {
    const config = createMockConfig('   ', '\t\n', 'anthropic');
    assert.throws(
      () => AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config),
      AIConfigurationError
    );
  });

  it('13. Empty-string credentials -> treated as unconfigured', () => {
    const config = createMockConfig('', '', 'anthropic');
    assert.throws(
      () => AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config),
      AIConfigurationError
    );
  });

  it('14. Tab/newline-only credentials -> treated as unconfigured', () => {
    const config = createMockConfig('\t', '\n', 'anthropic');
    assert.throws(
      () => AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config),
      AIConfigurationError
    );
  });

  it('15. Invalid runtime tier -> throws AIConfigurationError', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');
    assert.throws(
      () => AIRouter.selectInitialProvider({ tier: 'INVALID_TIER' as unknown as AIModelTier }, config),
      (err: Error) => err instanceof AIConfigurationError && err.message.includes('Unsupported or invalid AI model tier')
    );
  });

  it('16. Deterministic repeated execution -> identical decisions across repeated calls', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');
    const decision1 = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);
    const decision2 = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);
    const decision3 = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.deepStrictEqual(decision1, decision2);
    assert.deepStrictEqual(decision2, decision3);
  });

  it('17. Candidate ordering -> ["anthropic", "gemini"] when both configured', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.DEEP_CONTEXT }, config);

    assert.deepStrictEqual(decision.candidateProviders, ['anthropic', 'gemini']);
  });

  it('18. Config override is not mutated', () => {
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');
    const configSnapshot = JSON.stringify(config);

    AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.strictEqual(JSON.stringify(config), configSnapshot);
  });

  it('19. Routing context is not mutated', () => {
    const context = { tier: AIModelTier.FAST_JSON };
    const contextSnapshot = JSON.stringify(context);
    const config = createMockConfig('valid-anthropic', 'valid-gemini', 'anthropic');

    AIRouter.selectInitialProvider(context, config);

    assert.strictEqual(JSON.stringify(context), contextSnapshot);
  });

  it('20. Zero provider construction during candidate discovery', () => {
    // Prove structural & behavioral isolation:
    // AIRouter runs purely on config strings without needing provider instances or throwing constructor errors.
    const config = createMockConfig('fake-anthropic-key', 'fake-gemini-key', 'anthropic');
    const decision = AIRouter.selectInitialProvider({ tier: AIModelTier.FAST_JSON }, config);

    assert.ok(decision.selectedProvider);
    // Decision does not hold any object instances, only string primitives & arrays
    assert.strictEqual(typeof decision.selectedProvider, 'string');
    assert.strictEqual(typeof decision.routingStrategy, 'string');
    assert.strictEqual(typeof decision.routingReasonCode, 'string');
    assert.ok(Array.isArray(decision.candidateProviders));
  });
});
