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

### 1. 先把“类”理解成一种工具

可以把 Java 程序想成一个工具箱。“类”就是里面不同的工具：`String` 用来表示文字，`List` 用来装一组数据，其他类可能负责读文件、发网络请求。

我们本来只想把用户填的文字转换成接口需要的数据。例如：

```java
// 用户填写的目标类型：一个集合，可以装多个值。
String typeName = "java.util.Collection";

// 用户填写的参数值：一段 JSON 文字，里面有两个字符串。
String json = "[\"apple\", \"banana\"]";

// 我们希望得到：一个装着 apple 和 banana 的集合，
// 而不是把整段 JSON 原样当作一条字符串传出去。
```

这里，**JSON 是“要处理的数据”，类型名称是“用哪种工具处理”**。问题在于：如果工具也完全由输入决定，程序就可能用上原本不该在这里使用的类。

### 2. 为什么“按名字找一个类”也可能执行代码？

原来的代码大致分两步，下面是示意片段，`JacksonUtils` 代表项目现有的 JSON 转换工具：

```java
// 第一步：按照输入的名字查找类，并触发这个类的初始化。
Class<?> clazz = Class.forName(typeName);

// 第二步：把 JSON 文字转换成这个类型的 Java 对象。
Object value = JacksonUtils.fromJson(json, clazz);
```

第一步看起来只是在“查名字”，但 Java 的类可以带一段初始化代码。**第一次初始化这个类时，这段代码会自动执行，不需要另外调用它。**

下面是一个可以单独运行的小例子。保存为 `WhitelistDemo.java`，执行 `javac WhitelistDemo.java`，再执行 `java WhitelistDemo`：

```java
public class WhitelistDemo {
    public static class DemoTask {
        // static 代码块：这个类第一次初始化时自动执行。
        static {
            System.out.println("2. 类的初始化代码执行了");
        }

        // 构造函数：创建这个类的对象时执行。
        public DemoTask() {
            System.out.println("4. 创建对象的代码执行了");
        }
    }

    public static void main(String[] args) throws Exception {
        System.out.println("1. 准备按名字查找类");
        Class<?> clazz = Class.forName("WhitelistDemo$DemoTask");

        System.out.println("3. 准备创建对象");
        clazz.getDeclaredConstructor().newInstance();
    }
}
```

输出如下：

```text
1. 准备按名字查找类
2. 类的初始化代码执行了
3. 准备创建对象
4. 创建对象的代码执行了
```

例子只打印文字。但如果某个类在这些位置写的是“读文件”或“发请求”，执行的就是相应操作。JSON 转换工具在创建对象、填写属性时，也可能执行构造函数或设置属性的方法，具体取决于类本身和工具配置。例子中的创建对象操作是为了演示执行时机，不代表 Jackson 内部一定使用同样的代码。

这也不意味着输入任何类名就能执行任意代码：目标类首先必须能被当前程序找到，并且确实存在相关行为。白名单就是提前收紧可以选择的范围，避免把这些条件都交给外部输入碰运气。[Java 官方文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Class.html#forName(java.lang.String))说明了 `Class.forName(String)` 的初始化行为。

### 3. 白名单就像“只借出这几件工具”的清单

工具箱可以很大，但这个接口的参数转换只需要其中几种工具。白名单的意思是：**只有事先确认过的类型，才允许进入这条转换流程。**

下面用一个简化片段演示这种思路。`Map` 可以理解成一张“名称 → 类型”的对照表，`String.class` 表示程序里事先确定好的类型：

```java
// 开发者事先列出允许的类型，输入只能从这里选择。
java.util.Map<String, Class<?>> allowedTypes = java.util.Map.of(
    "java.lang.String", String.class,
    "java.util.List", java.util.List.class,
    "java.util.Set", java.util.Set.class,
    "java.util.Collection", java.util.Collection.class
);

// 先查清单，不再直接把输入交给 Class.forName()。
Class<?> clazz = allowedTypes.get(typeName);

if (clazz == null) {
    // 示例中直接拒绝；项目中应按已有约定处理未支持的类型。
    throw new IllegalArgumentException("不支持的参数类型：" + typeName);
}

// 只有清单里的类型，才进入 JSON 转换。
Object value = JacksonUtils.fromJson(json, clazz);
```

这是讲解原理的示意片段，不是项目的完整修复代码。实际白名单还需要覆盖已有功能使用的其他类型；未命中的情况也要遵循项目原有处理约定。

这张清单应当在加载输入指定的类、转换 JSON 之前检查。如果先执行 `Class.forName(typeName)`，再检查是否允许，那么类的初始化代码可能已经执行，检查就晚了。

### 4. 回到这次踩坑：清单漏了一项，就补上这一项

可以把这次问题理解为：“允许借出 List 工具，也允许借出 Set 工具，却忘了登记 Collection 工具。”因为清单按名称逐个查找，登记了 `java.util.List`，不会自动登记 `java.util.Collection`。

所以，修复方向是把 `Collection.class` 加入现有白名单，让 JSON 数组进入集合转换流程。`Collection` 本身是接口，具体创建哪种集合由 JSON 工具决定；传给 Dubbo 的形参类型仍然保留 `java.util.Collection`，与服务接口保持一致。

**漏了业务需要的类型，应补全白名单；不能为了让这次请求通过，就重新允许输入任意类名。** 类似门禁漏登记了一位应当进入的人，应该补登记，而不是把门禁拆掉。

白名单也不是所有 JSON 安全问题的万能解法。如果 JSON 工具还允许数据额外指定其他对象类型，那些类型也需要单独限制。这属于另一项配置检查，参见 [Jackson 官方安全说明](https://github.com/FasterXML/jackson-docs/wiki/JacksonPolymorphicDeserialization#111-security-risks-using-global-default-typing)。
