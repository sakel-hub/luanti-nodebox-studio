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
    id: 'default_grass.png',
    name: 'Grass',
    author: 'celeron55, BlockMen',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAArlBMVEU4YhY5Yxc5ZBY6ZBg6ZRc7Yxc7ZBY7Zhg7Zxc8ZRc8aBg9Zhg9aRk9ahg+aBg+aRc+axk+cBo/ahg/cBhAaxlAbBhAbhhAbhpAcRlAcxtBbRlBbxlBcBhBcRtBdBxBdRtCcBpCcRlCcxtCdBpCdhxDdBxDdRtDeBxEdR1EdhxEdxtEeBpFdx1FeBxGeB5GeR1HeR9IeiBIex9IfB5JeR9Jeh5JfCBKex9KfB5KfSE8mWaKAAAA2klEQVQYGQXBgUKCMBQF0IdNkRcSEYzkVmM6RiOnhbTR//9Y59AtiszVTJtXraomZRrCJcQyh7FaY0NMXe7uE/RiM2inBMidDhl6bKn9hBmNprIgXoMTBTPq0Wu6pvwdfOmWKoEObU/JDxfTm5zjNMiXr5iQk9KaJ4l8r7Jn2W1pBbrB3sCsdsR5JMVxEckBp1o2aVp6yj58TJgb9EBZ/3qySoALEjG0rurnQFLsGhzF2Q/VOEiA4EwFKZXtzPGackfZ7M+cA5wWl/j4sBJKu+c63pP3uWmk+fsHOJAawOkrkdAAAAAASUVORK5CYII='
  },
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
  }
];

