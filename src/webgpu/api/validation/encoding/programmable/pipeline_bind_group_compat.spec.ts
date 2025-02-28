export const description = `
TODO:
- test compatibility between bind groups and pipelines
    - the binding resource in bindGroups[i].layout is "group-equivalent" (value-equal) to pipelineLayout.bgls[i].
    - in the test fn, test once without the dispatch/draw (should always be valid) and once with
      the dispatch/draw, to make sure the validation happens in dispatch/draw.
    - x= {dispatch, all draws} (dispatch/draw should be size 0 to make sure validation still happens if no-op)
    - x= all relevant stages

TODO: subsume existing test, rewrite fixture as needed.
`;

import { kUnitCaseParamsBuilder } from '../../../../../common/framework/params_builder.js';
import { makeTestGroup } from '../../../../../common/framework/test_group.js';
import { memcpy, unreachable } from '../../../../../common/util/util.js';
import {
  kSamplerBindingTypes,
  kShaderStageCombinations,
  kBufferBindingTypes,
  ValidBindableResource,
} from '../../../../capability_info.js';
import { GPUConst } from '../../../../constants.js';
import {
  ProgrammableEncoderType,
  kProgrammableEncoderTypes,
} from '../../../../util/command_buffer_maker.js';
import { ValidationTest } from '../../validation_test.js';

const kComputeCmds = ['dispatch', 'dispatchIndirect'] as const;
type ComputeCmd = typeof kComputeCmds[number];
const kRenderCmds = ['draw', 'drawIndexed', 'drawIndirect', 'drawIndexedIndirect'] as const;
type RenderCmd = typeof kRenderCmds[number];

// Test resource type compatibility in pipeline and bind group
// TODO: Add externalTexture
const kResourceTypes: ValidBindableResource[] = [
  'uniformBuf',
  'filtSamp',
  'sampledTex',
  'storageTex',
];

function getTestCmds(
  encoderType: ProgrammableEncoderType
): readonly ComputeCmd[] | readonly RenderCmd[] {
  return encoderType === 'compute pass' ? kComputeCmds : kRenderCmds;
}

const kCompatTestParams = kUnitCaseParamsBuilder
  .combine('encoderType', kProgrammableEncoderTypes)
  .expand('call', p => getTestCmds(p.encoderType))
  .combine('callWithZero', [true, false]);

class F extends ValidationTest {
  getIndexBuffer(): GPUBuffer {
    return this.device.createBuffer({
      size: 8 * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.INDEX,
    });
  }

  getIndirectBuffer(indirectParams: Array<number>): GPUBuffer {
    const buffer = this.device.createBuffer({
      mappedAtCreation: true,
      size: indirectParams.length * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
    });
    memcpy({ src: new Uint32Array(indirectParams) }, { dst: buffer.getMappedRange() });
    buffer.unmap();
    return buffer;
  }

  getBindingResourceType(entry: GPUBindGroupLayoutEntry): ValidBindableResource {
    if (entry.buffer !== undefined) return 'uniformBuf';
    if (entry.sampler !== undefined) return 'filtSamp';
    if (entry.texture !== undefined) return 'sampledTex';
    if (entry.storageTexture !== undefined) return 'storageTex';
    unreachable();
  }

  createRenderPipelineWithLayout(
    bindGroups: Array<Array<GPUBindGroupLayoutEntry>>
  ): GPURenderPipeline {
    const shader = `
      [[stage(vertex)]] fn vs_main() -> [[builtin(position)]] vec4<f32> {
        return vec4<f32>(1.0, 1.0, 0.0, 1.0);
      }

      [[stage(fragment)]] fn fs_main() -> [[location(0)]] vec4<f32> {
        return vec4<f32>(0.0, 1.0, 0.0, 1.0);
      }
    `;
    const module = this.device.createShaderModule({ code: shader });
    const pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: bindGroups.map(entries => this.device.createBindGroupLayout({ entries })),
      }),
      vertex: {
        module,
        entryPoint: 'vs_main',
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{ format: 'rgba8unorm' }],
      },
      primitive: { topology: 'triangle-list' },
    });
    return pipeline;
  }

  createComputePipelineWithLayout(
    bindGroups: Array<Array<GPUBindGroupLayoutEntry>>
  ): GPUComputePipeline {
    const shader = `
      [[stage(compute), workgroup_size(1, 1, 1)]]
        fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) {
      }
    `;

    const module = this.device.createShaderModule({ code: shader });
    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: bindGroups.map(entries => this.device.createBindGroupLayout({ entries })),
      }),
      compute: {
        module,
        entryPoint: 'main',
      },
    });
    return pipeline;
  }

  createBindGroupWithLayout(bglEntries: Array<GPUBindGroupLayoutEntry>): GPUBindGroup {
    const bgEntries: Array<GPUBindGroupEntry> = [];
    for (const entry of bglEntries) {
      const resource = this.getBindingResource(this.getBindingResourceType(entry));
      bgEntries.push({
        binding: entry.binding,
        resource,
      });
    }

    return this.device.createBindGroup({
      entries: bgEntries,
      layout: this.device.createBindGroupLayout({ entries: bglEntries }),
    });
  }

  doCompute(pass: GPUComputePassEncoder, call: ComputeCmd | undefined, callWithZero: boolean) {
    const x = callWithZero ? 0 : 1;
    switch (call) {
      case 'dispatch':
        pass.dispatch(x, 1, 1);
        break;
      case 'dispatchIndirect':
        pass.dispatchIndirect(this.getIndirectBuffer([x, 1, 1]), 0);
        break;
      default:
        break;
    }
  }

  doRender(
    pass: GPURenderPassEncoder | GPURenderBundleEncoder,
    call: RenderCmd | undefined,
    callWithZero: boolean
  ) {
    const vertexCount = callWithZero ? 0 : 3;
    switch (call) {
      case 'draw':
        pass.draw(vertexCount, 1, 0, 0);
        break;
      case 'drawIndexed':
        pass.setIndexBuffer(this.getIndexBuffer(), 'uint32');
        pass.drawIndexed(vertexCount, 1, 0, 0, 0);
        break;
      case 'drawIndirect':
        pass.drawIndirect(this.getIndirectBuffer([vertexCount, 1, 0, 0, 0]), 0);
        break;
      case 'drawIndexedIndirect':
        pass.setIndexBuffer(this.getIndexBuffer(), 'uint32');
        pass.drawIndexedIndirect(this.getIndirectBuffer([vertexCount, 1, 0, 0, 0]), 0);
        break;
      default:
        break;
    }
  }

  createBindGroupLayoutEntry(
    encoderType: ProgrammableEncoderType,
    resourceType: ValidBindableResource,
    useU32Array: boolean
  ): GPUBindGroupLayoutEntry {
    const entry: GPUBindGroupLayoutEntry = {
      binding: 0,
      visibility: encoderType === 'compute pass' ? GPUShaderStage.COMPUTE : GPUShaderStage.FRAGMENT,
    };

    switch (resourceType) {
      case 'uniformBuf':
        entry.buffer = { hasDynamicOffset: useU32Array }; // default type: uniform
        break;
      case 'filtSamp':
        entry.sampler = {}; // default type: filtering
        break;
      case 'sampledTex':
        entry.texture = {}; // default sampleType: float
        break;
      case 'storageTex':
        entry.storageTexture = { access: 'write-only', format: 'rgba8unorm' };
        break;
    }

    return entry;
  }

  runTest(
    encoderType: ProgrammableEncoderType,
    pipeline: GPUComputePipeline | GPURenderPipeline,
    bindGroups: Array<GPUBindGroup | undefined>,
    dynamicOffsets: Array<number> | undefined,
    call: ComputeCmd | RenderCmd | undefined,
    callWithZero: boolean,
    success: boolean
  ) {
    const { encoder, validateFinish } = this.createEncoder(encoderType);

    if (encoder instanceof GPUComputePassEncoder) {
      encoder.setPipeline(pipeline as GPUComputePipeline);
    } else {
      encoder.setPipeline(pipeline as GPURenderPipeline);
    }

    for (let i = 0; i < bindGroups.length; i++) {
      const bindGroup = bindGroups[i];
      if (!bindGroup) {
        break;
      }
      if (dynamicOffsets) {
        encoder.setBindGroup(
          i,
          bindGroup,
          new Uint32Array(dynamicOffsets),
          0,
          dynamicOffsets.length
        );
      } else {
        encoder.setBindGroup(i, bindGroup);
      }
    }

    if (encoder instanceof GPUComputePassEncoder) {
      this.doCompute(encoder, call as ComputeCmd, callWithZero);
    } else {
      this.doRender(encoder, call as RenderCmd, callWithZero);
    }

    validateFinish(success);
  }
}

export const g = makeTestGroup(F);

g.test('bind_groups_and_pipeline_layout_mismatch')
  .desc(
    `
    Tests the bind groups must match the requirements of the pipeline layout.
    - bind groups required by the pipeline layout are required.
    - bind groups unused by the pipeline layout can be set or not.
    `
  )
  .params(
    kCompatTestParams
      .beginSubcases()
      .combineWithParams([
        { setBindGroup0: true, setBindGroup1: true, setUnusedBindGroup2: true, _success: true },
        { setBindGroup0: true, setBindGroup1: true, setUnusedBindGroup2: false, _success: true },
        { setBindGroup0: true, setBindGroup1: false, setUnusedBindGroup2: true, _success: false },
        { setBindGroup0: false, setBindGroup1: true, setUnusedBindGroup2: true, _success: false },
        { setBindGroup0: false, setBindGroup1: false, setUnusedBindGroup2: false, _success: false },
      ])
      .combine('useU32Array', [false, true])
  )
  .fn(t => {
    const {
      encoderType,
      call,
      callWithZero,
      setBindGroup0,
      setBindGroup1,
      setUnusedBindGroup2,
      _success,
      useU32Array,
    } = t.params;
    const visibility =
      encoderType === 'compute pass' ? GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX;

    const bindGroupLayouts: Array<Array<GPUBindGroupLayoutEntry>> = [
      // bind group layout 0
      [
        {
          binding: 0,
          visibility,
          buffer: { hasDynamicOffset: useU32Array }, // default type: uniform
        },
      ],
      // bind group layout 1
      [
        {
          binding: 0,
          visibility,
          buffer: { hasDynamicOffset: useU32Array }, // default type: uniform
        },
      ],
    ];

    // Create required bind groups
    const bindGroup0 = setBindGroup0 ? t.createBindGroupWithLayout(bindGroupLayouts[0]) : undefined;
    const bindGroup1 = setBindGroup1 ? t.createBindGroupWithLayout(bindGroupLayouts[1]) : undefined;
    const unusedBindGroup2 = setUnusedBindGroup2
      ? t.createBindGroupWithLayout(bindGroupLayouts[1])
      : undefined;

    // Create fixed pipeline
    const pipeline =
      encoderType === 'compute pass'
        ? t.createComputePipelineWithLayout(bindGroupLayouts)
        : t.createRenderPipelineWithLayout(bindGroupLayouts);

    const dynamicOffsets = useU32Array ? [0] : undefined;

    // Test without the dispatch/draw (should always be valid)
    t.runTest(
      encoderType,
      pipeline,
      [bindGroup0, bindGroup1, unusedBindGroup2],
      dynamicOffsets,
      undefined,
      false,
      true
    );

    // Test with the dispatch/draw, to make sure the validation happens in dispatch/draw.
    t.runTest(
      encoderType,
      pipeline,
      [bindGroup0, bindGroup1, unusedBindGroup2],
      dynamicOffsets,
      call,
      callWithZero,
      _success
    );
  });

g.test('buffer_binding,render_pipeline')
  .desc(
    `
  The GPUBufferBindingLayout bindings configure should be exactly
  same in PipelineLayout and bindgroup.
  - TODO: test more draw functions, e.g. indirect
  - TODO: test more visibilities, e.g. vetex
  - TODO: bind group should be created with different layout
  `
  )
  .params(u => u.combine('type', kBufferBindingTypes))
  .fn(async t => {
    const { type } = t.params;

    // Create fixed bindGroup
    const uniformBuffer = t.getUniformBuffer();

    const bindGroup = t.device.createBindGroup({
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
      layout: t.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {}, // default type: uniform
          },
        ],
      }),
    });

    // Create pipeline with different layouts
    const pipeline = t.createRenderPipelineWithLayout([
      [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type,
          },
        },
      ],
    ]);

    const { encoder, validateFinish } = t.createEncoder('render pass');
    encoder.setPipeline(pipeline);
    encoder.setBindGroup(0, bindGroup);
    encoder.draw(3);

    validateFinish(type === undefined || type === 'uniform');
  });

g.test('sampler_binding,render_pipeline')
  .desc(
    `
  The GPUSamplerBindingLayout bindings configure should be exactly
  same in PipelineLayout and bindgroup.
  - TODO: test more draw functions, e.g. indirect
  - TODO: test more visibilities, e.g. vetex
  `
  )
  .params(u =>
    u //
      .combine('bglType', kSamplerBindingTypes)
      .combine('bgType', kSamplerBindingTypes)
  )
  .fn(async t => {
    const { bglType, bgType } = t.params;
    const bindGroup = t.device.createBindGroup({
      entries: [
        {
          binding: 0,
          resource:
            bgType === 'comparison'
              ? t.device.createSampler({ compare: 'always' })
              : t.device.createSampler(),
        },
      ],
      layout: t.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: { type: bgType },
          },
        ],
      }),
    });

    // Create pipeline with different layouts
    const pipeline = t.createRenderPipelineWithLayout([
      [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: bglType,
          },
        },
      ],
    ]);

    const { encoder, validateFinish } = t.createEncoder('render pass');
    encoder.setPipeline(pipeline);
    encoder.setBindGroup(0, bindGroup);
    encoder.draw(3);

    validateFinish(bglType === bgType);
  });

g.test('bgl_binding_mismatch')
  .desc(
    'Tests the binding number must exist or not exist in both bindGroups[i].layout and pipelineLayout.bgls[i]'
  )
  .params(
    kCompatTestParams
      .beginSubcases()
      .combineWithParams([
        { bgBindings: [0, 1, 2], plBindings: [0, 1, 2], _success: true },
        { bgBindings: [0, 1, 2], plBindings: [0, 1, 3], _success: false },
        { bgBindings: [0, 2], plBindings: [0, 2], _success: true },
        { bgBindings: [0, 2], plBindings: [2, 0], _success: true },
        { bgBindings: [0, 1, 2], plBindings: [0, 1], _success: false },
        { bgBindings: [0, 1], plBindings: [0, 1, 2], _success: false },
      ])
      .combine('useU32Array', [false, true])
  )
  .fn(t => {
    const {
      encoderType,
      call,
      callWithZero,
      bgBindings,
      plBindings,
      _success,
      useU32Array,
    } = t.params;
    const visibility =
      encoderType === 'compute pass' ? GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX;

    const bglEntries: Array<GPUBindGroupLayoutEntry> = [];
    for (const binding of bgBindings) {
      bglEntries.push({
        binding,
        visibility,
        buffer: { hasDynamicOffset: useU32Array }, // default type: uniform
      });
    }
    const bindGroup = t.createBindGroupWithLayout(bglEntries);

    const plEntries: Array<Array<GPUBindGroupLayoutEntry>> = [[]];
    for (const binding of plBindings) {
      plEntries[0].push({
        binding,
        visibility,
        buffer: { hasDynamicOffset: useU32Array }, // default type: uniform
      });
    }
    const pipeline =
      encoderType === 'compute pass'
        ? t.createComputePipelineWithLayout(plEntries)
        : t.createRenderPipelineWithLayout(plEntries);

    const dynamicOffsets = useU32Array ? new Array(bgBindings.length).fill(0) : undefined;

    // Test without the dispatch/draw (should always be valid)
    t.runTest(encoderType, pipeline, [bindGroup], dynamicOffsets, undefined, false, true);

    // Test with the dispatch/draw, to make sure the validation happens in dispatch/draw.
    t.runTest(encoderType, pipeline, [bindGroup], dynamicOffsets, call, callWithZero, _success);
  });

g.test('bgl_visibility_mismatch')
  .desc('Tests the visibility in bindGroups[i].layout and pipelineLayout.bgls[i] must be matched')
  .params(
    kCompatTestParams
      .beginSubcases()
      .combine('bgVisibility', kShaderStageCombinations)
      .expand('plVisibility', p =>
        p.encoderType === 'compute pass'
          ? ([GPUConst.ShaderStage.COMPUTE] as const)
          : ([
              GPUConst.ShaderStage.VERTEX,
              GPUConst.ShaderStage.FRAGMENT,
              GPUConst.ShaderStage.VERTEX | GPUConst.ShaderStage.FRAGMENT,
            ] as const)
      )
      .combine('useU32Array', [false, true])
  )
  .fn(t => {
    const { encoderType, call, callWithZero, bgVisibility, plVisibility, useU32Array } = t.params;

    const bglEntries: Array<GPUBindGroupLayoutEntry> = [
      {
        binding: 0,
        visibility: bgVisibility,
        buffer: { hasDynamicOffset: useU32Array }, // default type: uniform
      },
    ];
    const bindGroup = t.createBindGroupWithLayout(bglEntries);

    const plEntries: Array<Array<GPUBindGroupLayoutEntry>> = [
      [
        {
          binding: 0,
          visibility: plVisibility,
          buffer: { hasDynamicOffset: useU32Array }, // default type: uniform
        },
      ],
    ];
    const pipeline =
      encoderType === 'compute pass'
        ? t.createComputePipelineWithLayout(plEntries)
        : t.createRenderPipelineWithLayout(plEntries);

    const dynamicOffsets = useU32Array ? [0] : undefined;

    // Test without the dispatch/draw (should always be valid)
    t.runTest(encoderType, pipeline, [bindGroup], dynamicOffsets, undefined, false, true);

    // Test with the dispatch/draw, to make sure the validation happens in dispatch/draw.
    t.runTest(
      encoderType,
      pipeline,
      [bindGroup],
      dynamicOffsets,
      call,
      callWithZero,
      bgVisibility === plVisibility
    );
  });

g.test('bgl_resource_type_mismatch')
  .desc(
    `
  Tests the binding resource type in bindGroups[i].layout and pipelineLayout.bgls[i] must be matched
  - TODO: Test externalTexture
  `
  )
  .params(
    kCompatTestParams
      .beginSubcases()
      .combine('bgResourceType', kResourceTypes)
      .combine('plResourceType', kResourceTypes)
      .expand('useU32Array', p => (p.bgResourceType === 'uniformBuf' ? [true, false] : [false]))
  )
  .fn(t => {
    const {
      encoderType,
      call,
      callWithZero,
      bgResourceType,
      plResourceType,
      useU32Array,
    } = t.params;

    const bglEntries: Array<GPUBindGroupLayoutEntry> = [
      t.createBindGroupLayoutEntry(encoderType, bgResourceType, useU32Array),
    ];
    const bindGroup = t.createBindGroupWithLayout(bglEntries);

    const plEntries: Array<Array<GPUBindGroupLayoutEntry>> = [
      [t.createBindGroupLayoutEntry(encoderType, plResourceType, useU32Array)],
    ];
    const pipeline =
      encoderType === 'compute pass'
        ? t.createComputePipelineWithLayout(plEntries)
        : t.createRenderPipelineWithLayout(plEntries);

    const dynamicOffsets = useU32Array ? [0] : undefined;

    // Test without the dispatch/draw (should always be valid)
    t.runTest(encoderType, pipeline, [bindGroup], dynamicOffsets, undefined, false, true);

    // Test with the dispatch/draw, to make sure the validation happens in dispatch/draw.
    t.runTest(
      encoderType,
      pipeline,
      [bindGroup],
      dynamicOffsets,
      call,
      callWithZero,
      bgResourceType === plResourceType
    );
  });
