import { TextureAnimationConfig } from '../models/nodebox.model';

export interface DefaultTextureItem {
  id: string;
  name: string;
  dataUrl: string;
  author: string;
  license: string;
  animation?: TextureAnimationConfig;
  backfaceCulling?: boolean;
}

export const DEFAULT_TEXTURES: DefaultTextureItem[] = [
  {
    id: 'default_wood.png',
    name: 'Wood Planks',
    author: 'BlockMen',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIVBMVEWFaTymgUpXQyV+YDBSPyOhfkiBYzOdeUWJaz1jSyqHaz311sK1AAAAdElEQVQI10XKMQoCMRQG4YGAxM6/WGwl7AEiDz1AyAWCKGIliHgCCw/gGWw96r5Ns187A6sm3YCSUqplrNgOCNkIvB7MDgZfScuj7mRkzGV/9LkDgVpThxGbnCddYxsCG4jn9XtPH8biz7FtfxczNPwJT2kC+PQS5paxgW4AAAAASUVORK5CYII='
  },
  {
    id: 'default_stone.png',
    name: 'Smooth Stone',
    author: 'Cisoun',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIVBMVEVhXl1WVFNvbGtiX15gXFtua2pVUlFOS0p8eHdQTUxoZGOCDXQRAAAAgklEQVQIHQXBMRKCMBBA0Z/AAbIjhXaaNJaB9QAOs1BTSO9YQE1Fn8qWQ3hP36PSh41mELufzXMf2aWxYXLCluvl7eSCSPMCQHPd30s90UrzlH15E7OP3zJX5HHdDwYPhgMRbN2CjynxiancRAW6mLxqJslJ5VyudImkGuAIVK0E9wf3zRbTcwUITAAAAABJRU5ErkJggg=='
  },
  {
    id: 'default_cobble.png',
    name: 'Cobblestone',
    author: 'Neuromancer',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAALVBMVEVIREJTUE5lYl9LSEVRTkxFQkBcWVeEgH1jX11fXFpoZmRybmxZVVNrZ2VVUlDpe7aDAAAAmklEQVQI12NYwdiQncu5w4rhEIeo4mwbIR4GY2YFJ01mYwaG66WijiJMa8sZklIZGAKU0nYyTNustbZk4iQxBglhQQVWl5Y8BhnhBI4Cg4AAhtBQQSUhLt1ShtXlPIKCbI0iDBKTDAJYDdUmMKSIMO1aXuojwMBgwOLZoRpszMB1nYGtU3l1MYNARzWPI6faZoaDji4GDCliwgAQOSNGL5af3gAAAABJRU5ErkJggg=='
  },
  {
    id: 'default_brick.png',
    name: 'Clay Brick',
    author: 'Calinou',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAYFBMVEVTEhJwGhpgFRVMERFOERGmqaGfopybnpdHEBCjqKChpp55HBxzGhpsGRmxtK2qraeXmpSDICBpGhpoFxdFDw+tsap7Hh5kGBi1urKoq6N0ISFZFha8wLiPk4xgGRmUl5D5zCqWAAAAtUlEQVQYVzXPxWEEQRAEsGoeXOaj/LP0y8pA6F2s0qknyUhcCcy4iNfvl5Fb7QxAXSBJoZGSAuWOksfRsxU3M0dbDmqLxjwv1Eh2LPLilZHnh3hlXEibANCSkgLQjNE+eXKzmKYyxNvQT41KjdaXRO2tgRmZmPiV5NeVGYCEAFDZPG0C5HsqFp53+wyD74a5HnSuEpWO+SAZ8RB3AZyYnoVxISXdNkn/H0eYD7lMMbyH/fZc/gCk0wkJC8+y0gAAAABJRU5ErkJggg=='
  },
  {
    id: 'default_dirt.png',
    name: 'Dirt',
    author: 'random-geek',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAMFBMVEVGKApUNBZWNxtYNxpZOiBaPiZdPyZfQipkRSpmSTBqSzFsTjVwUjhoVEZ8XEGDalgE/1C/AAAAm0lEQVQI1wGQAG//AMpWvFyBa9arAFOItVV7w3dsAE6XO3O+Y3AnAEQVRnZ6p5xiAGFpB7l2w5t3AIX3jKk3V2cMAH2YN3bHOxVqAFEmNwJ1lDx3AJUyecb1Io63AGoeObd9JZJnAIVXeHV3e0UXAGUi+oZ3V4Z+AGB112cwZntrAHd2N8kxl8ehAJGTjsHJR7uRAOi4M3i1GP1medU7vGNW+SwAAAAASUVORK5CYII='
  },
  {
    id: 'default_glass.png',
    name: 'Glass',
    author: 'Krock',
    license: 'CC0 1.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAARVBMVEUAAADZ2dnd3d3f39/h4eHi4uLn5+fo6Ojo6Ojq6urs7Ozv7+/x8fHy8vL09PT29vb39/f4+Pj5+fn6+vr8/Pz+/v7////pkXaiAAAACHRSTlMAAAAAAAAAALfnUqEAAABwSURBVBgZBcEBAkMwEACwoF1nKOfo/5+6xBX3+EVese353vtwAABDAACPTmU26xVpIJaZpZzYrKgDn6oyJCoA3QMAdF8AYFhpFEVpOL20ZcIUE9KP6SwobWuk1AigkRIAuOwAwOuI884c25Px9PuIP5mJBO01ty56AAAAAElFTkSuQmCC'
  },
  {
    id: 'default_steel_block.png',
    name: 'Steel Block',
    author: 'kilbith',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAY1BMVEXS0tPPz8/Q0NDR0dHExcWsrKzIycjLzMvHx8jW1tXGx8awsbCnp6fKysrCwsKioqKZmZnT1NTAwcC+vr6Xl5fW0tHMys7Mzc3Oy8menp6VlZWTk5O7vLq4uLivr6/Pz87Q0s0wwIeWAAAAtklEQVQYGQXBhWEDQRAEsFk8pieznf6rjIT6eh2vMo7xPOZjlgJLC2eC+yUiLIbnwkoJ5IEByEBB+iUgCbMDfuCZsAAAQsQxG+pCvDEgQnfa9oEJoYtE+G9FV634MkkIzBwoa3TDICa5NTpT0xDygeEdYG/U3KlpxYMaCyg2zRT6VmHEdOebe4gh915Q5TpDjKpv3XvfDB8OWXV/l12zblvBxD3mvO2fvavGOFHNrFqxh81h82v/zqIJYR+MkVEAAAAASUVORK5CYII='
  },
  {
    id: 'default_mese_block.png',
    name: 'Mese Block',
    author: 'celeron55, Perttu Ahola',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAADFBMVEWmpgDMzADm5gD//wCCJfc+AAAAQ0lEQVQI12PY////P4Z36/b/ZHi9a9VKhlevFnAyvOgCsbSArFergKxHixo4Gd7/AyoBc18wwSQecMFZTEAlU0NDwwD9lyh7F9kr0AAAAABJRU5ErkJggg=='
  },
  {
    id: 'pale_watcher_ritual_pyre_flame.png',
    name: 'Pyre Flame (Animated)',
    author: 'juraj / pale_watcher',
    license: 'MIT',
    backfaceCulling: false,
    animation: {
      type: 'vertical_frames',
      aspect_w: 16,
      aspect_h: 16,
      length: 1.0,
      frameCount: 8
    },
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAACAYAAAAClekiAAACbElEQVR4AWLAB/5/2LIXhBnIAVs0AJSUA2iFARSFs5vjsmeGIc1xL8yMsxln2whzmMNsM9u2ll07Xx7f/Vdfne7Bnl2lKj8D2mk5+qPTr13ld0BzM5Xj/VK8FE5XaYQyoLnhWQYCFS5WaUblV0Bzw7M8/HhRrtKCyk+A5oZnGUhToU4sqnwPaG54lgGXwk2CgStAc8OzDGQq3Cp4CmeA5oZnGcglLObEIaC54VkG8gmLabEPaG541oEWMSG2AM3NyUCTGBEbgOaG566cJPIUrhcDYhnQ3PDI/PUJDMMUvIg1okcsApobHhmy38v+goFEkS0q+QKJaUBzwyNDlo67pxPLbwGguZn/tO75/feA22d7ZsCBQBBE4fsH4ZCIEEQJCITo56cflQ8dhrmduYc944YD+95AzWfnbdC+8YDyeDBEy+NBuIHHg3gDhwecrZwHTFqLB3PjfI/yAK01H7I8wDNN3lIe4HXH2fLAiNfMA8rjQbiBx4MhU5YHQ7YsD9INLA/McVUeYH63eIDG+/teozxAa837LA/wTIOzlAd4dR7o9wN5X3DK8iDdwPIg3cDyIO7ceCDtC5hfLR6g8cb5EuUBWmseszzAM43zUh7gXS8P9PyA+vNAafDl69rgwxfV9+eBui/o+QHmZ4sHaLxxPkd5gNaad1ke4CnCAzE/qF8SDzrcD/T8QM8TMT9aPEDjjfMxygO0lXig7Atanmgry4PC4yzsC3p+oOeJ/JSn1vsCmrkGtxYP0HjmMcoDtP15oO8Len4gvS84FeUB2v480PcFPT/Q80T9faEYD/T7gbIv6PmBnicK7wsFePADtqGd1Oeyx00AAAAASUVORK5CYII='
  },
  {
    id: 'pale_watcher_ritual_pyre_top.png',
    name: 'Pyre Altar Top',
    author: 'juraj / pale_watcher',
    license: 'MIT',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABxklEQVR4ATWSxZldSQyFK4NzmZn3zcy0m3AmCAfmIByEM7B/1dd+WCAd0nX39y+Pj2/8vr5+3d4+PTy8smXN4u7u+eLi9unp/ezsmgK2NzeP7vr6oY+1paqlNdaQaQnUROpSzbnWUHuugW2iOdbl5Z2jj9VRRnOkKRTNfaQ1Up1pDLUlavmVFXShYHOQctendgTP4K/bXG2sNbG2JbGrOtckIcyhu8+15OoCu2AxBepyzanaQFtmh2Uo4NdAoLuXl88yMDEjd6nvkbZYLaJ99ZGIT5NqT/RtGgGNVMaidIqsqMFV4Kshj6CiwWIgOocPRKOnCgyjTjTl+vVf8vv/bs1M0g5Q6uPKROLeQyxUjZGaBBJj+3mrPz+OEoXUSUeEYIueYosVdjPKUcydV0KbN4D7lQWDCjXkQr+7uroHfqaOHm+6zDTAKcFsfmiGIbXD09MrM91JVazqHza+OcHrQD6yQ0iQVMciUse0q+RbAAtEHzjBa2LBY6P2QN6kl0RSCPVyPWRm8vaIXyrQbV43P2x8Wqw8mDtzAMkHskgjnYGRLEScqcyNZIi0SRh2DI+nFy70MRMw+PAIAMQWwRTw4YQhnJ/f/AUadGT4fVZU/wAAAABJRU5ErkJggg=='
  },
  {
    id: 'pale_watcher_ritual_pyre_side.png',
    name: 'Pyre Altar Side',
    author: 'juraj / pale_watcher',
    license: 'MIT',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAA3klEQVR4AWLUVZRkBzBCHigIQzEYNk9kuG2t9UwFCngHF8PDuAA9YIezUKQPEIyJBAi19ANKmvcn+ROiKIo6X9Mk8jxX339wgaaihanZWAQQhjMAiKIYf6y18iyxBL4/QaWxxJvAtTjgWAWsNC1CPa+el/ktVklWfguwTrVsECppCQiCEACSJGWji3vCauHsTnkNzxujUls6Of6uM2Tptj049ByZw1546XJLkhFLtAMh2XV2FVfLR7p5ZVLDSpnwAx3vuyMuQG/Hvlt91nJL+qwIZ9Wc0rN+RmxMw20AAAHGUh+1JiyrAAAAAElFTkSuQmCC'
  }
];
