## 1. 安装
`npm install koa-action-decorator`
## 2. 配置
```
import {Router} from 'koa-action-decorator'

let router = Router({
  controllerDir: `[controller目录]`
})

app.use(router.routes())
```
## 3. 注解
### @Controller

### @Action

### @GetAction

### @PostAction