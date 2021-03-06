import {
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from "typeorm"
import Comment from "./comment"
import Content from "./content"
import User from "./user"

/* 게시글 테이블 스키마 */
@Entity()
export default class Document extends Content {
  /* 작성자 */
  @ManyToOne(type => User, author => author.documents, {
    nullable : false,
  })
  public author: User

  /* 게시글에 달린 댓글 */
  @OneToMany(type => Comment, comment => comment.rootDocument)
  public comments: Comment[]

  /* 좋아요한 유저들 */
  @ManyToMany(type => User)
  @JoinTable()
  public likedUsers: User[]
}
