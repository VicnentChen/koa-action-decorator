## 1. 安装
`npm install koa-action-decorator`
## 1. 配置
```
import {Router} from 'koa-action-decorator'

let router = Router({
  controllerDir: `[controller目录]`
})

app.use(router.routes())
```
## 2. 注解
### @Controller

### @Action

### @GetAction

### @PostAction