export const description = `copyTexturetoTexture operation tests

TODO: rename "copy_stencil_aspect" to "copy_depth_stencil" and test the depth aspect.
TODO: remove fragment stage in InitializeDepthAspect() when browsers support null fragment stage.
`;

import { makeTestGroup } from '../../../../common/framework/test_group.js';
import { assert, memcpy } from '../../../../common/util/util.js';
import {
  kTextureFormatInfo,
  kRegularTextureFormats,
  SizedTextureFormat,
  kCompressedTextureFormats,
  depthStencilFormatAspectSize,
  DepthStencilFormat,
  kBufferSizeAlignment,
  kDepthStencilFormats,
} from '../../../capability_info.js';
import { GPUTest } from '../../../gpu_test.js';
import { align } from '../../../util/math.js';
import { physicalMipSize } from '../../../util/texture/base.js';
import { kBytesPerRowAlignment, dataBytesForCopyOrFail } from '../../../util/texture/layout.js';

class F extends GPUTest {
  GetInitialData(byteSize: number): Uint8Array {
    const initialData = new Uint8Array(byteSize);
    for (let i = 0; i < initialData.length; ++i) {
      initialData[i] = (i ** 3 + i) % 251;
    }
    return initialData;
  }

  GetInitialDataPerMipLevel(
    textureSize: Required<GPUExtent3DDict>,
    format: SizedTextureFormat,
    mipLevel: number
  ): Uint8Array {
    // TODO(jiawei.shao@intel.com): support 3D textures
    const textureSizeAtLevel = physicalMipSize(textureSize, format, '2d', mipLevel);
    const bytesPerBlock = kTextureFormatInfo[format].bytesPerBlock;
    const blockWidthInTexel = kTextureFormatInfo[format].blockWidth;
    const blockHeightInTexel = kTextureFormatInfo[format].blockHeight;
    const blocksPerSubresource =
      (textureSizeAtLevel.width / blockWidthInTexel) *
      (textureSizeAtLevel.height / blockHeightInTexel);

    const byteSize = bytesPerBlock * blocksPerSubresource * textureSizeAtLevel.depthOrArrayLayers;
    return this.GetInitialData(byteSize);
  }

  GetInitialStencilDataPerMipLevel(
    textureSize: Required<GPUExtent3DDict>,
    format: DepthStencilFormat,
    mipLevel: number
  ): Uint8Array {
    const textureSizeAtLevel = physicalMipSize(textureSize, format, '2d', mipLevel);
    const aspectBytesPerBlock = depthStencilFormatAspectSize(format, 'stencil-only');
    const byteSize =
      aspectBytesPerBlock *
      textureSizeAtLevel.width *
      textureSizeAtLevel.height *
      textureSizeAtLevel.depthOrArrayLayers;
    return this.GetInitialData(byteSize);
  }

  DoCopyTextureToTextureTest(
    srcTextureSize: Required<GPUExtent3DDict>,
    dstTextureSize: Required<GPUExtent3DDict>,
    format: SizedTextureFormat,
    copyBoxOffsets: {
      srcOffset: { x: number; y: number; z: number };
      dstOffset: { x: number; y: number; z: number };
      copyExtent: Required<GPUExtent3DDict>;
    },
    srcCopyLevel: number,
    dstCopyLevel: number
  ): void {
    const kMipLevelCount = 4;

    // Create srcTexture and dstTexture
    const srcTextureDesc: GPUTextureDescriptor = {
      size: srcTextureSize,
      format,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
      mipLevelCount: kMipLevelCount,
    };
    const srcTexture = this.device.createTexture(srcTextureDesc);
    const dstTextureDesc: GPUTextureDescriptor = {
      size: dstTextureSize,
      format,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
      mipLevelCount: kMipLevelCount,
    };
    const dstTexture = this.device.createTexture(dstTextureDesc);

    // Fill the whole subresource of srcTexture at srcCopyLevel with initialSrcData.
    const initialSrcData = this.GetInitialDataPerMipLevel(srcTextureSize, format, srcCopyLevel);
    const srcTextureSizeAtLevel = physicalMipSize(srcTextureSize, format, '2d', srcCopyLevel);
    const bytesPerBlock = kTextureFormatInfo[format].bytesPerBlock;
    const blockWidth = kTextureFormatInfo[format].blockWidth;
    const blockHeight = kTextureFormatInfo[format].blockHeight;
    const srcBlocksPerRow = srcTextureSizeAtLevel.width / blockWidth;
    const srcBlockRowsPerImage = srcTextureSizeAtLevel.height / blockHeight;
    this.device.queue.writeTexture(
      { texture: srcTexture, mipLevel: srcCopyLevel },
      initialSrcData,
      {
        bytesPerRow: srcBlocksPerRow * bytesPerBlock,
        rowsPerImage: srcBlockRowsPerImage,
      },
      srcTextureSizeAtLevel
    );

    // Copy the region specified by copyBoxOffsets from srcTexture to dstTexture.
    const dstTextureSizeAtLevel = physicalMipSize(dstTextureSize, format, '2d', dstCopyLevel);
    const minWidth = Math.min(srcTextureSizeAtLevel.width, dstTextureSizeAtLevel.width);
    const minHeight = Math.min(srcTextureSizeAtLevel.height, dstTextureSizeAtLevel.height);

    const appliedSrcOffset = {
      x: Math.min(copyBoxOffsets.srcOffset.x * blockWidth, minWidth),
      y: Math.min(copyBoxOffsets.srcOffset.y * blockHeight, minHeight),
      z: copyBoxOffsets.srcOffset.z,
    };
    const appliedDstOffset = {
      x: Math.min(copyBoxOffsets.dstOffset.x * blockWidth, minWidth),
      y: Math.min(copyBoxOffsets.dstOffset.y * blockHeight, minHeight),
      z: copyBoxOffsets.dstOffset.z,
    };

    const appliedCopyWidth = Math.max(
      minWidth +
        copyBoxOffsets.copyExtent.width * blockWidth -
        Math.max(appliedSrcOffset.x, appliedDstOffset.x),
      0
    );
    const appliedCopyHeight = Math.max(
      minHeight +
        copyBoxOffsets.copyExtent.height * blockHeight -
        Math.max(appliedSrcOffset.y, appliedDstOffset.y),
      0
    );
    assert(appliedCopyWidth % blockWidth === 0 && appliedCopyHeight % blockHeight === 0);

    const appliedCopyDepth =
      srcTextureSize.depthOrArrayLayers +
      copyBoxOffsets.copyExtent.depthOrArrayLayers -
      Math.max(appliedSrcOffset.z, appliedDstOffset.z);
    assert(appliedCopyDepth >= 0);

    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToTexture(
      { texture: srcTexture, mipLevel: srcCopyLevel, origin: appliedSrcOffset },
      { texture: dstTexture, mipLevel: dstCopyLevel, origin: appliedDstOffset },
      { width: appliedCopyWidth, height: appliedCopyHeight, depthOrArrayLayers: appliedCopyDepth }
    );

    // Copy the whole content of dstTexture at dstCopyLevel to dstBuffer.
    const dstBlocksPerRow = dstTextureSizeAtLevel.width / blockWidth;
    const dstBlockRowsPerImage = dstTextureSizeAtLevel.height / blockHeight;
    const bytesPerDstAlignedBlockRow = align(dstBlocksPerRow * bytesPerBlock, 256);
    const dstBufferSize =
      (dstBlockRowsPerImage * dstTextureSizeAtLevel.depthOrArrayLayers - 1) *
        bytesPerDstAlignedBlockRow +
      align(dstBlocksPerRow * bytesPerBlock, 4);
    const dstBufferDesc: GPUBufferDescriptor = {
      size: dstBufferSize,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    };
    const dstBuffer = this.device.createBuffer(dstBufferDesc);

    encoder.copyTextureToBuffer(
      { texture: dstTexture, mipLevel: dstCopyLevel },
      {
        buffer: dstBuffer,
        bytesPerRow: bytesPerDstAlignedBlockRow,
        rowsPerImage: dstBlockRowsPerImage,
      },
      dstTextureSizeAtLevel
    );
    this.device.queue.submit([encoder.finish()]);

    // Fill expectedDataWithPadding with the expected data of dstTexture. The other values in
    // expectedDataWithPadding are kept 0 to check if the texels untouched by the copy are 0
    // (their previous values).
    const expectedDataWithPadding = new ArrayBuffer(dstBufferSize);
    const expectedUint8DataWithPadding = new Uint8Array(expectedDataWithPadding);
    const expectedUint8Data = new Uint8Array(initialSrcData);

    const appliedCopyBlocksPerRow = appliedCopyWidth / blockWidth;
    const appliedCopyBlockRowsPerImage = appliedCopyHeight / blockHeight;
    const srcCopyOffsetInBlocks = {
      x: appliedSrcOffset.x / blockWidth,
      y: appliedSrcOffset.y / blockHeight,
      z: appliedSrcOffset.z,
    };
    const dstCopyOffsetInBlocks = {
      x: appliedDstOffset.x / blockWidth,
      y: appliedDstOffset.y / blockHeight,
      z: appliedDstOffset.z,
    };

    for (let z = 0; z < appliedCopyDepth; ++z) {
      const srcOffsetZ = srcCopyOffsetInBlocks.z + z;
      const dstOffsetZ = dstCopyOffsetInBlocks.z + z;
      for (let y = 0; y < appliedCopyBlockRowsPerImage; ++y) {
        const dstOffsetYInBlocks = dstCopyOffsetInBlocks.y + y;
        const expectedDataWithPaddingOffset =
          bytesPerDstAlignedBlockRow * (dstBlockRowsPerImage * dstOffsetZ + dstOffsetYInBlocks) +
          dstCopyOffsetInBlocks.x * bytesPerBlock;

        const srcOffsetYInBlocks = srcCopyOffsetInBlocks.y + y;
        const expectedDataOffset =
          bytesPerBlock *
            srcBlocksPerRow *
            (srcBlockRowsPerImage * srcOffsetZ + srcOffsetYInBlocks) +
          srcCopyOffsetInBlocks.x * bytesPerBlock;

        const bytesInRow = appliedCopyBlocksPerRow * bytesPerBlock;
        memcpy(
          { src: expectedUint8Data, start: expectedDataOffset, length: bytesInRow },
          { dst: expectedUint8DataWithPadding, start: expectedDataWithPaddingOffset }
        );
      }
    }

    // Verify the content of the whole subresouce of dstTexture at dstCopyLevel (in dstBuffer) is expected.
    this.expectGPUBufferValuesEqual(dstBuffer, expectedUint8DataWithPadding);
  }

  InitializeStencilAspect(
    sourceTexture: GPUTexture,
    initialStencilData: Uint8Array,
    srcCopyLevel: number,
    srcCopyBaseArrayLayer: number,
    copySize: readonly [number, number, number]
  ): void {
    this.queue.writeTexture(
      {
        texture: sourceTexture,
        mipLevel: srcCopyLevel,
        aspect: 'stencil-only',
        origin: { x: 0, y: 0, z: srcCopyBaseArrayLayer },
      },
      initialStencilData,
      { bytesPerRow: copySize[0], rowsPerImage: copySize[1] },
      copySize
    );
  }

  VerifyStencilAspect(
    destinationTexture: GPUTexture,
    initialStencilData: Uint8Array,
    dstCopyLevel: number,
    dstCopyBaseArrayLayer: number,
    copySize: readonly [number, number, number]
  ): void {
    const bytesPerRow = align(copySize[0], kBytesPerRowAlignment);
    const rowsPerImage = copySize[1];
    const outputBufferSize = align(
      dataBytesForCopyOrFail({
        layout: { bytesPerRow, rowsPerImage },
        format: 'stencil8',
        copySize,
        method: 'CopyT2B',
      }),
      kBufferSizeAlignment
    );
    const outputBuffer = this.device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      {
        texture: destinationTexture,
        aspect: 'stencil-only',
        mipLevel: dstCopyLevel,
        origin: { x: 0, y: 0, z: dstCopyBaseArrayLayer },
      },
      { buffer: outputBuffer, bytesPerRow, rowsPerImage },
      copySize
    );
    this.queue.submit([encoder.finish()]);

    const expectedStencilData = new Uint8Array(outputBufferSize);
    for (let z = 0; z < copySize[2]; ++z) {
      const initialOffsetPerLayer = z * copySize[0] * copySize[1];
      const expectedOffsetPerLayer = z * bytesPerRow * rowsPerImage;
      for (let y = 0; y < copySize[1]; ++y) {
        const initialOffsetPerRow = initialOffsetPerLayer + y * copySize[0];
        const expectedOffsetPerRow = expectedOffsetPerLayer + y * bytesPerRow;
        memcpy(
          { src: initialStencilData, start: initialOffsetPerRow, length: copySize[0] },
          { dst: expectedStencilData, start: expectedOffsetPerRow }
        );
      }
    }
    this.expectGPUBufferValuesEqual(outputBuffer, expectedStencilData);
  }
}

const kCopyBoxOffsetsForWholeDepth = [
  // From (0, 0) of src to (0, 0) of dst.
  {
    srcOffset: { x: 0, y: 0, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
  },
  // From (0, 0) of src to (blockWidth, 0) of dst.
  {
    srcOffset: { x: 0, y: 0, z: 0 },
    dstOffset: { x: 1, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
  },
  // From (0, 0) of src to (0, blockHeight) of dst.
  {
    srcOffset: { x: 0, y: 0, z: 0 },
    dstOffset: { x: 0, y: 1, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
  },
  // From (blockWidth, 0) of src to (0, 0) of dst.
  {
    srcOffset: { x: 1, y: 0, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
  },
  // From (0, blockHeight) of src to (0, 0) of dst.
  {
    srcOffset: { x: 0, y: 1, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
  },
  // From (blockWidth, 0) of src to (0, 0) of dst, and the copy extent will not cover the last
  // texel block column of both source and destination texture.
  {
    srcOffset: { x: 1, y: 0, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: -1, height: 0, depthOrArrayLayers: 0 },
  },
  // From (0, blockHeight) of src to (0, 0) of dst, and the copy extent will not cover the last
  // texel block row of both source and destination texture.
  {
    srcOffset: { x: 0, y: 1, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: -1, depthOrArrayLayers: 0 },
  },
] as const;

const kCopyBoxOffsetsFor2DArrayTextures = [
  // Copy the whole array slices from the source texture to the destination texture.
  // The copy extent will cover the whole subresource of either source or the
  // destination texture
  ...kCopyBoxOffsetsForWholeDepth,

  // Copy 1 texture slice from the 1st slice of the source texture to the 1st slice of the
  // destination texture.
  {
    srcOffset: { x: 0, y: 0, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: -2 },
  },
  // Copy 1 texture slice from the 2nd slice of the source texture to the 2nd slice of the
  // destination texture.
  {
    srcOffset: { x: 0, y: 0, z: 1 },
    dstOffset: { x: 0, y: 0, z: 1 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: -3 },
  },
  // Copy 1 texture slice from the 1st slice of the source texture to the 2nd slice of the
  // destination texture.
  {
    srcOffset: { x: 0, y: 0, z: 0 },
    dstOffset: { x: 0, y: 0, z: 1 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: -1 },
  },
  // Copy 1 texture slice from the 2nd slice of the source texture to the 1st slice of the
  // destination texture.
  {
    srcOffset: { x: 0, y: 0, z: 1 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: -1 },
  },
  // Copy 2 texture slices from the 1st slice of the source texture to the 1st slice of the
  // destination texture.
  {
    srcOffset: { x: 0, y: 0, z: 0 },
    dstOffset: { x: 0, y: 0, z: 0 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: -3 },
  },
  // Copy 3 texture slices from the 2nd slice of the source texture to the 2nd slice of the
  // destination texture.
  {
    srcOffset: { x: 0, y: 0, z: 1 },
    dstOffset: { x: 0, y: 0, z: 1 },
    copyExtent: { width: 0, height: 0, depthOrArrayLayers: -1 },
  },
] as const;

export const g = makeTestGroup(F);

g.test('color_textures,non_compressed,non_array')
  .desc(
    `
  Validate the correctness of the copy by filling the srcTexture with testable data and any
  non-compressed color format supported by WebGPU, doing CopyTextureToTexture() copy, and verifying
  the content of the whole dstTexture.

  Copy {1 texel block, part of, the whole} srcTexture to the dstTexture {with, without} a non-zero
  valid srcOffset that
  - covers the whole dstTexture subresource
  - covers the corners of the dstTexture
  - doesn't cover any texels that are on the edge of the dstTexture
  - covers the mipmap level > 0
  `
  )
  .params(u =>
    u
      .combine('format', kRegularTextureFormats)
      .beginSubcases()
      .combine('textureSize', [
        {
          srcTextureSize: { width: 32, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 32, height: 32, depthOrArrayLayers: 1 },
        },
        {
          srcTextureSize: { width: 31, height: 33, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 31, height: 33, depthOrArrayLayers: 1 },
        },
        {
          srcTextureSize: { width: 32, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 64, height: 64, depthOrArrayLayers: 1 },
        },
        {
          srcTextureSize: { width: 32, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 63, height: 61, depthOrArrayLayers: 1 },
        },
      ])
      .combine('copyBoxOffsets', kCopyBoxOffsetsForWholeDepth)
      .combine('srcCopyLevel', [0, 3])
      .combine('dstCopyLevel', [0, 3])
  )
  .fn(async t => {
    const { textureSize, format, copyBoxOffsets, srcCopyLevel, dstCopyLevel } = t.params;

    t.DoCopyTextureToTextureTest(
      textureSize.srcTextureSize,
      textureSize.dstTextureSize,
      format,
      copyBoxOffsets,
      srcCopyLevel,
      dstCopyLevel
    );
  });

g.test('color_textures,compressed,non_array')
  .desc(
    `
  Validate the correctness of the copy by filling the srcTexture with testable data and any
  compressed color format supported by WebGPU, doing CopyTextureToTexture() copy, and verifying
  the content of the whole dstTexture.
  `
  )
  .params(u =>
    u
      .combine('format', kCompressedTextureFormats)
      .beginSubcases()
      .combine('textureSize', [
        // The heights and widths are all power of 2
        {
          srcTextureSize: { width: 64, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 64, height: 32, depthOrArrayLayers: 1 },
        },
        // The virtual width of the source texture at mipmap level 2 (15) is not a multiple of 4
        {
          srcTextureSize: { width: 60, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 64, height: 32, depthOrArrayLayers: 1 },
        },
        // The virtual width of the destination texture at mipmap level 2 (15) is not a multiple
        // of 4
        {
          srcTextureSize: { width: 64, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 60, height: 32, depthOrArrayLayers: 1 },
        },
        // The virtual height of the source texture at mipmap level 2 (13) is not a multiple of 4
        {
          srcTextureSize: { width: 64, height: 52, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 64, height: 32, depthOrArrayLayers: 1 },
        },
        // The virtual height of the destination texture at mipmap level 2 (13) is not a
        // multiple of 4
        {
          srcTextureSize: { width: 64, height: 32, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 64, height: 52, depthOrArrayLayers: 1 },
        },
        // None of the widths or heights are power of 2
        {
          srcTextureSize: { width: 60, height: 52, depthOrArrayLayers: 1 },
          dstTextureSize: { width: 60, height: 52, depthOrArrayLayers: 1 },
        },
      ])
      .combine('copyBoxOffsets', kCopyBoxOffsetsForWholeDepth)
      .combine('srcCopyLevel', [0, 2])
      .combine('dstCopyLevel', [0, 2])
  )
  .fn(async t => {
    const { textureSize, format, copyBoxOffsets, srcCopyLevel, dstCopyLevel } = t.params;
    await t.selectDeviceOrSkipTestCase(kTextureFormatInfo[format].feature);

    t.DoCopyTextureToTextureTest(
      textureSize.srcTextureSize,
      textureSize.dstTextureSize,
      format,
      copyBoxOffsets,
      srcCopyLevel,
      dstCopyLevel
    );
  });

g.test('color_textures,non_compressed,array')
  .desc(
    `
  Validate the correctness of the texture-to-texture copy on 2D array textures by filling the
  srcTexture with testable data and any non-compressed color format supported by WebGPU, doing
  CopyTextureToTexture() copy, and verifying the content of the whole dstTexture.
  `
  )
  .params(u =>
    u
      .combine('format', kRegularTextureFormats)
      .beginSubcases()
      .combine('textureSize', [
        {
          srcTextureSize: { width: 64, height: 32, depthOrArrayLayers: 5 },
          dstTextureSize: { width: 64, height: 32, depthOrArrayLayers: 5 },
        },
        {
          srcTextureSize: { width: 31, height: 33, depthOrArrayLayers: 5 },
          dstTextureSize: { width: 31, height: 33, depthOrArrayLayers: 5 },
        },
      ])

      .combine('copyBoxOffsets', kCopyBoxOffsetsFor2DArrayTextures)
      .combine('srcCopyLevel', [0, 3])
      .combine('dstCopyLevel', [0, 3])
  )
  .fn(async t => {
    const { textureSize, format, copyBoxOffsets, srcCopyLevel, dstCopyLevel } = t.params;

    t.DoCopyTextureToTextureTest(
      textureSize.srcTextureSize,
      textureSize.dstTextureSize,
      format,
      copyBoxOffsets,
      srcCopyLevel,
      dstCopyLevel
    );
  });

g.test('color_textures,compressed,array')
  .desc(
    `
  Validate the correctness of the texture-to-texture copy on 2D array textures by filling the
  srcTexture with testable data and any compressed color format supported by WebGPU, doing
  CopyTextureToTexture() copy, and verifying the content of the whole dstTexture.
  `
  )
  .params(u =>
    u
      .combine('format', kCompressedTextureFormats)
      .beginSubcases()
      .combine('textureSize', [
        // The heights and widths are all power of 2
        {
          srcTextureSize: { width: 8, height: 8, depthOrArrayLayers: 5 },
          dstTextureSize: { width: 8, height: 8, depthOrArrayLayers: 5 },
        },
        // None of the widths or heights are power of 2
        {
          srcTextureSize: { width: 60, height: 52, depthOrArrayLayers: 5 },
          dstTextureSize: { width: 60, height: 52, depthOrArrayLayers: 5 },
        },
      ])

      .combine('copyBoxOffsets', kCopyBoxOffsetsFor2DArrayTextures)
      .combine('srcCopyLevel', [0, 2])
      .combine('dstCopyLevel', [0, 2])
  )
  .fn(async t => {
    const { textureSize, format, copyBoxOffsets, srcCopyLevel, dstCopyLevel } = t.params;
    await t.selectDeviceOrSkipTestCase(kTextureFormatInfo[format].feature);

    t.DoCopyTextureToTextureTest(
      textureSize.srcTextureSize,
      textureSize.dstTextureSize,
      format,
      copyBoxOffsets,
      srcCopyLevel,
      dstCopyLevel
    );
  });

g.test('zero_sized')
  .desc(
    `
  Validate the correctness of zero-sized copies (should be no-ops).

  - Copies that are zero-sized in only one dimension {x, y, z}, each touching the {lower, upper} end
  of that dimension.
  `
  )
  .paramsSubcasesOnly(u =>
    u //
      .combine('copyBoxOffset', [
        // copyExtent.width === 0
        {
          srcOffset: { x: 0, y: 0, z: 0 },
          dstOffset: { x: 0, y: 0, z: 0 },
          copyExtent: { width: -64, height: 0, depthOrArrayLayers: 0 },
        },
        // copyExtent.width === 0 && srcOffset.x === textureWidth
        {
          srcOffset: { x: 64, y: 0, z: 0 },
          dstOffset: { x: 0, y: 0, z: 0 },
          copyExtent: { width: -64, height: 0, depthOrArrayLayers: 0 },
        },
        // copyExtent.width === 0 && dstOffset.x === textureWidth
        {
          srcOffset: { x: 0, y: 0, z: 0 },
          dstOffset: { x: 64, y: 0, z: 0 },
          copyExtent: { width: -64, height: 0, depthOrArrayLayers: 0 },
        },
        // copyExtent.height === 0
        {
          srcOffset: { x: 0, y: 0, z: 0 },
          dstOffset: { x: 0, y: 0, z: 0 },
          copyExtent: { width: 0, height: -32, depthOrArrayLayers: 0 },
        },
        // copyExtent.height === 0 && srcOffset.y === textureHeight
        {
          srcOffset: { x: 0, y: 32, z: 0 },
          dstOffset: { x: 0, y: 0, z: 0 },
          copyExtent: { width: 0, height: -32, depthOrArrayLayers: 0 },
        },
        // copyExtent.height === 0 && dstOffset.y === textureHeight
        {
          srcOffset: { x: 0, y: 0, z: 0 },
          dstOffset: { x: 0, y: 32, z: 0 },
          copyExtent: { width: 0, height: -32, depthOrArrayLayers: 0 },
        },
        // copyExtent.depthOrArrayLayers === 0
        {
          srcOffset: { x: 0, y: 0, z: 0 },
          dstOffset: { x: 0, y: 0, z: 0 },
          copyExtent: { width: 0, height: 0, depthOrArrayLayers: -5 },
        },
        // copyExtent.depthOrArrayLayers === 0 && srcOffset.z === textureDepth
        {
          srcOffset: { x: 0, y: 0, z: 5 },
          dstOffset: { x: 0, y: 0, z: 0 },
          copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
        },
        // copyExtent.depthOrArrayLayers === 0 && dstOffset.z === textureDepth
        {
          srcOffset: { x: 0, y: 0, z: 0 },
          dstOffset: { x: 0, y: 0, z: 5 },
          copyExtent: { width: 0, height: 0, depthOrArrayLayers: 0 },
        },
      ])
      .combine('srcCopyLevel', [0, 3])
      .combine('dstCopyLevel', [0, 3])
  )
  .fn(async t => {
    const { copyBoxOffset, srcCopyLevel, dstCopyLevel } = t.params;

    const format = 'rgba8unorm';
    const textureSize = { width: 64, height: 32, depthOrArrayLayers: 5 };

    t.DoCopyTextureToTextureTest(
      textureSize,
      textureSize,
      format,
      copyBoxOffset,
      srcCopyLevel,
      dstCopyLevel
    );
  });

g.test('copy_stencil_aspect')
  .desc(
    `
  Validate the correctness of copyTextureToTexture() with stencil aspect.

  For all the texture formats with stencil aspect:
  - Initialize the stencil aspect of the source texture with writeTexture().
  - Copy the stencil aspect from the source texture into the destination texture
  - Copy the stencil aspect of the destination texture into another staging buffer and check its
    content
  - Test the copies from / into zero / non-zero array layer / mipmap levels
  - Test copying multiple array layers
  `
  )
  .params(u =>
    u
      .combine('format', kDepthStencilFormats)
      .beginSubcases()
      .combine('srcTextureSize', [
        { width: 32, height: 16, depthOrArrayLayers: 1 },
        { width: 32, height: 16, depthOrArrayLayers: 4 },
        { width: 24, height: 48, depthOrArrayLayers: 5 },
      ])
      .combine('srcCopyLevel', [0, 2])
      .combine('dstCopyLevel', [0, 2])
      .combine('srcCopyBaseArrayLayer', [0, 1])
      .combine('dstCopyBaseArrayLayer', [0, 1])
      .filter(t => {
        return (
          kTextureFormatInfo[t.format].stencil &&
          t.srcTextureSize.depthOrArrayLayers > t.srcCopyBaseArrayLayer &&
          t.srcTextureSize.depthOrArrayLayers > t.dstCopyBaseArrayLayer
        );
      })
  )
  .fn(async t => {
    const {
      format,
      srcTextureSize,
      srcCopyLevel,
      dstCopyLevel,
      srcCopyBaseArrayLayer,
      dstCopyBaseArrayLayer,
    } = t.params;
    await t.selectDeviceForTextureFormatOrSkipTestCase(format);

    const copySize: [number, number, number] = [
      srcTextureSize.width >> srcCopyLevel,
      srcTextureSize.height >> srcCopyLevel,
      srcTextureSize.depthOrArrayLayers - Math.max(srcCopyBaseArrayLayer, dstCopyBaseArrayLayer),
    ];
    const sourceTexture = t.device.createTexture({
      format,
      size: srcTextureSize,
      usage:
        GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      mipLevelCount: srcCopyLevel + 1,
    });
    const destinationTexture = t.device.createTexture({
      format,
      size: [
        copySize[0] << dstCopyLevel,
        copySize[1] << dstCopyLevel,
        srcTextureSize.depthOrArrayLayers,
      ] as const,
      usage:
        GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      mipLevelCount: dstCopyLevel + 1,
    });

    const initialStencilData = t.GetInitialStencilDataPerMipLevel(
      srcTextureSize,
      format,
      srcCopyLevel
    );
    t.InitializeStencilAspect(
      sourceTexture,
      initialStencilData,
      srcCopyLevel,
      srcCopyBaseArrayLayer,
      copySize
    );

    const encoder = t.device.createCommandEncoder();
    encoder.copyTextureToTexture(
      {
        texture: sourceTexture,
        mipLevel: srcCopyLevel,
        origin: { x: 0, y: 0, z: srcCopyBaseArrayLayer },
      },
      {
        texture: destinationTexture,
        mipLevel: dstCopyLevel,
        origin: { x: 0, y: 0, z: dstCopyBaseArrayLayer },
      },
      copySize
    );
    t.queue.submit([encoder.finish()]);

    t.VerifyStencilAspect(
      destinationTexture,
      initialStencilData,
      dstCopyLevel,
      dstCopyBaseArrayLayer,
      copySize
    );
  });
