---
title: 踩坑日记：ClassUtils 类型白名单遗漏 Collection
date: '2026-11-26T00:00:00+08:00'
tags: ['日记', '随笔', 'Java', 'Dubbo']
categories:
  - 日记
  - 随笔
---

## 问题现象

接口形参类型为 `java.util.Collection`，传入以下 JSON 数组：

```json
[
  "list_customer_head",
  "store_order_seq_prefix_config",
  "list_customer_filter",
  "auto_cancel_overtime_unpaid_order_config"
]
```

预期转换为包含四个字符串的集合，但修改后的 `ClassUtils` 会将整段 JSON 当作字符串传递，可能导致 Dubbo 泛化调用失败。

## 原因

为了限制任意类加载，`ClassUtils` 增加了类型白名单。

白名单包含 `java.util.List`、`java.util.Set` 等集合类型，但遗漏了 `java.util.Collection`。白名单按完整类名匹配，**允许 `List`，不会自动允许它的父接口 `Collection`**。

因此，`Collection` 会进入兜底逻辑。该逻辑只将 JSON 对象转换为 Map，数组 JSON 则保留为字符串，造成声明类型与实际值不匹配。

## 为什么需要白名单

原来的处理方式类似：

```java
Class<?> clazz = Class.forName(用户填写的类型);
JacksonUtils.fromJson(用户填写的值, clazz);
```

这不只是转换数据，还可能执行代码：

- `Class.forName()` 可能执行类的静态初始化代码。
- JSON 反序列化可能调用构造函数、setter。
- 这些方法可能包含文件操作、网络请求等副作用。

如果不可信的人能控制参数配置，且客户端存在可利用的类，就可能触发非预期操作。白名单用于限制允许在客户端加载和实例化的类型。

## 处理方式

将 `Collection.class` 加入固定白名单，沿用现有 JSON 反序列化逻辑，同时保留传给 Dubbo 的形参类型 `java.util.Collection`。

补充回归测试，覆盖：

- 包含多个字符串的 JSON 数组。
- 空数组 `[]`。
- 空白参数值。
- `parseParameter` 和 `setDefaultParameter` 两个入口。

## 经验

增加安全限制时，需要同时验证已有功能的兼容性。尤其是按类名精确匹配的白名单，要检查常用接口和实现类是否都有覆盖。

`java.util.List` 已在白名单中，但不能因此直接替换接口声明中的 `java.util.Collection`。应修复类型转换逻辑，保持调用契约一致。

> 当前为源码审查结论，修复方案尚未实施，未验证实际 Dubbo 调用结果。
