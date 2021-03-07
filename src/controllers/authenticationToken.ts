import { Connection, getConnection } from "typeorm"
import AuthenticationToken from "../entities/authenticationToken"
import { ipToInt } from "../lib/ip2int"
import { cookieExpirationDate } from "../lib/date"
import * as crypto from "crypto"
import User from "../entities/user"

const jwt = require('jsonwebtoken')


async function Authenticate (username: string, password: string): Promise<User> {
  const conn: Connection = getConnection()
  const users: User[] = await conn
    .getRepository(User)
    .find({
      where: {
        username,
      },
      relations: ['profileImage']
    })
  const user = users[0]

  const [encryptedKey, salt] = user.password.split("@")
  const derivedKey = crypto.pbkdf2Sync(password, salt, 131071, 64, 'sha512')

  if (derivedKey.toString('hex') !== encryptedKey)
    throw new Error('password mismatch')
  return user
}

/* 로그인 */
export const Login = async (ctx, next) => {
  const authenticationToken: AuthenticationToken = new AuthenticationToken()
  const conn: Connection = getConnection()

  try {
    // 1. User authentication
    const {
      username,
      password,
    } = ctx.request.body

    const user = await Authenticate(username, password)

    // 2. Issue access token and refresh token
    const accessToken = jwt.sign({ user }, 'secretKey', { expiresIn: '1h' })
    const refreshToken = jwt.sign({ user }, 'secretKey', { expiresIn: '14d' })                      

    // 3. Set authentication token cookie
    ctx.cookies.set('accessToken', accessToken, { expires: cookieExpirationDate() })

    // 4. Save refresh token to database 
    authenticationToken.accessToken = accessToken
    authenticationToken.refreshToken = refreshToken
    authenticationToken.accessIp = ipToInt(ctx.ip)

    await conn.manager.save(authenticationToken)
  }
  catch (e){
    ctx.throw(400, e)
  }

  /* 로그인 완료 응답 */
  ctx.response.status = 200
}

/* 로그아웃 */
export const Logout =  async (ctx, next) => {
  try {
    const conn: Connection = getConnection()
    await conn.manager.delete(AuthenticationToken, ctx.authenticationToken.id)

    ctx.status = 204
    ctx.redirect("/")
  }
  catch (e) {
    ctx.throw(400, e)
  }

  /* 로그아웃 완료 응답 */
  ctx.response.status = 204
}
