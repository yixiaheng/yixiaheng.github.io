---
slug: event-uimanager
title: 基于本项目的UIManager框架介绍与分享
published: 2026-11-13T14:16:00+08:00
updated: 2026-11-13T14:16:00+08:00
draft: false
description: 本文以一个 Unity 游戏项目为例，介绍项目中 UI 框架的设计思路与实现方式。文章从
  UIConfig、UIRegistry、UIManager 和 UIPanel
  等核心模块出发，说明如何统一管理界面的创建、打开、关闭、层级、生命周期、缓存和场景归属，并进一步讨论
  UIHandle、父子窗口、返回键、输入状态、模态窗口、背景模糊、动画转场和 UI 上下文传递等功能。通过将面板自身的业务表现与 UIManager
  负责的公共管理逻辑分离，减少重复实现和模块之间的耦合，使项目中的界面遵循统一的管理规则。本文内容基于个人项目实践，相关设计会根据项目规模、输入系统和场景结构进行调整，并不代表唯一的
  UI 框架方案。
image: /images/uploads/camera_1040g3k831sqk0nbelm005oe6u4541s3g60moa6o.jpg
tags:
  - Unity
  - UI
  - 框架
category: 项目随笔
projects:
  - job-3d-turn-based
---
# 讨论项目中UI框架的实现

## UI框架是什么

### UI框架是一套统一管理 UI 创建、显示、关闭、层级、输入、生命周期和场景关系的公共系统

## 为什么需要UI框架

- 在游戏开发中，UI是我们经常使用的东西，它的使用也相当的简单，我们经常在UI其本身的脚本中直接规定它的各项功能，怎么打开/关闭它，处理各种逻辑。当它很少的时候，这确实很方便。
- 但是当项目中出现几十个或者上百个界面的时候(当然这个在大型游戏中很常见)，我们便会发现这貌似很难管理。我们尝试思考以下的问题

```
- 谁负责创建它？
- 它应该挂在哪个 Canvas 下？
- 它应该显示在 HUD、窗口、弹窗还是 Overlay 层？
- 打开它时是否需要暂停玩家？
- 是否需要显示鼠标？
- 是否阻止相机和移动输入？
- 另一个窗口打开时，下面的窗口要不要隐藏？
- 点击背景是否关闭？
- 按 Esc 应该关闭哪一个？
- 背景是否需要模糊？
- 界面关闭后是销毁还是缓存？
- 场景卸载时，这个界面是否应该一起销毁？
- 父窗口关闭时，子弹窗怎么办？
- 场景切换时，原来的 UI 是否需要挂起和恢复？
- 打开动画和关闭动画应该由谁控制？
```
- 面对如此多的各类功能，我们不可能讲它们的实现或调用逻辑都写到自己的那部分UI控制代码当中，这极大的增加了项目的管理成本。
#### 常见的问题：
```
同一个问题被实现很多遍
不同界面的关闭行为不一致
部分界面绕过 UIManager
某个界面关闭后，模态输入没有释放
某个场景卸载后，UIManager 仍然保留旧实例
某个弹窗显示在错误的层级
某个 UI 可以看见但无法点击
某个 UI 可以点击但没有真正关闭
```
所以，我们需要一套合适的UI框架来帮我们真正解决这个问题，将各种功能、规则全部集中起来

## 具体实现

- 接下来我们来探讨本项目中的框架具体实现
- 先谈论组成，再讨论具体功能

### UI框架的组成

#### 1、UI类型与规则

对应的文件是UIFrameworkTypes、UIConfig

```UIConfig C#
using UnityEngine;

namespace Game.UI
{
    [CreateAssetMenu(menuName = "Game/UI/UI Config", fileName = "UIConfig")]
    public class UIConfig : ScriptableObject
    {
        [Header("Identity")]
        public UIId id;
        public UIPanel prefab;

        [Header("Placement")]
        public UILayer layer = UILayer.Window;
        [Tooltip("Screen 挂到屏幕 UI 层；World 保留预制体的世界空间 Canvas 和坐标。")]
        public UISpace space = UISpace.Screen;

        [Header("Instance")]
        public UIInstanceMode instanceMode = UIInstanceMode.Single;
        public UICacheMode cacheMode = UICacheMode.Keep;
        public UILifetime lifetime = UILifetime.Scene;
        [Tooltip("关闭此项用于切换黑幕等系统 UI，使其不随业务场景界面挂起。")]
        public bool suspendWithPresentation = true;

        [Header("Navigation")]
        public bool handlesBack = true;
        public bool hideLowerWindows;

        [Header("Input")]
        public bool showCursor;
        public bool blockMovement;
        public bool blockCamera;

        [Header("Background")]
        public bool modal;
        public bool closeWhenClickMask;
        public bool blurBackground;

        private void OnValidate()
        {
            if (id == UIId.None)
                Debug.LogWarning($"UIConfig {name} 没有设置有效的 UIId", this);

            if (prefab == null)
                Debug.LogWarning($"UIConfig {name} 没有设置 UIPanel Prefab", this);
        }
    }
}

```
- 这一层解决的问题是
	UI是谁	
	哪种UI类型
	放在哪里
	何时销毁
	是否允许存在多个实例
	是否阻止输入
	是否需要模糊背景
	是否允许点击背景关闭
	等等
	

#### 2、UI注册与查找

- 具体代码在UIRegistry（ScriptableObject）
- 具体主要负责从UIId -> UIConfig的映射，所有的UIConfig都在这里注册。
- 这样做的好处是是UII的资源路径和实例化方法被隐藏，获取方式统一规划，清晰明了。

#### 3、UI实例管理层

- 主要是UIManager、UIInstanceRecord、UIHandle负责

```概念区分
UIId       = UI 类型
UIConfig   = UI 规则/ UIprefab
UIPanel    = 实际面板对象
UIHandle   = 某一次创建出来的实例编号
```

- UI的实例化一般有两种区分，
 	一种是多实例模式（同一个UIId可以对应多个UIHandle）
 	另一种是单实例模式（同一个 UIId 通常只保留一个实例）

UIManager内部有维护
```
Dictionary<int, UIInstanceRecord> instances;
Dictionary<UIId, UIInstanceRecord> singleInstances;
List<UIInstanceRecord> openedPanels;
```
分别对应以下三种问题
- 根据UIHandle查询实例
- 根据UIId查询单例
- 记录当前打开的UI顺序

#### 4、面板生命周期

- 首先，所有的框架面板都继承UIPanel
- 它提供统一的生命周期
```
Initialize  		
OpenRoutine
OnInitialize
OnOpen
OnOpened
OnContextChanged
OnClosing
OnClosed
ForceCloseImmediate
```
- 一个具体业务面板只需要关注自己的业务内容：
```
public sealed class SettingsPanel : UIPanel
{
    protected override void OnOpen(IUIContext context)
    {
        // 刷新设置界面
    }

    protected override void OnClosed()
    {
        // 清理自己的事件
    }
}
```
而以下流程由基类和 UIManager 负责：
```
面板初始化
面板状态切换
打开动画
关闭动画
CanvasGroup 交互控制
被覆盖状态
被场景挂起状态
上下文保存
```
以此来统一所有面板的生命周期。

以面板切换为例子，不使用UI框架时，我想要实现打开背包时关闭其它的所有窗口，我需要得到其它所有窗口的引用，或采用事件监听的方法，但是在框架中，因为有了统一的生命周期管理和UI登记，只需要调用相应的函数即可，降低了代码的解耦性，背包不需要知道其它UI到底是谁。

### UI框架实现什么功能

#### 1. 统一的创建与打开

- UIPanel应该通过调用UIManager.Instance.Open(UIId id)来打开/创建
```创建流程
通过UIId查询UIConfig
找到prefab
创建实例
挂载到正确的UIRoot
初始化UIPanel
分配UIHandle
绑定所属场景
应用Context
播放打开流程
```

#### 2.统一的关闭流程

- 同样统一在UIManager中处理 调用UIManager.Instance.Close(UIHandle handle);
或者Owner.Close(Handle);

- UIManager负责统一处理
```
- 关闭动画
- 子面板
- 背景模糊
- 模态输入
- UI层级
- 缓存策略
- OnClosing()
- OnClosed()
- 返回键状态Esc
```
项目中的关闭面板大致分两种
- 一种是提供button，直接注册相关的函数即可，效果就是点击按钮关闭
- 第二种是用于实现点击背景板关闭当前面板的效果，最为常用，实现在UIMaskClose

#### 3.UI层级管理
```UILayer层级
public enum UILayer
{
    HUD,		//探索 HUD、战斗状态栏
    Window,	//设置、背包、角色培养等
    Popup,		//角色选择，确认弹窗、药水使用等
    Toast,		//短暂提醒
    Overlay	//转场黑屏，全屏遮罩
}
```
- 排序：UIManager根据UILayer和打开顺序统一排序。
```
HUD -> Window -> Popup -> Toast -> Overlay
```
```
这里的顺序是当前项目中用于排序和显示层级的顺序。某个 Overlay 是否真的覆盖整个屏幕，还取决于它的预制体尺寸、Canvas 设置和自身布局，不能只由枚举名称保证。
避免每个面板自己写层级，统一保证
```
```
Popup 显示在 Window 上面
Window 显示在 HUD 上面
Overlay 可以盖住整个 UI
```

#### 4.ScreenSpace 和 WorldSpace管理
```UISpace 挂载空间
public enum UISpace
{
    Screen,
    World
}
```
一个是挂到 UIRoot 下对应的屏幕 UI 层

一个是挂到独立的 WorldUIRoot，保留预制体自身的世界空间 Canvas、位置和缩放。

#### 5.父子窗口关系管理
框架支持
```
父窗口
└── 子弹窗
```
打开子窗口时，可以传入父窗口句柄：
```
UIManager.Instance.Open(
    UIId.AlliesChoose,
    context,
    parent: partyHandle
);
```
这样 UIManager 会记录：
```
AlliesChoose.Parent = BattleParty
BattleParty.Children.Add(AlliesChoose)
```
父子关系带来的好处是：
```
- 父窗口关闭时，子窗口一起关闭；
- 子窗口不会错误地关闭父窗口；
- 场景清理时可以递归释放；
- 返回键可以优先处理最上层子窗口；
- 父窗口和子窗口可以共享场景归属。
```

#### 6.返回键和UI导航
- UI框架还需要统一处理 返回按键、系统返回键Esc
- 项目中的UIManager.Back()会从最上层查找可以返回的面板，基本上按照前面的层级从高到底，
最上层Popup -> Window -> 其他可返回面板

- 如果某个弹窗是强制确认弹窗，UIManager中有相应的判断
```
handlesBack = false
modal = true
```
那么UIManager不会跳过它去关闭下方窗口

#### 7.输入管理
- UI 打开后，通常会影响探索输入。

- 比如角色培养界面打开后：
```
玩家不能移动
玩家不能旋转镜头
鼠标应该显示
```
这些规则由 UIConfig 描述：
```
showCursor
blockMovement
blockCamera
```
然后由：
UIInputCoordinator
汇总所有当前打开 UI 的输入请求。
```例如：
SettingsPanel blockMovement = true
CharacterPanel blockCamera = true
```
UIManager 不需要让每个面板自己去写：
```
player.enabled = false;
camera.enabled = false;
```
而是统一发布当前 UI 的输入状态。

这样多个 UI 同时存在时，可以正确合并状态。

```例如：
窗口 A 阻止移动
窗口 B 阻止相机
最终状态应该是：
阻止移动 = true
阻止相机 = true
而不是某个窗口关闭后把另一个窗口的限制也错误清掉。
```

### 8.鼠标状态管理

- 在游戏中的不同状态，鼠标会显示/隐藏，UI界面的鼠标显隐，UIManager会统一处理
```
Cursor.lockState
Cursor.visible
```
关闭UI后恢复原状态，统一处理，不需要在UI代码中硬编码


### 9.模态窗口管理

- 当前窗口打开时，下面的UI不应该继续交互
``` UIconfig
modal
hideLowerWindows
```
- modal 表示当前窗口会覆盖下层窗口的交互。

- hideLowerWindows 表示在被覆盖时，进一步隐藏下方的 Window 和 Popup。

- 当前项目中，hideLowerWindows 只负责隐藏 Window 和 Popup，HUD 不会因为这个字段自动隐藏。

UIManager 的 RefreshFrameworkState() 和 RefreshCoveredState() 会统一计算：
- 哪些窗口被覆盖；
- 哪些窗口需要隐藏；
- 哪些窗口需要禁止交互；
- 哪些窗口可以响应返回键。
这样业务界面不需要自己禁用下面的窗口。


### 10.背景模糊管理

每个UI界面都应该记录自己是否有模糊请求，这里不能只用全局一个变量来统计，因为关闭其中一个窗口时，另一个窗口可能仍然需要模糊。

项目中：
```
UIBackgroundController
```
会根据每个 UIHandle 记录请求：
```
SettingsPanel 的 handle 请求模糊
CharacterPanel 的 handle 请求模糊
```
只有当所有请求都释放后，模糊才真正关闭。

具体的模糊实现代码位于UIBlurManager，执行实际的模糊渲染，这里不再展开讲解

### 11.动画和转场管理

UI框架还需要统一管理
```
打开动画
关闭动画
场景淡入淡出
遮罩动画
```
项目中的：
```
UITransition
UIFadeTransition
SceneTransitionPanel
```
负责这些效果。

UIManager 负责调用时机：
```
OpenRoutine()
    ↓
播放打开动画
    ↓
动画完成后进入 Open 状态
关闭时：
CloseRoutine()
    ↓
进入 Closing 状态
    ↓
播放关闭动画
    ↓
执行 OnClosed()
    ↓
进入 Closed 状态
```
好处是所有窗口的生命周期状态一致。

### 12.场景的生命周期管理
- UIConfig需要确认UILifetime
```
UILifetime.Global
UILifetime.Scene
```
是跨场景留存，还是仅仅在当前场景中才会显示

同时场景UI也需要记录
```
OwnerSceneHandle
```
当场景卸载时，UIManager 自动调用：
```
ReleaseSceneUI(scene.handle);
```
最终的效果是离开一个场景，只清楚属于这个场景的SceneUI，Global继续保留


### 13.UI的缓存和销毁

- 不同 UI 的创建成本不同。

- 有些界面适合缓存：
```
Settings
Backpack
CharacterPanel
```
- 有些弹窗关闭后可以直接销毁：
```
CharacterConfirm
BattleResult
临时提示窗口
```

UIConfig 通过：
```
UICacheMode.Keep
UICacheMode.DestroyOnClose
```
决定关闭后的行为。
```
Keep
    关闭后隐藏，保留实例
    下次打开时复用

DestroyOnClose
    关闭后释放实例和 GameObject
```
这样业务代码不需要自己决定：
```
Destroy(gameObject);
```

避免业务层和 UIManager 产生冲突。


### 14.UI上下文传递

- 大部分的UI显示，需要各种各样的游戏数据，比如当你打开背包的时候
```你需要知道
物品种类
物品数量
玩家持有的所有问题
等等
```
这些数据就可以通过```IUIContext```传递
这里用角色培养升级举例子
```
UIManager.Instance.Open(
    UIId.CharacterConfirm,
    new CharacterPopupContext(parent, preview),
    parentHandle
);

```
UIManager 负责：
```
保存 Context
传递给 UIPanel.OnOpen()
在同一个实例复用时调用 OnContextChanged()
```
具体业务面板负责解释 Context：
```
protected override void OnOpen(IUIContext context)
{
    data = context as CharacterPopupContext;
    Render();
}
```
这样 UIManager 不需要知道：
- 什么是角色培养
- 什么是装备
- 什么是战斗队伍
它只负责传递上下文。

## UI框架不应该负责什么
UI 框架很重要，但不能把所有逻辑都塞进 UIManager

UIManager不应该负责
- 角色升级规则
- 装备是否合法
- 材料是否足够
- 背包数据如何保存
- 战斗奖励如何计算
- 签到奖励如何发放
- NPC 对话内容
- 网络请求
- 账号认证

这些属于业务系统

## 总结
UI框架最终解决的核心问题
```
1. 统一创建
   所有 UI 都通过相同入口打开。

2. 统一层级
   HUD、Window、Popup、Toast、Overlay 有明确顺序。

3. 统一生命周期
   初始化、打开、关闭、缓存、销毁有统一规则。

4. 统一交互
   返回键、遮罩、输入、模态、鼠标状态统一管理。

5. 统一场景适配
   场景 UI 可以挂起、恢复和在卸载时清理。
```
所以 UI 框架并不是为了替代每一个面板，而是为了让所有面板都遵守同一套规则。

最重要的设计原则是：
面板负责自己的内容，UIManager 负责所有面板共同需要的管理工作。

个人博客：https://yixiaheng.github.io/

github:https://github.com/yixiaheng
