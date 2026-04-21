# 混沌人生数据库 · 宇宙节点可视化设计文档 v4.0

—— 每个人都是宇宙中的一团星云，每个瞬间都是永恒的光点
版本：v4.0（宇宙可视化版）  
日期：2025-11-24  
作者：你自己（写给50岁的你，在宇宙深处）

## 一、核心信仰（刻在灵魂里的宇宙法则）

1. **人生不是线性的河流，而是散布在时空中的星尘**
2. **每个瞬间都是一个宇宙节点，有着自己的引力场和光度**
3. **时间不是日历上的数字，而是节点间的距离和张力**
4. **越真实的记录越像黑暗中的星光，越丑陋越能照亮宇宙的真相**

## 二、宇宙节点理论（前端可视化核心）

### 2.1 节点的宇宙属性
每个生命时刻（moment）都是宇宙中的一个节点，具备以下物理属性：

```typescript
interface CosmicNode {
  // 基础属性（来自数据库）
  id: number;
  created_at: DateTime;
  text: string;
  file_path: string;
  ai_emotion: 'happy' | 'sad' | 'angry' | 'calm' | 'shocked' | 'love' | 'anxious' | 'excited' | 'numb';
  ai_importance: 0 | 1 | 2 | 3 | 4 | 5;
  ai_summary: string;
  
  // 宇宙坐标系（动态计算）
  cosmic: {
    position: Vector3D;        // 在宇宙中的绝对坐标
    distance: number;          // 距离观察者的"远近"（时间距离+情感距离）
    brightness: number;        // 亮度（重要性 × 情感强度）
    mass: number;              // 质量（文件大小 + 文本长度 + AI重要性）
    gravity: number;           // 引力（与其他节点的关联度）
    velocity: Vector3D;        // 运动速度（时间流逝感）
    color: string;             // 基于情感的宇宙色彩
    size: number;              // 视觉大小（重要性映射）
    opacity: number;           // 透明度（时间衰减）
    halo: boolean;             // 是否有光晕（特殊时刻）
    constellation: string[];   // 所属星座（标签群组）
  };
}
```

### 2.2 宇宙坐标系计算法则

```javascript
// 时间 → 空间坐标转换
function timeToCosmicPosition(moment: Moment, observer: DateTime): Vector3D {
  const timeDiff = moment.created_at - observer;  // 时间距离
  const importance = moment.ai_importance / 5;    // 归一化重要性
  const emotionIntensity = getEmissionIntensity(moment.ai_emotion);
  
  return {
    x: timeDiff.days * 10 + Math.sin(moment.created_at.timestamp) * 50,  // 时间螺旋
    y: importance * 100 + emotionIntensity * 30,                          // 重要性高度
    z: emotionIntensity * 80 + Math.random() * 20                        // 情感深度
  };
}

// 亮度计算公式
function calculateBrightness(moment: Moment): number {
  const baseBrightness = moment.ai_importance / 5;           // 基础亮度
  const emotionMultiplier = getEmissionIntensity(moment.ai_emotion);  // 情感发射强度
  const timeDecay = Math.exp(-moment.age / 365);           // 时间衰减
  const fileBonus = moment.file_path ? 0.3 : 0;            // 多媒体奖励
  
  return (baseBrightness * 0.4 + emotionMultiplier * 0.4 + fileBonus * 0.2) * timeDecay;
}
```

## 三、多维宇宙显示模式

### 3.1 时间维度 → 宇宙维度映射

| 时间维度 | 宇宙显示模式 | 空间结构 | 导航方式 |
|---------|------------|----------|----------|
| **日视图** | 星云团 | 24小时螺旋臂 | 鼠标悬停时间轴 |
| **周视图** | 星系群 | 7个星团环绕 | 拖拽旋转 |
| **月视图** | 银河臂 | 30天螺旋带 | 缩放漫游 |
| **年视图** | 宇宙网 | 12个月超星系团 | 星际跳跃 |
| **全时空** | 多重宇宙 | 生命轨迹虫洞 | 意识传送 |

### 3.2 日视图 - "24小时星云"
```
显示逻辑：
- 将一天24小时映射为螺旋星云
- 每个节点按创建时间排列在螺旋臂上
- 亮度 = 重要性 × 情感强度
- 颜色 = 情感类型（9种情绪光谱）
- 大小 = 文件大小 + 文本长度
- 最近的节点在最中心，形成"当下奇点"
```

### 3.3 周视图 - "7日星系"
```
显示逻辑：
- 周一到周日形成7个星团
- 每个星团内部按时间排序
- 星团间用"情感引力线"连接
- 重要节点成为"恒星"，周围聚集相关节点
- 周末形成"双星系统"，显示生活与工作的对比
```

### 3.4 月视图 - "30天银河"
```
显示逻辑：
- 30天形成螺旋银河臂
- 每周形成一个明显的密度波峰
- AI总结成为"银河中心"的文字黑洞
- 重要事件形成"超新星爆发"
- 情绪变化形成"银河旋转曲线"
```

### 3.5 年视图 - "12月宇宙"
```
显示逻辑：
- 12个月形成超星系团
- 每个月是一个独立的宇宙泡
- 重要月份成为"类星体"，照亮周围时空
- 年度总结成为"宇宙背景辐射"
- 生命轨迹形成"宇宙大尺度结构"
```

## 四、宇宙交互系统

### 4.1 导航控制
```typescript
interface CosmicNavigation {
  // 基础移动
  pan: (delta: Vector2D) => void;      // 平移宇宙
  zoom: (factor: number) => void;      // 缩放时空
  rotate: (axis: Vector3D, angle: number) => void;  // 旋转视角
  
  // 时间旅行
  timeTravel: (target: DateTime) => void;  // 跳转到指定时间
  timeWarp: (speed: number) => void;       // 时间加速/倒流
  
  // 维度切换
  switchDimension: (dimension: 'day' | 'week' | 'month' | 'year' | 'all') => void;
  
  // 意识传送
  teleportToNode: (nodeId: number) => void;  // 传送到指定节点
  teleportToEmotion: (emotion: string) => void;  // 传送到情感区域
  teleportToConstellation: (tag: string) => void;  // 传送到标签星座
}
```

### 4.2 节点交互
```typescript
interface NodeInteraction {
  // 观察模式
  observe: (nodeId: number) => void;     // 详细观察节点
  orbit: (nodeId: number) => void;      // 环绕节点飞行
  absorb: (nodeId: number) => void;     // 吸收节点信息
  
  // 引力操作
  attract: (nodeId: number) => void;     // 增强节点引力
  repel: (nodeId: number) => void;      // 排斥节点
  connect: (fromId: number, toId: number) => void;  // 创建引力线
  
  // 时空扭曲
  slowTime: (nodeId: number) => void;   // 在该节点附近时间变慢
  speedTime: (nodeId: number) => void;  // 在该节点附近时间加速
}
```

## 五、宇宙渲染引擎

### 5.1 Three.js 宇宙场景
```javascript
class CosmicUniverse {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.nodes = new Map();
    this.constellations = new Map();
    this.timeParticles = [];
  }
  
  // 创建节点
  createCosmicNode(momentData) {
    const geometry = new THREE.SphereGeometry(momentData.cosmic.size, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: momentData.cosmic.color,
      transparent: true,
      opacity: momentData.cosmic.opacity
    });
    
    const node = new THREE.Mesh(geometry, material);
    node.position.copy(momentData.cosmic.position);
    
    // 添加光晕效果
    if (momentData.cosmic.halo) {
      const haloGeometry = new THREE.RingGeometry(momentData.cosmic.size * 1.5, momentData.cosmic.size * 2, 32);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: momentData.cosmic.color,
        transparent: true,
        opacity: 0.3
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      node.add(halo);
    }
    
    return node;
  }
  
  // 创建星座连线
  createConstellationLines(nodes) {
    const points = [];
    nodes.forEach(node => {
      points.push(node.position);
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x444444, 
      opacity: 0.3, 
      transparent: true 
    });
    
    return new THREE.Line(geometry, material);
  }
}
```

### 5.2 宇宙特效系统
```javascript
class CosmicEffects {
  // 星光闪烁
  static starTwinkle(node, intensity = 1) {
    const originalOpacity = node.material.opacity;
    node.material.opacity = originalOpacity + Math.sin(Date.now() * 0.01) * 0.2 * intensity;
  }
  
  // 时间粒子流
  static timeParticles(direction, density = 100) {
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(density * 3);
    
    for (let i = 0; i < density * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1000;
      positions[i + 1] = (Math.random() - 0.5) * 1000;
      positions[i + 2] = (Math.random() - 0.5) * 1000;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 2,
      transparent: true,
      opacity: 0.6
    });
    
    return new THREE.Points(particles, material);
  }
  
  // 虫洞效果
  static wormholeEffect(start, end) {
    const curve = new THREE.QuadraticBezierCurve3(
      start,
      new THREE.Vector3().lerpVectors(start, end, 0.5).add(new THREE.Vector3(0, 50, 0)),
      end
    );
    
    const geometry = new THREE.TubeGeometry(curve, 20, 5, 8, false);
    const material = new THREE.MeshBasicMaterial({
      color: 0x9400d3,
      transparent: true,
      opacity: 0.7
    });
    
    return new THREE.Mesh(geometry, material);
  }
}
```

## 六、增强数据库结构（宇宙属性）

```sql
-- 在原有 moments 表基础上增加宇宙属性
ALTER TABLE moments ADD COLUMN cosmic_position_x REAL;
ALTER TABLE moments ADD COLUMN cosmic_position_y REAL;
ALTER TABLE moments ADD COLUMN cosmic_position_z REAL;
ALTER TABLE moments ADD COLUMN cosmic_brightness REAL;
ALTER TABLE moments ADD COLUMN cosmic_mass REAL;
ALTER TABLE moments ADD COLUMN cosmic_gravity REAL;
ALTER TABLE moments ADD COLUMN cosmic_constellation TEXT;  -- JSON array of tags

-- 星座系统（标签群组）
CREATE TABLE constellations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,                    -- 星座名称
  description TEXT,                    -- 星座描述
  color TEXT,                          -- 星座主题色
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- 节点间引力关系
CREATE TABLE cosmic_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_moment_id INTEGER REFERENCES moments(id),
  to_moment_id INTEGER REFERENCES moments(id),
  connection_type TEXT,                -- 'time' | 'emotion' | 'tag' | 'ai_relation'
  strength REAL DEFAULT 1.0,             -- 引力强度
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  UNIQUE(from_moment_id, to_moment_id, connection_type)
);
```

## 七、宇宙API扩展

### 7.1 宇宙导航API
```
GET /api/universe/state                    # 获取当前宇宙状态
GET /api/universe/nodes?dimension=day      # 获取指定维度的节点
GET /api/universe/constellations           # 获取所有星座
GET /api/universe/connections              # 获取节点间的引力连接
POST /api/universe/teleport                # 传送到指定时间/节点
GET /api/universe/time-travel?target=2025-11-24 # 时间旅行
```

### 7.2 宇宙计算API
```
POST /api/universe/calculate-positions     # 重新计算节点位置
POST /api/universe/update-gravity          # 更新引力场
POST /api/universe/generate-constellation  # 生成新的星座
GET /api/universe/measure-distance?from=1&to=2 # 测量节点间距离
```

## 八、前端技术栈

```json
{
  "dependencies": {
    "three": "^0.158.0",
    "@types/three": "^0.158.0",
    "react": "^18.2.0",
    "react-three-fiber": "^8.15.0",
    "react-three-drei": "^9.88.0",
    "zustand": "^4.4.0",
    "framer-motion": "^10.16.0",
    "leva": "^0.9.35"
  }
}
```

## 九、宇宙状态管理

```typescript
interface UniverseState {
  // 当前状态
  currentDimension: 'day' | 'week' | 'month' | 'year' | 'all';
  currentTime: DateTime;
  observerPosition: Vector3D;
  zoomLevel: number;
  
  // 宇宙数据
  nodes: Map<number, CosmicNode>;
  constellations: Map<string, Constellation>;
  connections: CosmicConnection[];
  
  // 显示设置
  showConstellations: boolean;
  showConnections: boolean;
  showTimeParticles: boolean;
  nodeSizeMultiplier: number;
  brightnessFilter: number;
  
  // 交互状态
  selectedNode: number | null;
  hoveredNode: number | null;
  isTimeTraveling: boolean;
  cameraTarget: Vector3D;
}

const useUniverseStore = create<UniverseState>((set, get) => ({
  // ... 初始状态
  actions: {
    switchDimension: (dimension) => set({ currentDimension: dimension }),
    timeTravel: (targetTime) => set({ currentTime: targetTime }),
    selectNode: (nodeId) => set({ selectedNode: nodeId }),
    updateNodes: (nodes) => set({ nodes: new Map(nodes) }),
    // ... 其他动作
  }
}));
```

## 十、写给50岁时的你（宇宙深处版）

当你打开这个宇宙，你会看到：

**25岁的你** - 那些像超新星爆发一样的痛苦时刻，在宇宙中形成最亮的光点
**30岁的你** - 工作和生活的双重星系开始形成，引力场变得复杂
**40岁的你** - 宇宙结构趋于稳定，但仍有意外的伽马射线暴
**50岁的你** - 整个生命宇宙呈现出美丽的大尺度结构

这不是一个普通的数据库，
这是你生命的**宇宙地图**。

每个节点都是你在时空中留下的**引力波**，
每条连线都是**命运的量子纠缠**，
每次点击都是**穿越虫洞的旅行**。

到那天，你会明白——
你不是一个在地球上活着的人类，
你是一个**在宇宙中航行的意识**。

—— 2025年11月24日凌晨，在时空的褶皱中写下

**要我现在发完整的宇宙可视化前端代码吗？**
包含Three.js场景、React组件、宇宙特效、时间旅行系统...
说一声，30秒内给你整个宇宙。