import { attemptGarbageCollection } from '../../../common/util/collect_garbage.js';
import { assert } from '../../../common/util/util.js';
import { ValidBindableResource, BindableResource, kMaxQueryCount } from '../../capability_info.js';
import { GPUTest, ResourceState, initUncanonicalizedDeviceDescriptor } from '../../gpu_test.js';
import {
  DevicePool,
  DeviceProvider,
  TestOOMedShouldAttemptGC,
  UncanonicalizedDeviceDescriptor,
} from '../../util/device_pool.js';

// TODO: When DevicePool becomes able to provide multiple devices at once, use the usual one instead of a new one.
const mismatchedDevicePool = new DevicePool();

/**
 * Base fixture for WebGPU validation tests.
 */
export class ValidationTest extends GPUTest {
  // Device mismatched validation tests require another GPUDevice different from the default
  // GPUDevice of GPUTest. It is only used to create device mismatched objects.
  private mismatchedProvider: DeviceProvider | undefined;
  private mismatchedAcquiredDevice: GPUDevice | undefined;

  /** GPUDevice for creating mismatched objects required by device mismatched validation tests. */
  get mismatchedDevice(): GPUDevice {
    assert(
      this.mismatchedProvider !== undefined,
      'No provider available right now; did you "await" selectMismatchedDeviceOrSkipTestCase?'
    );
    if (!this.mismatchedAcquiredDevice) {
      this.mismatchedAcquiredDevice = this.mismatchedProvider.acquire();
    }
    return this.mismatchedAcquiredDevice;
  }

  /**
   * Create other device different with current test device, which could be got by `.mismatchedDevice`.
   * A `descriptor` may be undefined, which returns a `default` mismatched device.
   * If the request descriptor or feature name can't be supported, throws an exception to skip the entire test case.
   */
  async selectMismatchedDeviceOrSkipTestCase(
    descriptor:
      | UncanonicalizedDeviceDescriptor
      | GPUFeatureName
      | undefined
      | Array<GPUFeatureName | undefined>
  ): Promise<void> {
    assert(
      this.mismatchedProvider === undefined,
      "Can't selectMismatchedDeviceOrSkipTestCase() multiple times"
    );

    this.mismatchedProvider =
      descriptor === undefined
        ? await mismatchedDevicePool.reserve()
        : await mismatchedDevicePool.reserve(initUncanonicalizedDeviceDescriptor(descriptor));

    this.mismatchedAcquiredDevice = this.mismatchedProvider.acquire();
  }

  protected async finalize(): Promise<void> {
    await super.finalize();

    if (this.mismatchedProvider) {
      // TODO(kainino0x): Deduplicate this with code in GPUTest.finalize
      let threw: undefined | Error;
      {
        const provider = this.mismatchedProvider;
        this.mismatchedProvider = undefined;
        try {
          await mismatchedDevicePool.release(provider);
        } catch (ex) {
          threw = ex;
        }
      }

      if (threw) {
        if (threw instanceof TestOOMedShouldAttemptGC) {
          // Try to clean up, in case there are stray GPU resources in need of collection.
          await attemptGarbageCollection();
        }
        throw threw;
      }
    }
  }

  /**
   * Create a GPUTexture in the specified state.
   * A `descriptor` may optionally be passed, which is used when `state` is not `'invalid'`.
   */
  createTextureWithState(
    state: ResourceState,
    descriptor?: Readonly<GPUTextureDescriptor>
  ): GPUTexture {
    descriptor = descriptor ?? {
      size: { width: 1, height: 1, depthOrArrayLayers: 1 },
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT,
    };

    switch (state) {
      case 'valid':
        return this.trackForCleanup(this.device.createTexture(descriptor));
      case 'invalid':
        return this.getErrorTexture();
      case 'destroyed': {
        const texture = this.device.createTexture(descriptor);
        texture.destroy();
        return texture;
      }
    }
  }

  /**
   * Create a GPUTexture in the specified state. A `descriptor` may optionally be passed;
   * if `state` is `'invalid'`, it will be modified to add an invalid combination of usages.
   */
  createBufferWithState(
    state: ResourceState,
    descriptor?: Readonly<GPUBufferDescriptor>
  ): GPUBuffer {
    descriptor = descriptor ?? {
      size: 4,
      usage: GPUBufferUsage.VERTEX,
    };

    switch (state) {
      case 'valid':
        return this.trackForCleanup(this.device.createBuffer(descriptor));

      case 'invalid': {
        // Make the buffer invalid because of an invalid combination of usages but keep the
        // descriptor passed as much as possible (for mappedAtCreation and friends).
        this.device.pushErrorScope('validation');
        const buffer = this.device.createBuffer({
          ...descriptor,
          usage: descriptor.usage | GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_SRC,
        });
        this.device.popErrorScope();
        return buffer;
      }
      case 'destroyed': {
        const buffer = this.device.createBuffer(descriptor);
        buffer.destroy();
        return buffer;
      }
    }
  }

  /**
   * Create a GPUQuerySet in the specified state.
   * A `descriptor` may optionally be passed, which is used when `state` is not `'invalid'`.
   */
  createQuerySetWithState(
    state: ResourceState,
    desc?: Readonly<GPUQuerySetDescriptor>
  ): GPUQuerySet {
    const descriptor = { type: 'occlusion' as const, count: 2, ...desc };

    switch (state) {
      case 'valid':
        return this.trackForCleanup(this.device.createQuerySet(descriptor));
      case 'invalid': {
        // Make the queryset invalid because of the count out of bounds.
        descriptor.count = kMaxQueryCount + 1;
        return this.expectGPUError('validation', () => this.device.createQuerySet(descriptor));
      }
      case 'destroyed': {
        const queryset = this.device.createQuerySet(descriptor);
        queryset.destroy();
        return queryset;
      }
    }
  }

  /** Create an arbitrarily-sized GPUBuffer with the STORAGE usage. */
  getStorageBuffer(): GPUBuffer {
    return this.trackForCleanup(
      this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE })
    );
  }

  /** Create an arbitrarily-sized GPUBuffer with the UNIFORM usage. */
  getUniformBuffer(): GPUBuffer {
    return this.trackForCleanup(
      this.device.createBuffer({ size: 1024, usage: GPUBufferUsage.UNIFORM })
    );
  }

  /** Return an invalid GPUBuffer. */
  getErrorBuffer(): GPUBuffer {
    return this.createBufferWithState('invalid');
  }

  /** Return an invalid GPUSampler. */
  getErrorSampler(): GPUSampler {
    this.device.pushErrorScope('validation');
    const sampler = this.device.createSampler({ lodMinClamp: -1 });
    this.device.popErrorScope();
    return sampler;
  }

  /**
   * Return an arbitrarily-configured GPUTexture with the `TEXTURE_BINDING` usage and specified sampleCount.
   */
  getSampledTexture(sampleCount: number = 1): GPUTexture {
    return this.trackForCleanup(
      this.device.createTexture({
        size: { width: 16, height: 16, depthOrArrayLayers: 1 },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING,
        sampleCount,
      })
    );
  }

  /** Return an arbitrarily-configured GPUTexture with the `STORAGE_BINDING` usage. */
  getStorageTexture(): GPUTexture {
    return this.trackForCleanup(
      this.device.createTexture({
        size: { width: 16, height: 16, depthOrArrayLayers: 1 },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING,
      })
    );
  }

  /** Return an arbitrarily-configured GPUTexture with the `RENDER_ATTACHMENT` usage. */
  getRenderTexture(sampleCount: number = 1): GPUTexture {
    return this.trackForCleanup(
      this.device.createTexture({
        size: { width: 16, height: 16, depthOrArrayLayers: 1 },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount,
      })
    );
  }

  /** Return an invalid GPUTexture. */
  getErrorTexture(): GPUTexture {
    this.device.pushErrorScope('validation');
    const texture = this.device.createTexture({
      size: { width: 0, height: 0, depthOrArrayLayers: 0 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING,
    });
    this.device.popErrorScope();
    return texture;
  }

  /** Return an invalid GPUTextureView (created from an invalid GPUTexture). */
  getErrorTextureView(): GPUTextureView {
    this.device.pushErrorScope('validation');
    const view = this.getErrorTexture().createView();
    this.device.popErrorScope();
    return view;
  }

  /**
   * Return an arbitrary object of the specified {@link BindableResource} type
   * (e.g. `'errorBuf'`, `'nonFiltSamp'`, `sampledTexMS`, etc.)
   */
  getBindingResource(bindingType: BindableResource): GPUBindingResource {
    switch (bindingType) {
      case 'errorBuf':
        return { buffer: this.getErrorBuffer() };
      case 'errorSamp':
        return this.getErrorSampler();
      case 'errorTex':
        return this.getErrorTextureView();
      case 'uniformBuf':
        return { buffer: this.getUniformBuffer() };
      case 'storageBuf':
        return { buffer: this.getStorageBuffer() };
      case 'filtSamp':
        return this.device.createSampler({ minFilter: 'linear' });
      case 'nonFiltSamp':
        return this.device.createSampler();
      case 'compareSamp':
        return this.device.createSampler({ compare: 'never' });
      case 'sampledTex':
        return this.getSampledTexture(1).createView();
      case 'sampledTexMS':
        return this.getSampledTexture(4).createView();
      case 'storageTex':
        return this.getStorageTexture().createView();
    }
  }

  /** Create an arbitrarily-sized GPUBuffer with the STORAGE usage from mismatched device. */
  getDeviceMismatchedStorageBuffer(): GPUBuffer {
    return this.trackForCleanup(
      this.mismatchedDevice.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE })
    );
  }

  /** Create an arbitrarily-sized GPUBuffer with the UNIFORM usage from mismatched device. */
  getDeviceMismatchedUniformBuffer(): GPUBuffer {
    return this.trackForCleanup(
      this.mismatchedDevice.createBuffer({ size: 4, usage: GPUBufferUsage.UNIFORM })
    );
  }

  /** Return a GPUTexture with descriptor from mismatched device. */
  getDeviceMismatchedTexture(descriptor: GPUTextureDescriptor): GPUTexture {
    return this.trackForCleanup(this.mismatchedDevice.createTexture(descriptor));
  }

  /** Return an arbitrarily-configured GPUTexture with the `SAMPLED` usage from mismatched device. */
  getDeviceMismatchedSampledTexture(sampleCount: number = 1): GPUTexture {
    return this.getDeviceMismatchedTexture({
      size: { width: 4, height: 4, depthOrArrayLayers: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING,
      sampleCount,
    });
  }

  /** Return an arbitrarily-configured GPUTexture with the `STORAGE` usage from mismatched device. */
  getDeviceMismatchedStorageTexture(): GPUTexture {
    return this.getDeviceMismatchedTexture({
      size: { width: 4, height: 4, depthOrArrayLayers: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING,
    });
  }

  /** Return an arbitrarily-configured GPUTexture with the `RENDER_ATTACHMENT` usage from mismatched device. */
  getDeviceMismatchedRenderTexture(sampleCount: number = 1): GPUTexture {
    return this.getDeviceMismatchedTexture({
      size: { width: 4, height: 4, depthOrArrayLayers: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount,
    });
  }

  getDeviceMismatchedBindingResource(bindingType: ValidBindableResource): GPUBindingResource {
    switch (bindingType) {
      case 'uniformBuf':
        return { buffer: this.getDeviceMismatchedStorageBuffer() };
      case 'storageBuf':
        return { buffer: this.getDeviceMismatchedUniformBuffer() };
      case 'filtSamp':
        return this.mismatchedDevice.createSampler({ minFilter: 'linear' });
      case 'nonFiltSamp':
        return this.mismatchedDevice.createSampler();
      case 'compareSamp':
        return this.mismatchedDevice.createSampler({ compare: 'never' });
      case 'sampledTex':
        return this.getDeviceMismatchedSampledTexture(1).createView();
      case 'sampledTexMS':
        return this.getDeviceMismatchedSampledTexture(4).createView();
      case 'storageTex':
        return this.getDeviceMismatchedStorageTexture().createView();
    }
  }

  /** Create a GPURenderPipeline in the specified state. */
  createRenderPipelineWithState(state: 'valid' | 'invalid'): GPURenderPipeline {
    return state === 'valid' ? this.createNoOpRenderPipeline() : this.createErrorRenderPipeline();
  }

  /** Return a GPURenderPipeline with default options and no-op vertex and fragment shaders. */
  createNoOpRenderPipeline(): GPURenderPipeline {
    return this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: `[[stage(vertex)]] fn main() -> [[builtin(position)]] vec4<f32> {
  return vec4<f32>();
}`,
        }),
        entryPoint: 'main',
      },
      fragment: {
        module: this.device.createShaderModule({
          code: '[[stage(fragment)]] fn main() {}',
        }),
        entryPoint: 'main',
        targets: [{ format: 'rgba8unorm', writeMask: 0 }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  /** Return an invalid GPURenderPipeline. */
  createErrorRenderPipeline(): GPURenderPipeline {
    this.device.pushErrorScope('validation');
    const pipeline = this.device.createRenderPipeline({
      vertex: {
        module: this.device.createShaderModule({
          code: '',
        }),
        entryPoint: '',
      },
    });
    this.device.popErrorScope();
    return pipeline;
  }

  /** Return a GPUComputePipeline with a no-op shader. */
  createNoOpComputePipeline(layout?: GPUPipelineLayout): GPUComputePipeline {
    return this.device.createComputePipeline({
      layout,
      compute: {
        module: this.device.createShaderModule({
          code: '[[stage(compute), workgroup_size(1)]] fn main() {}',
        }),
        entryPoint: 'main',
      },
    });
  }

  /** Return an invalid GPUComputePipeline. */
  createErrorComputePipeline(): GPUComputePipeline {
    this.device.pushErrorScope('validation');
    const pipeline = this.device.createComputePipeline({
      compute: {
        module: this.device.createShaderModule({
          code: '',
        }),
        entryPoint: '',
      },
    });
    this.device.popErrorScope();
    return pipeline;
  }
}
