---
title: 检索增强生成（RAG）：构建个人与企业专属知识库
category: 高效应用与工程实践
updated_at: 2026-11-25
level: 通识进阶
---

# 检索增强生成（RAG）：构建个人与企业专属知识库

> **核心摘要**：检索增强生成是在回答前从外部资料中检索相关内容，再将这些内容提供给模型生成答案的方法。它有助于利用个人或企业知识，并保留核查依据，但效果同时取决于资料治理、检索质量和生成过程。

## 1. 概念解析与生活类比

**检索增强生成（Retrieval-Augmented Generation，RAG）**将外部信息检索与语言生成结合，使回答可以参考模型训练之外的资料。2020 年的代表性论文系统研究了这一组合思路，但当今系统的实现方式已经更加多样。[[1]](https://arxiv.org/abs/2005.11401)

它类似“带着资料回答问题”的人事专员。员工询问异地出差报销标准时，专员先找出适用地区、当前有效的制度与附件，再解释条款，并给出出处。仅凭记忆作答、只把一批文件存进网盘，都没有完成这一过程。

一个常见流程包括：

1. **整理资料**：识别正文、表格、标题、版本、生效日期与访问权限。
2. **建立索引**：把材料组织成可查找的内容单元，保留必要的上下文。
3. **检索与筛选**：根据问题寻找候选材料，再判断哪些最相关。
4. **组织回答**：将选出的证据提供给模型，形成解释并关联来源。

以上是常见设计思路，不意味着每个知识库产品都使用相同架构。尤其要注意，RAG 通常是在使用时补充资料，并不等于重新训练模型。

## 2. 核心价值与应用场景

RAG 解决的是“模型需要参考哪些特定资料，以及如何让资料参与回答”的问题。

| 场景 | 可接入的知识 | 关键治理要求 |
| --- | --- | --- |
| 企业制度问答 | 当前有效的流程、政策和附件 | 版本、地区与人员适用范围 |
| 客服支持 | 产品说明与已批准回复 | 区分现售、停产及不同版本 |
| 项目知识管理 | 决策记录与交付文档 | 保留时间、责任人与原始出处 |
| 个人学习 | 合法取得的教材与笔记 | 区分原文观点和个人理解 |

以报销制度为例，答案不仅应解释标准，还应显示依据的制度名称、版本与具体条款。如果找不到适用地区的规定，应说明资料缺失，并给出需要向谁确认，而不是用其他地区标准补齐。

验收时要分别检查三个环节：**该找的材料是否被找到，找到的材料是否适用，回答是否忠实反映材料**。用容易混淆的旧版本、跨部门问题和无答案问题做抽查，更能暴露真实缺陷。

## 3. 最新演进与代表性实践（2025–2026）

**从孤立片段检索走向保留语境。**Anthropic 于 2024 年 9 月介绍 Contextual Retrieval，在检索片段中补充解释性上下文，并结合其他检索与重排方式。这是理解后续知识库改进的重要基础：片段提到“本年度增长”时，必须能知道对应的公司与年份。[[2]](https://www.anthropic.com/research/contextual-retrieval)

**2025 年：检索能力更容易成为应用组件。**OpenAI 于 2025 年 3 月发布面向智能体的新工具，其中包括托管文件搜索。这是应用集成的代表案例，不意味着接入后可以省去资料清理和权限设计。[[3]](https://openai.com/index/new-tools-for-building-agents/)

**2026 年：知识应用更关注可信来源与内容授权。**Google 于 2026 年 7 月将 NotebookLM 更名为 Gemini Notebook；9 月的 Expert Intelligence 公告介绍了将兼容的已购电子书加入笔记本，并依据书中内容问答的能力。它是来源约束知识应用的产品案例，公开公告不足以证明其所有内部实现都采用同一种 RAG 架构。[[4]](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/)[[5]](https://workspaceupdates.googleblog.com/2026/09/introducing-expert-intelligence-in-Gemini-Notebook.html)

## 4. 常见认知误区与使用边界

- **误区一：上传文件就是训练出专属模型。**文件接入、索引检索和模型训练是不同机制。应确认资料如何进入答案，而非只看“专属”字样。
- **误区二：有 RAG 就不会幻觉。**检索可能漏掉证据，生成也可能过度推断。仍需检查引用与结论是否匹配。
- **误区三：所有内容一起入库，效果最好。**旧版、重复和冲突材料会增加判断难度。优先建立有效版本与适用范围，再扩大覆盖面。
- **误区四：检索到的内容都可以让当前用户看到。**权限应在检索与输出流程中实际执行，不能依赖模型自行判断保密等级。
- **误区五：长上下文出现后，RAG 已经失去价值。**是否需要检索，应结合资料规模、更新频率、权限和任务特点判断；两种方式也可以结合使用。

## 5. 参考来源（Sources）

- [1] [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) - Patrick Lewis 等 / 2020，基础论文
- [2] [Introducing Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval) - Anthropic / 2024
- [3] [New tools for building agents](https://openai.com/index/new-tools-for-building-agents/) - OpenAI / 2025
- [4] [NotebookLM is now Gemini Notebook](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/) - Google / 2026
- [5] [Introducing Expert Intelligence in Gemini Notebook](https://workspaceupdates.googleblog.com/2026/09/introducing-expert-intelligence-in-Gemini-Notebook.html) - Google Workspace / 2026
