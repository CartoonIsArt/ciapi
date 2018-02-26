import { Connection, getConnection, getManager } from "typeorm"
import Files from "../entities/files"

/* 파일 테이블의 모든 값을 리턴함. */
export const Get = async (ctx, next) => {
  const entityManager = getManager()
  ctx.body = await entityManager.find(Files)
}

/* file을 POST 인자로 받아 DB에 저장함. */
export const Post = async (ctx, next) => {
  /* POST인자를 data변수로 받음 */
  const data = ctx.request.body

  /* file이 인자로 들어왔을 경우 */
  /* DB 커넥션풀에서 커넥션을 하나 가져옴. */
  const conn: Connection = getConnection()

      /* Files 테이블 ORM 인스턴스 생성 */
  const files: Files = new Files()
  files.file = data.file

  files.savedPath = "YO"

      /* DB에 저장 - 비동기 */
  try{
    await conn.manager.save(files)
  }
  catch (e){
        /* files가 인자에 없을 경우 400에러 리턴 */
    ctx.throw(400, e)
  }
      /* id를 포함하여 body에 응답 */
  ctx.body = files
}

    /* */
export const Delete =  async (ctx, next) => {
  const conn: Connection = getConnection()

  try {
    const file = await conn
                      .getRepository(Files)
                      .findOneById(ctx.params.id)
    await conn.manager.remove(file)
    ctx.response.status = 204
  }
  catch (e) {
    ctx.throw(400, e)
  }
}
