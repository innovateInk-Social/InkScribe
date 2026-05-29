/**
 * Comprehensive Mock Database for standalone editor validation.
 * Represents standard InnovateInk article structures loaded with blocks and review threads.
 */
export const DEFAULT_MOCK_ARTICLE = {
  article_id: "123",
  version: 1,
  title: "The Future of Distributed AI Processing Platforms",
  blocks: [
    {
      id: "blk_01",
      type: "heading",
      content: "The Future of Distributed AI Processing Platforms",
      metadata: { level: 1, alignment: "left" }
    },
    {
      id: "blk_02",
      type: "paragraph",
      content: "As artificial intelligence models grow in size, deploying them on centralized nodes becomes increasingly expensive and single-point-of-failure prone. Distributed AI processing networks aim to partition massive neural networks across thousands of heterogeneous end-user machines worldwide.",
      metadata: { alignment: "left" }
    },
    {
      id: "blk_03",
      type: "callout",
      content: "Distributed topologies can reduce raw operational energy expenditures by up to 43% compared to hyperscale cloud datacenters.",
      metadata: { variant: "tip" }
    },
    {
      id: "blk_04",
      type: "heading",
      content: "Core Topology Integration",
      metadata: { level: 2, alignment: "left" }
    },
    {
      id: "blk_05",
      type: "paragraph",
      content: "Implementing a model partition layer requires strict execution protocols. For example, a pipeline parallel scheduler is used to stream micro-batches of tensor evaluations through the target nodes sequentially:",
      metadata: { alignment: "left" }
    },
    {
      id: "blk_06",
      type: "code",
      content: `async function distributeTensors(microBatch, nodeCluster) {\n  let currentTensor = microBatch.input;\n  for (const node of nodeCluster) {\n    currentTensor = await node.evaluate(currentTensor);\n  }\n  return currentTensor;\n}`,
      metadata: { language: "javascript" }
    },
    {
      id: "blk_07",
      type: "divider",
      content: "",
      metadata: {}
    },
    {
      id: "blk_08",
      type: "heading",
      content: "Benchmarked Comparison",
      metadata: { level: 3, alignment: "left" }
    },
    {
      id: "blk_09",
      type: "table",
      content: [
        ["Network Node Type", "Compute Power (TFLOPS)", "Average Network Latency"],
        ["Consumer GPU Cluster", "840 TFLOPS", "45 ms"],
        ["Edge Node Mobiles", "120 TFLOPS", "120 ms"],
        ["Dedicated Cloud Pods", "4200 TFLOPS", "4 ms"]
      ],
      metadata: {}
    },
    {
      id: "blk_10",
      type: "quote",
      content: "Decentralized machine learning is not just an efficiency gain; it is a fundamental democratization of cognitive infrastructure.",
      metadata: {}
    }
  ]
};

export const DEFAULT_MOCK_COMMENTS = {
  "blk_02": [
    {
      id: "c_01",
      author: "Dr. Sarah Mitchell (Lead Reviewer)",
      message: "Should we add a link to the original distributed AI consortium research paper here to support this claim?",
      timestamp: "2026-05-17T14:32:00Z",
      resolved: false
    },
    {
      id: "c_02",
      author: "Marcus Chen (Editor-in-Chief)",
      message: "Agreed. Let's make sure we source the 43% statistic cleanly in the callout below as well.",
      timestamp: "2026-05-17T14:45:00Z",
      resolved: false
    }
  ],
  "blk_06": [
    {
      id: "c_03",
      author: "DevOps Engineer",
      message: "The `nodeCluster` array should ideally be optimized with a load-balancer hook rather than a linear `for...of` loop.",
      timestamp: "2026-05-17T15:02:00Z",
      resolved: true // Already resolved comment thread!
    }
  ]
};
