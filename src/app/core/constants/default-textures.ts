export interface DefaultTextureItem {
  id: string;
  name: string;
  dataUrl: string;
  author: string;
  license: string;
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
    id: 'everness_luminous_mushroom_top.png',
    name: 'Luminous Mushroom Top',
    author: 'Everness',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABiElEQVR4AWKYY/LvHwwz4ACAWskBWa4oCMOzh2hHz8Z4nm3bYxTilBHbxWxhNpQ63V/S9xQGMf6qe4+b3+2sUtpzpNfhbEnIrAnlfeVODgIDT7tU73V830DlQFmYhvGYIzEIozFlblrYORNC9tB/3zdgHkfDyvuY8DYqwZgIOxa2hNCv6HRRGexV3oYd1aTjpFUZ+rqeWNNmA582VV/H/Gdz2ztfVlKDQrZDOWt1ZDqE2IAwt+6aDdjDN9f8d2fSGyhvCgsTQngAerpt1GC9cviNCF4Oq76+7L9bY97Afl5YPhQmVj4zuuSYWBXWDoS93DcieLCreiPlP5uH/rsMEoMivyZkliG36iG5nf1ui+rhM0jmZ5TxuAsqPREXFqaE7VP3PQP18JnHsbDyMe54G1M+JJRURFnc1u8ZqIfvYsFD8XpYqKZ8nwf6+RYk31Z6yUNicJy0KelODXif2YBv5twog2R+Qoj2Owa7YbjfIPF9/mbOjdrPq122kA2SYFw9goOC8s2cG/QFI3GTfeSjmfAAAAAASUVORK5CYII='
  },
  {
    id: 'everness_luminous_mushroom_bottom.png',
    name: 'Luminous Mushroom Bottom',
    author: 'Everness',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA8ElEQVR4AaySg2oGUBTHb1puTEOc8QZDbnEIs23byLOtODzY+Aq/1r+zO/v7/nV4ceimFqF/CloGoaHXpGz53RNqe8GTew9dzrqAsjtIODEpW35/J7cYGh+++KBtGCpuIWYPwrYkzZb/9Qee3Hso5eRTiNiGkDWTsuV3v0HXOFTdQ9w+RO2YlC3/F0/e9mRkHnKuoPoeMs5Mypb/i/dvezK3ZJcVUXVLypb/uw88uaBD81cDRdLdX6Ey8m9snH6Uv1i2t1PRJApvrR+/WLa3UPP0UCT9V8v2NX6xbI9DThTkJDbMjIIJ8CY2YhIF3sQGAKnKmCXPBUeuAAAAAElFTkSuQmCC'
  },
  {
    id: 'everness_luminous_mushroom_side_x.png',
    name: 'Luminous Mushroom Side X',
    author: 'Everness',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAxklEQVR4AeyPAxICYRSA944Nsu3GNco2ztEF//ethtnu2dD+8C6Qjgpht+BzCEGPTsb0z25etWBQhmZRqOV1Ww8qsGoJ2qUwBW56pavg4JsRRcyF/WbIpUjF9N3a/nr/gGVL7DfbBUU9K7RKMLTf3KpvGltF2Aslv//9m2OCwCiSkzMwJfcU//u3PhKCQezaZRDx7F9QzcgaOsIhgiXzESbD+DAxrGry5kA4uz0hdJ0XQhLGB2LcaspsIJztyDQUwPjbcagBAI1Nv2oJ4GRtAAAAAElFTkSuQmCC'
  },
  {
    id: 'everness_luminous_mushroom_side_z.png',
    name: 'Luminous Mushroom Side Z',
    author: 'Everness',
    license: 'CC BY-SA 3.0',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAyUlEQVR4Ae2PA3IFQRBA52A5QGzbtl2IU4htOymGJ/t/d96qY9tv2O5W34V/CrMtEqNMwsO09xZna9RzaezWlLdAdiWklVneW9aiaeoB9VIGAfUWek14cMwsk8RoTWS4jFt035j9B/cnaO6BilaL3EqTtDIZt7JZ4+rVZDBcnM7tp0eoNe7xKfGLcqQQVhtgOE2O+7/t27YO14tK1gX59CbAhSw64XrAdR91Qft5prMguJAvdBeUz971URccBcDt9+J/Qf0tn4vXBnMwvY1m37biAAAAAElFTkSuQmCC'
  }
];
