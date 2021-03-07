import { Connection, getConnection } from "typeorm"
import Comment from "../entities/comment"
import Document from "../entities/document"
import User from "../entities/user"

/* 해당 댓글 GET */
export const GetOne = async (ctx, next) => {
  const conn: Connection = getConnection()

  try{
    const comment: Comment = await conn
    .getRepository(Comment)
    .findOne(ctx.params.id, {
      relations: [
        "author",
        "author.profileImage",
        "rootDocument",
        "likedUsers",
        "comments",
        "rootComment",
      ]})

    ctx.body = comment
  }
  catch (e){
    ctx.throw(400, e)
  }

  /* GET 성공 응답 */
  ctx.response.status = 200
}

/* 댓글 POST */
export const Post = async (ctx, next) => {
  const conn: Connection = getConnection()
  const comment: Comment = new Comment()
  const data = ctx.request.body.data
  let documentId: number = null

  try{
    /* 세션의 유저와 relation 설정 */
    comment.author = ctx.state.token.user

    /* commentId를 인자로 전달하면 대댓글 relation 설정 */
    if (typeof(data.commentId) === "number") {
      const parent: Comment = await conn
      .getRepository(Comment)
      .findOne(data.commentId, {
        relations: ["rootDocument"],
      })

      comment.rootComment = parent
      documentId = parent.rootDocument.id
    }

    /* 게시글과 relation 설정 */
    const document: Document = await conn
    .getRepository(Document)
    .findOneOrFail(documentId
      ? documentId : Number(data.documentId))

    comment.rootDocument = document

    /* 나머지 required 정보 입력 */
    comment.id = data.id
    comment.createdAt = data.created_at
    comment.content = data.text

    /* 댓글 작성자의 댓글 수 1 증가 */
    ++(comment.author.commentsCount)

    comment.likedUsers = []

    await conn.manager.save(comment.author)
    await conn.manager.save(comment)
  }
  catch (e){
    if (e.message ===
    "Cannot read property 'user' of undefined"){
      ctx.throw(401, e)
    }
    ctx.throw(400, e)
  }

  /* POST 성공 응답 */
  ctx.body = comment
  ctx.response.status = 200
}

/* 해당 댓글 DELETE */
export const DeleteOne =  async (ctx, next) => {
  const conn: Connection = getConnection()
  const leaver: User = await conn.getRepository(User).findOne(0)

  try {
    /* DB에서 댓글 불러오기 */
    const comment: Comment = await conn
    .getRepository(Comment)
    .findOne(ctx.params.id, {
      relations: [
        "author",
        "likedUsers",
      ]})

    /* 댓글 작성자의 댓글 수 1 감소 */
    --(comment.author.commentsCount)
    await conn.manager.save(comment.author)

    /* 탈퇴한 유저 relation */
    comment.author = leaver
    await conn.manager.save(comment)
  }
  catch (e) {
    ctx.throw(400, e)
  }

  /* DELETE 성공 응답 */
  ctx.response.status = 204
}

/* 해당 댓글 좋아요 GET */
export const GetLikes = async (ctx, next) => {
  const conn: Connection = getConnection()

  try{
    const comment: Comment = await conn
    .getRepository(Comment)
    .findOne(ctx.params.id, {
      relations: [
        "likedUsers",
        "likedUsers.profileImage",
      ]})

    ctx.body = comment.likedUsers
  }
  catch (e){
    ctx.throw(400, e)
  }

  /* GET 성공 응답 */
  ctx.response.status = 200
}

/* 해당 댓글 좋아요 POST */
export const PostLikes = async (ctx, next) => {
  const conn: Connection = getConnection()

  try {
    /* DB에서 댓글 불러오기 */
    const comment: Comment = await conn
    .getRepository(Comment)
    .findOne(ctx.params.id, {
      relations: ["likedUsers"],
    })

    /* 세션 유저 불러오기 */
    const user: User = ctx.state.token.user

    /* 세션의 유저와 좋아요 relation 설정 */
    comment.likedUsers.push(user)
    ++(user.likedCommentsCount)

    await conn.manager.save(comment)
    await conn.manager.save(user)

    /* POST 성공 응답 */
    ctx.body = comment.likedUsers
    ctx.response.status = 200
  }
  catch (e) {
    if (e.message ===
    "Cannot read property 'user' of undefined"){
      ctx.throw(401, e)
    }
    ctx.throw(400, e)
  }
}

/* 해당 댓글 좋아요 DELETE */
export const CalcelLikes = async (ctx, next) => {
  const conn: Connection = getConnection()

  try {
    /* DB에서 댓글 불러오기 */
    const comment: Comment = await conn
    .getRepository(Comment)
    .findOne(ctx.params.id)

    /* 세션 유저 불러오기 */
    const user: User = ctx.state.token.user

    /* 세션의 유저와 좋아요 relation 해제 */
    await conn
    .createQueryBuilder()
    .relation(Comment, "likedUsers")
    .of(comment)
    .remove(user)

    /* 세션 유저의 댓글 좋아요 수 1 감소 */
    --(user.likedCommentsCount)
    await conn.manager.save(user)
  }
  catch (e) {
    if (e.message ===
    "Cannot read property 'user' of undefined"){
      ctx.throw(401, e)
    }
    ctx.throw(400, e)
  }

  /* DELETE 성공 응답 */
  ctx.response.status = 204
}