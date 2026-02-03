import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 房间管理员表
 * 存储房间的 moderator（房管）信息
 * 房管拥有管理房间内用户的权限，由房主或系统管理员任命
 */
@Entity({ name: 'tb_room_moderator' })
@Index(['room_id', 'user_id'], { unique: true })
export class RoomModeratorEntity extends BaseEntity {
  @Column({ comment: '所属房间ID' })
  room_id: number;

  @Column({ comment: '被任命为房管的用户ID' })
  user_id: number;

  @Column({ default: 1, comment: '房管状态: 1-有效, 0-已撤销' })
  status: number;

  @Column({ nullable: true, comment: '任命人的用户ID（房主或系统管理员）' })
  appointed_by: number;

  @Column({ length: 255, nullable: true, comment: '任命备注说明' })
  remark: string;
}
