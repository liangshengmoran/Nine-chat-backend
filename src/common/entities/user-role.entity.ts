import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('tb_user_role')
@Index('IDX_user_role_scope', ['user_id', 'role_id', 'scope_value'], { unique: true })
export class UserRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '用户ID' })
  user_id: number;

  @Column({ type: 'int', comment: '角色ID' })
  role_id: number;

  @Column({ type: 'varchar', length: 64, default: '*', comment: '作用域值: * 表示全局, 房间ID 表示指定房间' })
  scope_value: string;

  @Column({ type: 'int', nullable: true, comment: '分配者用户ID' })
  assigned_by: number;

  @Column({ type: 'int', default: 1, comment: '状态: 1-有效 0-已撤销' })
  status: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
