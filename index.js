const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, User, Invoice } = require("./db");
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

router.post("/api/invoice", async ctx => {
  let openid = ''
  if (ctx.request.headers["x-wx-source"]) {
    openid = ctx.request.headers["x-wx-openid"]
  }
  let currentUser = await User.findOne({ where: { openid } })
  if (!currentUser || !currentUser.id) {
    ctx.body = {
      code: 401,
      errMsg: '没有权限'
    }
  }
  const { invoice } = ctx.request.body;
  let data = { user_id: currentUser.id }
  if (invoice.type) {
    data.type = invoice.type
  }
  if (invoice.title) {
    data.title = invoice.title
  }
  if (invoice.tax_number) {
    data.tax_number = invoice.tax_number
  }
  if (invoice.company_address) {
    data.company_address = invoice.company_address
  }
  if (invoice.telephone) {
    data.telephone = invoice.telephone
  }
  if (invoice.bank_name) {
    data.bank_name = invoice.bank_name
  }
  if (invoice.bank_account) {
    data.bank_account = invoice.bank_account
  }
  let exsitInvoice = await Invoice.findOne({ where: { title: data.title } })
  if (!exsitInvoice || !exsitInvoice.id) {
    const result = await Invoice.create(data)
    ctx.body = {
      code: 200,
      data: result
    }
  } else {
    const result = await Invoice.update(data, { where: { id: exsitInvoice.id } })
    ctx.body = {
      code: 200,
      data: result
    }
  }
})

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
  const { request } = ctx;
  const { id } = ctx.params;
  const { user } = request.body;
  let openid = ''
  if (ctx.request.headers["x-wx-source"]) {
    openid = ctx.request.headers["x-wx-openid"]
  }
  let currentUser = await User.findOne({ where: { openid } })
  if (currentUser.role !== 'admin' && currentUser.id !== id) {
    ctx.body = {
      code: 401,
      errMsg: '没有权限'
    }
  } else {
    if (currentUser.id === id && user.role) {
      ctx.body = {
        code: 400,
        errMsg: '不能修改自己的角色'
      }
    } else {
      let date = {}
      if (user.role) {
        date.role = user.role
      }
      if (user.name) {
        date.name = user.name
      }
      if (user.id_tems) {
        date.id_tems = user.id_tems
      }
      if (user.email) {
        date.email = user.email
      }
      if (user.phone) {
        date.phone = user.phone
      }
      if (user.referee) {
        date.referee = user.referee
      }
      if (user.need_improve !== undefined) {
        date.need_improve = user.need_improve
      }
      let result = await User.update(date, { where: { id } })
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

router.post("/api/userSearch", async (ctx) => {
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
    let { text } = ctx.request.body;
    let excludeFileds = ['openid']
    if (currentUser.role !== 'admin') {
      excludeFileds.push('role', 'need_improve')
    }
    let user = await User.findAll({
      where: {
        [sequelize_1.Op.or]: [
          { referee: { [sequelize_1.Op.like]: `%${text}%` } },
          { phone: { [sequelize_1.Op.like]: `%${text}%` } }
        ]
      }, attributes: { exclude: excludeFileds }, include: [{ model: Invoice, limit: 10, order: [['updatedAt', 'DESC']] }], limit: 10, order: [['updatedAt', 'DESC']]
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
