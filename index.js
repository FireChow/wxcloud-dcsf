const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, User } = require("./db");
const sequelize_1 = require("sequelize")

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
const txtPage = fs.readFileSync(path.join(__dirname, "MP_verify_4PHUAKsyG7gnjDcD.txt"), "utf-8");

// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

router.get("/MP_verify_4PHUAKsyG7gnjDcD.txt", async (ctx) => {
  ctx.body = txtPage;
});

router.post("/api/user", async (ctx) => {
  const { request } = ctx;
  const { user } = request.body;
  let verifyMsg = ''
  if (!user.name.trim()) verifyMsg = '请输入被鉴定对象信息'
  if (!user.id_tems.trim()) verifyMsg = '请输入鉴定项目'
  if (!user.email.trim()) verifyMsg = '请输入邮箱'
  else if (!/^\w+@\w+\.\w+$/.test(user.email.trim())) verifyMsg = '请输入正确的邮箱'
  if (!user.phone.trim()) verifyMsg = '请输入联系方式'
  else if (!/^1[3456789]\d{9}$/.test(user.phone.trim())) verifyMsg = '请输入正确的联系方式'
  if (!user.referee.trim()) verifyMsg = '请输入鉴定人'
  if (verifyMsg) {
    ctx.body = {
      code: 400,
      errMsg: verifyMsg
    }
  } else {
    if (ctx.request.headers["x-wx-source"]) {
      user.openid = ctx.request.headers["x-wx-openid"]
    }
    let newUser = User.build(user)
    let result = await newUser.save()

    ctx.body = {
      code: 200,
      data: result
    }
  }
});

router.put("/api/user/:id", async ctx => {
  let openid = ''
  if (ctx.request.headers["x-wx-source"]) {
    openid = ctx.request.headers["x-wx-openid"]
  }
  let currentUser = await User.findOne({ where: { openid } })
  if (currentUser.role !== 'admin') {
    ctx.body = {
      code: 401,
      errMsg: '没有权限'
    }
  } else {
    const { request } = ctx;
    const { id } = ctx.params;
    const { user } = request.body;
    if (currentUser.id === id) {
      ctx.body = {
        code: 400,
        errMsg: '不能修改自己'
      }
    } else {
      let result = await User.update({ role: user.role }, { where: { id } })
      ctx.body = {
        code: 200,
        data: result
      }
    }
  }
})

router.get("/api/user/:openid", async (ctx) => {
  const { openid } = ctx.params;
  let user = await User.findOne({ where: { openid } })
  ctx.body = {
    code: 200,
    data: user
  };
});

router.get("/api/userSearch/:text", async (ctx) => {
  let openid = ''
  if (ctx.request.headers["x-wx-source"]) {
    openid = ctx.request.headers["x-wx-openid"]
  }
  let currentUser = await User.findOne({ where: { openid } })
  if (currentUser.role !== 'admin' && currentUser.role !== 'finance') {
    ctx.body = {
      code: 401,
      errMsg: '没有权限'
    }
  } else {
    const { text } = ctx.params;
    let excludeFileds = ['openid']
    if (currentUser.role !== 'admin') {
      excludeFileds.push('role')
    }
    let user = await User.findAll({
      where: {
        [sequelize_1.Op.or]: [
          { name: { [sequelize_1.Op.like]: `%${text}%` } },
          { phone: { [sequelize_1.Op.like]: `%${text}%` } }
        ]
      }, attributes: { exclude: excludeFileds }
    })
    ctx.body = {
      code: 200,
      data: user
    }
  }
});

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers["x-wx-source"]) {
    ctx.body = ctx.request.headers["x-wx-openid"];
  }
});

const app = new Koa();
app
  .use(logger())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())

const port = process.env.PORT || 80;
async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
bootstrap();
