// AUTO-GENERATED - DO NOT EDIT. See src/common/tools/gen_listings.ts.

export const listing = [
  {
    "file": [],
    "readme": "WebGPU conformance test suite."
  },
  {
    "file": [
      "api"
    ],
    "readme": "Tests for full coverage of the Javascript API surface of WebGPU."
  },
  {
    "file": [
      "api",
      "operation"
    ],
    "readme": "Tests that check the result of performing valid WebGPU operations, taking advantage of\nparameterization to exercise interactions between features."
  },
  {
    "file": [
      "api",
      "operation",
      "buffers"
    ],
    "readme": "GPUBuffer tests."
  },
  {
    "file": [
      "api",
      "operation",
      "buffers",
      "map"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "operation",
      "buffers",
      "map_detach"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "operation",
      "buffers",
      "map_oom"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "operation",
      "command_buffer",
      "basic"
    ],
    "description": "Basic tests."
  },
  {
    "file": [
      "api",
      "operation",
      "command_buffer",
      "compute",
      "basic"
    ],
    "description": "Basic command buffer compute tests."
  },
  {
    "file": [
      "api",
      "operation",
      "command_buffer",
      "copies"
    ],
    "description": "copy{Buffer,Texture}To{Buffer,Texture} tests.\n\nTest Plan:\n* Validate the correctness of the copy by filling the srcBuffer with testable data, doing\n  CopyBufferToBuffer() copy, and verifying the content of the whole dstBuffer with MapRead:\n  Copy {4 bytes, part of, the whole} srcBuffer to the dstBuffer {with, without} a non-zero valid\n  srcOffset that\n  - covers the whole dstBuffer\n  - covers the beginning of the dstBuffer\n  - covers the end of the dstBuffer\n  - covers neither the beginning nor the end of the dstBuffer\n* Validate the state transitions after the copy:\n  first copy from srcBuffer to dstBuffer, then copy from dstBuffer to srcBuffer and check the\n  content of the whole dstBuffer\n* Validate the order of the copies in one command buffer:\n  first copy from srcBuffer to a region of dstBuffer, then copy from another part of srcBuffer to\n  another region of dstBuffer which have overlaps with the region of dstBuffer in the first copy\n  and check the content of the whole dstBuffer to see the copies are done in correct order."
  },
  {
    "file": [
      "api",
      "operation",
      "command_buffer",
      "render",
      "basic"
    ],
    "description": "Basic command buffer rendering tests."
  },
  {
    "file": [
      "api",
      "operation",
      "command_buffer",
      "render",
      "rendering"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "operation",
      "command_buffer",
      "render",
      "storeop"
    ],
    "description": "renderPass store op test that drawn quad is either stored or cleared based on storeop"
  },
  {
    "file": [
      "api",
      "operation",
      "copyBetweenLinearDataAndTexture"
    ],
    "description": "writeTexture + copyBufferToTexture + copyTextureToBuffer operation tests.\n\n* copy_with_various_rows_per_image_and_bytes_per_row: test that copying data with various bytesPerRow (including { ==, > } bytesInACompleteRow) and rowsPerImage (including { ==, > } copyExtent.height) values and minimum required bytes in copy works for every format. Also covers special code paths:\n  - bufferSize - offset < bytesPerImage * copyExtent.depth\n  - when bytesPerRow is not a multiple of 512 and copyExtent.depth > 1: copyExtent.depth % 2 == { 0, 1 }\n  - bytesPerRow == bytesInACompleteCopyImage\n\n* copy_with_various_offsets_and_data_sizes: test that copying data with various offset (including { ==, > } 0 and is/isn't power of 2) values and additional data paddings works for every format with 2d and 2d-array textures. Also covers special code paths:\n  - offset + bytesInCopyExtentPerRow { ==, > } bytesPerRow\n  - offset > bytesInACompleteCopyImage\n\n* copy_with_various_origins_and_copy_extents: test that copying slices of a texture works with various origin (including { origin.x, origin.y, origin.z } { ==, > } 0 and is/isn't power of 2) and copyExtent (including { copyExtent.x, copyExtent.y, copyExtent.z } { ==, > } 0 and is/isn't power of 2) values (also including {origin._ + copyExtent._ { ==, < } the subresource size of textureCopyView) works for all formats. origin and copyExtent values are passed as [number, number, number] instead of GPUExtent3DDict.\n\n* copy_various_mip_levels: test that copying various mip levels works for all formats. Also covers special code paths:\n  - the physical size of the subresouce is not equal to the logical size\n  - bufferSize - offset < bytesPerImage * copyExtent.depth and copyExtent needs to be clamped\n\n* copy_with_no_image_or_slice_padding_and_undefined_values: test that when copying a single row we can set any bytesPerRow value and when copying a single slice we can set rowsPerImage to 0. Also test setting offset, rowsPerImage, mipLevel, origin, origin.{x,y,z} to undefined.\n\n* TODO:\n  - add another initMethod which renders the texture\n  - test copyT2B with buffer size not divisible by 4 (not done because expectContents 4-byte alignment)\n  - add tests for 1d / 3d textures"
  },
  {
    "file": [
      "api",
      "operation",
      "fences"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "operation",
      "labels"
    ],
    "description": "For every create function, the descriptor.label is carried over to the object.label.\n\nTODO: implement"
  },
  {
    "file": [
      "api",
      "operation",
      "render_pass",
      "resolve"
    ],
    "description": "API Operation Tests for RenderPass StoreOp.\nTests a render pass with a resolveTarget resolves correctly for many combinations of:\n  - number of color attachments, some with and some without a resolveTarget\n  - renderPass storeOp set to {‘store’, ‘clear’}\n  - resolveTarget mip level set to {‘0’, base mip > ‘0’}\n  - resolveTarget base array layer set to {‘0’, base layer > '0'} for 2D textures\n  TODO: test all renderable color formats\n  TODO: test that any not-resolved attachments are rendered to correctly."
  },
  {
    "file": [
      "api",
      "operation",
      "render_pass",
      "storeOp"
    ],
    "description": "API Operation Tests for RenderPass StoreOp.\n\n  Test Coverage:\n\n  - Tests that color and depth-stencil store operations {'clear', 'store'} work correctly for a\n    render pass with both a color attachment and depth-stencil attachment.\n      TODO: use depth24plus-stencil8\n\n  - Tests that store operations {'clear', 'store'} work correctly for a render pass with multiple\n    color attachments.\n      TODO: test with more interesting loadOp values\n\n  - Tests that store operations {'clear', 'store'} work correctly for a render pass with a color\n    attachment for:\n      - All renderable color formats\n      - mip level set to {'0', mip > '0'}\n      - array layer set to {'0', layer > '1'} for 2D textures\n      TODO: depth slice set to {'0', slice > '0'} for 3D textures\n\n  - Tests that store operations {'clear', 'store'} work correctly for a render pass with a\n    depth-stencil attachment for:\n      - All renderable depth-stencil formats\n      - mip level set to {'0', mip > '0'}\n      - array layer set to {'0', layer > '1'} for 2D textures\n      TODO: test depth24plus and depth24plus-stencil8 formats\n      TODO: test that depth and stencil aspects are set seperately\n      TODO: depth slice set to {'0', slice > '0'} for 3D textures\n      TODO: test with more interesting loadOp values"
  },
  {
    "file": [
      "api",
      "operation",
      "resource_init",
      "texture_zero_init"
    ],
    "description": "Test uninitialized textures are initialized to zero when read."
  },
  {
    "file": [
      "api",
      "regression"
    ],
    "readme": "One-off tests that reproduce API bugs found in implementations to prevent the bugs from\nappearing again."
  },
  {
    "file": [
      "api",
      "validation"
    ],
    "readme": "Positive and negative tests for all the validation rules of the API."
  },
  {
    "file": [
      "api",
      "validation",
      "buffer",
      "create"
    ],
    "description": "Tests for validation in createBuffer."
  },
  {
    "file": [
      "api",
      "validation",
      "buffer",
      "destroy"
    ],
    "description": "Destroying a buffer more than once is allowed."
  },
  {
    "file": [
      "api",
      "validation",
      "buffer",
      "mapping"
    ],
    "description": "Validation tests for GPUBuffer.mapAsync, GPUBuffer.unmap and GPUBuffer.getMappedRange."
  },
  {
    "file": [
      "api",
      "validation",
      "capability_checks",
      "features"
    ],
    "readme": "Test every method or option that shouldn't be valid without an feature enabled.\n\n- x= that feature {enabled, disabled}\n\nOne file for each feature name.\n\nTODO: implement"
  },
  {
    "file": [
      "api",
      "validation",
      "capability_checks",
      "limits"
    ],
    "readme": "Test everything that shouldn't be valid without a higher-than-specified limit.\n\n- x= that limit {default, max supported (if different), lower than default (TODO: if allowed)}\n\nOne file for each limit name.\n\nTODO: implement"
  },
  {
    "file": [
      "api",
      "validation",
      "copyBufferToBuffer"
    ],
    "description": "copyBufferToBuffer tests.\n\nTest Plan:\n* Buffer is valid/invalid\n  - the source buffer is invalid\n  - the destination buffer is invalid\n* Buffer usages\n  - the source buffer is created without GPUBufferUsage::COPY_SRC\n  - the destination buffer is created without GPUBufferUsage::COPY_DEST\n* CopySize\n  - copySize is not a multiple of 4\n  - copySize is 0\n* copy offsets\n  - sourceOffset is not a multiple of 4\n  - destinationOffset is not a multiple of 4\n* Arthimetic overflow\n  - (sourceOffset + copySize) is overflow\n  - (destinationOffset + copySize) is overflow\n* Out of bounds\n  - (sourceOffset + copySize) > size of source buffer\n  - (destinationOffset + copySize) > size of destination buffer\n* Source buffer and destination buffer are the same buffer"
  },
  {
    "file": [
      "api",
      "validation",
      "copyTextureToTexture"
    ],
    "description": "copyTextureToTexture tests.\n\nTest Plan: (TODO(jiawei.shao@intel.com): add tests on aspects and 1D/3D textures)\n* the source and destination texture\n  - the {source, destination} texture is {invalid, valid}.\n  - mipLevel {>, =, <} the mipmap level count of the {source, destination} texture.\n  - the source texture is created {with, without} GPUTextureUsage::CopySrc.\n  - the destination texture is created {with, without} GPUTextureUsage::CopyDst.\n* sample count\n  - the sample count of the source texture {is, isn't} equal to the one of the destination texture\n  - when the sample count is greater than 1:\n    - it {is, isn't} a copy of the whole subresource of the source texture.\n    - it {is, isn't} a copy of the whole subresource of the destination texture.\n* texture format\n  - the format of the source texture {is, isn't} equal to the one of the destination texture.\n    - including: depth24plus-stencil8 to/from {depth24plus, stencil8}.\n  - for each depth and/or stencil format: a copy between two textures with same format:\n    - it {is, isn't} a copy of the whole subresource of the {source, destination} texture.\n* copy ranges\n  - if the texture dimension is 2D:\n    - (srcOrigin.x + copyExtent.width) {>, =, <} the width of the subresource size of source\n      textureCopyView.\n    - (srcOrigin.y + copyExtent.height) {>, =, <} the height of the subresource size of source\n      textureCopyView.\n    - (srcOrigin.z + copyExtent.depth) {>, =, <} the depth of the subresource size of source\n      textureCopyView.\n    - (dstOrigin.x + copyExtent.width) {>, =, <} the width of the subresource size of destination\n      textureCopyView.\n    - (dstOrigin.y + copyExtent.height) {>, =, <} the height of the subresource size of destination\n      textureCopyView.\n    - (dstOrigin.z + copyExtent.depth) {>, =, <} the depth of the subresource size of destination\n      textureCopyView.\n* when the source and destination texture are the same one:\n  - the set of source texture subresources {has, doesn't have} overlaps with the one of destination\n    texture subresources."
  },
  {
    "file": [
      "api",
      "validation",
      "copy_between_linear_data_and_texture"
    ],
    "readme": "writeTexture + copyBufferToTexture + copyTextureToBuffer validation tests.\n\nTest coverage:\n* resource usages:\n\t- texture_usage_must_be_valid: for GPUTextureUsage::COPY_SRC, GPUTextureUsage::COPY_DST flags.\n\t- TODO: buffer_usage_must_be_valid\n\n* textureCopyView:\n\t- texture_must_be_valid: for valid, destroyed, error textures.\n\t- sample_count_must_be_1: for sample count 1 and 4.\n\t- mip_level_must_be_in_range: for various combinations of mipLevel and mipLevelCount.\n\t- texel_block_alignment_on_origin: for all formats and coordinates.\n\n* bufferCopyView:\n\t- TODO: buffer_must_be_valid\n\t- TODO: bytes_per_row_alignment\n\n* linear texture data:\n\t- bound_on_rows_per_image: for various combinations of copyDepth (1, >1), copyHeight, rowsPerImage.\n\t- offset_plus_required_bytes_in_copy_overflow\n\t- required_bytes_in_copy: testing minimal data size and data size too small for various combinations of bytesPerRow, rowsPerImage, copyExtent and offset. for the copy method, bytesPerRow is computed as bytesInACompleteRow aligned to be a multiple of 256 + bytesPerRowPadding * 256.\n\t- texel_block_alignment_on_rows_per_image: for all formats.\n\t- texel_block_alignment_on_offset: for all formats.\n\t- bound_on_bytes_per_row: for all formats and various combinations of bytesPerRow and copyExtent. for writeTexture, bytesPerRow is computed as (blocksPerRow * blockWidth * bytesPerBlock + additionalBytesPerRow) and copyExtent.width is computed as copyWidthInBlocks * blockWidth. for the copy methods, both values are mutliplied by 256.\n\t- bound_on_offset: for various combinations of offset and dataSize.\n\n* texture copy range:\n\t- 1d_texture: copyExtent.height isn't 1, copyExtent.depth isn't 1.\n\t- texel_block_alignment_on_size: for all formats and coordinates.\n\t- texture_range_conditons: for all coordinate and various combinations of origin, copyExtent, textureSize and mipLevel.\n\nTODO: more test coverage for 1D and 3D textures."
  },
  {
    "file": [
      "api",
      "validation",
      "copy_between_linear_data_and_texture",
      "copyBetweenLinearDataAndTexture_dataRelated"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "validation",
      "copy_between_linear_data_and_texture",
      "copyBetweenLinearDataAndTexture_textureRelated"
    ],
    "description": ""
  },
  {
    "file": [
      "api",
      "validation",
      "createBindGroup"
    ],
    "description": "createBindGroup validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "createBindGroupLayout"
    ],
    "description": "createBindGroupLayout validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "createPipelineLayout"
    ],
    "description": "createPipelineLayout validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "createSampler"
    ],
    "description": "createSampler validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "createTexture"
    ],
    "description": "createTexture validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "createView"
    ],
    "description": "createView validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "encoding",
      "cmds",
      "compute_pass"
    ],
    "description": "API validation test for compute pass"
  },
  {
    "file": [
      "api",
      "validation",
      "encoding",
      "cmds",
      "debug"
    ],
    "description": "API validation test for debug groups and markers\n\nTest Coverage:\n  - For each encoder type (GPUCommandEncoder, GPUComputeEncoder, GPURenderPassEncoder,\n  GPURenderBundleEncoder):\n    - Test that all pushDebugGroup must have a corresponding popDebugGroup\n      - Push and pop counts of 0, 1, and 2 will be used.\n      - An error must be generated for non matching counts.\n    - Test calling pushDebugGroup with empty and non-empty strings.\n    - Test inserting a debug marker with empty and non-empty strings."
  },
  {
    "file": [
      "api",
      "validation",
      "error_scope"
    ],
    "description": "Error scope validation tests.\n\nNote these must create their own device, not use GPUTest (that one already has error scopes on it).\n\nTODO: shorten test names; detail should move to the description.)\n\nTODO: consider slightly revising these tests to make sure they're complete. {\n    - push 0, pop 1\n    - push validation, push oom, pop, pop, pop\n    - push oom, push validation, pop, pop, pop\n    - push validation, pop, pop\n    - push oom, pop, pop\n    - push various x100000 (or some other large number), pop x100000, pop\n    - }"
  },
  {
    "file": [
      "api",
      "validation",
      "fences"
    ],
    "description": "fences validation tests.\n\nTODO: Add some more tests/cases (may replace some existing tests), e.g.:\n  For fence values 0 < x < y < z:\n  - initialValue=0, signal(0)\n  - initialValue=x, signal(x)\n  - initialValue=x, signal(y)\n  - initialValue=y, signal(x)\n  - initialValue=x, signal(y), signal(y)\n  - initialValue=x, signal(y), signal(z), wait(z)\n  - initialValue=x, signal(z), signal(y)\n  - initialValue=x, wait(x)\n  - initialValue=y, wait(x)\n  - initialValue=x, wait(y)\n  - initialValue=x, signal(y), wait(x)\n  - initialValue=x, signal(y), wait(y)\n  - etc."
  },
  {
    "file": [
      "api",
      "validation",
      "initialization",
      "requestDevice"
    ],
    "description": "Test validation conditions for requestDevice."
  },
  {
    "file": [
      "api",
      "validation",
      "query_set",
      "destroy"
    ],
    "description": "Destroying a query set more than once is allowed."
  },
  {
    "file": [
      "api",
      "validation",
      "queue"
    ],
    "readme": "Tests for validation that occurs inside queued operations\n(submit, writeBuffer, writeTexture, copyImageBitmapToTexture).\n\nBufferMapStatesToTest = {\n  mapped -> unmapped,\n  mapped at creation -> unmapped,\n  mapping pending -> unmapped,\n  pending -> mapped (await map),\n  unmapped -> pending (noawait map),\n  created mapped-at-creation,\n}\n\nNote writeTexture is tested in copyBetweenLinearDataAndTexture."
  },
  {
    "file": [
      "api",
      "validation",
      "queue",
      "buffer_mapped"
    ],
    "description": "Tests for map-state of mappable buffers used in submitted command buffers.\n\n- x= just before queue op, buffer in {BufferMapStatesToTest}\n- x= in every possible place for mappable buffer:\n  {writeBuffer, copyB2B {src,dst}, copyB2T, copyT2B, ..?}\n\nTODO: implement"
  },
  {
    "file": [
      "api",
      "validation",
      "queue",
      "copyImageBitmapToTexture"
    ],
    "description": "copyImageBitmapToTexture Validation Tests in Queue.\n\nTODO: Split this test plan per-test.\n\nTest Plan:\n- For source.imageBitmap:\n  - imageBitmap generated from ImageData:\n    - Check that an error is generated when imageBitmap is closed.\n\n- For destination.texture:\n  - For 2d destination textures:\n    - Check that an error is generated when texture is in destroyed state.\n    - Check that an error is generated when texture is an error texture.\n    - Check that an error is generated when texture is created without usage COPY_DST.\n    - Check that an error is generated when sample count is not 1.\n    - Check that an error is generated when mipLevel is too large.\n    - Check that an error is generated when texture format is not valid.\n\n- For copySize:\n  - Noop copy shouldn't throw any exception or return any validation error.\n  - Check that an error is generated when destination.texture.origin + copySize is too large.\n\nTODO: 1d, 3d texture and 2d array textures."
  },
  {
    "file": [
      "api",
      "validation",
      "queue",
      "destroyed",
      "buffer"
    ],
    "description": "Tests using a destroyed buffer on a queue.\n\n- used in {writeBuffer,\n  setBindGroup, copyB2B {src,dst}, copyB2T, copyT2B,\n  setIndexBuffer, {draw,dispatch}Indirect, ..?}\n- x= if applicable, {in pass, in bundle}\n- x= {destroyed, not destroyed (control case)}\n\nTODO: implement. (Search for other places some of these cases may have already been tested.)"
  },
  {
    "file": [
      "api",
      "validation",
      "queue",
      "destroyed",
      "query_set"
    ],
    "description": "Tests using a destroyed query set on a queue.\n\n- used in {resolveQuerySet, timestamp {compute, render, non-pass},\n    pipeline statistics {compute, render}, occlusion}\n- x= {destroyed, not destroyed (control case)}\n\nTODO: implement. (Search for other places some of these cases may have already been tested.)"
  },
  {
    "file": [
      "api",
      "validation",
      "queue",
      "destroyed",
      "texture"
    ],
    "description": "Tests using a destroyed texture on a queue.\n\n- used in {writeTexture,\n  setBindGroup, copyT2T {src,dst}, copyB2T, copyT2B, copyImageBitmapToTexture,\n  color attachment {0,>0}, {D,S,DS} attachment, ..?}\n- x= if applicable, {in pass, in bundle}\n- x= {destroyed, not destroyed (control case)}\n\nTODO: implement. (Search for other places some of these cases may have already been tested.)"
  },
  {
    "file": [
      "api",
      "validation",
      "queue",
      "writeBuffer"
    ],
    "description": "Tests writeBuffer validation.\n\n- buffer missing usage flag\n- bufferOffset {ok, too large for buffer}\n- dataOffset {ok, too large for data}\n- size {ok, too large for buffer}\n- size {ok, too large for data}\n- size unspecified; default {ok, too large for buffer}\n\nNote: destroyed buffer is tested in destroyed/.\n\nTODO: implement."
  },
  {
    "file": [
      "api",
      "validation",
      "queue_submit"
    ],
    "description": "queue submit validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "render_pass",
      "resolve"
    ],
    "description": "API Validation Tests for RenderPass Resolve.\n\n  Test Coverage:\n    - When resolveTarget is not null:\n      - Test that the colorAttachment is multisampled:\n        - A single sampled colorAttachment should generate an error.\n      - Test that the resolveTarget is single sampled:\n        - A multisampled resolveTarget should generate an error.\n      - Test that the resolveTarget has usage OUTPUT_ATTACHMENT:\n        - A resolveTarget without usage OUTPUT_ATTACHMENT should generate an error.\n      - Test that the resolveTarget's texture view describes a single subresource:\n        - A resolveTarget texture view with base mip {0, base mip > 0} and mip count of 1 should be\n          valid.\n          - An error should be generated when the resolve target view mip count is not 1 and base\n            mip is {0, base mip > 0}.\n        - A resolveTarget texture view with base array layer {0, base array layer > 0} and array\n          layer count of 1 should be valid.\n          - An error should be generated when the resolve target view array layer count is not 1 and\n            base array layer is {0, base array layer > 0}.\n      - Test that the resolveTarget's format is the same as the colorAttachment:\n        - An error should be generated when the resolveTarget's format does not match the\n          colorAttachment's format.\n      - Test that the resolveTarget's size is the same the colorAttachment:\n        - An error should be generated when the resolveTarget's height or width are not equal to\n          the colorAttachment's height or width."
  },
  {
    "file": [
      "api",
      "validation",
      "render_pass",
      "storeOp"
    ],
    "description": "API Validation Tests for RenderPass StoreOp.\n\nTest Coverage:\n  - Tests that when depthReadOnly is true, depthStoreOp must be 'store'.\n    - When depthReadOnly is true and depthStoreOp is 'clear', an error should be generated.\n\n  - Tests that when stencilReadOnly is true, stencilStoreOp must be 'store'.\n    - When stencilReadOnly is true and stencilStoreOp is 'clear', an error should be generated.\n\n  - Tests that the depthReadOnly value matches the stencilReadOnly value.\n    - When depthReadOnly does not match stencilReadOnly, an error should be generated.\n\n  - Tests that depthReadOnly and stencilReadOnly default to false."
  },
  {
    "file": [
      "api",
      "validation",
      "render_pass_descriptor"
    ],
    "description": "render pass descriptor validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "resource_usages",
      "textureUsageInPassEncoder"
    ],
    "description": "Texture Usages Validation Tests in Render Pass and Compute Pass.\n\nTest Coverage:\n  - For each combination of two texture usages:\n    - For various subresource ranges (different mip levels or array layers) that overlap a given\n      subresources or not for color formats:\n      - For various places that resources are used, for example, used in bundle or used in render\n        pass directly.\n        - Check that an error is generated when read-write or write-write usages are binding to the\n          same texture subresource. Otherwise, no error should be generated. One exception is race\n          condition upon two writeonly-storage-texture usages, which is valid.\n\n  - For each combination of two texture usages:\n    - For various aspects (all, depth-only, stencil-only) that overlap a given subresources or not\n      for depth/stencil formats:\n      - Check that an error is generated when read-write or write-write usages are binding to the\n        same aspect. Otherwise, no error should be generated.\n\n  - Test combinations of two shader stages:\n    - Texture usages in bindings with invisible shader stages should be validated. Invisible shader\n      stages include shader stage with visibility none, compute shader stage in render pass, and\n      vertex/fragment shader stage in compute pass.\n\n  - Tests replaced bindings:\n    - Texture usages via bindings replaced by another setBindGroup() upon the same bindGroup index\n      in render pass should be validated. However, replaced bindings should not be validated in\n      compute pass.\n\n  - Test texture usages in bundle:\n    - Texture usages in bundle should be validated if that bundle is executed in the current scope.\n\n  - Test texture usages with unused bindings:\n    - Texture usages should be validated even its bindings is not used in pipeline.\n\n  - Test texture usages validation scope:\n    - Texture usages should be validated per each render pass. And they should be validated per each\n      dispatch call in compute."
  },
  {
    "file": [
      "api",
      "validation",
      "setBindGroup"
    ],
    "description": "setBindGroup validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "setBlendColor"
    ],
    "description": "setBlendColor validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "setScissorRect"
    ],
    "description": "setScissorRect validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "setStencilReference"
    ],
    "description": "setStencilReference validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "setViewport"
    ],
    "description": "setViewport validation tests."
  },
  {
    "file": [
      "api",
      "validation",
      "state",
      "device_lost"
    ],
    "readme": "Tests of behavior while the device is lost.\n\n- x= every method in the API.\n\nTODO: implement"
  },
  {
    "file": [
      "api",
      "validation",
      "state",
      "device_mismatched"
    ],
    "readme": "Tests of behavior on one device using objects from another device.\n\n- x= every place in the API where an object is passed (as this, an arg, or a dictionary member).\n\nTODO: implement"
  },
  {
    "file": [
      "api",
      "validation",
      "texture",
      "destroy"
    ],
    "description": "Destroying a texture more than once is allowed."
  },
  {
    "file": [
      "examples"
    ],
    "description": "Examples of writing CTS tests with various features.\n\nStart here when looking for examples of basic framework usage."
  },
  {
    "file": [
      "idl"
    ],
    "readme": "Tests to check that the WebGPU IDL is correctly implemented, for examples that objects exposed\nexactly the correct members, and that methods throw when passed incomplete dictionaries.\n\nSee https://github.com/gpuweb/cts/issues/332"
  },
  {
    "file": [
      "idl",
      "constants",
      "flags"
    ],
    "description": "Test the values of flags interfaces (e.g. GPUTextureUsage)."
  },
  {
    "file": [
      "shader"
    ],
    "readme": "Tests for full coverage of the shaders that can be passed to WebGPU."
  },
  {
    "file": [
      "shader",
      "execution"
    ],
    "readme": "Tests that check the result of valid shader execution."
  },
  {
    "file": [
      "shader",
      "regression"
    ],
    "readme": "One-off tests that reproduce shader bugs found in implementations to prevent the bugs from\nappearing again."
  },
  {
    "file": [
      "shader",
      "validation"
    ],
    "readme": "Positive and negative tests for all the validation rules of the shading language."
  },
  {
    "file": [
      "util",
      "texture",
      "texelData"
    ],
    "description": "Test helpers for texel data produce the expected data in the shader"
  },
  {
    "file": [
      "web_platform"
    ],
    "readme": "Tests for Web platform-specific interactions like GPUSwapChain and canvas, WebXR,\nImageBitmaps, and video APIs."
  },
  {
    "file": [
      "web_platform",
      "canvas",
      "context_creation"
    ],
    "description": ""
  },
  {
    "file": [
      "web_platform",
      "copyImageBitmapToTexture"
    ],
    "description": "copy imageBitmap To texture tests."
  },
  {
    "file": [
      "web_platform",
      "reftests"
    ],
    "readme": "Reference tests (reftests) for WebGPU canvas presentation.\n\nThese render some contents to a canvas using WebGPU, and WPT compares the rendering result with\nthe \"reference\" versions (in `ref/`) which render with 2D canvas.\n\nThis tests things like:\n- The canvas has the correct orientation.\n- The canvas renders with the correct transfer function.\n- The canvas blends and interpolates in the correct color encoding.\n\nTODO: Test all possible output texture formats (currently only testing bgra8unorm).\nTODO: Test all possible ways to write into those formats (currently only testing B2T copy)."
  }
];
