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
  if (ctx.request.headers["x-wx-source"]) {
    user.openid = ctx.request.headers["x-wx-openid"]
  }
  let newUser = User.build(user)
  let result = await newUser.save()

  ctx.body = {
    code: 200,
    data: result
  };
});

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
  if (currentUser.role !== 'admin') throw new Error('没有权限')
  const { text } = ctx.params;
  let user = await User.findOne({ where: {
    [sequelize_1.Op.or]: [
      { name: { [sequelize_1.Op.like]: `%${text}%` } },
      { phone: { [sequelize_1.Op.like]: `%${text}%` } }
    ]
  }, attributes: { exclude: ['openid', 'role'] } })
  ctx.body = {
    code: 200,
    data: user
  };
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
