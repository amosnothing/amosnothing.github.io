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

## 补充：为什么需要给类加白名单

### 参数配置不应决定客户端执行哪些类

这里的输入同时包含“类型名称”和“参数值”。如果直接把用户填写的类型交给 `Class.forName()`，就相当于允许配置者从客户端运行环境中选择一个类，再交给 JSON 工具创建对象。参数转换因此跨越了信任边界：外部输入开始影响客户端执行哪些初始化和对象构造逻辑。

单参数的 `Class.forName(String)` 会初始化目标类，首次初始化时可能执行静态代码块。即使改用不触发初始化的加载方式，后续反序列化仍可能调用构造函数、工厂方法、setter 或自定义反序列化器，具体取决于目标类和 Jackson 配置。因此，仅避免类初始化并不能替代对目标类型的限制。[Java 官方文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Class.html#forName(java.lang.String))说明了该加载方法的初始化行为。

### 白名单把可用类型限制在明确需要的范围内

客户端通常只需要转换字符串、数字、布尔值以及常用集合等有限类型。固定白名单让程序只接受经过确认的类型，而不是默认信任运行环境中的所有类。相比不断补充危险类黑名单，白名单更容易明确允许范围，也能避免新增依赖后无意中扩大可加载类型。

风险是否能够被利用，仍取决于输入是否可控、客户端有哪些类、目标类的具体行为以及反序列化配置，不能仅凭使用了反射就认定一定能够远程执行代码。但这些条件不应成为放开任意类加载的理由。

### 应补全白名单，同时保留安全边界

本次问题是白名单遗漏了业务需要的 `java.util.Collection`。合理的处理是补充该类型并验证数组转换结果，继续保持 Dubbo 的形参声明；取消白名单或对所有类型重新开放 `Class.forName()`，都会重新引入原先需要限制的风险。

白名单也需要在类加载和反序列化之前生效。若 Jackson 另外启用了允许输入指定子类型的多态反序列化，还需要单独限制这些子类型；外层参数类型通过白名单，并不意味着内部对象类型就自动安全。Jackson 官方也提醒，不可信输入下的默认多态类型处理需要限制允许反序列化的类，参见[官方安全说明](https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization#111-security-risks-using-global-default-typing)。这里是补充的安全原则，尚未核实当前 `JacksonUtils` 是否启用了相关配置。

> 当前为源码审查结论，修复方案尚未实施，未验证实际 Dubbo 调用结果。
