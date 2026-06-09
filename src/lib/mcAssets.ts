// 香草物品图标的"模型解析"回退: 当直猜 textures/item|block/<id>.png 都 404 时 (贴图名 != 物品 id
// 的方块, 如 grass_block / furnace / crafting_table), 经物品模型 -> parent 链 -> 贴图引用解析出真实贴图。
// 全部走 assets.mcasset.cloud (1.20.1 香草), 模块级缓存模型 JSON 与解析结果, 避免重复请求。

const CDN = 'https://assets.mcasset.cloud/1.20.1/assets/minecraft'

interface Model {
  parent?: string
  textures?: Record<string, string>
}

const modelCache = new Map<string, Promise<Model | null>>()
const textureCache = new Map<string, Promise<string | null>>()

// 取模型 JSON (ref 形如 "minecraft:block/furnace" / "block/cube_all" / "item/handheld"; 香草命名空间恒 minecraft)
function fetchModel(ref: string): Promise<Model | null> {
  const rel = ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref
  let p = modelCache.get(rel)
  if (!p) {
    p = fetch(`${CDN}/models/${rel}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<Model>) : null))
      .catch(() => null)
    modelCache.set(rel, p)
  }
  return p
}

// 沿 parent 链向上合并 textures (子覆盖父); builtin/* (如 builtin/entity 的箱子) 不再向上, 其元素是实体渲染无平面贴图
async function collectTextures(ref: string, depth: number): Promise<Record<string, string>> {
  if (depth > 8) return {}
  const model = await fetchModel(ref)
  if (!model) return {}
  let parentTex: Record<string, string> = {}
  if (model.parent && !model.parent.includes('builtin/')) {
    parentTex = await collectTextures(model.parent, depth + 1)
  }
  return { ...parentTex, ...(model.textures ?? {}) }
}

// 解析贴图引用: "#key" 指向同表其它键, 递归直到具体值 (如 "minecraft:block/furnace_front")
function resolveRef(val: string, tex: Record<string, string>, depth = 0): string | null {
  if (!val || depth > 8) return null
  if (val.startsWith('#')) {
    const k = val.slice(1)
    return tex[k] ? resolveRef(tex[k], tex, depth + 1) : null
  }
  return val
}

// 选一个有代表性的图标贴图: 优先 layer0(物品) 与正面/侧面/all(方块); 末位兜底排除 particle(避免拿掉落粒子误导)
const PICK_ORDER = ['layer0', 'front', 'north', 'side', 'east', 'all', 'texture', 'top', 'up', 'west', 'south']

function pickTexture(tex: Record<string, string>): string | null {
  for (const k of PICK_ORDER) {
    if (tex[k]) {
      const r = resolveRef(tex[k], tex)
      if (r) return r
    }
  }
  for (const [k, v] of Object.entries(tex)) {
    if (k === 'particle') continue
    const r = resolveRef(v, tex)
    if (r) return r
  }
  return null
}

function textureUrl(ref: string): string {
  const path = ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref
  return `${CDN}/textures/${path}.png`
}

/**
 * 解析香草物品 id (如 "grass_block") 的图标贴图完整 URL, 失败返回 null。结果模块级缓存。
 * 仅在 ItemIcon 的直猜路径都失败后调用 (覆盖贴图名 != id 的方块/特殊物品)。
 */
export function resolveVanillaTexture(itemName: string): Promise<string | null> {
  let p = textureCache.get(itemName)
  if (!p) {
    p = (async () => {
      const tex = await collectTextures(`item/${itemName}`, 0)
      const ref = pickTexture(tex)
      return ref ? textureUrl(ref) : null
    })()
    textureCache.set(itemName, p)
  }
  return p
}
