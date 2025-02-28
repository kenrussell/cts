export const description = `Validation tests for the invariant attribute`;

import { makeTestGroup } from '../../../../common/framework/test_group.js';
import { ShaderValidationTest } from '../shader_validation_test.js';

import { kBuiltins } from './builtins.spec.js';
import { generateShader } from './util.js';

export const g = makeTestGroup(ShaderValidationTest);

g.test('valid_only_with_vertex_position_builtin')
  .desc(`Test that the invariant attribute is only accepted with the vertex position builtin`)
  .params(u =>
    u
      .combineWithParams(kBuiltins)
      .combine('use_struct', [true, false] as const)
      .beginSubcases()
  )
  .fn(t => {
    const code = generateShader({
      attribute: `[[builtin(${t.params.name}), invariant]]`,
      type: t.params.type,
      stage: t.params.stage,
      io: t.params.io,
      use_struct: t.params.use_struct,
    });

    t.expectCompileResult(t.params.name === 'position', code);
  });

g.test('not_valid_on_user_defined_io')
  .desc(`Test that the invariant attribute is not accepted on user-defined IO attributes.`)
  .params(u => u.combine('use_invariant', [true, false] as const).beginSubcases())
  .fn(t => {
    const invariant = t.params.use_invariant ? '[[invariant]]' : '';
    const code = `
    struct VertexOut {
      [[location(0)]] ${invariant} loc0 : vec4<f32>;
      [[builtin(position)]] position : vec4<f32>;
    };
    [[stage(vertex)]]
    fn main() -> VertexOut {
      return VertexOut();
    }
    `;
    t.expectCompileResult(!t.params.use_invariant, code);
  });

g.test('invalid_use_of_parameters')
  .desc(`Test that no parameters are accepted for the invariant attribute`)
  .params(u => u.combine('suffix', ['', '()', '(0)'] as const).beginSubcases())
  .fn(t => {
    const code = `
    struct VertexOut {
      [[builtin(position), invariant${t.params.suffix}]] position : vec4<f32>;
    };
    [[stage(vertex)]]
    fn main() -> VertexOut {
      return VertexOut();
    }
    `;
    t.expectCompileResult(t.params.suffix === '', code);
  });
