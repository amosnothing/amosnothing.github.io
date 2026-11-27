---
layout: page
title: AI 通识
nav_order: 1
has_toc: false
subtitle: 人工智能基础、前沿能力、应用实践与安全合规
permalink: /ai-knowledge-base/
---

# AI 通识

面向非 AI 领域的专业研究人员，围绕科研资料处理、方法选择与结果核查，说明 AI 的计算机制和适用边界。原理、实证结果、产品声明与操作建议分别标明依据。

建议按下列模块顺序阅读，也可以按当前工作需要选择主题。各篇从具体问题展开，文末列出专业来源及其支持范围。产品入口、访问条件和法规实施安排，实际使用前仍需核对当前说明。

## 怎样阅读来源与证据等级

下列等级是本知识库用于区分证据用途的约定，不是论文质量排名或法律效力排序。同一来源也可能包含不同性质的内容，应按它实际支持的论断使用。

| 等级 | 可以用来支持什么 | 需要保留什么限制 |
| --- | --- | --- |
| E1 · 研究证据 | 有方法描述的论文、技术报告或工程实验；综述用于梳理定义和已有研究 | 说明模型、数据、任务与评测条件；预印本不等于已经同行评审，厂商实验不等于独立复现 |
| E2 · 实现与实践依据 | 官方接口、协议、公开实现、安全指南与工程经验 | 可解释具体机制或提供实践建议，不自动证明普遍效果；OWASP 指南也不是法律 |
| E3 · 产品方声明 | 产品名称、定位、发布与开放安排 | 用于确认厂商声明；演示、宣传与自报分数不能直接作为通用能力或业务收益结论 |
| N · 规范依据 | 法律、规章、规范性文件与官方实施说明 | 先判断法域、业务角色和适用条件；官方说明与法律文本的性质仍需分别标明 |

各篇参考来源同时标明类型、等级和支持范围。文中提出的评价与选型方法是实践建议，其适用性需要独立检验；教学构造不作为实测结果。

## 01 · 核心原理与基础概念

{% capture article_url %}{% link ai-knowledge-base/01-核心原理与基础概念/01-大语言模型基础：AI是如何理解与生成内容的.md %}{% endcapture %}
- [大语言模型基础：文本生成的统计机制与科研使用边界]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/01-核心原理与基础概念/02-上下文窗口（Context Window）：AI的短期工作记忆边界.md %}{% endcapture %}
- [上下文窗口（Context Window）：输入范围、计算成本与证据覆盖]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/01-核心原理与基础概念/03-大模型幻觉（Hallucination）：成因分析与应对策略.md %}{% endcapture %}
- [大模型幻觉（Hallucination）：事实错误、来源偏离与科研核查]({{ article_url | uri_escape }})

## 02 · 前沿能力演进（2026最新进展）

{% capture article_url %}{% link ai-knowledge-base/02-前沿能力演进（2026最新进展）/01-推理模型（Reasoning Models）：慢思考与复杂逻辑推演.md %}{% endcapture %}
- [推理模型（Reasoning Models）：计算预算、验证信号与结果可靠性]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/02-前沿能力演进（2026最新进展）/02-原生多模态技术：跨文本、图像与音视频的统一理解.md %}{% endcapture %}
- [多模态技术：科研图像、文字与音频的联合处理]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/02-前沿能力演进（2026最新进展）/03-AI智能体（AI Agents）：从对话交互到自主任务执行.md %}{% endcapture %}
- [AI 智能体（AI Agents）：模型输出与工具执行的连接机制]({{ article_url | uri_escape }})

## 03 · 高效应用与工程实践

{% capture article_url %}{% link ai-knowledge-base/03-高效应用与工程实践/01-提示词工程（Prompt Engineering）：结构化指令设计方法.md %}{% endcapture %}
- [提示词工程（Prompt Engineering）：科研任务的输入约束与对照评价]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/03-高效应用与工程实践/02-检索增强生成（RAG）：构建个人与企业专属知识库.md %}{% endcapture %}
- [检索增强生成（RAG）：科研文库的证据检索与生成评价]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/03-高效应用与工程实践/03-AI工作流自动化：多工具协同与效率提升实践.md %}{% endcapture %}
- [AI 工作流自动化：科研报告的状态控制与结果验收]({{ article_url | uri_escape }})

## 04 · 生态格局与安全合规

{% capture article_url %}{% link ai-knowledge-base/04-生态格局与安全合规/01-全球主流大模型与AI工具生态全景（2026版）.md %}{% endcapture %}
- [大模型与 AI 工具：科研任务的选型与可复现性（2026版）]({{ article_url | uri_escape }})
{% capture article_url %}{% link ai-knowledge-base/04-生态格局与安全合规/02-AI数据安全与隐私保护：合规使用准则.md %}{% endcapture %}
- [AI 数据安全与隐私保护：科研资料处理的责任与边界]({{ article_url | uri_escape }})
